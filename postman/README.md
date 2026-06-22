# CrownBid Employee API — Postman

Postman collection for every backend endpoint accessible to the **empleado** (employee/operator) role.

## Files

| File | Purpose |
|------|---------|
| `employee-api.postman_collection.json` | Request collection |
| `employee-api.postman_environment.json` | Environment variables |
| `MISSING_EMPLOYEE_ENDPOINTS.md` | Expected features without API routes |
| `generate-employee-collection.mjs` | Regenerates JSON from source (optional) |

## Import into Postman

1. Open Postman → **Import**.
2. Select both `employee-api.postman_collection.json` and `employee-api.postman_environment.json`.
3. In the environment dropdown (top right), choose **CrownBid Employee API**.
4. Confirm `base_url` matches your API (default `http://localhost:3000/api`).

## Configure `base_url`

| Environment | `base_url` | `server_root` |
|-------------|------------|---------------|
| Local API | `http://localhost:3000/api` | `http://localhost:3000` |
| Docker host | `http://127.0.0.1:3000/api` | `http://127.0.0.1:3000` |

Health requests use `server_root` because `/health` is mounted outside `/api`.

## Employee login and token

1. Ensure API is running (`npm run dev:api`).
2. Set in `apps/api/.env`:
   - `EMPLOYEE_ADMIN_EMAIL`
   - `EMPLOYEE_ADMIN_PASSWORD`
   - `EMPLOYEE_ADMIN_ID` (must exist in `dbo.empleados`)
3. Run **1. Auth → Employee Login**.
4. Tests save `access_token` (and `employee_id`) to the environment automatically.
5. All other folders inherit collection Bearer auth: `Authorization: Bearer {{access_token}}`.

There is **no refresh token** in this API. When JWT expires, run Employee Login again.

Default credentials (from `.env.example`): `admin@crownbid.local` / `EmpleadoAdmin2026!`

## Recommended execution order

1. **11. Health / Debug** — confirm API + DB are up.
2. **1. Auth → Employee Login** — stores `access_token`.
3. **2. Employee / Profile → Get Current Employee (me)** — validates employee session.
4. **3. Auctions → List Auctions** — sets `auction_id` from first result (or create one).
5. **5. Submitted Articles → List Submissions** — sets `article_id`.
6. **5. Submitted Articles → Get Submission Detail** — sets `image_id` from first photo.
7. **5. Accept Submission** → **Assign Submission to Auction** (needs valid pending/accepted row).
8. **8. Warehouse / Insurance** — assign deposit + insurance on accepted product.
9. **3. List Auction Catalog Items** — sets `item_id`.
10. **4. Bids** — read-only bid history / live state for operators.
11. **7. Clients** — list/admit clients (`client_id`).
12. **9. Payment Methods** — verify/reject (`payment_method_id`).
13. **3. Close Auction Item** / **10. Post-auction** — needs live auction data and bids (client-side).

## Environment variables

| Variable | Set by | Usage |
|----------|--------|-------|
| `base_url` | Manual | API prefix for all requests |
| `server_root` | Manual | Health checks |
| `access_token` | Login test | Bearer auth |
| `refresh_token` | — | Not used (no refresh flow) |
| `employee_email` / `employee_password` | Manual | Login body |
| `employee_id` | Login / list empleados | `GET /empleados/:id` |
| `auction_id` | Create/list auctions | Admin + catalog paths |
| `article_id` | Submissions list | Product/submission review |
| `item_id` | Auction items list | Close/result paths |
| `client_id` / `user_id` | Client list | Admission endpoints |
| `image_id` | Submission detail | Product photo GET |
| `payment_method_id` | Payment methods list | Verify/reject |
| `bid_id` | — | No employee bid endpoints |
| `category_id` | Manual | Demo country PK (`paises.numero`) |
| `warehouse_id` | Manual | Demo sector id (`sectores.identificador`) |
| `insurance_policy_id` | — | No API endpoint |

## Role / permission assumptions

- **Single operator role:** JWT `role: "empleado"`. There is no separate `admin` role in code.
- **`/api/admin/*`:** All routes use `requireEmployeeAuth` — employees and “admin” operators share the same surface.
- **Client-only routes:** Bidding, live auction, notifications, client profile, and client submissions return **403** for employee tokens (`requireClienteAuth`).
- **`/api/users/me`:** Not for employees — returns **401** even with valid employee JWT.
- **Public reads:** `GET /subastas`, `GET /items/:id` work without token (`optionalAuth`).
- **English aliases:** `/api/auctions/*` and `/api/admin/items/submissions/*` mirror Spanish routes; collection uses Spanish paths by default.

## Missing endpoints

See [MISSING_EMPLOYEE_ENDPOINTS.md](./MISSING_EMPLOYEE_ENDPOINTS.md). Summary of what was added in the latest backend pass:

- `GET /api/empleados/me`
- `PATCH /api/admin/productos/:id/deposito`
- `PATCH /api/admin/productos/:id/seguro`
- Fixed `POST .../rechazar` (migration 006)
- `PATCH /api/admin/subastas/:id/estado`
- Employee read-only `GET .../pujos/history` and `GET .../live`

Still deferred: image upload by employee, auction delete, bulk winners list, payment/shipping updates.

Apply migration before testing rejection:

```bash
sqlcmd -S localhost,1433 -d CrownBid -U sa -P "<password>" -C \
  -i database/migrations/006_productos_rejection_review.sql
```

## Regenerate collection

```bash
node postman/generate-employee-collection.mjs
```

## Related collections

Older partial collections live in `docs/postman/` (client auth, payment methods, bids). This employee collection is the authoritative operator set for current routes.
