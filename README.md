# 🛍️ W-Store — Full-Stack Checkout Demo

![Status](https://img.shields.io/badge/status-complete-brightgreen?style=flat-square)
![Backend](https://img.shields.io/badge/backend-NestJS%20%2B%20Prisma-red?style=flat-square)
![Frontend](https://img.shields.io/badge/frontend-React%20%2B%20Vite-blue?style=flat-square)
![Tests](https://img.shields.io/badge/frontend%20tests-150%20passing-brightgreen?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-lightgrey?style=flat-square)

**W-Store** es una aplicación **didáctica** de e-commerce enfocada en el flujo de checkout y pagos con **Wompi sandbox**. Implementa un backend REST completo con NestJS y Prisma, un frontend React multi-paso con estado centralizado en Redux Toolkit, y un conjunto de tests unitarios y de componentes. El proyecto **no es de producción** — usa el entorno sandbox de Wompi y no incluye autenticación de usuarios.

---

## 🧭 Flujo de negocio

```
Home (/)
  └─ Seleccionar producto → "Pagar con tarjeta"
        └─ /checkout/card — Formulario de tarjeta + datos de entrega
              └─ /checkout/summary — Resumen del pedido y confirmación
                    └─ /checkout/processing — Creación de transacción + polling
                          └─ /checkout/result — Resultado (APPROVED / DECLINED / ERROR)
```

---

## 🏗️ Tech stack

| Capa | Tecnología | Versión |
|---|---|---|
| Backend framework | NestJS | 11.x |
| Lenguaje backend | TypeScript | 5.7 |
| ORM | Prisma | 6.x |
| Base de datos | PostgreSQL | 16 (Docker) |
| Frontend framework | React | 19.x |
| Build tool frontend | Vite | 7.x |
| Estilos | Tailwind CSS | 4.x |
| Estado global | Redux Toolkit | 2.x |
| Routing | React Router | 7.x |
| Lenguaje frontend | TypeScript | 5.9 |
| Tests backend | Jest + @nestjs/testing | 30.x |
| Tests frontend | Vitest + Testing Library | 4.x |
| Infra local | Docker Compose (solo PostgreSQL) | — |
| Package manager | pnpm | — |

---

## 🧱 Arquitectura

```
┌─────────────────────────────────────┐
│   React + Vite  (localhost:5173)    │  ← SPA multi-paso, Redux, React Router
└────────────────┬────────────────────┘
                 │ HTTP / fetch
┌────────────────▼────────────────────┐
│   NestJS API   (localhost:3001)     │  ← REST: productos, transacciones,
│   Products · Transactions           │    entregas, webhook Wompi
│   Deliveries  · Wompi webhook       │
└────────────────┬────────────────────┘
                 │ Prisma ORM
┌────────────────▼────────────────────┐
│   PostgreSQL 16  (Docker :5432)     │
└─────────────────────────────────────┘

         ↕  Wompi sandbox (simulado)
         https://api-sandbox.co.uat.wompi.dev/v1
```

---

## 📁 Estructura del repositorio

```
w-store/
├── backend/                   # API NestJS
│   ├── src/
│   │   ├── products/          # Módulo de productos
│   │   ├── transactions/      # Módulo de transacciones
│   │   ├── deliveries/        # Módulo de entregas
│   │   └── wompi/             # Webhook Wompi
│   ├── prisma/
│   │   ├── schema.prisma      # Modelos de datos
│   │   └── seed.ts            # 3 productos de ejemplo
│   ├── docker-compose.yml     # PostgreSQL local
│   └── .env.example
├── frontend/                  # SPA React
│   └── src/
│       ├── pages/             # ProductListPage · CheckoutCardPage
│       │                      # CheckoutSummaryPage · CheckoutProcessingPage
│       │                      # CheckoutResultPage
│       ├── components/        # ProductCard · …
│       ├── store/             # checkoutSlice (Redux Toolkit)
│       └── lib/               # api.ts · money.ts · card.ts · checkout.ts
├── docs/
│   ├── COMMANDS.md
│   ├── ROADMAP.md
│   ├── DECISIONS.md
│   ├── AUDIT_REPORT.md
│   └── postman/               # Colección exportada
└── README.md
```

---

## 🗃️ Modelo de datos

| Entidad | Campos clave | Relaciones |
|---|---|---|
| `Product` | id, name, description, priceCents, stock | → Transaction[] |
| `Customer` | id, fullName, email (único), address | → Transaction[], Delivery[] |
| `Transaction` | id, status\*, productId, customerId, amountCents, baseFeeCents, deliveryCents | → Product, Customer, Delivery? |
| `Delivery` | id, transactionId (único), customerId, address, status\*\* | → Transaction, Customer |

\* `status`: `PENDING` · `APPROVED` · `DECLINED` · `ERROR`  
\*\* `status`: `PENDING_SHIPMENT` · `SHIPPED` · `DELIVERED`

---

## 🔌 API Endpoints

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/products` | Lista todos los productos |
| `GET` | `/products/:id` | Retorna un producto por ID (404 si no existe) |
| `POST` | `/transactions` | Crea transacción en PENDING; upsert de cliente, verifica stock |
| `GET` | `/transactions/:id` | Consulta transacción con producto, cliente y entrega anidados |
| `PATCH` | `/transactions/:id/status` | Finaliza transacción manualmente (APPROVED / DECLINED / ERROR) |
| `POST` | `/wompi/webhook` | Webhook Wompi — finaliza transacción y descuenta stock |
| `GET` | `/deliveries/:transactionId` | Retorna la entrega asociada a una transacción (404 si no existe) |

---

## ⚙️ Variables de entorno

### Backend (`backend/.env`)

Copiar de `backend/.env.example` y completar con valores reales:

| Variable | Descripción |
|---|---|
| `DATABASE_URL` | Cadena de conexión PostgreSQL |
| `USE_WOMPI` | `"true"` para llamar al sandbox Wompi; `"false"` para flujo simulado |
| `VERIFY_WOMPI_SIGNATURE` | `"true"` para verificar HMAC del webhook (recomendado en staging) |
| `WOMPI_BASE_URL` | URL base del sandbox de Wompi |
| `WOMPI_PUBLIC_KEY` | Llave pública del dashboard Wompi |
| `WOMPI_PRIVATE_KEY` | Llave privada del dashboard Wompi |
| `WOMPI_INTEGRITY_KEY` | Llave de integridad para firma HMAC del webhook |

### Frontend (`frontend/.env`)

Copiar de `frontend/.env.example`:

| Variable | Descripción |
|---|---|
| `VITE_API_URL` | URL base del backend (ej. `http://localhost:3001`) |

> Los archivos `.env` **no deben commitearse**. El `.gitignore` cubre `.env` y `.env.*`, y excluye únicamente `.env.example`.

---

## 🚀 Setup local

### 1. Levantar PostgreSQL (Docker)

```bash
cd backend
docker compose up -d
```

### 2. Backend

```bash
# (desde backend/)
cp .env.example .env
# Editar .env → DATABASE_URL="postgresql://wuser:wpass@localhost:5432/wstore?schema=public"

pnpm install
pnpm exec prisma migrate dev
pnpm run prisma:seed
pnpm run start:dev
# → http://localhost:3001
```

### 3. Frontend

```bash
cd frontend
cp .env.example .env
# VITE_API_URL=http://localhost:3001 ya está configurado por defecto

pnpm install
pnpm run dev
# → http://localhost:5173
```

---

## 🧪 Tests

### Backend

```bash
cd backend

# Unit tests — 9 suites, 34 tests
pnpm run test

# Con reporte de cobertura
# Statements 95.91% | Branches 81.44% | Functions 92% | Lines 97.5%
pnpm run test:cov

# Tests end-to-end
pnpm run test:e2e
```

### Frontend

```bash
cd frontend

# 150 tests, ~2 s (sin watch)
pnpm run test:run

# Con reporte de cobertura
pnpm run test:coverage

# Verificación de tipos TypeScript
pnpm exec tsc --noEmit

# Build de producción
pnpm run build
```

---

## 🖱️ Cómo probar manualmente

1. Levantar backend y frontend (ver [Setup local](#-setup-local)).
2. Abrir `http://localhost:5173`.
3. Hacer click en **"Pagar con tarjeta"** en cualquier producto.
4. Completar el formulario de entrega (nombre, email, dirección) y los datos de tarjeta (número, titular, vencimiento MM/YY, CVV).
   - Número de tarjeta de prueba válido (Luhn): `4111 1111 1111 1111`
5. Revisar el resumen del pedido y hacer click en **"Confirmar pago"**.
6. La pantalla de procesando crea la transacción y hace polling cada 2.5 s.
7. Para finalizar la transacción manualmente desde otro terminal:

```bash
# Reemplazar <TX_ID> con el ID de la transacción
curl -s -X PATCH http://localhost:3001/transactions/<TX_ID>/status \
  -H "Content-Type: application/json" \
  -d '{"status":"APPROVED"}'
# Valores válidos: "APPROVED" | "DECLINED" | "ERROR"
```

8. La pantalla de resultado mostrará el estado final con los datos de la entrega (si APPROVED).

---

## 📬 Postman

La colección exportada se encuentra en `docs/postman/w-store-backend.postman_collection.json`. Incluye requests para todos los endpoints con ejemplos de body y headers (incluyendo la carpeta de webhook Wompi).

---

## 🔒 Decisiones técnicas destacables

- **CVV no almacenado** — el CVV nunca se guarda en Redux, localStorage ni en el backend.
- **Número de tarjeta no persistido** — solo se almacena los últimos 4 dígitos (`last4`) y la marca detectada.
- **Redux Toolkit para estado de checkout** — flujo multi-paso sin prop drilling; el slice `checkoutSlice` centraliza producto, cliente, metadata de tarjeta y transacción.
- **Polling controlado** — la pantalla de procesando hace polling a `GET /transactions/:id` cada 2.5 s con timeout de 120 s. Se evita doble POST en StrictMode con `useRef`.
- **Validación Luhn** — el número de tarjeta se valida con el algoritmo de Luhn antes de avanzar.
- **Transacciones atómicas en Prisma** — aprobar un pago descuenta stock y crea `Delivery` en un único `$transaction` atómico.
- **Idempotencia** — un segundo APPROVED sobre la misma transacción retorna "Ya finalizada" sin repetir operaciones ni decrementar stock.
- **Helmet + Throttler** — headers de seguridad HTTP y rate limiting global (60 req/IP/min) en todos los endpoints del backend.

---

## ⚠️ Limitaciones conocidas

- **Proyecto sandbox/didáctico** — no apto para producción real.
- **Sin autenticación de usuarios** — cualquiera puede crear o consultar transacciones vía API.
- **Wompi sandbox** — el pago real requiere un token de tarjeta generado por el widget JS de Wompi. Con `USE_WOMPI=false` el flujo completo se simula manualmente vía `PATCH /transactions/:id/status`.
- **CORS fijo a `localhost:5173`** — requiere cambio de configuración para staging o producción.
- **Sin deploy documentado** — el proyecto corre únicamente en local hasta que se configure un entorno cloud.
- **Sin persistencia de sesión en checkout** — refrescar la pestaña en `/checkout/processing` pierde el estado de la transacción en curso.

---

## 🗺️ Roadmap

- [ ] Screenshots o GIF del flujo completo para este README.
- [ ] Deploy (Railway / Render para backend; Vercel para frontend).
- [ ] Integración real con Wompi (tokenización de tarjeta con widget JS).
- [ ] Persistencia de sesión en `/checkout/processing` (localStorage del transactionId).
- [ ] CI/CD (GitHub Actions: test → build → deploy).
- [ ] Arquitectura hexagonal en backend (repositorios, use-cases explícitos).

---

## 👨‍💻 Autor

**Sebastián Quintana** — Ingeniería de Sistemas (EAN).  
Stack principal: NestJS · React · Prisma · PostgreSQL · TypeScript.
