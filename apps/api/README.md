# @crownbid/api

Backend REST CrownBid (Node.js + Express + TypeScript).

## Scripts

| Script | Descripción |
|--------|-------------|
| `npm run dev` | Servidor con recarga (`tsx watch`) |
| `npm run build` | Compila a `dist/` |
| `npm start` | Ejecuta `dist/server.js` |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest — tests esenciales Auth (`tests/auth.essential.test.ts`) |
| `npm run db:test` | Prueba de conexión SQL Server (CLI) |

## Variables de entorno

Ver `.env.example`. **Phase 1** exige `SQLSERVER_CONNECTION_STRING` (o `DATABASE_URL` como alias). **Phase 3** requiere `JWT_SECRET` para emitir tokens en login (en producción el arranque falla si falta). `JWT_EXPIRES_IN` es opcional (por defecto `15m` en código). **Phase 7** usa `FRONTEND_URL` (obligatorio en producción para forgot-password), `PASSWORD_RESET_TOKEN_TTL_MINUTES` (opcional, default 30 en código) y SMTP para correo real.

## Endpoints públicos

- `GET /health`, `GET /api/health` — estado del proceso
- `GET /api/health/db` — `SELECT 1` contra SQL Server (`503` si no hay conexión)
- `POST /api/auth/register` — registro (Phase 2; ver `docs/auth-phase-2-register.md`)
- `POST /api/auth/login` — login + JWT (Phase 3; ver `docs/auth-phase-3-login.md`)
- `POST /api/auth/change-initial-password` — primera contraseña definitiva + JWT `access` (Phase 4; ver `docs/auth-phase-4-change-initial-password.md`)
- `GET /api/users/me` — perfil autenticado (**Bearer** tipo `access`; Phase 5; ver `docs/auth-phase-5-users-me.md`)
- `POST /api/auth/logout` — cierre de sesión **en el cliente** (descartar JWT); **200** `{ ok, message }`. No hay revocación server-side en esta versión del TP.
- `POST /api/auth/forgot-password` — **no implementado** (**501**, código `PASSWORD_RESET_NOT_IMPLEMENTED`)
- `POST /api/auth/reset-password` — **no implementado** (**501**, código `PASSWORD_RESET_NOT_IMPLEMENTED`)

**Demo backend (Phase 5 — entrega final):**

- Checklist compacto — [`docs/demo/backend-demo-checklist.md`](../../docs/demo/backend-demo-checklist.md)
- QA manual completo — [`docs/demo/backend-final-manual-qa.md`](../../docs/demo/backend-final-manual-qa.md)
- DoD final — [`docs/demo/backend-final-dod-checklist.md`](../../docs/demo/backend-final-dod-checklist.md)
- Postman demo — [`docs/postman/CrownBid-Final-Demo.postman_collection.json`](../../docs/postman/CrownBid-Final-Demo.postman_collection.json)
- Informe Phase 5 — [`audit/phase-5-final-backend-delivery-report.md`](../../audit/phase-5-final-backend-delivery-report.md)

### Admisión de clientes (empleado)

| Método | Ruta | Rol |
|--------|------|-----|
| GET | `/api/admin/clientes/:id` | Empleado |
| PATCH | `/api/admin/clientes/:id/admitir` | Empleado (`admitido`, `categoria` opcional) |
| PATCH | `/api/admin/clients/:id/admit` | Alias inglés |

### Estado operativo del cliente (pujas)

| Método | Ruta | Rol |
|--------|------|-----|
| GET | `/api/users/me/status` | Cliente (`?auctionId=` opcional) |
| GET | `/api/clientes/me/status` | Alias |
| GET | `/api/clients/me/status` | Alias inglés |

Respuesta incluye `admitido`, `categoria`, `hasVerifiedPaymentMethod`, `canBid`, `cannotBidReason`.

**Cierre Auth (Phase 8):** QA manual y checklist — `docs/auth-phase-8-manual-qa.md`. Resumen para frontend/mobile — `docs/auth-final-summary.md`.

### Envío de productos (sin cambios de esquema SQL)

Requiere `DEFAULT_REVIEWER_EMPLOYEE_ID` en `.env` (FK `productos.revisor`).

| Método | Ruta | Rol |
|--------|------|-----|
| POST | `/api/productos/solicitudes` | Cliente (contrato TPO; body `nombre`, `descripcion`, `fotos[]`, declaraciones) |
| POST | `/api/productos/submissions` | Cliente (contrato legacy) |
| POST | `/api/items/submissions` | Cliente (alias inglés de solicitudes) |
| GET | `/api/productos/mis-solicitudes` | Cliente |
| GET | `/api/productos/mis-solicitudes/:id` | Cliente |
| GET | `/api/items/my-submissions` | Cliente (alias inglés) |
| POST | `/api/productos/mis-solicitudes/:id/aceptar-condiciones` | Cliente → **409** `TERMS_ACCEPTANCE_NOT_SUPPORTED_BY_SCHEMA` |
| POST | `/api/productos/mis-solicitudes/:id/rechazar-condiciones` | Cliente → **409** (idem) |
| GET | `/api/users/me/item-submissions` | Cliente (legacy) |
| GET | `/api/users/me/item-submissions/:id` | Cliente |
| DELETE | `/api/users/me/item-submissions/:id` | Cliente (solo `disponible=no`, sin catálogo) |
| POST | `/api/auth/employee/login` | Empleado (env `EMPLOYEE_ADMIN_*`) |
| GET | `/api/admin/productos/solicitudes` | Empleado (`?status`, `search`, `limit`, `offset`) |
| GET | `/api/admin/productos/solicitudes/:id` | Empleado |
| POST | `/api/admin/productos/solicitudes/:id/aceptar` | Empleado (`basePrice`, `commissionPercent`) |
| POST | `/api/admin/productos/solicitudes/:id/rechazar` | Empleado → **409** `REJECTION_NOT_SUPPORTED_BY_SCHEMA` |
| POST | `/api/admin/productos/solicitudes/:id/asignar-subasta` | Empleado (`auctionId` \| `catalogId`, `basePrice`, `commissionPercent`) |
| GET | `/api/admin/items/submissions` | Empleado (alias inglés) |
| GET | `/api/admin/productos/revision` | Empleado (legacy; solo pendientes) |
| POST | `/api/admin/productos/:id/decision` | Empleado (`approve` \| `reject`) |
| PATCH | `/api/admin/productos/:id/auction-assignment` | Empleado |

**Estados API (derivados):** `PENDING_REVIEW`, `ACCEPTED`, `ASSIGNED_TO_AUCTION` — ver `audit/phase-4-item-submission-review-hardening-report.md`.

**Fase 4 hardening:** mínimo 6 fotos; empleado no crea solicitudes; aceptar/asignar bloquean duplicados (`ITEM_ALREADY_ASSIGNED`); rechazo honesto `REJECTION_NOT_SUPPORTED_BY_SCHEMA`; `productId` = `itemsCatalogo` tras asignar.

**Limitaciones del esquema fijo:** no hay columna de motivo de rechazo ni historial; `disponible=no` agrupa pendiente y no aprobado; las declaraciones legales se validan pero no se persisten; rechazo persistido no soportado (`POST .../rechazar` → 409).

**Foto de envío:** `GET /api/users/me/item-submissions/:id/photos/:photoId` (cliente, binario `application/octet-stream`).

### QA manual — parche correcciones envío de productos

1. **Rutas productos:** `GET /api/productos` y `GET /api/productos/:id` montados una sola vez; `POST /api/productos/submissions` no es capturado por `/:id`.
2. **Ocultar pendientes:** Con producto `disponible=no`, `GET /api/productos/:id` → 404; el dueño lo ve en `GET /api/users/me/item-submissions/:id`.
3. **Admin reject:** `POST .../decision` con `{ "decision": "reject" }` → `decisionApplied: "not_approved"` + `limitations`; producto ya aprobado → 409.
4. **Admin approve:** Producto programado o vendido → 409.
5. **Asignación subasta:** Body con `catalogId` y `subastaId` juntos → 422; `subastaId` inexistente → 404.
6. **Cancelar con seguro:** Producto con `seguro` no nulo → 409 al `DELETE` del envío.
7. **Foto ajena:** Otro cliente con su token → 404 en foto de otro dueño.
8. **Concurrencia asignación:** (opcional) dos `PATCH .../auction-assignment` simultáneos → uno 409.

### Subasta en vivo (Fase 2 hardening — sin cambios de esquema SQL)

Alias inglés: `/api/auctions` (misma lógica que `/api/subastas`).

**Contrato de elegibilidad** (`canAccess`, `canBid`, `cannotBidReason`): calculado en backend. Códigos públicos incluyen `USER_NOT_AUTHENTICATED` (anónimo), `USER_NOT_ADMITTED`, `CATEGORY_NOT_ALLOWED`, `PAYMENT_METHOD_*`, `AUCTION_NOT_OPEN`, `LIVE_SESSION_REQUIRED`.

**Featured** (`?featured=true`): subconjunto derivado de subastas abiertas/próximas (`DERIVED_FEATURED_AUCTIONS`), sin columna `featured` en BD.

**Ítem en curso** (`NO_CURRENT_ITEM_FIELD`): primer `itemsCatalogo` no vendido por `identificador ASC`; `/live` y `POST .../pujos` usan la misma regla. Puja sobre otro ítem → `409 ITEM_NOT_CURRENT`.

**Límites de puja:** `minNextBid` / `maxNextBid` en `GET .../live` coinciden con validación de `POST .../pujos` (redondeo a 2 decimales; oro/platino sin tope máximo).

Ver informe: `audit/phase-2-auction-live-bidding-hardening-report.md`.

| Método | Path | Auth |
|--------|------|------|
| GET | `/api/subastas`, `/api/auctions` | Opcional (`?featured=true`, `status`, `category`) |
| GET | `/api/subastas/:id`, `/api/auctions/:auctionId` | Opcional |
| GET | `/api/subastas/:id/items` | Opcional (`basePrice` con JWT cliente) |
| GET | `/api/items/:id` | Opcional (`id` = `itemsCatalogo.identificador`) |
| POST/DELETE | `.../live/session` | Cliente operativo |
| GET | `.../live` | Cliente operativo (polling) |
| GET | `.../pujos/history` o `.../bids/history` | Cliente operativo |
| GET | `/api/users/me/metrics` | Bearer access |

**Puja:** requiere `POST .../live/session` antes de `POST .../pujos` (sesión en memoria — ver informe `audit/live-auction-backend-flow-implementation-report.md`).

### Cierre de ítem / adjudicación — Fase 3 (sin cambios de esquema SQL)

| Método | Path | Auth |
|--------|------|------|
| POST | `/api/subastas/:id/items/:itemId/cerrar` | Empleado |
| GET | `/api/subastas/:id/items/:itemId/resultado` | Bearer |
| POST | `/api/auctions/:auctionId/items/:itemId/close` | Empleado (alias) |
| GET | `/api/auctions/:auctionId/items/:itemId/result` | Bearer (alias) |
| GET | `/api/users/me/metrics` | Cliente |
| GET | `/api/users/me/purchases` | Cliente operativo |

Ganador desde `pujos` (empate: menor `identificador`). Sin pujas → `COMPANY_CLIENT_ID` en `.env`. Re-cierre → `409 ITEM_ALREADY_FINALIZED`. Respuesta: `resultStatus`, `productTitle`; GET resultado sin `paymentMethodId`.

Persistencia: `registroDeSubasta`, `itemsCatalogo.subastado`, `pujos.ganador`. Ver `audit/phase-3-auction-closing-result-hardening-report.md`.

---

# Medios de pago y autorización de pujas

**Cierre Fase 5:** informe [`../../docs/payment-methods-backend-closure.md`](../../docs/payment-methods-backend-closure.md) · checklist manual [`../../docs/payment-methods-manual-checklist.md`](../../docs/payment-methods-manual-checklist.md) · Postman [`../../docs/postman/CrownBid-Payment-Methods-Bids.postman_collection.json`](../../docs/postman/CrownBid-Payment-Methods-Bids.postman_collection.json) · OpenAPI [`../../docs/swagger.yaml`](../../docs/swagger.yaml).

Requiere migración `database/migrations/001_medios_pago_subasta_moneda.sql`.

## Flujo backend

1. El **cliente** registra medios de pago (`POST` → siempre `pendiente`).
2. La **empresa** (empleado) verifica o rechaza cada medio.
3. Para **pujar** hacen falta **dos** aprobaciones: `clientes.admitido = 'si'` y al menos un medio `verificado` seleccionado en la puja.
4. El cliente debe **inscribirse** en la subasta (`POST .../asistentes`) antes de pujar.
5. El backend valida categoría, subasta abierta, moneda, importe y revalida el medio **dentro de la transacción** de la puja.

**Regla final:** sin medio verificado el cliente puede ver datos de subasta permitidos por otras rutas, pero **no puede pujar**. El frontend no sustituye estas validaciones.

## Endpoints

### Cliente (`Bearer` access + contraseña definitiva)

| Método | Path | Body | Respuesta | Errores principales |
|--------|------|------|-----------|---------------------|
| GET | `/api/users/me/payment-methods` | — | `{ items: PaymentMethodPublic[] }` | 401 |
| POST | `/api/users/me/payment-methods` | ver abajo | `{ id, type, status, message }` | 400 `CVV_*`, `FULL_CARD_*`, 403 `CLIENT_NOT_FOUND` |
| PATCH | `/api/users/me/payment-methods/:id/disable` | — | `{ id, status }` | 404 `PAYMENT_METHOD_NOT_FOUND` |
| POST | `/api/subastas/:id/asistentes` | — | `{ id, auctionId, clientId, bidderNumber }` | 403 `USER_NOT_ADMITTED`, `CATEGORY_NOT_ALLOWED` |
| POST | `/api/subastas/:id/pujos` | `itemId`, `amount`, `paymentMethodId` | ver abajo | 403/404/409 (ver informe) |

**POST medio de pago (campos en español):**

```json
{
  "tipo": "tarjeta_credito",
  "moneda": "ARS",
  "titular": "Juan Pérez",
  "entidad": "Visa",
  "ultimosDigitos": "3456"
}
```

Cheque: `tipo: "cheque_certificado"`, `montoGarantia` obligatorio; `montoDisponible` se inicializa igual a la garantía.

**POST puja:**

```json
{
  "itemId": 10,
  "amount": 15100,
  "paymentMethodId": 3
}
```

- **`itemId`:** `dbo.itemsCatalogo.identificador` (ítem del catálogo de la subasta), **no** `dbo.productos.identificador`.
- **201:** `{ id, auctionId, itemId, amount, assistantId, paymentMethodId, winner }`.

### Empleado (`POST /api/auth/employee/login` → `role: empleado`, `employeeId`)

| Método | Path | Body | Respuesta |
|--------|------|------|-----------|
| GET | `/api/admin/payment-methods?status=pendiente` | query `status`: `pendiente` (default), `verificado`, `rechazado`, `deshabilitado`, `all` | `{ items: AdminPaymentMethodItem[] }` (máx. 100) |
| PATCH | `/api/admin/payment-methods/:id/verify` | — | `{ id, status, verifierId, verifiedAt }` |
| PATCH | `/api/admin/payment-methods/:id/reject` | `{ "reason": "..." }` | `{ id, status, rejectionReason, verifierId }` |

## Reglas de datos importantes

- No persistir PAN completo ni CVV.
- Solo el empleado verifica/rechaza; el cliente no puede fijar `estado` ni `verificador`.
- `pendiente` / `rechazado` / `deshabilitado` no habilitan pujas.
- Cheque: validar `montoDisponible >= amount` al pujar; **no** descontar saldo en esta fase.

## Transiciones de estado del medio

**Cliente — disable:**

| Desde | A |
|-------|---|
| `pendiente` | `deshabilitado` |
| `verificado` | `deshabilitado` |
| `rechazado` | `rechazado` (sin cambio; idempotente) |
| `deshabilitado` | `deshabilitado` (idempotente) |

**Empleado — verify:**

| Desde | A |
|-------|---|
| `pendiente` | `verificado` |
| `verificado` | `verificado` (idempotente) |
| `rechazado` | `verificado` |
| `deshabilitado` | 409 `PAYMENT_METHOD_DISABLED` |

**Empleado — reject:**

| Desde | A |
|-------|---|
| `pendiente` | `rechazado` |
| `rechazado` | `rechazado` (actualiza motivo) |
| `verificado` | `rechazado` (revocación administrativa; no borra pujas históricas) |
| `deshabilitado` | 409 `PAYMENT_METHOD_DISABLED` |

## Contrato de errores

Listado completo en [`../../docs/payment-methods-backend-closure.md`](../../docs/payment-methods-backend-closure.md) §6.

## Auth flow quick check (local)

1. `POST /api/auth/register` → obtener contraseña temporal (mock o email).
2. `POST /api/auth/login` con temporal → `mustChangePassword: true`.
3. `POST /api/auth/change-initial-password` con Bearer (token primer login) → nuevo `accessToken`.
4. `GET /api/users/me` con Bearer (`access`).
5. `POST /api/auth/logout` → **204**; mismo token → **401** revocado.
6. `POST /api/auth/forgot-password` → **202** mensaje genérico.
7. `POST /api/auth/reset-password` con token del correo/mock → sesión **200**.

Validación detallada: `docs/auth-phase-8-manual-qa.md`.

## Contrato API

Documentación en `../../docs/api/api-docs.md`.
