# Decision Log — W-Store

Registro de decisiones técnicas significativas tomadas durante el desarrollo y la auditoría del proyecto.

---

## DEC-001 — Reparar el proyecto, no reconstruirlo

**Fecha:** 2026-05-24  
**Estado:** Aprobado

### Contexto

El proyecto estuvo inactivo desde agosto 2025. Al retomarlo, se realizó una auditoría completa (ver `docs/AUDIT_REPORT.md`) para decidir si convenía partir de cero o continuar sobre la base existente.

### Decisión

Se decidió **reparar el proyecto existente**, no reconstruirlo.

### Razones

1. **El backend core es funcional y correcto.** La lógica de transacciones usa una DB transaction atómica de Prisma (`prisma.$transaction`), lo que garantiza consistencia al descontar stock. Esto es exactamente lo que la spec exige y es no trivial de implementar bien.

2. **El modelo de datos es adecuado.** El schema Prisma cubre `Product`, `Customer` y `Transaction` con las relaciones correctas. Solo falta agregar `Delivery`.

3. **La integración con Wompi webhook está implementada.** El controller maneja la firma HMAC opcional, la reconciliación de referencia `trx_<id>` y la idempotencia (ignora webhooks si la transacción ya está finalizada).

4. **La validación de DTOs y el setup de NestJS están completos.** `ValidationPipe`, raw body para firma, CORS, seed de datos. Rehacer esto sería trabajo sin valor diferencial.

5. **Lo que falta son features nuevas, no correcciones de arquitectura rota.** El flujo de checkout multi-paso, Redux, formularios y tests son adiciones que se construyen sobre la base existente, no parches sobre código incorrecto.

### Alternativa descartada

Reconstruir desde cero con NestJS + React perdería todo el trabajo de backend validado y no aportaría mejoras arquitectónicas que no puedan lograrse reparando. El tiempo de reconstrucción sería significativamente mayor sin beneficio técnico demostrable.

### Consecuencias

- Se trabajará en fases secuenciales (ver `docs/ROADMAP.md`).
- No se modifica código funcional hasta completar la Fase 1 (fundamentos).
- El orden de las fases refleja la dependencia técnica: DB → backend → frontend → tests → docs.

---

## DEC-002 — Mantener pnpm como package manager

**Fecha:** 2026-05-24  
**Estado:** Aprobado

### Contexto

El proyecto ya usa `pnpm` en ambos, backend y frontend. Hay `pnpm-lock.yaml` implícito por los scripts en `package.json`.

### Decisión

Mantener `pnpm`. No migrar a `npm` ni `yarn`.

### Razón

Cambiar el package manager no aporta valor y puede invalidar los lockfiles existentes, generando riesgo de versiones distintas a las probadas originalmente.

---

## DEC-003 — Modelo Delivery como tabla separada en Prisma

**Fecha:** 2026-05-24  
**Estado:** Pendiente de implementación (Fase 1)

### Contexto

La spec exige crear una entrega al aprobar el pago. El schema actual no tiene tabla `Delivery`.

### Decisión

Agregar `Delivery` como modelo Prisma independiente con relación a `Transaction` y `Customer`, no como campo en `Transaction`.

### Razón

- Una entrega puede tener su propio ciclo de vida (estado de envío, dirección de entrega, fecha estimada).
- Modelarla como tabla separada permite extenderla sin alterar el modelo de transacciones.
- Sigue el principio de separación de responsabilidades que la spec menciona explícitamente.

### Campos mínimos esperados

```prisma
model Delivery {
  id            String   @id @default(cuid())
  transactionId String   @unique
  customerId    String
  address       String
  status        String   // PENDING_SHIPMENT | SHIPPED | DELIVERED
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  transaction Transaction @relation(fields: [transactionId], references: [id])
  customer    Customer    @relation(fields: [customerId], references: [id])
}
```

---

## Riesgos técnicos actuales

Los siguientes riesgos fueron identificados en la auditoría y deben gestionarse durante las fases correspondientes.

| ID | Riesgo | Severidad | Fase de mitigación |
|---|---|---|---|
| R-01 | `backend/.env` puede haber sido commiteado con keys reales | ALTO | Fase 1 |
| R-02 | Webhook de Wompi sin verificación de firma por defecto | ALTO | Fase 1 / Fase 2 |
| R-03 | WompiService no envía `payment_method` → sandbox siempre falla silenciosamente | ALTO | Fase 2 |
| R-04 | Modelo `Delivery` ausente → requisito core no cumplible | ALTO | Fase 1 |
| R-05 | Cobertura de tests < 5% (objetivo: > 80%) | ALTO | Fase 2 + Fase 4 |
| R-06 | Sin Redux → requisito obligatorio de la spec incumplido | ALTO | Fase 3 |
| R-07 | Port mismatch en Postman (3000 vs 3001) | MEDIO | Fase 1 |
| R-08 | Sin headers de seguridad (Helmet) | MEDIO | Fase 1 |
| R-09 | Sin rate limiting en endpoints públicos | MEDIO | Fase 1 / Fase 2 |
| R-10 | `prisma/migrations/` en `.gitignore` → schema no reproducible desde git | MEDIO | Fase 1 |
| R-11 | Datos de cliente hardcodeados en frontend | MEDIO | Fase 3 |
| R-12 | CORS hardcodeado a `localhost:5173` | BAJO | Fase 5 (deploy) |
