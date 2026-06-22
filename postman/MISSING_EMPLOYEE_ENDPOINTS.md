# Missing Employee Endpoints

Updated after implementing Priority 0/1 employee API endpoints.

## Implemented (no longer missing)

| Capability | Endpoint |
|------------|----------|
| Employee profile | `GET /api/empleados/me` |
| Assign deposit location | `PATCH /api/admin/productos/:id/deposito` |
| Assign insurance policy | `PATCH /api/admin/productos/:id/seguro` |
| Reject submission | `POST /api/admin/productos/solicitudes/:id/rechazar` (requires migration `006_productos_rejection_review.sql`) |
| Auction status change | `PATCH /api/admin/subastas/:id/estado` (also via `PATCH /api/admin/subastas/:id`) |
| Employee read-only bids | `GET /api/subastas/:id/pujos/history`, `GET /api/subastas/:id/live` |

## Still missing / deferred

### Insurance metadata (partial)

| Field | Status |
|-------|--------|
| `descripcion`, `vigenciaDesde`, `vigenciaHasta` in request body | Accepted but **not persisted** — `dbo.seguros` only has `nroPoliza`, `compania`, `polizaCombinada`, `importe` |

### Bids (write)

| Capability | Status |
|------------|--------|
| Employee place bid | **Intentionally client-only** — `POST /api/subastas/:id/pujos` still requires `requireClienteAuth` |

### Auction lifecycle

| Capability | Status |
|------------|--------|
| Delete/cancel auction | **Missing** |
| Close entire auction in one call | **Missing** — use per-item `POST /api/subastas/:id/items/:itemId/cerrar` |

### Employee profile (legacy)

| Capability | Status |
|------------|--------|
| `GET /api/users/me` for employee | **Not usable** (401) — use `GET /api/empleados/me` |
| Refresh token | **Missing by design** — stateless JWT |

### Item images

| Capability | Status |
|------------|--------|
| Employee upload/replace photos | **Deferred** — photos created on client submission; read via `GET /api/productos/:id/photos/:photoId` |

### Inspection workflow

| Capability | Status |
|------------|--------|
| Dedicated inspection status | **Deferred** — use submission `status` + `notasRevision` on reject / `notes` on accept |
| Request inspection endpoint | **Missing** |

### Post-auction payments

| Capability | Status |
|------------|--------|
| List all winners for auction | **Missing** — per-item `GET .../resultado` only |
| Update payment/shipping as employee | **Missing** |

### User blocking

| Capability | Status |
|------------|--------|
| Block beyond admission | **Partial** — `PATCH /api/admin/clientes/:id/admitir` with `admitido: "no"` |

## Database migration required

Apply before rejection works against SQL Server:

```bash
sqlcmd -S localhost,1433 -d CrownBid -U sa -P "<password>" -C \
  -i database/migrations/006_productos_rejection_review.sql
```

Adds `motivoRechazo` and `notasRevision` to `dbo.productos`.
