# @crownbid/api

Backend REST CrownBid (Node.js + Express + TypeScript).

## Scripts

| Script | Descripción |
|--------|-------------|
| `npm run dev` | Servidor con recarga (`tsx watch`) |
| `npm run build` | Compila a `dist/` |
| `npm start` | Ejecuta `dist/server.js` |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run db:test` | Prueba de conexión SQL Server (CLI) |

## Variables de entorno

Ver `.env.example`. **Phase 1** exige `SQLSERVER_CONNECTION_STRING` (o `DATABASE_URL` como alias). **Phase 3** requiere `JWT_SECRET` para emitir tokens en login (en producción el arranque falla si falta). `JWT_EXPIRES_IN` es opcional (por defecto `15m` en código). SMTP y `FRONTEND_URL` siguen siendo para registro u otras fases.

## Endpoints públicos

- `GET /health`, `GET /api/health` — estado del proceso
- `GET /api/health/db` — `SELECT 1` contra SQL Server (`503` si no hay conexión)
- `POST /api/auth/register` — registro (Phase 2; ver `docs/auth-phase-2-register.md`)
- `POST /api/auth/login` — login + JWT (Phase 3; ver `docs/auth-phase-3-login.md`)
- `POST /api/auth/change-initial-password` — primera contraseña definitiva + JWT `access` (Phase 4; ver `docs/auth-phase-4-change-initial-password.md`)

Aún **501**:

- `POST /api/auth/logout`
- `GET /api/users/me`

## Contrato API

Documentación en `../../docs/api/api-docs.md`.
