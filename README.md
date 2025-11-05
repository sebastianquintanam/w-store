# 🛍️ W-Store — Checkout con Wompi (NestJS + React)
![Status](https://img.shields.io/badge/status-backend%20ready-brightgreen?style=flat-square)
![Backend](https://img.shields.io/badge/backend-NestJS%20%2B%20Prisma-red?style=flat-square)
![Frontend](https://img.shields.io/badge/frontend-React%20%2B%20Vite-blue?style=flat-square)
![Tests](https://img.shields.io/badge/tests-passing-brightgreen?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-lightgrey?style=flat-square)

**W-Store** es una app didáctica de e-commerce enfocada en el flujo de **checkout y pagos con Wompi (sandbox)**.

## 🔗 Navegación rápida
- 📦 **Backend (NestJS):** [backend/README.md](./backend/README.md)
- 🎨 **Frontend (React):** [frontend/README.md](./frontend/README.md)

## 🧭 Descripción
El proyecto está dividido en dos módulos:
1) **Backend**: API REST con NestJS, Prisma y PostgreSQL. Gestiona productos, transacciones y el webhook de Wompi.  
2) **Frontend**: interfaz de usuario (React + Vite + Tailwind) para seleccionar producto y realizar el pago.

## 🧱 Arquitectura
[Frontend React] → [API NestJS /products /transactions /wompi/webhook] → [Prisma + PostgreSQL]

## 🚀 Cómo correr rápido (dev)

### Backend
```bash
cd backend
pnpm install
npx prisma migrate dev
pnpm start:dev
```

## Frontend (placeholder)

cd frontend
pnpm install
pnpm run dev


🧪 Tests (backend)
🧾 Postman

Colección y environment exportados en docs/postman/.

La colección incluye carpetas: Transactions y Wompi (webhook) con headers (e.g. integrity-signature) y ejemplos.

👨‍💻 Autor

Sebastián Quintana — Ingeniería de Sistemas (EAN).
Stack: NestJS • React • Prisma • PostgreSQL.
