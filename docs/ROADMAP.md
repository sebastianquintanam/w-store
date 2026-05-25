# Roadmap — W-Store

**Fecha de inicio:** 2026-05-24  
**Última actualización:** 2026-05-25  
**Estrategia:** Reparar el proyecto existente (ver `docs/DECISIONS.md`).  
**Orden:** Las fases son secuenciales. No comenzar la siguiente hasta completar los criterios de aceptación de la anterior.

---

## Fase 1 — Fundamentos

**Objetivo:** Dejar el entorno técnico en estado reproducible y seguro antes de escribir features.

### Tareas

- [x] Sacar `prisma/migrations/` del `.gitignore` — patrón era no-op; comentado con explicación. ✓ 2026-05-24
- [ ] Corregir el port en la colección Postman de `:3000` a `:3001`.
- [ ] Verificar con `git log --all --full-history -- backend/.env` si las credenciales fueron commiteadas; si sí, rotar keys de Wompi sandbox.
- [x] Agregar `Delivery` al schema Prisma con relaciones a `Transaction` y `Customer`. ✓ 2026-05-24
- [x] Crear y aplicar migración `20260525014707_add_delivery`. `prisma validate` y `pnpm build` pasaron. ✓ 2026-05-25
- [ ] Agregar `@nestjs/helmet` al backend para headers de seguridad básicos.
- [ ] Agregar `@nestjs/throttler` con un límite razonable en `POST /transactions`.
- [ ] Actualizar `backend/.gitignore` para asegurar que `.env` esté excluido correctamente a nivel de carpeta.

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
- [ ] `GET /transactions/:id` no incluye `delivery` relacionado — añadir `include: { delivery: true }` en `findOne()`.
- [ ] Exponer `GET /deliveries/:transactionId` para consulta directa desde el frontend.

**WompiService:**
- [ ] Implementar tokenización de tarjeta: `POST /tokens/cards` en Wompi sandbox para obtener token antes de crear transacción.
- [ ] Actualizar el payload de `createTransaction()` para incluir `payment_method: { type: 'CARD', token, installments }`.
- [ ] Mapear correctamente el status de respuesta de Wompi (`data.status`) al estado interno.
- [ ] Agregar `GET /products/:id`.

**Tests backend (objetivo > 80% cobertura):**
- [ ] `products.service.spec.ts`: findAll, producto sin stock.
- [x] `transactions.service.spec.ts`: 7 tests — PENDING, producto no existe, stock 0, APPROVED crea Delivery, DECLINED sin Delivery, ERROR sin Delivery, doble finalización idempotente. ✓ 2026-05-25 — 10 tests passing en total.
- [ ] `wompi.controller.spec.ts`: webhook APPROVED, DECLINED, firma inválida con VERIFY=true, referencia sin prefijo `trx_`.
- [ ] Cobertura global > 80% aún pendiente.

### Criterio de aceptación

- `pnpm test:cov` muestra cobertura de líneas y branches > 80% en backend.
- Con `USE_WOMPI=true` y keys de sandbox válidas, una transacción completa llega a APPROVED vía webhook.
- `GET /deliveries/:transactionId` retorna la entrega creada.
- Todos los tests pasan (`pnpm test`).

---

## Fase 3 — Frontend checkout completo

**Objetivo:** Implementar el flujo de 5 pasos exigido por la spec, con Redux, formularios reales y diseño mobile-first.

### Tareas

**Infraestructura:**
- [ ] Instalar Redux Toolkit + React Router v6.
- [ ] Definir el store: slice `checkout` con estado para cada paso (producto, tarjeta, cliente, transacción, resultado).
- [ ] Configurar rutas: `/`, `/checkout/card`, `/checkout/summary`, `/checkout/processing`, `/checkout/result`.

**Paso 1 — Producto (`/`):**
- [ ] Mostrar producto con nombre, descripción, precio formateado en COP, stock disponible.
- [ ] Deshabilitar "Pagar con tarjeta de crédito" si stock = 0.
- [ ] Al hacer click, guardar `productId` en store y navegar a `/checkout/card`.
- [ ] Al volver desde resultado, refrescar stock del producto.

**Paso 2 — Tarjeta + Entrega (`/checkout/card`):**
- [ ] Formulario de tarjeta: número (con máscara `XXXX XXXX XXXX XXXX`), titular, expiración (MM/YY), CVV.
- [ ] Validación con algoritmo de Luhn para el número de tarjeta.
- [ ] Detección automática Visa / Mastercard por prefijo (logo visual).
- [ ] Formulario de entrega: nombre completo, email, dirección.
- [ ] Validación de todos los campos antes de continuar.
- [ ] Guardar datos en store. No persistir CVV ni número completo en localStorage.

**Paso 3 — Resumen (`/checkout/summary`):**
- [ ] Mostrar: nombre del producto, precio, base fee (fijo, definido en backend), delivery fee, **total**.
- [ ] Tarjeta enmascarada: solo últimos 4 dígitos visibles.
- [ ] Botón "Pagar" → llama `POST /transactions` con datos del store.

**Paso 4 — Procesando (`/checkout/processing`):**
- [ ] Mostrar indicador de carga.
- [ ] Polling a `GET /transactions/:id` cada 2.5s.
- [ ] Timeout de 2 minutos con mensaje de error si no resuelve.
- [ ] Al resolver (APPROVED / DECLINED / ERROR), navegar a `/checkout/result`.

**Paso 5 — Resultado (`/checkout/result`):**
- [ ] Mostrar estado final: APPROVED → éxito, DECLINED / ERROR → fallo.
- [ ] Mostrar referencia de transacción.
- [ ] Botón "Volver a la tienda" → navega a `/` y refresca stock.
- [ ] El producto en `/` debe mostrar el stock actualizado.

**Diseño:**
- [ ] Mobile-first: breakpoint base para iPhone SE (375px).
- [ ] Sin scroll horizontal en ningún paso.
- [ ] Botones y formularios utilizables en pantalla táctil.
- [ ] Responsive hasta desktop.

**Persistencia:**
- [ ] Guardar en localStorage el paso actual y el `transactionId` (no datos de tarjeta).
- [ ] Al refrescar en `/checkout/processing`, recuperar `transactionId` y retomar polling.

### Criterio de aceptación

- Flujo completo funciona de inicio a fin en Chrome mobile (DevTools iPhone SE).
- Sin datos de tarjeta en localStorage ni Redux devtools con CVV persistido.
- Stock se actualiza en pantalla de producto al volver.
- Formulario de tarjeta rechaza números inválidos (Luhn).
- Refrescar en `/checkout/processing` retoma el polling sin perder el estado.

---

## Fase 4 — Tests frontend + pulido

**Objetivo:** Cobertura de tests > 80% en frontend. Ajustes de UX y accesibilidad.

### Tareas

**Tests (Vitest + Testing Library):**
- [ ] Configurar Vitest en el proyecto frontend.
- [ ] `ProductCard.spec.tsx`: renderiza con stock disponible, deshabilita botón con stock 0.
- [ ] `CardForm.spec.tsx`: validación Luhn, detección Visa/MC, campos requeridos, no persiste CVV.
- [ ] `DeliveryForm.spec.tsx`: validación de email, campos requeridos.
- [ ] `Summary.spec.tsx`: calcula correctamente producto + base fee + delivery = total.
- [ ] `checkout.slice.spec.ts`: acciones del store, transiciones de estado entre pasos.
- [ ] `Result.spec.tsx`: renderiza APPROVED, DECLINED, ERROR correctamente.
- [ ] Mocks de `fetch` para todos los llamados a API.

**Pulido:**
- [ ] Eliminar botones de debug "Aprobar / Rechazar / Error" del `ProductCard`.
- [ ] Reemplazar placeholder gris de imagen con imagen real o ilustración del producto.
- [ ] Revisar contraste de colores (WCAG AA mínimo).
- [ ] Agregar `aria-label` en botones de acción.

### Criterio de aceptación

- `pnpm test --coverage` muestra cobertura de líneas > 80% en frontend.
- Todos los tests pasan.
- Sin botones de simulación expuestos en UI de producción.

---

## Fase 5 — README + Postman + Deploy

**Objetivo:** Documentación final completa y, si aplica, despliegue demostrable.

### Tareas

**README raíz:**
- [ ] Descripción del proyecto.
- [ ] Flujo de negocio (los 5 pasos).
- [ ] Stack técnico.
- [ ] Explicación de arquitectura (capas backend, estructura frontend).
- [ ] Estructura de carpetas.
- [ ] Modelo de datos (diagrama o tabla).
- [ ] Tabla de endpoints con método, ruta y descripción.
- [ ] Link a colección Postman.
- [ ] Variables de entorno (sin valores secretos).
- [ ] Instrucciones de setup local (Docker, migrate, seed, backend, frontend).
- [ ] Comandos de tests y cobertura.
- [ ] Resultados de cobertura (captura o tabla).
- [ ] Consideraciones de seguridad.
- [ ] Limitaciones conocidas.

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
