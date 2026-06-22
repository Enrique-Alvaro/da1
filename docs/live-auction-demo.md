# Live auction demo scenario

Repeatable **development-only** seed for end-to-end testing of the CrownBid live auction flow (mobile + API).

## Prerequisites

1. SQL Server with `database/schema.sql`, `database/cliente_credenciales.sql`, and migrations `001`–`006` applied.
2. API env configured (`apps/api/.env` with `SQLSERVER_CONNECTION_STRING`).
3. Employee admin in `.env` (`EMPLOYEE_ADMIN_*`) for closing items.

```bash
npm run db:migrate          # from repo root
npm run seed:live-auction-demo
```

Re-running the command **creates a new auction** each time (unique `run id` in ubicación and `DEMO-{runId}-001` piece numbers). **Previous demo auctions are kept** so you can accumulate history.

Demo users (`demo.owner@…`, `demo.competitor@…`) are reused; only a new auction + 3 products are inserted per run.

## Demo users

| Role | Email | Password |
|------|-------|----------|
| Item owner | `demo.owner@crownbid.test` | `Password123!` |
| Competitor (already bidding) | `demo.competitor@crownbid.test` | `Password123!` |

Override password with `SEED_LIVE_DEMO_PASSWORD` in the environment.

Both users are admitted clients (`categoria: comun`). The competitor has a **verified** ARS payment method (`montoGarantia: 500,000`).

## Auction

| Field | Value |
|-------|--------|
| Title (ubicación) | Subasta Demo en Vivo - 10 Minutos |
| Status | `abierta` / API `live` |
| Category | `comun` (1% / 20% bid rules apply) |
| Currency | ARS |
| Duration | ~10 minutes from seed time |
| Items | 3 lots, 6 photos each |

### Lots

1. **DEMO-LOT-001** — Juego de Té Inglés (base ARS 10,000) — **competitor bid ARS 10,100**
2. **DEMO-LOT-002** — Lámpara Art Déco (base ARS 18,000)
3. **DEMO-LOT-003** — Cuadro óleo A. Moretti 1984 (base ARS 25,000)

Deposit (all items): `Depósito Central - Sector A`  
Insurance: `POL-DEMO-2026-001` — Demo Seguros S.A.

Owner receives `submission_custody_updated` notifications (if migration `002` applied).

## Frontend test flow

### 1. Verify countdown and live state

- Open app → home → auction **Subasta Demo en Vivo - 10 Minutos**
- Confirm **Termina en …** countdown (~10 min)
- Open catalog → 3 items

### 2. Outbid competitor (your user)

Use **your own admitted client** with a **verified ARS** payment method.

1. Open item 1 → **Entrar a subasta en vivo**
2. Current highest bid should be **ARS 10,100** (Demo Competitor)
3. Place **ARS 10,200** or higher (max **12,100** with normal rules)
4. You should become highest bidder without false “someone bid higher” errors

Bid math (item 1, base 10,000):

- Min after 10,100: `10,100 + 1% × 10,000 = 10,200`
- Max after 10,100: `10,100 + 20% × 10,000 = 12,100`

### 3. Advance items (employee)

The API has **no automatic lot advance**. After each item finishes, an **employee** must close it:

```http
POST /api/subastas/{auctionId}/items/{itemId}/cerrar
Authorization: Bearer {employeeAccessToken}
Content-Type: application/json

{}
```

Or English route:

```http
POST /api/auctions/{auctionId}/items/{itemId}/close
```

Then the next unsold catalog item becomes **current** (lowest `itemsCatalogo.identificador` with `subastado = no`).

Repeat for items 2 and 3.

### 4. Owner visibility

Login as `demo.owner@crownbid.test`:

- **Mis artículos** → deposit + insurance on each submission
- **Notificaciones** → custody update alerts → tap opens Mis artículos

## Postman / API sequence

1. `POST /api/auth/employee/login` → `access_token`
2. `POST /api/auth/login` as `demo.competitor@crownbid.test` (optional — bid already seeded)
3. `GET /api/subastas?status=live`
4. `GET /api/subastas/{auctionId}`
5. `GET /api/subastas/{auctionId}/items`
6. `GET /api/subastas/{auctionId}/live?itemId={itemId}`
7. Your user: `POST /api/subastas/{auctionId}/asistentes`
8. Your user: `POST /api/subastas/{auctionId}/live/session`
9. Your user: `POST /api/subastas/{auctionId}/pujos` with `{ "itemId", "amount", "paymentMethodId" }`
10. Employee: `POST /api/subastas/{auctionId}/items/{itemId}/cerrar`
11. `GET /api/subastas/{auctionId}/items/{itemId}/resultado`

The seed prints concrete IDs after each run.

## Validation checklist

- [ ] `npm run seed:live-auction-demo` succeeds twice without duplicates
- [ ] Demo users login
- [ ] Auction visible as live with ~10 min countdown
- [ ] 3 items × 6 photos in detail
- [ ] Item 1 shows competitor winning at 10,100
- [ ] Your user can outbid (10,200+)
- [ ] Employee can close item 1 → item 2 becomes current
- [ ] Flow continues through item 3
- [ ] Expired auction rejects new bids
- [ ] Owner sees deposit/insurance; competitor does not see owner-only consignment UI as owner

## Troubleshooting

| Issue | Fix |
|-------|-----|
| No live auction | Re-run seed; check API DB connection matches seed |
| Cannot bid | User admitted? Verified ARS payment method? Entered live session? |
| `LIVE_SESSION_REQUIRED` | Call enter-live endpoint before bidding (app does this automatically) |
| `OWNER_CANNOT_BID` | Do not use `demo.owner@crownbid.test` to bid on own lots |
| Photos missing | Re-run seed (recreates 6 `fotos` rows per product) |
| Notifications missing | Apply migration `002_notificaciones.sql` |
