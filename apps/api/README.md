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

Ver `.env.example`. **Phase 1** exige `SQLSERVER_CONNECTION_STRING` (o `DATABASE_URL` como alias). Opcional: JWT, SMTP, `FRONTEND_URL` para fases siguientes.

## Endpoints públicos (Phase 1)

- `GET /health`, `GET /api/health` — estado del proceso
- `GET /api/health/db` — `SELECT 1` contra SQL Server (`503` si no hay conexión)

Rutas Auth/Users montadas con **501 Not Implemented** hasta Phase 2 — ver `docs/auth-phase-1-foundation.md`.

## Contrato API

Documentación en `../../docs/api/api-docs.md`.
