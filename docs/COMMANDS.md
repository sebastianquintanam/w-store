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

# Confirmar que Prisma ve la BD
cd backend && npx prisma migrate status
```
