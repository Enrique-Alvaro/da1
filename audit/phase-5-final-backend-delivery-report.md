# Phase 5 — Final Backend Delivery Report

**Date:** 2026-05-23  
**Scope:** Backend only — documentation, manual QA, defense readiness. No DB schema changes. No frontend changes.

---

## 1. Executive summary

| Item | Value |
| ---- | ----- |
| **Final delivery verdict** | `BACKEND_READY_WITH_DOCUMENTED_LIMITATIONS` |
| **Defensible for TP** | Yes |
| **DB changed in Phase 5** | **No** |
| **Frontend changed in Phase 5** | **No** |
| **Typecheck** | Pass |
| **Build** | Pass |
| **Tests** | Pass (157 tests, incl. health smoke) |
| **Lint** | Not configured (`npm run lint` unavailable) |

The backend implements the professor schema flows for auth, admission, payment methods, auctions/live/bidding, closing/result/metrics, and item submission/review/assignment. Unsupported persistence (password reset, rejection reason, owner terms acceptance) returns honest **409/501** codes rather than faking state.

---

## 2. Final route inventory

Base URL: `http://localhost:3000`. Mount prefix: `/api` unless noted.

**Auth legend:** `—` = public; `Bearer` = JWT access token; `Cliente` = `requireClienteAuth`; `Empleado` = `requireEmployeeAuth`; `Op` = `requireOperationalUser` (definitive password).

| Domain | Method | Route | Auth | Role | Implemented | Documented | Notes |
| ------ | ------ | ----- | ---- | ---- | ----------- | ---------- | ----- |
| Health | GET | `/health`, `/api/health` | — | — | Yes | Yes | Process OK |
| Health | GET | `/api/health/db` | — | — | Yes | Yes | 503 if DB down |
| Auth | POST | `/api/auth/register` | — | — | Yes | Yes | 201 client |
| Auth | POST | `/api/auth/login` | — | — | Yes | Yes | JWT or initial password |
| Auth | POST | `/api/auth/employee/login` | — | — | Yes | Yes | Env admin |
| Auth | POST | `/api/auth/change-initial-password` | Bearer initial | Cliente | Yes | Yes | → access JWT |
| Auth | POST | `/api/auth/forgot-password` | — | — | 501 | Yes | `PASSWORD_RESET_NOT_IMPLEMENTED` |
| Auth | POST | `/api/auth/reset-password` | — | — | 501 | Yes | Same |
| Auth | POST | `/api/auth/logout` | Bearer | Any | Yes | Yes | Client-side discard only |
| Users | GET | `/api/users/me` | Bearer | Any | Yes | Yes | Profile |
| Admission | GET | `/api/users/me/status` | Bearer+Op | Cliente | Yes | Yes | `?auctionId=` |
| Admission | GET | `/api/clientes/me/status`, `/api/clients/me/status` | Bearer+Op | Cliente | Yes | Yes | Aliases |
| Admission | GET | `/api/admin/clientes/:id` | Bearer | Empleado | Yes | Yes | |
| Admission | PATCH | `/api/admin/clientes/:id/admitir` | Bearer | Empleado | Yes | Yes | `admitido`, `categoria` |
| Admission | PATCH | `/api/admin/clients/:id/admit` | Bearer | Empleado | Yes | Yes | English alias |
| Payment | GET | `/api/users/me/payment-methods` | Bearer+Op | Cliente | Yes | Yes | |
| Payment | POST | `/api/users/me/payment-methods` | Bearer+Op | Cliente | Yes | Yes | |
| Payment | PATCH | `/api/users/me/payment-methods/:id/disable` | Bearer+Op | Cliente | Yes | Yes | |
| Payment | GET | `/api/admin/payment-methods` | Bearer | Empleado | Yes | Partial | Admin list |
| Payment | PATCH | `/api/admin/payment-methods/:id/verify` | Bearer | Empleado | Yes | Yes | Required to bid |
| Payment | PATCH | `/api/admin/payment-methods/:id/reject` | Bearer | Empleado | Yes | Partial | |
| Auctions | GET | `/api/subastas` | Optional | — | Yes | Yes | `featured`, pagination |
| Auctions | GET | `/api/auctions` | Optional | — | Yes | Yes | English alias |
| Auctions | GET | `/api/subastas/:id` | Optional | — | Yes | Yes | Detail + access flags |
| Auctions | GET | `/api/subastas/:id/items` | Optional | — | Yes | Yes | Catalog items |
| Items | GET | `/api/items/:id` | Optional | — | Yes | Yes | `itemsCatalogo` id |
| Live | POST | `/api/subastas/:id/asistentes` | Bearer+Op | Cliente | Yes | Yes | Register assistant |
| Live | POST | `/api/subastas/:id/live/session` | Bearer+Op | Cliente | Yes | Yes | In-memory session |
| Live | DELETE | `/api/subastas/:id/live/session` | Bearer+Op | Cliente | Yes | Yes | |
| Live | GET | `/api/subastas/:id/live` | Bearer+Op | Cliente | Yes | Yes | min/max bid, finalized |
| Bids | POST | `/api/subastas/:id/pujos` | Bearer+Op | Cliente | Yes | Yes | `itemId`, `amount`, `paymentMethodId` |
| Bids | POST | `/api/auctions/:auctionId/bids` | Bearer+Op | Cliente | Yes | Yes | English alias |
| Bids | GET | `/api/subastas/:id/pujos/history` | Bearer+Op | Cliente | Yes | Yes | |
| Bids | GET | `/api/subastas/:id/bids/history` | Bearer+Op | Cliente | Yes | Yes | Alias |
| Close | POST | `/api/subastas/:id/items/:itemId/cerrar` | Bearer | Empleado | Yes | Yes | Winner server-side |
| Close | POST | `/api/auctions/:auctionId/items/:itemId/close` | Bearer | Empleado | Yes | Yes | English alias |
| Result | GET | `/api/subastas/:id/items/:itemId/resultado` | Bearer | Cliente | Yes | Yes | Hides `paymentMethodId` |
| Result | GET | `/api/auctions/:auctionId/items/:itemId/result` | Bearer | Cliente | Yes | Yes | Alias |
| Metrics | GET | `/api/users/me/metrics` | Bearer | Cliente | Yes | Yes | From `registroDeSubasta` |
| Purchases | GET | `/api/users/me/purchases` | Bearer | Cliente | Yes | Yes | |
| Submission | POST | `/api/productos/solicitudes` | Bearer+Op | Cliente | Yes | Yes | 6+ photos |
| Submission | POST | `/api/productos/submissions`, `/api/items/submissions` | Bearer+Op | Cliente | Yes | Yes | Aliases |
| Submission | GET | `/api/productos/mis-solicitudes` | Bearer+Op | Cliente | Yes | Yes | |
| Submission | GET | `/api/productos/mis-solicitudes/:id` | Bearer+Op | Cliente | Yes | Yes | |
| Submission | POST | `.../aceptar-condiciones`, `.../rechazar-condiciones` | Bearer+Op | Cliente | 409 | Yes | `TERMS_ACCEPTANCE_NOT_SUPPORTED_BY_SCHEMA` |
| Submission | GET | `/api/users/me/item-submissions` | Bearer+Op | Cliente | Yes | Partial | Legacy path |
| Admin review | GET | `/api/admin/productos/solicitudes` | Bearer | Empleado | Yes | Yes | Filters |
| Admin review | GET | `/api/admin/productos/solicitudes/:id` | Bearer | Empleado | Yes | Yes | |
| Admin review | POST | `.../aceptar` | Bearer | Empleado | Yes | Yes | `basePrice`, `commissionPercent` |
| Admin review | POST | `.../rechazar` | Bearer | Empleado | 409 | Yes | `REJECTION_NOT_SUPPORTED_BY_SCHEMA` |
| Admin review | POST | `.../asignar-subasta` | Bearer | Empleado | Yes | Yes | `auctionId` or `catalogId` |
| Admin review | GET/POST | `/api/admin/items/submissions/*` | Bearer | Empleado | Yes | Yes | English aliases |
| Admin legacy | GET/POST/PATCH | `/api/admin/productos/revision`, `decision`, `auction-assignment` | Bearer | Empleado | Yes | Partial | Legacy review API |
| Catalog | GET | `/api/productos`, `/api/productos/:id` | Bearer | Any | Yes | Partial | List/detail |
| Reference | GET/POST/PUT/DELETE | `/api/paises`, `/api/sectores` | Varies | Empleado | Yes | Partial | CRUD reference data |
| Reference | GET | `/api/empleados`, `/api/empleados/:id` | Bearer | Empleado | Yes | Partial | |

Spanish routes (`/api/subastas`, `/api/productos`) are **source of truth** for demo and defense.

---

## 3. Final DoD checklist

See [`docs/demo/backend-final-dod-checklist.md`](../docs/demo/backend-final-dod-checklist.md).

**Summary:** All critical demo areas are `DONE` or `DONE_WITH_LIMITATIONS`. Reject-with-reason and forgot-password are `NOT_SUPPORTED_BY_SCHEMA` with honest API responses.

---

## 4. Documentation updated

| Document | Action |
| -------- | ------ |
| `docs/demo/backend-final-manual-qa.md` | Created — full Flows A–E, errors, defense |
| `docs/demo/backend-final-dod-checklist.md` | Created — DoD table |
| `docs/demo/backend-demo-checklist.md` | Existing; cross-linked in Phase 5 |
| `docs/postman/CrownBid-Final-Demo.postman_collection.json` | Created — 23-step demo flow |
| `docs/swagger.yaml` | Phase 5 note; server URL; no fake endpoints |
| `docs/api/api-docs.md` | Referenced; aligned via prior phases + swagger note |
| `apps/api/README.md` | Demo links (Phase 5 companions) |
| `audit/phase-5-final-backend-delivery-report.md` | This file |
| `apps/api/tests/health.smoke.test.ts` | Added minimal smoke test |

---

## 5. Manual QA readiness

**Demonstrable end-to-end (API only):**

1. Health → register/login → employee admit → client status  
2. Payment method create → employee verify → `canBid`  
3. List auction → live session → bid → history  
4. Employee close → result → metrics/purchases  
5. Item submission (6 photos) → admin accept → assign → item in auction list  

**Required env:** `SQLSERVER_CONNECTION_STRING`, `JWT_SECRET`, `EMPLOYEE_ADMIN_*`, `DEFAULT_REVIEWER_EMPLOYEE_ID`; `COMPANY_CLIENT_ID` for no-bid close.

**Recovery tips:**

- `USER_NOT_ADMITTED` → admit client  
- `PAYMENT_METHOD_*` → verify PM  
- `LIVE_SESSION_REQUIRED` → `POST .../live/session`  
- `COMPANY_CLIENT_ID_REQUIRED` → set env + restart API  
- Live state empty after restart → re-enter session  

**Guide:** [`docs/demo/backend-final-manual-qa.md`](../docs/demo/backend-final-manual-qa.md)  
**Postman:** [`docs/postman/CrownBid-Final-Demo.postman_collection.json`](../docs/postman/CrownBid-Final-Demo.postman_collection.json)

---

## 6. Business rules covered

| Rule | Backend enforced | Evidence | Notes |
| ---- | ---------------- | -------- | ----- |
| Admitted user for bidding | Yes | `pujos.service`, status endpoint | `USER_NOT_ADMITTED` |
| Category access | Yes | Access service | `CATEGORY_NOT_ALLOWED` |
| Verified payment method | Yes | Bid + status | `PAYMENT_METHOD_*` codes |
| Bid min/max | Yes | `computeBidLimits` | `BID_TOO_LOW`, `BID_TOO_HIGH` |
| Premium exception | Yes | Bid limits | Documented in Phase 2 |
| Guarantee limit | Yes | If configured | `GUARANTEE_LIMIT_EXCEEDED` |
| Transaction-safe bidding | Yes | Repository UPDLOCK | Phase 2 |
| Winner server-side on close | Yes | `subastas-closing.service` | No client-supplied winner |
| 6-photo submission | Yes | Zod + service | `INSUFFICIENT_PHOTOS` |
| Admin-only review/assign | Yes | `requireEmployeeAuth` | |
| Duplicate close blocked | Yes | Phase 3 | `ITEM_ALREADY_FINALIZED` |
| Reject not persisted | Honest 409 | Phase 4 | Schema limitation |

---

## 7. Schema compliance

| Check | Result |
| ----- | ------ |
| Migrations added in Phase 5 | **No** |
| Tables/columns altered in Phase 5 | **No** |
| Professor `schema.sql` respected | **Yes** |
| Approved supplemental scripts only | `cliente_credenciales.sql`, `001_medios_pago_subasta_moneda.sql` |

| Limitation | Impact | Handling |
| ---------- | ------ | -------- |
| No password reset table | Forgot/reset → 501 | Documented |
| No rejection reason column | Admin reject → 409 | `REJECTION_NOT_SUPPORTED_BY_SCHEMA` |
| No owner terms acceptance column | Terms endpoints → 409 | `TERMS_ACCEPTANCE_NOT_SUPPORTED_BY_SCHEMA` |
| Live session in memory | Lost on restart | Documented; re-enter session |
| No WebSocket/SSE | Polling live state | Documented |
| No debt/fine subsystem | N/A | Not implemented |
| `COMPANY_CLIENT_ID` env | No-bid close | 409 if missing |

---

## 8. Error contract

Format: `{ "error": { "code": "...", "message": "..." } }` (and optional `details`).

| Code | Typical HTTP | Trigger |
| ---- | ------------ | ------- |
| `USER_NOT_ADMITTED` | 403 | Bid without admission |
| `CATEGORY_NOT_ALLOWED` | 403 | Category mismatch |
| `PAYMENT_METHOD_REQUIRED` | 403 | No PM on bid |
| `PAYMENT_METHOD_NOT_VERIFIED` | 403 | Unverified PM |
| `PAYMENT_METHOD_DISABLED` | 403 | Disabled PM |
| `GUARANTEE_LIMIT_EXCEEDED` | 403 | Guarantee cap |
| `BID_TOO_LOW` / `BID_TOO_HIGH` | 400 | Amount out of range |
| `LIVE_SESSION_REQUIRED` | 403 | Bid without live session |
| `ITEM_NOT_CURRENT` | 409 | Wrong catalog item |
| `ITEM_ALREADY_FINALIZED` | 409 | Re-close |
| `COMPANY_CLIENT_ID_REQUIRED` | 409 | Close no bids |
| `INSUFFICIENT_PHOTOS` | 400 | &lt; 6 photos |
| `REJECTION_NOT_SUPPORTED_BY_SCHEMA` | 409 | Admin reject |
| `TERMS_ACCEPTANCE_NOT_SUPPORTED_BY_SCHEMA` | 409 | Owner terms |
| `PASSWORD_RESET_NOT_IMPLEMENTED` | 501 | Forgot/reset |

Production: no stack traces; SQL errors mapped via error middleware.

---

## 9. Tests and validation

| Command | Result | Notes |
| ------- | ------ | ----- |
| `npm run typecheck` | Pass | `apps/api` |
| `npm run build` | Pass | |
| `npm test` | Pass | 157 tests |
| `npm run lint` | N/A | Not in package.json |

**Coverage highlights (no duplication added):**

| Area | Test file(s) |
| ---- | ------------ |
| Health | `tests/health.smoke.test.ts` |
| Auth | `tests/auth.essential.test.ts` |
| Admission | `tests/client-admission.test.ts` |
| Live/bids | `tests/live-auction-flow.test.ts`, `phase-2-*.test.ts`, `pujos-phase4.test.ts` |
| Closing | `tests/auction-closing-flow.test.ts`, `phase-3-*.test.ts` |
| Submissions | `tests/item-submission-flow.test.ts`, `phase-4-*.test.ts` |

---

## 10. Known limitations

- Password reset not implemented (501).  
- Live sessions are in-process memory only.  
- Featured auctions are derived (`DERIVED_FEATURED_AUCTIONS`), not a DB flag.  
- Admin reject and owner terms acceptance cannot persist.  
- Commission/shipping fields limited by schema/product model.  
- Metrics/purchases lack persisted `finalizedAt` on all paths.  
- Swagger documents critical paths; full CRUD reference routes may be partial — use this report + manual QA as source of truth for demo.

---

## 11. Defense recommendations

1. **Open with health + auth** — show JWT and employee vs client roles.  
2. **Admission + payment** — demonstrate `canBid` gates with real error codes.  
3. **Auction flow** — list → live session → valid/invalid bid → history.  
4. **Closing** — employee close, result, metrics; mention `COMPANY_CLIENT_ID` for no-bid case.  
5. **Submissions** — 6-photo validation, admin accept/assign, show item in catalog.  
6. **Limitations honestly** — professor schema constraints; backend does not fake unsupported state.  
7. **Point to docs** — `backend-final-manual-qa.md`, Postman collection, this report.

---

## 12. Final verdict

| Dimension | Status |
| --------- | ------ |
| Backend readiness | **Ready with documented limitations** |
| Demo readiness | **Yes** (with DB seed + env) |
| Documentation readiness | **Yes** |
| Remaining risks | Live session lost on restart; demo data dependency; no password reset for defense Q&A |

**Recommended next step:** Frontend/mobile integration using Spanish routes and documented error codes; manual QA script as acceptance checklist for integrated demo.
