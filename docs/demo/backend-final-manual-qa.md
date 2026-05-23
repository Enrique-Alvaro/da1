# Backend Final Manual QA

## 1. Purpose

This guide validates the CrownBid **backend only** for TP delivery and defense. It follows the flows hardened in Phases 1–4 without requiring frontend or mobile. Spanish routes are preferred; English aliases are noted where they exist.

Companion documents:

- [`backend-demo-checklist.md`](backend-demo-checklist.md) — compact step table
- [`backend-final-dod-checklist.md`](backend-final-dod-checklist.md) — Definition of Done
- [`../../audit/phase-5-final-backend-delivery-report.md`](../../audit/phase-5-final-backend-delivery-report.md) — full route inventory

---

## 2. Preconditions

1. SQL Server running and reachable from the API host.
2. Professor schema applied: `database/schema.sql` (do not modify).
3. Supplemental scripts applied (required for auth/payments):
   - `database/cliente_credenciales.sql`
   - `database/migrations/001_medios_pago_subasta_moneda.sql`
4. `apps/api/.env` configured from `.env.example`.
5. API started: `cd apps/api && npm run dev` (default port **3000**).
6. At least one **open** auction (`subastas.estado = 'abierta'`) with catalog/item data for bidding demo.
7. Employee admin credentials configured in `.env` (`EMPLOYEE_ADMIN_*`).
8. `DEFAULT_REVIEWER_EMPLOYEE_ID` points to an existing `dbo.empleados` row.
9. For closing **without bids**: set `COMPANY_CLIENT_ID` to an existing `dbo.clientes` row.

---

## 3. Environment variables

| Variable | Required | Purpose |
| -------- | -------- | ------- |
| `SQLSERVER_CONNECTION_STRING` | Yes | ADO-style SQL Server connection |
| `JWT_SECRET` | Yes (prod) / recommended (dev) | Sign access tokens |
| `JWT_EXPIRES_IN` | No | Token TTL (default `15m` in code) |
| `DEFAULT_REVIEWER_EMPLOYEE_ID` | Yes for item submission | FK `productos.revisor` |
| `EMPLOYEE_ADMIN_EMAIL` | Yes for employee login | TPO admin login |
| `EMPLOYEE_ADMIN_PASSWORD` | Yes | |
| `EMPLOYEE_ADMIN_ID` | Yes | Must exist in `dbo.empleados` |
| `COMPANY_CLIENT_ID` | If demo close without bids | Company buyer in `registroDeSubasta` |
| `SMTP_*`, `SMTP_FROM` | Prod register email | Optional in dev |
| `FRONTEND_URL` | Prod password reset | Not used while reset is 501 |
| `PORT` | No | Default `3000` |

---

## 4. Required demo data

| Entity | How to obtain |
| ------ | ------------- |
| Employee | `.env` `EMPLOYEE_ADMIN_*` + row in `dbo.empleados` |
| Client | `POST /api/auth/register` + login |
| Admitted client | `PATCH /api/admin/clientes/:id/admitir` |
| Verified payment method | Client creates PM → employee `PATCH .../verify` |
| Open auction | Seed SQL or existing DB |
| Catalog item | Assign product or seed `itemsCatalogo` |
| Company client | `.env` `COMPANY_CLIENT_ID` |

**ID semantics:** `itemId` in bids/live = `itemsCatalogo.identificador`. `productId` = `productos.identificador`. After submission assign, `catalogItemId` = `itemsCatalogo.identificador`.

---

## 5. End-to-end demo flow

Replace `{{base}}` with `http://localhost:3000`.

### Flow A — Auth and admission

| Step | Objective | Method | Route | Auth | Expected |
| ---- | --------- | ------ | ----- | ---- | -------- |
| A1 | Health | GET | `/api/health` | — | 200 `status: ok` |
| A2 | DB health | GET | `/api/health/db` | — | 200 or 503 if DB down |
| A3 | Register client | POST | `/api/auth/register` | — | 201 |
| A4 | Login client | POST | `/api/auth/login` | — | 200 + `accessToken` or initial password flow |
| A5 | Change initial password | POST | `/api/auth/change-initial-password` | Bearer initial | 200 + `accessToken` if first login |
| A6 | Login employee | POST | `/api/auth/employee/login` | — | 200 + `accessToken` |
| A7 | Admit client | PATCH | `/api/admin/clientes/:id/admitir` | Bearer employee | 200 `admitido: si` |
| A8 | Client status | GET | `/api/users/me/status` | Bearer client | 200; after PM verify `canBid` may be true |

**Admit body example:**

```json
{ "admitido": "si", "categoria": "comun" }
```

**Forgot/reset:** `POST /api/auth/forgot-password` and `reset-password` return **501** `PASSWORD_RESET_NOT_IMPLEMENTED` (documented limitation).

**Logout:** `POST /api/auth/logout` returns 200 — discard token on client; no server revocation.

---

### Flow B — Payment method

| Step | Method | Route | Auth | Expected |
| ---- | ------ | ----- | ---- | -------- |
| B1 | POST | `/api/users/me/payment-methods` | Client | 201 `estado: pendiente` |
| B2 | PATCH | `/api/admin/payment-methods/:id/verify` | Employee | 200 `verificado` |
| B3 | GET | `/api/users/me/status` | Client | `hasVerifiedPaymentMethod: true` |

---

### Flow C — Auction / live / bidding

| Step | Method | Route | Auth | Expected |
| ---- | ------ | ----- | ---- | -------- |
| C1 | GET | `/api/subastas?featured=true` | Optional | 200 `items[]`, meta `DERIVED_FEATURED_AUCTIONS` |
| C2 | GET | `/api/subastas/:id` | Optional | 200 `canBid`, `cannotBidReason` |
| C3 | GET | `/api/subastas/:id/items` | Optional | 200 array |
| C4 | GET | `/api/items/:id` | Optional | 200 (`id` = catalog item) |
| C5 | POST | `/api/subastas/:id/asistentes` | Client | 201 assistant |
| C6 | POST | `/api/subastas/:id/live/session` | Client | 200 active session |
| C7 | GET | `/api/subastas/:id/live` | Client | 200 `minNextBid`, `maxNextBid` |
| C8 | POST | `/api/subastas/:id/pujos` | Client | 201 bid |
| C9 | POST | `/api/subastas/:id/pujos` (low) | Client | 409 `BID_TOO_LOW` |
| C10 | GET | `/api/subastas/:id/pujos/history` | Client | 200 `order: newest_first` |
| C11 | DELETE | `/api/subastas/:id/live/session` | Client | 200 leave |

**Bid body:**

```json
{ "itemId": 10, "amount": 15100, "paymentMethodId": 3 }
```

**Note:** Restarting the API clears in-memory live sessions — repeat step C6 before bidding.

English aliases: `/api/auctions/*`, `POST .../bids`, `GET .../bids/history`.

---

### Flow D — Closing / result / metrics

| Step | Method | Route | Auth | Expected |
| ---- | ------ | ----- | ---- | -------- |
| D1 | POST | `/api/subastas/:id/items/:itemId/cerrar` | Employee | 200 `resultStatus: FINALIZED` |
| D2 | GET | `/api/subastas/:id/items/:itemId/resultado` | Bearer | 200 winner fields |
| D3 | GET | `/api/subastas/:id/live` | Client | `isFinalized: true` |
| D4 | GET | `/api/users/me/metrics` | Client | 200 counts |
| D5 | GET | `/api/users/me/purchases` | Client | 200 `items[]` |

Close without bids requires `COMPANY_CLIENT_ID`; otherwise **409 COMPANY_CLIENT_ID_REQUIRED**.

---

### Flow E — Item submission / review / assignment

| Step | Method | Route | Auth | Expected |
| ---- | ------ | ----- | ---- | -------- |
| E1 | POST | `/api/productos/solicitudes` (&lt;6 fotos) | Client | 400 validation |
| E2 | POST | `/api/productos/solicitudes` (6+ fotos) | Client | 201 `PENDING_REVIEW` |
| E3 | GET | `/api/productos/mis-solicitudes` | Client | 200 own list |
| E4 | GET | `/api/admin/productos/solicitudes` | Employee | 200 |
| E5 | POST | `/api/admin/productos/solicitudes/:id/aceptar` | Employee | 200 `ACCEPTED` |
| E6 | POST | `/api/admin/productos/solicitudes/:id/rechazar` | Employee | **409** `REJECTION_NOT_SUPPORTED_BY_SCHEMA` |
| E7 | POST | `/api/admin/productos/solicitudes/:id/asignar-subasta` | Employee | 200 `catalogItemId` |
| E8 | GET | `/api/subastas/:auctionId/items` | Optional | assigned item visible |

**Submit body (minimal):**

```json
{
  "nombre": "Reloj",
  "descripcion": "Estado excelente",
  "declaracionPropiedad": true,
  "declaracionSinImpedimentos": true,
  "origenLicitoDeclarado": true,
  "fotos": ["<base64 x6>"]
}
```

**Assign body:**

```json
{
  "auctionId": 1,
  "basePrice": 500,
  "commissionPercent": 10
}
```

---

## 6. Expected business errors

| Code | How to trigger | HTTP |
| ---- | -------------- | ---- |
| `USER_NOT_ADMITTED` | Bid before admit | 403 |
| `CATEGORY_NOT_ALLOWED` | Bid on premium auction with low category | 403 |
| `PAYMENT_METHOD_NOT_VERIFIED` | Bid with pending PM | 403 |
| `LIVE_SESSION_REQUIRED` | Bid without live session | 403 |
| `BID_TOO_LOW` / `BID_TOO_HIGH` | Amount outside limits | 409 |
| `GUARANTEE_LIMIT_EXCEEDED` | Cheque bid over disponible | 409 |
| `ITEM_ALREADY_FINALIZED` | Second close on same item | 409 |
| `COMPANY_CLIENT_ID_REQUIRED` | Close with no bids, no env | 409 |
| `INSUFFICIENT_PHOTOS` | Accept/submit with &lt;6 photos | 400 |
| `REJECTION_NOT_SUPPORTED_BY_SCHEMA` | POST rechazar | 409 |
| `TERMS_ACCEPTANCE_NOT_SUPPORTED_BY_SCHEMA` | Owner terms endpoints | 409 |
| `ITEM_ALREADY_ASSIGNED` | Second assign | 409 |
| `PASSWORD_RESET_NOT_IMPLEMENTED` | Forgot/reset | 501 |

---

## 7. Known limitations

- Professor `schema.sql` only — no new tables/columns in TP delivery.
- Live session **in-memory** (`NO_PERSISTED_LIVE_SESSION`) — restart API → re-enter live.
- No WebSocket/SSE — poll `GET .../live`.
- Featured auctions **derived** (`DERIVED_FEATURED_AUCTIONS`).
- Item rejection / owner terms **not persistible** in schema.
- Submission status **derived** from `disponible` + catalog assignment.
- No debt/fine subsystem; no insurance/storage in this delivery.
- Forgot/reset password not implemented.

---

## 8. Defense notes

1. Start with **health** and **auth** — show JWT and admission are server-enforced.
2. Show **payment verification** before bidding.
3. Demo **live state** returning `minNextBid`/`maxNextBid` matching bid validation.
4. Close item **server-side** winner from `pujos`; show **result** endpoint.
5. Demo **item submission** with 6 photos and **honest 409** on reject.
6. Explain limitations come from **original academic schema**, not missing backend effort — unsupported states are not faked.

---

## Postman

Import [`../postman/CrownBid-Final-Demo.postman_collection.json`](../postman/CrownBid-Final-Demo.postman_collection.json). Set collection variables after login steps.
