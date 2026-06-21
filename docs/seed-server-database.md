# Server database seed (CrownBid)

Idempotent TypeScript seed for **production/staging** SQL Server (`CrownBid`).

## What it inserts (only if missing)

| Area | Data |
|------|------|
| `dbo.paises` | Argentina (1), Uruguay, Chile, Brasil, España, USA |
| `dbo.empleados` | Reviewer employee (`DEFAULT_REVIEWER_EMPLOYEE_ID`, default 1) |
| `dbo.subastas` + catalog | One open demo auction (`CrownBid Demo — Buenos Aires`) |
| `dbo.clientes` | Optional buyer `buyer@crownbid.demo` (admitted, platino) |

No `DROP`, `DELETE`, or `TRUNCATE`.

## Prerequisites

- Schema applied: `database/schema.sql`, `database/cliente_credenciales.sql`, migrations `001`–`003`
- Backend env vars for SQL connection (same as API)

## Run on Ubuntu server

```bash
ssh nasser@170.239.85.196 -p 37783
cd /opt/crownbid
git pull origin alvaro-paginas

# Load compose/API env (adjust path if your secrets live elsewhere)
set -a
source .env
set +a

# From host: connect to SQL published on localhost (Docker)
export SQLSERVER_CONNECTION_STRING="Server=127.0.0.1,1433;Database=CrownBid;User Id=sa;Password=${MSSQL_SA_PASSWORD};Encrypt=true;TrustServerCertificate=true"

# Optional: demo buyer password (not committed)
export SEED_DEMO_PASSWORD='ChooseAStrongDemoPassword1!'

npm ci
npm run seed:demo --workspace @crownbid/api
```

Alternative using `DB_*` vars (if `SQLSERVER_CONNECTION_STRING` is unset):

```bash
export DB_HOST=127.0.0.1
export DB_PORT=1433
export DB_NAME=CrownBid
export DB_USER=sa
export DB_PASSWORD="${MSSQL_SA_PASSWORD}"
npm run seed:demo --workspace @crownbid/api
```

## Verify

```sql
-- Countries
SELECT COUNT(*) AS country_count FROM dbo.paises;
SELECT numero, nombre, nombreCorto FROM dbo.paises ORDER BY nombre;

-- Demo buyer
SELECT c.identificador, cc.email, c.admitido, c.categoria
FROM dbo.cliente_credenciales cc
JOIN dbo.clientes c ON c.identificador = cc.persona_id
WHERE cc.email = 'buyer@crownbid.demo';

-- Open auctions
SELECT identificador, fecha, estado, ubicacion, categoria
FROM dbo.subastas
WHERE LOWER(LTRIM(RTRIM(estado))) = N'abierta';

-- Items in demo catalog
SELECT ic.identificador, ic.precioBase, p.descripcionCatalogo, s.ubicacion
FROM dbo.itemsCatalogo ic
JOIN dbo.productos p ON p.identificador = ic.producto
JOIN dbo.catalogos cat ON cat.identificador = ic.catalogo
JOIN dbo.subastas s ON s.identificador = cat.subasta
WHERE s.ubicacion LIKE N'CrownBid Demo%';
```

## API check

```bash
curl -s http://127.0.0.1:3006/api/auth/register/countries | jq
curl -s http://170.239.85.196:3006/api/auth/register/countries | jq
```

Registration from the APK should accept **countryId `1` (Argentina)** after seeding.

## Employee admin

Login empleado uses env (`EMPLOYEE_ADMIN_EMAIL` / `EMPLOYEE_ADMIN_PASSWORD`), not SQL credentials.

## Demo buyer (optional)

If `SEED_DEMO_PASSWORD` was set during seed:

- Email: `buyer@crownbid.demo`
- Password: value of `SEED_DEMO_PASSWORD` (choose at seed time; do not commit)
