# Phase 2 — Auction Live Bidding Hardening Report

## 1. Executive summary

**Final status:** `PHASE_2_AUCTION_FLOW_HARDENED_WITH_LIMITATIONS`

**What was fixed**

- Deterministic current catalog item (`pickCurrentItemId` by `identificador ASC`, skip sold).
- Public eligibility codes (`USER_NOT_AUTHENTICATED` alias of internal `AUTH_REQUIRED`; `USER_NOT_ADMITTED` on bids).
- `minNextBid` / `maxNextBid` aligned between `GET .../live` and `POST .../pujos` via shared `computeBidLimits` + `roundMoney`.
- Live `lastBids[].isWinning` and bid history `isWinning` based on highest amount (not newest row).
- Bid only on current live item (`ITEM_NOT_CURRENT`).
- `itemCount` on auction list/detail; `DERIVED_FEATURED_AUCTIONS` in list meta.
- Live state exposes `canAccess`, `currentHighestBid`, `schemaLimitations`.

**What remains limited**

- Live session in process memory only (`NO_PERSISTED_LIVE_SESSION`).
- No WebSocket/SSE; polling on `GET .../live`.
- No DB column for featured auctions (`DERIVED_FEATURED_AUCTIONS`).
- Current item is derived, not stored (`NO_CURRENT_ITEM_FIELD`).
- Guarantee rules only where `mediosPago` schema supports them (`PARTIAL_GUARANTEE_SUPPORT`).

**Database changed:** **No** (no migrations, tables, or columns added).

---

## 2. Route map

| Method | Route | Auth | Purpose | Status |
| ------ | ----- | ---- | ------- | ------ |
| GET | `/api/subastas` | Optional | List auctions (`?featured`, `status`, `category`) | OK |
| GET | `/api/auctions` | Optional | English alias — same handlers | OK |
| GET | `/api/subastas/:id` | Optional | Auction detail + eligibility | OK |
| GET | `/api/auctions/:auctionId` | Optional | English alias | OK |
| GET | `/api/subastas/:id/items` | Optional | Catalog items (`basePrice` if JWT cliente) | OK |
| GET | `/api/auctions/:auctionId/items` | Optional | English alias | OK |
| GET | `/api/items/:id` | Optional | Item detail (`itemsCatalogo.identificador`) | OK |
| POST | `/api/subastas/:id/live/session` | Cliente operativo | Enter in-memory live session | OK |
| DELETE | `/api/subastas/:id/live/session` | Cliente operativo | Leave session (idempotent) | OK |
| GET | `/api/subastas/:id/live` | Cliente operativo | Live state + bid limits | OK |
| POST | `/api/subastas/:id/pujos` | Cliente operativo | Place bid | OK |
| POST | `/api/auctions/:auctionId/bids` | Cliente operativo | English alias | OK |
| GET | `/api/subastas/:id/pujos/history` | Cliente operativo | Bid history (newest first) | OK |
| GET | `/api/subastas/:id/bids/history` | Cliente operativo | Alias | OK |
| GET | `/api/auctions/:auctionId/bids/history` | Cliente operativo | English alias | OK |
| POST | `/api/subastas/:id/asistentes` | Cliente operativo | Register attendee | OK |
| POST | `/api/subastas/:id/items/:itemId/cerrar` | Empleado | Close item (existing flow) | OK |
| GET | `/api/subastas/:id/items/:itemId/resultado` | Bearer | Result (existing flow) | OK |
| GET | `/api/users/me/metrics` | Bearer | User metrics (bidding-related) | OK |

Spanish routes are source of truth; English paths reuse the same controllers/services.

---

## 3. Business rules verified

| Rule | Endpoint/service | Status | Notes |
| ---- | ---------------- | ------ | ----- |
| Featured list without DB column | `listAuctions` | OK | `DERIVED_FEATURED_AUCTIONS`, limit 6 |
| Empty list → `[]` | `GET /subastas` | OK | No 500 on empty |
| Eligibility on detail | `getAuctionDetail` + `evaluateAuctionAccess` | OK | `canBid`, `cannotBidReason` |
| Category gate | `assertCategoryAllowed` / access | OK | `CATEGORY_NOT_ALLOWED` |
| Admission gate | `assertCanBid` | OK | `USER_NOT_ADMITTED` |
| Verified payment for bid | `assertPaymentMethodForBid` | OK | `PAYMENT_METHOD_*` codes |
| Live session before bid | `assertLiveSessionForBid` | OK | `LIVE_SESSION_REQUIRED` |
| One active session per process | `live-session.store` | OK | `LIVE_SESSION_OTHER_AUCTION` |
| Current item selection | `pickCurrentItemId` | OK | First unsold by id ASC |
| Bid on current item only | `assertCanBid` | OK | `ITEM_NOT_CURRENT` |
| Min/max bid (común) | `computeBidLimits` + `validateBidAmountRules` | OK | +1% / +20% of base, rounded |
| Premium no max | `isPremiumAuctionCategory` | OK | `maxNextBid: null` |
| Live vs bid limits match | `getLiveAuctionState` / `createBid` | OK | Shared `computeBidLimits` |
| History newest first | `getBidHistory` | OK | `order: newest_first` |
| Winning flag in history | `getBidHistory` | OK | Highest amount wins |
| Transaction safety on insert | `insertBidInTransaction` | OK | Unchanged UPDLOCK path |

---

## 4. Error handling

| Error case | Error code | HTTP status | Endpoint |
| ---------- | ---------- | ----------- | -------- |
| Not authenticated | `USER_NOT_AUTHENTICATED` (public) / `UNAUTHENTICATED` | 401 | Bid, live |
| Not admitted | `USER_NOT_ADMITTED` | 403 | Bid, asistentes |
| Category denied | `CATEGORY_NOT_ALLOWED` | 403 | Bid, live access |
| Payment missing | `PAYMENT_METHOD_REQUIRED` | 403 | Bid (via eligibility) |
| Payment not verified | `PAYMENT_METHOD_NOT_VERIFIED` | 403 | Bid |
| Payment disabled | `PAYMENT_METHOD_DISABLED` | 403 | Bid |
| Currency mismatch | `PAYMENT_METHOD_CURRENCY_MISMATCH` | 403 | Bid |
| Guarantee exceeded | `GUARANTEE_LIMIT_EXCEEDED` | 403 | Bid (cheque) |
| Auction closed | `AUCTION_NOT_OPEN` | 409 | Bid, live enter |
| Auction not found | `AUCTION_NOT_FOUND` | 404 | Detail, bid |
| Item not found | `ITEM_NOT_FOUND` | 404 | Bid |
| Wrong current item | `ITEM_NOT_CURRENT` | 409 | Bid |
| Bid too low | `BID_TOO_LOW` | 409 | Bid |
| Bid too high | `BID_TOO_HIGH` | 409 | Bid (non-premium) |
| Live session required | `LIVE_SESSION_REQUIRED` | 403 | Bid |
| Other auction session | `LIVE_SESSION_OTHER_AUCTION` | 409 | Live enter / bid |
| Concurrent bid | `BID_CONFLICT` | 409 | Bid (transaction) |

---

## 5. Schema limitations

| Requirement | Current support | Implemented behavior | Limitation label |
| ----------- | --------------- | -------------------- | ---------------- |
| Featured flag in DB | No column | Open/upcoming auctions, date order, limit 6 | `DERIVED_FEATURED_AUCTIONS` |
| Persisted live session | No table | In-memory map per API process | `NO_PERSISTED_LIVE_SESSION` |
| Current item pointer | No column | First unsold catalog row by id | `NO_CURRENT_ITEM_FIELD` |
| Cheque guarantee | `mediosPago` migration | Validated when `montoDisponible` present | `PARTIAL_GUARANTEE_SUPPORT` |
| Real-time push | N/A | Poll `GET .../live` | `SCHEMA_LIMITATION` (no WS/SSE) |
| Auction title/thumbnail | Limited in `subastas` | Location, category, date; images via items | `SCHEMA_LIMITATION` |

**Item ID semantics:** `itemId` in bids and `GET /api/items/:id` = `itemsCatalogo.identificador` (not `productos.identificador`).

---

## 6. Tests added/updated

| Test file | Scenario | Result |
| --------- | -------- | ------ |
| `tests/phase-2-auction-live-bidding-hardening.test.ts` | Listing, eligibility, limits alignment, ITEM_NOT_CURRENT | Pass |
| `tests/live-auction-flow.test.ts` | Featured meta, pickCurrentItemId, live session | Pass (updated) |
| `tests/pujos-phase4.test.ts` | USER_NOT_ADMITTED, catalog mock for assertCanBid | Pass (updated) |
| `tests/client-admission.test.ts` | assertCanBid with catalog mock | Pass (updated) |

**Total:** 141 tests passing.

---

## 7. Documentation updated

- `audit/phase-2-auction-live-bidding-hardening-report.md` (this file)
- `apps/api/README.md` — Phase 2 hardening notes, error codes
- `docs/demo/backend-demo-checklist.md` — demo fields and troubleshooting

---

## 8. Validation commands

Run from `apps/api`:

```bash
npm run typecheck
npm run build
npm test
```

| Command | Result |
| ------- | ------ |
| `npm run typecheck` (apps/api) | Pass |
| `npm run build` (apps/api) | Pass |
| `npm test` (apps/api) | Pass — 141 tests |
| `npm run typecheck` (monorepo root) | N/A — script only in `@crownbid/api` |

---

## 9. Known limitations

1. Restarting the API clears live sessions; clients must re-enter before bidding.
2. No WebSocket/SSE — mobile should poll `GET .../live`.
3. Featured auctions are heuristic, not editorial.
4. `GET /subastas` with many rows issues one `itemCount` query per auction (acceptable for demo scale).
5. Requires migration `001_medios_pago_subasta_moneda.sql` + `cliente_credenciales.sql` for payment and currency features.

---

## 10. Recommended next phase

**Phase 3 — Operational polish (backend):** insurance/storage flows if schema allows; Swagger/Postman full sync; optional password reset on `cliente_credenciales`; admin reporting endpoints. Alternatively, **frontend/mobile integration** against hardened contracts with E2E against seeded DB.
