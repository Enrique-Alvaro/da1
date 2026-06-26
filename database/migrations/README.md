# Migraciones SQL Server (CrownBid)

Scripts **aditivos** posteriores a `database/schema.sql` del profesor. Ejecutar en orden numérico sobre una base ya creada con el esquema académico (+ `cliente_credenciales.sql` si aplica).

| Archivo | Descripción |
|---------|-------------|
| `001_medios_pago_subasta_moneda.sql` | Fase 1 — medios de pago, moneda de subasta, índices únicos en `asistentes` |
| `002_notificaciones.sql` | Tabla `notificaciones` |
| `003_password_reset_tokens.sql` | Tokens de restablecimiento de contraseña |
| `004_subastas_hora_fin.sql` | Columna `subastas.horaFin` |
| `005_productos_submission_metadata.sql` | Metadatos de envío en `productos` / `itemsCatalogo` |
| `006_productos_rejection_review.sql` | `motivoRechazo` y `notasRevision` en `productos` |

## Cómo aplicar

Desde la raíz del monorepo (lee `apps/api/.env`):

```bash
npm run db:migrate
```

O manualmente con `sqlcmd` (ajustar servidor y credenciales):

```bash
# Todas en orden ( -I = QUOTED_IDENTIFIER ON, needed for filtered indexes )
for f in database/migrations/00*.sql; do
  sqlcmd -S localhost,1433 -d CrownBid -U sa -P "<password>" -C -I -i "$f"
done
```

**Docker (crownbid-sqlserver):** SQL escucha en `localhost` dentro del contenedor; en el host CrownBid publica **`127.0.0.1:1436`** (no 1433).

```bash
source .env
for file in $(ls -1 database/migrations/00*.sql | sort); do
  docker exec -i crownbid-sqlserver /opt/mssql-tools18/bin/sqlcmd \
    -S localhost -U sa -P "$MSSQL_SA_PASSWORD" -C -I -d CrownBid -b -i /dev/stdin < "$file" || exit 1
done
```

```bash
# Ejemplo (un solo archivo)
sqlcmd -S localhost -d CrownBid -i database/migrations/006_productos_rejection_review.sql
```

O ejecutar el archivo desde SSMS / Azure Data Studio contra la misma BD que usa la API.

## Fase 1 — Qué agrega y por qué

### `subastas.moneda`

- Subastas en **ARS** o **USD** (no bimonetarias).
- Default `ARS` para filas existentes.
- CHECK `('ARS', 'USD')`.

### `mediosPago`

Tabla auxiliar para garantías de pago del **cliente** (`cliente` → `clientes.identificador`).

- **No** reemplaza `clientes.admitido`: la empresa aprueba al postor (`admitido = 'si'`) y por separado verifica cada medio (`estado = 'verificado'`).
- Estados: `pendiente`, `verificado`, `rechazado`, `deshabilitado`.
- Tipos: cuenta/tarjeta nacional o extranjera, cheque certificado.

**Seguridad de datos:** no persistir PAN completo, CVV ni credenciales bancarias sensibles (solo últimos 4 dígitos / alias / CBU parcial según implementación API).

### Índices en `asistentes`

- `UX_asistentes_cliente_subasta`: un cliente no se inscribe dos veces a la misma subasta.
- `UX_asistentes_subasta_numeroPostor`: un número de postor no se repite en la misma subasta.

Soportan la **Opción A** (inscripción explícita antes de pujar).

**Precondición en BD con datos reales:** antes de aplicar `001_*.sql`, verificar que no haya duplicados (la migración no limpia datos). Si alguna consulta devuelve filas, resolver duplicados manualmente antes de crear los índices únicos.

```sql
SELECT cliente, subasta, COUNT(*) AS total
FROM dbo.asistentes
GROUP BY cliente, subasta
HAVING COUNT(*) > 1;

SELECT subasta, numeroPostor, COUNT(*) AS total
FROM dbo.asistentes
GROUP BY subasta, numeroPostor
HAVING COUNT(*) > 1;
```

## Notas para fases posteriores (no implementadas en Fase 1)

### `PATCH disable` de medios (backend)

| Transición | Comportamiento previsto |
|------------|-------------------------|
| `pendiente` → `deshabilitado` | Permitido |
| `verificado` → `deshabilitado` | Permitido |
| `rechazado` → `rechazado` | PATCH disable no cambia el estado (conserva motivo de rechazo) |
| `deshabilitado` → `deshabilitado` | Idempotente éxito |

### Cheque certificado — `montoDisponible`

- En alta (Fase 2): `montoDisponible = montoGarantia` para `cheque_certificado`.
- En pujas (Fase 4): validar `importe <= montoDisponible`; **no descontar** saldo al pujar.
- Descuento de `montoDisponible` solo cuando exista flujo de adjudicación/venta (alcance extendido).

### `personas.estado`

El esquema académico define `CHECK (estado IN ('activo', 'incativo'))`. Antes de bloquear pujas por estado, auditar valores reales en BD. **MVP del guard de pujas:** priorizar `clientes.admitido`, medio verificado, categoría, subasta abierta, asistente y reglas de monto; no asumir bloqueo por `personas.estado` hasta confirmar convención del proyecto.

## Estado del plan

- Tras aplicar `001_*.sql`: base lista para API medios de pago y pujas (Fases 2–4).
- **Fase 5 (cierre backend):** documentación en `docs/payment-methods-backend-closure.md`, checklist `docs/payment-methods-manual-checklist.md`, OpenAPI y Postman actualizados.
