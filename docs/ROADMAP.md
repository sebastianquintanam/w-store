# Roadmap — W-Store

**Fecha de inicio:** 2026-05-24  
**Última actualización:** 2026-05-27 — Fases 1–4 completadas. Frontend + 150 tests. README actualizado.  
**Estrategia:** Reparar el proyecto existente (ver `docs/DECISIONS.md`).  
**Orden:** Las fases son secuenciales. No comenzar la siguiente hasta completar los criterios de aceptación de la anterior.

---

## Fase 1 — Fundamentos

**Objetivo:** Dejar el entorno técnico en estado reproducible y seguro antes de escribir features.

### Tareas

- [x] Sacar `prisma/migrations/` del `.gitignore` — patrón era no-op; comentado con explicación. ✓ 2026-05-24
- [x] Corregir el port en la colección Postman de `:3000` a `:3001`. ✓ 2026-05-25 — Verificado con grep: la colección ya apuntaba a `:3001` en todos sus requests. No se requirió ningún cambio.
- [x] Verificar con `git log --all --full-history -- backend/.env` si las credenciales fueron commiteadas; si sí, rotar keys de Wompi sandbox. ✓ 2026-05-25 — Historial limpio. Los 3 commits que aparecieron en búsqueda amplia solo tocaron `backend/.env.example`. Los archivos `.env` reales nunca fueron commiteados. No se requiere rotación de keys.
- [x] Agregar `Delivery` al schema Prisma con relaciones a `Transaction` y `Customer`. ✓ 2026-05-24
- [x] Crear y aplicar migración `20260525014707_add_delivery`. `prisma validate` y `pnpm build` pasaron. ✓ 2026-05-25
- [x] Agregar `helmet@8.2.0` — `app.use(helmet())` en `main.ts` después de `enableCors()`. Headers: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, CSP. ✓ 2026-05-25
- [x] Agregar `@nestjs/throttler@6.5.0` — `ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }])` + `APP_GUARD` global. Responde `429` al exceder 60 req/min. ✓ 2026-05-25
- [x] Actualizar `backend/.gitignore` para asegurar que `.env` esté excluido correctamente a nivel de carpeta. ✓ 2026-05-25 — Agregadas líneas `.env.*` y `!.env.example` después de `.env` existente. Ahora cubre variantes como `.env.local`, `.env.staging`, `.env.production`.

### Criterio de aceptación

- `docker compose up -d && npx prisma migrate deploy && pnpm run prisma:seed` produce una BD funcional desde un clone limpio.
- `curl http://localhost:3001/products` retorna los 3 productos seeded.
- La colección Postman ejecuta sin editar URLs.
- El schema tiene tabla `Delivery`.
- Response headers incluyen `X-Content-Type-Options`, `X-Frame-Options`.

---

## Fase 2 — Backend completion

**Objetivo:** Completar todos los requisitos de backend de la spec: capas, Delivery, WompiService funcional, cobertura de tests > 80%.

### Tareas

**Arquitectura:**
- [ ] Extraer acceso a Prisma en repositorios (`ProductRepository`, `TransactionRepository`, `CustomerRepository`, `DeliveryRepository`).
- [ ] Mover lógica de negocio de los servicios actuales a use-cases explícitos (`CreateTransactionUseCase`, `FinalizeTransactionUseCase`).
- [ ] Los controladores solo deben orquestar: recibir DTO → llamar use-case → retornar respuesta.

**Delivery:**
- [ ] Extraer lógica de Delivery a un repositorio o servicio dedicado (actualmente inline en `TransactionsService`).
- [x] Al aprobar: crear `Delivery` con `transactionId`, `customerId`, `address`, `status: PENDING_SHIPMENT` dentro del `$transaction` atómico. ✓ 2026-05-25 — validado con smoke test manual (stock bajó, delivery creado, doble APPROVED idempotente).
- [x] `GET /transactions/:id` ahora incluye `product` (select), `customer` (select) y `delivery` (completo, null si no aprobada). 13 tests passing. ✓ 2026-05-25
- [x] Exponer `GET /deliveries/:transactionId` — `DeliveriesModule` completo (service, controller, spec). 17 tests passing. ✓ 2026-05-25

**WompiService:**
- [ ] Implementar tokenización de tarjeta: `POST /tokens/cards` en Wompi sandbox para obtener token antes de crear transacción.
- [ ] Actualizar el payload de `createTransaction()` para incluir `payment_method: { type: 'CARD', token, installments }`.
- [ ] Mapear correctamente el status de respuesta de Wompi (`data.status`) al estado interno.
- [x] Agregar `GET /products/:id` — `NotFoundException` si no existe, mismo `select` que `findAll`. 15 tests passing. ✓ 2026-05-25

**Tests backend (objetivo > 80% cobertura):**
- [x] `products.service.spec.ts`: findAll (select + orderBy), findOne (existe), findOne (NotFoundException). ✓ 2026-05-25 — 3 tests. Total acumulado: 6 suites, 20 tests passing.
- [x] `transactions.service.spec.ts`: 10 tests — create (3), finalize (4), findOne (3). ✓ 2026-05-25 — 17 tests passing en total (products.controller.spec: 3, deliveries.controller.spec: 2).
- [x] `wompi.controller.spec.ts`: APPROVED, DECLINED, VOIDED→ERROR, referencia sin `trx_`, firma ausente, firma inválida, firma válida. ✓ 2026-05-25 — 7 tests (era 1). Total acumulado: 6 suites, 26 tests passing.
- [x] `transactions.controller.spec.ts`: create (1), findOne (2), finalize (1). ✓ 2026-05-25 — 4 tests. Total acumulado: 7 suites, 30 tests passing.
- [x] Cobertura global > 80% alcanzada en Statements (87.75%), Functions (80%), Lines (88.33%). ✓ 2026-05-25
- [x] `wompi.service.spec.ts`: createTransaction OK, createTransaction error HTTP. ✓ 2026-05-25 — 2 tests.
- [x] `deliveries.service.spec.ts`: findByTransactionId (existe + NotFoundException). ✓ 2026-05-25 — 2 tests. Total acumulado: 9 suites, 34 tests passing.
- [x] Branches >80% alcanzado: 81.44%. ✓ 2026-05-25
- [x] Cobertura global final: Statements 95.91% | Branches 81.44% | Functions 92% | Lines 97.5%. ✓ 2026-05-25

### Criterio de aceptación

- `pnpm test:cov` muestra cobertura >80% en todas las métricas: Statements 95.91% | Branches 81.44% | Functions 92% | Lines 97.5%. ✓ 2026-05-25 — 9 suites, 34 tests.
- Con `USE_WOMPI=true` y keys de sandbox válidas, una transacción completa llega a APPROVED vía webhook.
- `GET /deliveries/:transactionId` retorna la entrega creada.
- Todos los tests pasan (`pnpm test`).

---

## Fase 3 — Frontend checkout completo ✓ 2026-05-27

**Objetivo:** Implementar el flujo de 5 pasos exigido por la spec, con Redux, formularios reales y diseño mobile-first.

### Tareas

**Infraestructura:**
- [x] Instalar Redux Toolkit + React Router v7. ✓ 2026-05-27
- [x] Definir el store: slice `checkoutSlice` con producto, customer, cardMeta y transaction. ✓ 2026-05-27
- [x] Configurar rutas: `/`, `/checkout/card`, `/checkout/summary`, `/checkout/processing`, `/checkout/result`. ✓ 2026-05-27

**Paso 1 — Producto (`/`):**
- [x] Mostrar producto con nombre, descripción, precio formateado en COP, stock disponible. ✓ 2026-05-27
- [x] Deshabilitar "Pagar con tarjeta" si stock = 0. ✓ 2026-05-27
- [x] Al hacer click, guardar product en store y navegar a `/checkout/card`. ✓ 2026-05-27
- [x] Al volver desde resultado, ProductListPage re-fetcha `/products` → stock actualizado. ✓ 2026-05-27

**Paso 2 — Tarjeta + Entrega (`/checkout/card`):**
- [x] Formulario de tarjeta: número (máscara `XXXX XXXX XXXX XXXX`), titular, vencimiento MM/YY, CVV. ✓ 2026-05-27
- [x] Validación Luhn para el número de tarjeta. ✓ 2026-05-27
- [x] Detección automática Visa / Mastercard por prefijo. ✓ 2026-05-27
- [x] Formulario de entrega: nombre completo, email, dirección. ✓ 2026-05-27
- [x] Validación de todos los campos antes de continuar. ✓ 2026-05-27
- [x] Guardar en store. CVV y número completo no persistidos. ✓ 2026-05-27

**Paso 3 — Resumen (`/checkout/summary`):**
- [x] Mostrar producto, precio, base fee, delivery fee, total. ✓ 2026-05-27
- [x] Tarjeta enmascarada (solo últimos 4 dígitos). ✓ 2026-05-27
- [x] "Confirmar pago" → navega a `/checkout/processing` (la transacción se crea allí). ✓ 2026-05-27

**Paso 4 — Procesando (`/checkout/processing`):**
- [x] POST /transactions → crea transacción PENDING. ✓ 2026-05-27
- [x] Polling a GET /transactions/:id cada 2.5s. ✓ 2026-05-27
- [x] Timeout de 120s (2 minutos) con mensaje de error. ✓ 2026-05-27
- [x] Al resolver (APPROVED / DECLINED / ERROR), navega a `/checkout/result`. ✓ 2026-05-27

**Paso 5 — Resultado (`/checkout/result`):**
- [x] APPROVED: confirmación + datos de entrega (GET /deliveries/:transactionId). ✓ 2026-05-27
- [x] DECLINED / ERROR: mensaje de fallo + botón "Intentar nuevamente". ✓ 2026-05-27
- [x] "Volver al inicio" → resetCheckout() → navigate('/'). ✓ 2026-05-27

**Diseño:**
- [x] Mobile-first con Tailwind CSS (breakpoints sm, lg). ✓ 2026-05-27
- [x] Sin scroll horizontal en ningún paso. ✓ 2026-05-27
- [x] Responsive hasta desktop. ✓ 2026-05-27

**Persistencia:**
- [ ] Guardar en localStorage el `transactionId` (no datos de tarjeta).
- [ ] Al refrescar en `/checkout/processing`, recuperar `transactionId` y retomar polling.

### Criterio de aceptación

- Flujo completo funciona de inicio a fin. ✓ 2026-05-27
- Sin CVV ni número completo de tarjeta persistido en Redux ni localStorage. ✓ 2026-05-27
- Stock se actualiza en pantalla de producto al volver (ProductListPage re-fetcha en mount). ✓ 2026-05-27
- Formulario de tarjeta rechaza números inválidos (Luhn). ✓ 2026-05-27
- Refrescar en `/checkout/processing` reinicia el flujo (persistencia localStorage pendiente).

---

## Fase 4 — Tests frontend + pulido ✓ (tests) / pendiente (pulido)

**Objetivo:** Cobertura de tests > 80% en frontend. Ajustes de UX y accesibilidad.

### Tareas

**Tests (Vitest + Testing Library) — 150 tests passing ✓ 2026-05-27**
- [x] Configurar Vitest en el proyecto frontend. ✓ 2026-05-27
- [x] `ProductCard.test.tsx`: renderiza con stock disponible, deshabilita botón con stock 0. 10 tests. ✓ 2026-05-27
- [x] `CheckoutCardPage.test.tsx`: validación Luhn, detección Visa/MC, campos requeridos, no persiste CVV ni número completo. 15 tests. ✓ 2026-05-27
- [x] `CheckoutSummaryPage.test.tsx`: calcula correctamente producto + base fee + delivery = total. Guards de ruta. 14 tests. ✓ 2026-05-27
- [x] `checkoutSlice.test.ts`: acciones del store (setProduct, setCustomer, setCardMeta, setTransaction, resetCheckout, resetPayment). 23 tests. ✓ 2026-05-27
- [x] `CheckoutResultPage.test.tsx`: renderiza APPROVED, DECLINED, ERROR; guards; delivery fetch. 23 tests. ✓ 2026-05-27
- [x] `CheckoutProcessingPage.test.tsx`: guards, polling, fake timers, timeout 120s. 24 tests. ✓ 2026-05-27
- [x] `ProductListPage.test.tsx`: loading, error, products render. 6 tests. ✓ 2026-05-27
- [x] `lib/card.test.ts`, `lib/money.test.ts`, `lib/checkout.test.ts`: utilidades puras. 35 tests. ✓ 2026-05-27
- [x] Mocks de API vía `vi.mock('../lib/api')`. ✓ 2026-05-27

**Pulido:**
- [ ] Eliminar botones de debug "Aprobar / Rechazar / Error" del `ProductCard` si aún existen.
- [ ] Reemplazar placeholder gris de imagen con imagen real o ilustración del producto.
- [ ] Revisar contraste de colores (WCAG AA mínimo).
- [ ] Agregar `aria-label` en botones de acción.

### Criterio de aceptación

- `pnpm run test:run` muestra 150 tests passing. ✓ 2026-05-27
- `pnpm run test:coverage` genera reporte de cobertura. ✓ 2026-05-27
- Sin botones de simulación expuestos en UI de producción (pendiente verificación).

---

## Fase 5 — README + Postman + Deploy

**Objetivo:** Documentación final completa y, si aplica, despliegue demostrable.

### Tareas

**README raíz:**
- [x] Descripción del proyecto. ✓ 2026-05-27
- [x] Flujo de negocio (los 5 pasos). ✓ 2026-05-27
- [x] Stack técnico. ✓ 2026-05-27
- [x] Explicación de arquitectura (capas backend, estructura frontend). ✓ 2026-05-27
- [x] Estructura de carpetas. ✓ 2026-05-27
- [x] Modelo de datos (tabla con 4 entidades). ✓ 2026-05-27
- [x] Tabla de endpoints con método, ruta y descripción. ✓ 2026-05-27
- [x] Link a colección Postman (`docs/postman/`). ✓ 2026-05-27
- [x] Variables de entorno (sin valores secretos). ✓ 2026-05-27
- [x] Instrucciones de setup local (Docker, migrate, seed, backend, frontend). ✓ 2026-05-27
- [x] Comandos de tests y cobertura (backend + frontend). ✓ 2026-05-27
- [x] Resultados de cobertura backend (Statements 95.91% | Branches 81.44%). ✓ 2026-05-27
- [x] Consideraciones de seguridad y decisiones técnicas. ✓ 2026-05-27
- [x] Limitaciones conocidas. ✓ 2026-05-27
- [ ] Screenshots o GIF del flujo completo.

**Postman:**
- [ ] Actualizar colección: corregir puerto a 3001.
- [ ] Agregar requests: `GET /products`, `GET /products/:id`, `GET /transactions/:id`, `GET /deliveries/:transactionId`.
- [ ] Agregar ejemplos de respuesta en cada request.
- [ ] Agregar carpeta "Wompi webhook" con ejemplos APPROVED, DECLINED, ERROR.

**Deploy (opcional, bonus):**
- [ ] Backend en Railway, Render o similar.
- [ ] Frontend en Vercel o Netlify.
- [ ] Variables de entorno configuradas en plataforma (no en código).
- [ ] URL pública documentada en README.

### Criterio de aceptación

- Un revisor puede clonar el repo, seguir el README y tener el proyecto corriendo localmente en menos de 10 minutos.
- La colección Postman ejecuta todos los endpoints sin editar URLs.
- Si hay deploy: las URLs públicas están en el README y funcionan.
