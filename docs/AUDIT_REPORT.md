# Audit Report — W-Store

**Fecha de auditoría inicial:** 2026-05-24  
**Última actualización:** 2026-05-27 — Frontend completo con flujo multi-paso, 150 tests passing. README raíz actualizado.  
**Auditor:** Claude Sonnet 4.6 (asistido por Sebastian Quintana)  
**Estado del proyecto:** Completo (backend + frontend + tests). Fases 1–4 cerradas. Ver `docs/ROADMAP.md`.

---

## 1. Stack actual

| Capa | Tecnología | Versión |
|---|---|---|
| Backend framework | NestJS | 11.x |
| Lenguaje backend | TypeScript | 5.7 |
| ORM | Prisma | 6.x |
| Base de datos | PostgreSQL | 16 (Docker) |
| Frontend framework | React | 19.x |
| Build tool frontend | Vite | 7.x |
| CSS | Tailwind CSS | 4.x |
| Package manager | pnpm | — |
| Tests backend | Jest 30 + jest-mock-extended | — |
| Tests frontend | Vitest + Testing Library | 4.x |
| Contenedores | Docker Compose (solo BD) | — |

---

## 2. Endpoints existentes

| Método | Ruta | Descripción | Archivo |
|---|---|---|---|
| `GET` | `/products` | Lista todos los productos | `src/products/products.controller.ts` |
| `GET` | `/products/:id` | Retorna un producto por ID — 404 si no existe | `src/products/products.controller.ts` |
| `POST` | `/transactions` | Crea transacción PENDING, llama Wompi si `USE_WOMPI=true` | `src/transactions/transactions.controller.ts` |
| `GET` | `/transactions/:id` | Consulta transacción por ID — incluye `product`, `customer` y `delivery` (null si no aprobada) | `src/transactions/transactions.controller.ts` |
| `PATCH` | `/transactions/:id/status` | Finaliza transacción manualmente (simulado) | `src/transactions/transactions.controller.ts` |
| `GET` | `/deliveries/:transactionId` | Retorna la entrega asociada a una transacción — 404 si no existe | `src/deliveries/deliveries.controller.ts` |
| `POST` | `/wompi/webhook` | Webhook de Wompi, finaliza transacción y descuenta stock | `src/wompi/wompi.controller.ts` |

**Endpoints exigidos por spec que NO existen:**
- `GET /customers` o `POST /customers`

---

## 3. Flujo frontend — estado actual ✓ 2026-05-27

El frontend implementa el **flujo completo de checkout en 5 pasos** con React Router, Redux Toolkit y formularios reales.

```
ProductListPage (/)
  └─ useEffect → GET /products → renderiza ProductCard[] en grid
        └─ ProductCard → "Pagar con tarjeta"
              └─ setProduct(product) → navigate('/checkout/card')

CheckoutCardPage (/checkout/card)
  ├─ Formulario entrega: nombre, email, dirección
  ├─ Formulario tarjeta: número (máscara), titular, vencimiento MM/YY, CVV
  ├─ Validación Luhn + detección de marca (Visa/Mastercard)
  └─ setCustomer() + setCardMeta() → navigate('/checkout/summary')

CheckoutSummaryPage (/checkout/summary)
  ├─ Muestra producto, datos de entrega, tarjeta enmascarada
  ├─ Desglose de costos: precio + base fee + delivery = total
  └─ "Confirmar pago" → navigate('/checkout/processing')

CheckoutProcessingPage (/checkout/processing)
  ├─ POST /transactions → crea transacción PENDING
  ├─ Polling GET /transactions/:id cada 2.5s
  ├─ Timeout de 120s con mensaje de error
  └─ APPROVED/DECLINED/ERROR → navigate('/checkout/result')

CheckoutResultPage (/checkout/result)
  ├─ APPROVED: muestra confirmación + estado de entrega (GET /deliveries/:id)
  ├─ DECLINED/ERROR: muestra mensaje + botón "Intentar nuevamente"
  └─ "Volver al inicio" → resetCheckout() → navigate('/')
```

Todos los pasos tienen **route guards** con `<Navigate replace>`: redirigen a `/` si falta el producto, o a `/checkout/card` si falta el cliente o los datos de tarjeta.

---

## 4. Requisitos ya implementados

| Requisito | Archivo(s) clave |
|---|---|
| Listado de productos con nombre, precio, stock | `products.service.ts`, `ProductCard.tsx` |
| Crear transacción en estado PENDING | `transactions.service.ts:47-56` |
| Verificar stock antes de crear transacción | `transactions.service.ts:26-28` |
| Upsert de cliente por email | `transactions.service.ts:30-41` |
| Finalizar transacción (APPROVED / DECLINED / ERROR) | `transactions.service.ts:97-126` |
| Descontar stock solo al aprobar (DB transaction atómica) | `transactions.service.ts:111-115` |
| Prevenir stock negativo | `transactions.service.ts:111-115` |
| Bloquear compra si stock = 0 | `transactions.service.ts:27` |
| Webhook de Wompi con verificación HMAC opcional | `wompi.controller.ts` |
| Referencia interna `trx_<id>` para reconciliar webhook | `transactions.service.ts:67`, `wompi.controller.ts:58-60` |
| Validación de DTOs con class-validator | `dto/create-transaction.dto.ts` |
| CORS habilitado para dev | `main.ts:27-33` |
| Raw body capturado para verificación de firma | `main.ts:12-17` |
| Docker Compose para PostgreSQL | `backend/docker-compose.yml` |
| Seed con 3 productos | `prisma/seed.ts` |
| `.env.example` sin secretos | `backend/.env.example` |
| `.gitignore` cubre `.env` y `docs/private/` | `.gitignore` raíz |
| Modelo `Delivery` en BD con relaciones a `Transaction` y `Customer` | `prisma/schema.prisma` + migración `20260525014707_add_delivery` |
| Crear `Delivery` (`PENDING_SHIPMENT`) al aprobar, dentro de la misma DB transaction atómica | `transactions.service.ts:116-132` |
| Guard de idempotencia: doble APPROVED → "Ya finalizada" sin nuevo decremento ni Delivery | `transactions.service.ts:102-104` |
| `GET /transactions/:id` devuelve `product`, `customer` y `delivery` anidados (`delivery: null` si no aprobada) | `transactions.service.ts:145-156` |
| `GET /products/:id` — retorna producto individual con mismo `select` que `findAll`; 404 si no existe | `products.service.ts:15-22`, `products.controller.ts:13-16` |
| `GET /deliveries/:transactionId` — consulta entrega por `transactionId`; 404 si no existe | `src/deliveries/` (DeliveriesModule completo) |
| Redux Toolkit instalado y configurado; slice `checkoutSlice` con product, customer, cardMeta, transaction | `frontend/src/store/checkoutSlice.ts` |
| Flujo de checkout en 5 pasos con React Router y route guards | `frontend/src/pages/` |
| Formulario de tarjeta con máscara, validación Luhn y detección Visa/Mastercard | `frontend/src/pages/CheckoutCardPage.tsx` |
| Formulario de entrega con validación de campos requeridos | `frontend/src/pages/CheckoutCardPage.tsx` |
| Pantalla de resumen con desglose de costos (precio + base fee + delivery + total) | `frontend/src/pages/CheckoutSummaryPage.tsx` |
| Pantalla de procesando con polling 2.5s, timeout 120s y manejo de errores de red | `frontend/src/pages/CheckoutProcessingPage.tsx` |
| Pantalla de resultado con APPROVED/DECLINED/ERROR, datos de entrega y botones de retorno | `frontend/src/pages/CheckoutResultPage.tsx` |
| CVV no almacenado; número completo de tarjeta no persistido (solo last4 y marca) | `frontend/src/store/checkoutSlice.ts`, `CheckoutCardPage.tsx` |
| 150 tests frontend — Vitest + Testing Library | `frontend/src/**/*.test.ts(x)` (10 archivos) |

---

## 5. Requisitos — estado actualizado ✓ 2026-05-27

### ~~Críticos~~ — todos resueltos

| Requisito | Estado |
|---|---|
| ~~Redux obligatorio~~ | RESUELTO ✓ 2026-05-27 — `checkoutSlice` con Redux Toolkit. Estado centralizado de producto, cliente, cardMeta y transacción. |
| ~~Flujo de 5 pasos~~ | RESUELTO ✓ 2026-05-27 — Rutas: `/` → `/checkout/card` → `/checkout/summary` → `/checkout/processing` → `/checkout/result`. |
| ~~Formulario de tarjeta de crédito~~ | RESUELTO ✓ 2026-05-27 — Número con máscara, titular, vencimiento MM/YY, CVV. Validación Luhn, detección Visa/Mastercard. |
| ~~Formulario de entrega real~~ | RESUELTO ✓ 2026-05-27 — Campos: nombre completo, email, dirección. Validación de campos requeridos. |
| ~~Pantalla de resumen~~ | RESUELTO ✓ 2026-05-27 — Muestra producto, datos de entrega, tarjeta enmascarada, desglose de costos y total. |
| ~~Pantalla de resultado final~~ | RESUELTO ✓ 2026-05-27 — APPROVED/DECLINED/ERROR con datos de entrega, botones de reintento y retorno al inicio. |
| ~~Tests de frontend~~ | RESUELTO ✓ 2026-05-27 — **150 tests passing** en 10 archivos. Vitest + Testing Library. |
| **Cobertura backend > 80%** | ALCANZADO ✓ 2026-05-25 — Statements 95.91% \| Branches 81.44% \| Functions 92% \| Lines 97.5%. 9 suites, 34 tests. |

### Altos (degradan la calidad técnica)

| Requisito | Detalle |
|---|---|
| **Capas hexagonales** | Servicios acceden Prisma directamente. Sin repositories, use-cases ni adapters separados. |
| **WompiService incompleto** | Payload a Wompi sandbox no incluye `payment_method` (token de tarjeta). Con `USE_WOMPI=true` siempre cae al catch y deja PENDING. |
| **README completo** | `backend/README.md` es el boilerplate genérico de NestJS. No documenta el proyecto. |

### Medios

| Requisito | Detalle |
|---|---|
| **GET /products/:id** | No existe endpoint de producto individual. |
| **Endpoints de clientes y entregas** | No expuestos como recursos REST independientes. |
| **Diseño mobile-first** | Actualmente grid de desktop. La spec pide iPhone SE como referencia mínima. |
| **Headers de seguridad** | Sin Helmet ni CSP. |
| **Rate limiting** | Sin throttler en ningún endpoint. |

### Bajos / Plus

| Requisito | Detalle |
|---|---|
| **Detección Visa/Mastercard** | La spec menciona esto como plus. |
| **Recuperación de progreso en refresh** | Sin localStorage ni persistencia de estado de checkout. |

---

## 6. Problemas críticos

### P1 — Port mismatch en colección Postman
La colección `docs/postman/w-store-backend.postman_collection.json` apunta a `:3000`.  
El backend corre en `:3001` (definido en `main.ts:43`).  
Cualquier revisor que ejecute la colección sin editar la URL obtiene `ECONNREFUSED`.

### P2 — Datos de cliente hardcodeados en frontend
`frontend/src/lib/api.ts:36-44` envía siempre `Demo User / demo@example.com / Calle Falsa 123`.  
El flujo completo de checkout nunca captura datos reales del usuario.

### P3 — WompiService no puede procesar pagos reales
`backend/src/wompi/wompi.service.ts:8-22` envía a Wompi sandbox un payload sin `payment_method`.  
Wompi requiere un token de tarjeta (generado por su widget JS). Con `USE_WOMPI=true`, el resultado es siempre un error silencioso → transacción queda PENDING indefinidamente.

### ~~P4 — Modelo Delivery ausente~~ RESUELTO ✓ 2026-05-25
Migración `20260525014707_add_delivery` aplicada. `Delivery` se crea en `finalize()` al aprobar, dentro del mismo `prisma.$transaction`. Validado con smoke test: stock bajó, delivery retornado en respuesta, doble APPROVED idempotente.

**Observación pendiente:** `GET /transactions/:id` aún no incluye el `delivery` relacionado. Añadir `include: { delivery: true }` en `findOne()` queda pendiente para Fase 2.

### P5 — Cobertura de tests insuficiente (en progreso)
- `transactions.service.spec.ts`: 10 tests. Cubre: PENDING, producto no existe, stock 0, APPROVED crea Delivery, DECLINED sin Delivery, ERROR sin Delivery, doble finalización, findOne (3 casos).
- `products.service.spec.ts`: 3 tests. Cubre: findAll (select + orderBy), findOne (existe), findOne (NotFoundException). ✓ 2026-05-25
- `wompi.controller.spec.ts`: 7 tests. Cubre: APPROVED, DECLINED, VOIDED→ERROR, referencia sin `trx_`, firma ausente, firma inválida, firma válida (HMAC correcto). ✓ 2026-05-25
- `products.controller.spec.ts`: 3 tests. `deliveries.controller.spec.ts`: 2 tests.
- `transactions.controller.spec.ts`: 4 tests. Cubre: create, findOne (existe + NotFoundException), finalize. ✓ 2026-05-25
- `wompi.service.spec.ts`: 2 tests. Cubre: createTransaction OK, createTransaction error HTTP. ✓ 2026-05-25
- `deliveries.service.spec.ts`: 2 tests. Cubre: findByTransactionId (existe + NotFoundException). ✓ 2026-05-25
- **Total backend: 9 suites, 34 tests passing.**
- **Cobertura final:** Statements 95.91% ✓ | Branches 81.44% ✓ | Functions 92% ✓ | Lines 97.5% ✓ — objetivo >80% superado en todas las métricas.

**Tests frontend — 150 tests passing ✓ 2026-05-27**

| Archivo | Tests |
|---|---|
| `lib/money.test.ts` | 3 |
| `lib/checkout.test.ts` | 5 |
| `lib/card.test.ts` | 27 |
| `store/checkoutSlice.test.ts` | 23 |
| `components/ProductCard.test.tsx` | 10 |
| `pages/CheckoutCardPage.test.tsx` | 15 |
| `pages/CheckoutSummaryPage.test.tsx` | 14 |
| `pages/CheckoutResultPage.test.tsx` | 23 |
| `pages/CheckoutProcessingPage.test.tsx` | 24 |
| `pages/ProductListPage.test.tsx` | 6 |
| **Total frontend** | **150** |

Herramientas: Vitest 4.x + Testing Library 16.x. Cobertura de frontend no medida en esta auditoría.

### ~~P6 — `.gitignore` de backend incompleto~~ RESUELTO ✓ 2026-05-25
`backend/.gitignore` reforzado: agregadas líneas `.env.*` y `!.env.example`. Cubre variantes `.env.local`, `.env.staging`, `.env.production`. Historial git auditado — ningún archivo `.env` real fue commiteado en ningún momento.

### ~~P7 — README de backend es boilerplate de NestJS~~ PARCIALMENTE RESUELTO ✓ 2026-05-27
El `README.md` raíz fue reescrito con arquitectura, endpoints, modelo de datos, env vars, setup y comandos de tests. Los sub-README de `backend/` y `frontend/` siguen siendo boilerplate (NestJS/Vite), pero el README raíz cubre toda la información relevante del proyecto.

---

## 7. Riesgos de seguridad

| Riesgo | Severidad | Detalle |
|---|---|---|
| ~~Archivos `.env` en disco con posibles secretos~~ | ~~ALTO~~ | RESUELTO ✓ 2026-05-25 — Historial git auditado: ningún `.env` real commiteado. `backend/.gitignore` reforzado con `.env.*` y `!.env.example`. |
| Webhook sin autenticación en modo por defecto | ALTO | `VERIFY_WOMPI_SIGNATURE=false` por defecto. Cualquiera puede llamar `/wompi/webhook` y finalizar transacciones. |
| ~~Sin headers de seguridad~~ | ~~MEDIO~~ | RESUELTO ✓ 2026-05-25 — `helmet@8.2.0` en `main.ts`. Activa `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, CSP y más. |
| ~~Sin rate limiting~~ | ~~MEDIO~~ | RESUELTO ✓ 2026-05-25 — `@nestjs/throttler@6.5.0` global: 60 req/IP/min, retorna `429` con headers `X-RateLimit-*`. |
| CORS hardcodeado a `localhost:5173` | MEDIO | No funciona en staging ni producción sin cambio de código. |
| IDs internos de transacciones expuestos en UI | BAJO | `ProductCard.tsx:113` muestra el ID de la transacción en pantalla. |
| Sin validación de rango en `deliveryCents` | BAJO | Acepta 0 o valores arbitrariamente grandes; no hay regla de negocio sobre el rango válido. |

---

## 8. Recomendación final: reparar, no reconstruir

**Se recomienda reparar el proyecto existente.**

**Razones para reparar:**

1. El núcleo de backend es sólido: schema Prisma correcto, lógica de transacciones con DB transaction atómica, webhook implementado, validación de DTOs, CORS, raw body para firma.
2. La estructura de NestJS (módulos, controladores, servicios) está bien organizada y es extensible.
3. El modelo de datos es adecuado para los requisitos (solo falta `Delivery`).
4. Docker y seed están funcionales.
5. Las brechas identificadas son de features faltantes (flujo de checkout, tests, Delivery), no de arquitectura rota que obligue a reescribir.

**Lo que falta es principalmente frontend** (todo el checkout multi-paso, Redux, formularios) y **completar el backend** (Delivery, tests, capas, WompiService). Ese trabajo se puede construir sobre la base existente sin riesgo.

**Reconstruir** perdería el trabajo de backend ya validado y tomaría significativamente más tiempo sin añadir valor técnico.
