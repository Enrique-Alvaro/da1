# Phase 3 — Auction Closing Result Hardening Report

## 1. Executive summary

**Final status:** `PHASE_3_CLOSING_FLOW_HARDENED_WITH_LIMITATIONS`

**What was fixed**

- Closing duplicate prevention: existing `registroDeSubasta` → `409 ITEM_ALREADY_FINALIZED` (no second insert).
- No-bid close requires `COMPANY_CLIENT_ID`; missing config → `409 COMPANY_CLIENT_ID_REQUIRED`; invalid company client → `409 COMPANY_CLIENT_NOT_FOUND`.
- API response enrichment: `resultStatus` (`FINALIZED` / `NOT_FINALIZED`), `productTitle`; `finalAmount` null when not finalized.
- GET resultado omits `paymentMethodId` (no sensitive payment leak).
- Live state after close: shows last sold item finalized fields, winner name from profile, `isCurrentUserWinner`.
- Metrics document `WINS_FROM_REGISTRO_ONLY`; purchases add `productTitle`, `finalizedAt: null` with limitations.
- Payment validation on close when `paymentMethodId` is sent (same rules as bidding).

**What remains limited**

- No `finalizedAt` column in schema (derived `new Date().toISOString()` on close only).
- Commission from catalog row, not percentage engine (`NO_COMMISSION_SCHEMA_SUPPORT`).
- No shipping (`NO_SHIPPING_SCHEMA_SUPPORT`).
- Purchase `status: "unknown"` (`NO_PURCHASE_STATUS_SUPPORT`).
- Payment method not stored on `pujos` (`NO_PAYMENT_METHOD_ON_BID`).
- Ownership transfer via `registroDeSubasta` only (`AMBIGUOUS_OWNERSHIP_UPDATE` if expecting `duenios` change).

**Database changed:** **No**

---

## 2. Route map

| Method | Route | Auth | Purpose | Status |
| ------ | ----- | ---- | ------- | ------ |
| POST | `/api/subastas/:id/items/:itemId/cerrar` | Empleado | Close item, persist result | OK |
| POST | `/api/auctions/:auctionId/items/:itemId/close` | Empleado | English alias | OK |
| GET | `/api/subastas/:id/items/:itemId/resultado` | Bearer | Finalization result | OK |
| GET | `/api/auctions/:auctionId/items/:itemId/result` | Bearer | English alias | OK |
| GET | `/api/subastas/:id/live` | Cliente operativo | Live + finalized overlay | OK |
| GET | `/api/users/me/metrics` | Bearer cliente | Bids/wins/attendance | OK |
| GET | `/api/users/me/purchases` | Cliente operativo | Won items from registro | OK |

No `/api/usuarios/me/compras` or `/api/user/me/*` aliases in codebase (only `/api/users/me/*`).

---

## 3. Business rules verified

| Rule | Endpoint/service | Status | Notes |
| ---- | ---------------- | ------ | ----- |
| Employee-only close | `assertEmployeeCanClose` | OK | `NO_PERMISSION_TO_CLOSE_AUCTION` |
| Winner from pujos server-side | `findWinningBidForClose` | OK | Amount DESC, id ASC tie-break |
| Transactional close | `persistItemClose` | OK | UPDLOCK, registro + subastado + ganador |
| No duplicate registro | `persistItemClose` + pre-check | OK | 409 on second POST |
| Company purchase no bids | `closeAuctionItem` | OK | Needs `COMPANY_CLIENT_ID` |
| Optional payment validation | `assertPaymentMethodForBid` on close | OK | Winner-scoped `findByIdAndCliente` |
| Result NOT_FINALIZED | `getItemFinalizationResult` | OK | `resultStatus`, null amounts |
| Live finalized overlay | `getLiveAuctionState` | OK | Last sold item if no current |
| Metrics from registro wins | `users-metrics.repository` | OK | Not from `pujos.ganador` alone |
| Purchases from registro | `users-purchases.repository` | OK | Excludes company client rows |

---

## 4. Result/finalization behavior

**Winner calculation:** `SELECT TOP 1 ... FROM pujos WHERE item = @itemId ORDER BY importe DESC, identificador ASC`.

**No-bid company purchase:** `COMPANY_CLIENT_ID` env → `persistItemClose` with company `cliente`, base price, min commission `0.02`. Without env → `409 COMPANY_CLIENT_ID_REQUIRED`.

**Persistence:** `registroDeSubasta` insert, `itemsCatalogo.subastado = 'si'`, winning `pujos.ganador = 'si'` (others `'no'`).

**Duplicate closing:** Pre-check `findRegistroByProductoAndSubasta` → `409 ITEM_ALREADY_FINALIZED`; transaction also counts existing registro under lock.

**Limitations:** No timestamp column; commission/shipping derived; payment method id only in close response when employee passes body, not stored on bid row.

---

## 5. Error handling

| Error case | Error code | HTTP status | Endpoint |
| ---------- | ---------- | ----------- | -------- |
| Not employee | `NO_PERMISSION_TO_CLOSE_AUCTION` | 403 | POST cerrar |
| Auction missing | `AUCTION_NOT_FOUND` | 404 | cerrar / resultado |
| Item missing | `ITEM_NOT_FOUND` | 404 | cerrar / resultado |
| Already finalized | `ITEM_ALREADY_FINALIZED` | 409 | POST cerrar |
| No company config | `COMPANY_CLIENT_ID_REQUIRED` | 409 | POST cerrar (sin pujas) |
| Company client missing | `COMPANY_CLIENT_NOT_FOUND` | 409 | POST cerrar (sin pujas) |
| Payment not found | `PAYMENT_METHOD_NOT_FOUND` | 404 | POST cerrar |
| Payment not verified | `PAYMENT_METHOD_*` | 409 | POST cerrar |
| Guarantee exceeded | `GUARANTEE_LIMIT_EXCEEDED` | 409 | POST cerrar (cheque) |

---

## 6. Schema limitations

| Requirement | Current support | Implemented behavior | Limitation label |
| ----------- | --------------- | -------------------- | ---------------- |
| Finalized timestamp | No column | ISO string at close time only | `NO_PERSISTED_FINALIZATION_TIMESTAMP` |
| Commission engine | `itemsCatalogo.comision` | Stored on registro | `NO_COMMISSION_SCHEMA_SUPPORT` |
| Shipping | None | Always `0` | `NO_SHIPPING_SCHEMA_SUPPORT` |
| Purchase status | None | `status: "unknown"` | `NO_PURCHASE_STATUS_SUPPORT` |
| Payment on bid row | None | Optional body on close only | `NO_PAYMENT_METHOD_ON_BID` |
| Ownership update | `registroDeSubasta` | No `duenios` transfer | `AMBIGUOUS_OWNERSHIP_UPDATE` |
| Company purchase | Env + `clientes` row | Full registro when configured | `PARTIAL_COMPANY_PURCHASE_SUPPORT` |
| Item sold flag | `itemsCatalogo.subastado` | Set on close | — |
| Guarantee on close | `mediosPago.montoDisponible` | Validated if paymentMethodId sent | `PARTIAL_GUARANTEE_SUPPORT` |

---

## 7. Tests added/updated

| Test file | Scenario | Result |
| --------- | -------- | ------ |
| `tests/auction-closing-flow.test.ts` | Close, company, duplicate, payment, resultStatus | Pass (updated) |
| `tests/phase-3-auction-closing-result-hardening.test.ts` | Live finalized, purchases, metrics, close→result | Pass (new) |

**Total:** 148 tests passing.

---

## 8. Documentation updated

- `audit/phase-3-auction-closing-result-hardening-report.md` (this file)
- `apps/api/README.md` — closing, metrics, purchases
- `docs/demo/backend-demo-checklist.md` — close/result/live steps, COMPANY_CLIENT_ID

---

## 9. Validation commands

From `apps/api`:

```bash
npm run typecheck
npm run build
npm test
```

| Command | Result |
| ------- | ------ |
| `npm run typecheck` | Pass |
| `npm run build` | Pass |
| `npm test` | Pass — 148 tests |

---

## 10. Known limitations

1. `finalizedAt` in API is not durable across DB inspection.
2. Second close after success returns 409 (not idempotent 200).
3. Live shows last sold item when no unsold current item (document for multi-item auctions).
4. Purchases lack payment summary until bid stores payment reference.
5. Insurance/storage/debt flows out of scope.

---

## 11. Recommended next phase

**Phase 4 — API contract & integration polish:** Swagger/Postman sync with Spanish/English routes; optional `/api/clients/me/purchases` alias if mobile expects it; password reset on `cliente_credenciales`; or **mobile E2E** against seeded demo DB.
