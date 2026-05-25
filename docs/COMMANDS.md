# Commands — W-Store

Referencia rápida de comandos para levantar y operar el proyecto localmente.

---

## Puertos

| Servicio | Puerto |
|---|---|
| Backend (NestJS) | `3001` |
| Frontend (Vite) | `5173` |
| PostgreSQL (Docker) | `5432` |

---

## Variables de entorno necesarias

### Backend (`backend/.env`)

Copiar de `backend/.env.example` y completar con valores reales:

```env
# Base de datos
DATABASE_URL="postgresql://wuser:wpass@localhost:5432/wstore?schema=public"

# Control de integración Wompi
USE_WOMPI="false"                   # "true" para llamar al sandbox real
VERIFY_WOMPI_SIGNATURE="false"      # "true" en staging/prod

# Wompi sandbox (obtener en dashboard.wompi.co)
WOMPI_BASE_URL="https://api-sandbox.co.uat.wompi.dev/v1"
WOMPI_PUBLIC_KEY="<pub_key_sandbox>"
WOMPI_PRIVATE_KEY="<prv_key_sandbox>"
WOMPI_INTEGRITY_KEY="<integrity_key_sandbox>"
```

### Frontend (`frontend/.env`)

```env
VITE_API_URL=http://localhost:3001
```

> No incluir secretos de Wompi en variables de frontend. La clave pública puede exponerse solo si se integra el widget JS de Wompi directamente en el cliente.

---

## Docker

El `docker-compose.yml` está en `backend/`. Levanta solo PostgreSQL.

```bash
# Levantar la base de datos
cd backend
docker compose up -d

# Ver logs de postgres
docker compose logs -f db

# Detener sin borrar volumen
docker compose stop

# Detener y eliminar contenedores (el volumen pgdata persiste)
docker compose down

# Eliminar contenedores Y el volumen (borra todos los datos)
docker compose down -v
```

---

## Backend (NestJS)

```bash
cd backend

# Instalar dependencias
pnpm install

# Modo desarrollo con hot-reload
pnpm start:dev

# Modo producción
pnpm build
pnpm start:prod

# Formatear código
pnpm format

# Lint
pnpm lint
```

---

## Prisma

Todos los comandos se ejecutan desde `backend/`.

```bash
# Aplicar migraciones y regenerar cliente (dev)
npx prisma migrate dev

# Aplicar migraciones en producción (sin prompt)
npx prisma migrate deploy

# Sembrar la base de datos (3 productos de ejemplo)
pnpm run prisma:seed

# Abrir Prisma Studio (explorador visual de BD)
npx prisma studio

# Regenerar el cliente Prisma sin migrar
npx prisma generate

# Revisar diferencias entre schema y BD
npx prisma migrate status
```

---

## Frontend (React + Vite)

```bash
cd frontend

# Instalar dependencias
pnpm install

# Modo desarrollo con HMR
pnpm dev

# Build de producción
pnpm build

# Preview del build (sirve dist/ localmente)
pnpm preview

# Lint
pnpm lint
```

---

## Tests

### Backend

```bash
cd backend

# Correr todos los unit tests
pnpm test

# Correr tests en modo watch
pnpm test:watch

# Correr tests con reporte de cobertura
pnpm test:cov

# Correr tests e2e
pnpm test:e2e
```

El reporte de cobertura se genera en `backend/coverage/`.

### Frontend

> Los tests de frontend aún no están implementados (ver Fase 4 en `ROADMAP.md`).
> Cuando estén configurados con Vitest:

```bash
cd frontend

# Correr tests (cuando estén implementados)
pnpm test

# Con cobertura
pnpm test --coverage
```

---

## Flujo completo de arranque local (desde cero)

```bash
# 1. Base de datos
cd backend
docker compose up -d

# 2. Dependencias e instalación
pnpm install

# 3. Variables de entorno
cp .env.example .env
# → editar .env con DATABASE_URL y keys de Wompi

# 4. Migraciones y seed
npx prisma migrate dev
pnpm run prisma:seed

# 5. Levantar backend
pnpm start:dev
# → http://localhost:3001

# 6. En otra terminal: frontend
cd ../frontend
pnpm install
pnpm dev
# → http://localhost:5173
```

---

## Verificación rápida

```bash
# Confirmar que el backend responde
curl http://localhost:3001/products

# Confirmar GET /products/:id
PRODUCT_ID=$(curl -s http://localhost:3001/products | jq -r '.[0].id')
curl -s http://localhost:3001/products/$PRODUCT_ID | jq .
curl -s http://localhost:3001/products/id_inexistente | jq '{status:.statusCode,message:.message}'

# Confirmar que Prisma ve la BD
cd backend && npx prisma migrate status
```

---

## Smoke test — flujo de transacción completo

Requiere backend corriendo en `:3001` y BD con seed aplicado.

```bash
# 1. Obtener el id de un producto del seed
PRODUCT_ID=$(curl -s http://localhost:3001/products | jq -r '.[0].id')

# 2. Crear transacción (queda en PENDING)
TRX=$(curl -s -X POST http://localhost:3001/transactions \
  -H "Content-Type: application/json" \
  -d "{
    \"productId\": \"$PRODUCT_ID\",
    \"deliveryCents\": 5000,
    \"customer\": {\"fullName\":\"Test User\",\"email\":\"test@test.com\",\"address\":\"Calle 1\"}
  }")
echo $TRX | jq .
TRX_ID=$(echo $TRX | jq -r '.transaction.id')

# 3. Aprobar → debe retornar delivery con status PENDING_SHIPMENT y stock decrementado
curl -s -X PATCH http://localhost:3001/transactions/$TRX_ID/status \
  -H "Content-Type: application/json" \
  -d '{"status":"APPROVED"}' | jq .

# 4. Intentar aprobar de nuevo → debe responder "Ya finalizada" sin tocar stock
curl -s -X PATCH http://localhost:3001/transactions/$TRX_ID/status \
  -H "Content-Type: application/json" \
  -d '{"status":"APPROVED"}' | jq .

# 5. Confirmar stock actualizado
curl -s http://localhost:3001/products | jq '.[0].stock'
```

**Resultados esperados validados el 2026-05-25:**
- Paso 3: `delivery.status = "PENDING_SHIPMENT"` presente en respuesta.
- Paso 4: `message = "Ya finalizada"`, sin delivery en respuesta.
- Paso 5: stock = valor inicial − 1.

```bash
# 6. Verificar GET /transactions/:id con relaciones anidadas (validado 2026-05-25)
curl -s http://localhost:3001/transactions/$TRX_ID | jq '{status:.status, product:.product.name, customer:.customer.email, delivery:.delivery.status}'
```

Resultado esperado (APPROVED):
```json
{
  "status":   "APPROVED",
  "product":  "Audífonos Bluetooth",
  "customer": "test@test.com",
  "delivery": "PENDING_SHIPMENT"
}
```

Resultado esperado (DECLINED):
```json
{
  "status":   "DECLINED",
  "product":  "Audífonos Bluetooth",
  "customer": "test@test.com",
  "delivery": null
}
```
```
