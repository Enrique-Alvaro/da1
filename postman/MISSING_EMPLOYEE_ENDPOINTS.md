# Missing Employee Endpoints

Endpoints expected for employee/operator workflows but **not implemented** in the current CrownBid API (as of this audit).

## Warehouse / deposit location

| Expected capability | Status |
|---------------------|--------|
| Assign `depositoUbicacion` to a consigned product | **Missing** — field exists in DB (`dbo.productos.depositoUbicacion`) and is returned in submission/detail mappers, but no `PATCH`/`POST` admin route updates it |
| Update warehouse/deposit location | **Missing** |
| List warehouses | **Missing** — `sectores` CRUD exists but is unrelated to product deposit assignment |

**Workaround:** direct SQL update on `dbo.productos.depositoUbicacion`.

## Insurance policy

| Expected capability | Status |
|---------------------|--------|
| Assign insurance policy number (`productos.seguro`) | **Missing** |
| Update insurance company (`dbo.seguros`) | **Missing** |
| Link policy to consigned item via API | **Missing** |

**Workaround:** direct SQL on `dbo.productos.seguro` and `dbo.seguros`.

## Article rejection

| Expected capability | Status |
|---------------------|--------|
| `POST /api/admin/productos/solicitudes/:id/rechazar` | **Exists but returns 409** `REJECTION_NOT_SUPPORTED_BY_SCHEMA` |
| `POST /api/admin/items/submissions/:id/reject` | **Same 409** |
| Legacy `POST /api/admin/productos/:id/decision` with `reject` | May work via legacy flow — prefer testing against pending legacy rows |

## Bids (employee operations)

| Expected capability | Status |
|---------------------|--------|
| List bids as employee | **Client-only** — `GET /api/subastas/:id/pujos/history` returns **403** for `empleado` |
| Place bid as employee | **Client-only** — `POST /api/subastas/:id/pujos` returns **403** |
| Live auction operator console | **Client-only** — `GET /api/subastas/:id/live` returns **403** |

## Auction lifecycle

| Expected capability | Status |
|---------------------|--------|
| Delete/cancel auction | **Missing** |
| Dedicated “change status” endpoint | **Partial** — use `PATCH /api/admin/subastas/:id` with `estado` (`abierta` \| `carrada`) |
| Close entire auction in one call | **Missing** — only per-item close: `POST /api/subastas/:id/items/:itemId/cerrar` |

## Employee profile / session

| Expected capability | Status |
|---------------------|--------|
| `GET /api/users/me` for employee | **Not usable** — returns **401** (JWT `sub` is employee id, not `personas` id) |
| `GET /api/users/me/metrics` | **403** for employees |
| Dedicated `GET /api/empleados/me` | **Missing** — use `GET /api/empleados/:id` with known `employee_id` |
| Refresh token | **Missing** — stateless JWT only; re-login via `POST /api/auth/employee/login` |

## Item images (employee upload)

| Expected capability | Status |
|---------------------|--------|
| Upload photos to existing product | **Missing** — photos are created during client submission |
| Employee associate/replace images | **Missing** — read-only `GET /api/productos/:id/photos/:photoId` |

## Inspection / review status

| Expected capability | Status |
|---------------------|--------|
| Request inspection workflow | **Missing** |
| Separate inspection status field API | **Missing** — review is modeled via submission `status` and legacy `revision` list |
| Employee notes on submission (standalone) | **Partial** — `notes` on accept endpoint only |

## Post-auction payments (employee)

| Expected capability | Status |
|---------------------|--------|
| List all winners for an auction | **Missing** — per-item `GET .../resultado` only |
| Update payment/shipping as employee | **Missing** |
| Payment summary across auction | **Missing** |

## User blocking

| Expected capability | Status |
|---------------------|--------|
| Block/reject user beyond admission | **Partial** — `PATCH /api/admin/clientes/:id/admitir` with `admitido: "no"` only |
