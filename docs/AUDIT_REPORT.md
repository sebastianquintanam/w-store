# Audit Report — W-Store

**Fecha:** 2026-05-24  
**Auditor:** Claude Sonnet 4.6 (asistido por Sebastian Quintana)  
**Estado del proyecto:** Inactivo desde agosto 2025. Sin tocar código funcional al momento de esta auditoría.

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
| Tests frontend | **Ninguno** | — |
| Contenedores | Docker Compose (solo BD) | — |

---

## 2. Endpoints existentes

| Método | Ruta | Descripción | Archivo |
|---|---|---|---|
| `GET` | `/products` | Lista todos los productos | `src/products/products.controller.ts` |
| `POST` | `/transactions` | Crea transacción PENDING, llama Wompi si `USE_WOMPI=true` | `src/transactions/transactions.controller.ts` |
| `GET` | `/transactions/:id` | Consulta transacción por ID | `src/transactions/transactions.controller.ts` |
| `PATCH` | `/transactions/:id/status` | Finaliza transacción manualmente (simulado) | `src/transactions/transactions.controller.ts` |
| `POST` | `/wompi/webhook` | Webhook de Wompi, finaliza transacción y descuenta stock | `src/wompi/wompi.controller.ts` |

**Endpoints exigidos por spec que NO existen:**
- `GET /products/:id`
- `GET /customers` o `POST /customers`
- `POST /deliveries` o creación interna de Delivery

---

## 3. Flujo frontend existente

El frontend tiene **una sola pantalla** — no hay routing, no hay pasos, no hay Redux.

```
App.tsx
  └─ useEffect → GET /products → renderiza ProductCard[] en grid
        └─ ProductCard (por producto)
              ├─ Botón "Comprar" → POST /transactions (datos hardcodeados)
              ├─ Polling cada 2.5s mientras status = PENDING
              └─ Botones de debug: "Aprobar / Rechazar / Error" → PATCH /transactions/:id/status
```

**Datos de cliente hardcodeados en `frontend/src/lib/api.ts:36-44`:**
```
fullName: 'Demo User'
email:    'demo@example.com'
address:  'Calle Falsa 123'
```

El usuario nunca ingresa información real. No hay formulario de tarjeta ni de entrega.

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

---

## 5. Requisitos faltantes

### Críticos (bloquean la evaluación)

| Requisito | Detalle |
|---|---|
| **Redux obligatorio** | La spec exige Redux para React. No existe ninguna gestión de estado centralizada. |
| **Flujo de 5 pasos** | Spec: Producto → Tarjeta+Entrega → Resumen → Resultado → Producto actualizado. Solo existe la pantalla de producto. |
| **Formulario de tarjeta de crédito** | Sin validación, sin detección Visa/Mastercard, sin enmascaramiento. |
| **Formulario de entrega real** | Los datos del cliente están hardcodeados en `api.ts`. |
| **Pantalla de resumen** | Debe mostrar producto + base fee + delivery fee + total. No existe. |
| **Pantalla de resultado final** | Debe mostrar estado y redirigir al producto con stock actualizado. No existe. |
| **Modelo `Delivery` en schema** | No hay tabla de entregas en `schema.prisma`. |
| **Crear Delivery al aprobar** | El `finalize()` solo descuenta stock; no crea ninguna entrega. |
| **Tests de frontend** | No existe ningún archivo `.spec` en `frontend/src/`. |
| **Cobertura > 80%** | Backend tiene 2 spec files con 1 assertion cada uno. Cobertura real < 5%. |

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

### P4 — Modelo Delivery ausente
El schema Prisma no tiene tabla `Delivery`. El requisito de crear una entrega al aprobar el pago no puede cumplirse sin una migración primero.

### P5 — Cobertura de tests insuficiente
- `transactions.service.spec.ts`: 1 test que verifica que `prisma.transaction.create` fue llamado.
- `wompi.controller.spec.ts`: 1 test que verifica `finalize` fue llamado con argumentos correctos.
- Sin tests para: stock insuficiente, pago fallido, out-of-stock, productos, DTOs inválidos, casos de error.

### P6 — Migraciones en `.gitignore`
`prisma/migrations/` está excluido del repo raíz. Un clone fresco no puede reproducir el schema sin ejecutar `prisma migrate dev` desde cero, lo que puede divergir del estado de producción.

### P7 — README de backend es boilerplate de NestJS
No documenta la arquitectura del proyecto, endpoints, modelo de datos ni instrucciones de setup.

---

## 7. Riesgos de seguridad

| Riesgo | Severidad | Detalle |
|---|---|---|
| Archivos `.env` en disco con posibles secretos | ALTO | `backend/.env` y `frontend/.env` existen. Verificar con `git log --all --full-history -- backend/.env` si fueron commiteados. |
| Webhook sin autenticación en modo por defecto | ALTO | `VERIFY_WOMPI_SIGNATURE=false` por defecto. Cualquiera puede llamar `/wompi/webhook` y finalizar transacciones. |
| Sin headers de seguridad | MEDIO | Sin Helmet, sin CSP, sin `X-Frame-Options`, sin `Strict-Transport-Security`. |
| Sin rate limiting | MEDIO | `POST /transactions` puede ser abusado para crear registros masivos en BD. |
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
