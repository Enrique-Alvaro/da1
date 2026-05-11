# @crownbid/api

Backend REST CrownBid (Node.js + Express + TypeScript).

## Scripts

| Script | Descripción |
|--------|-------------|
| `npm run dev` | Servidor con recarga (`tsx watch`) |
| `npm run build` | Compila a `dist/` |
| `npm start` | Ejecuta `dist/server.js` |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest — tests esenciales Auth (`tests/auth.essential.test.ts`) |
| `npm run db:test` | Prueba de conexión SQL Server (CLI) |

## Variables de entorno

Ver `.env.example`. **Phase 1** exige `SQLSERVER_CONNECTION_STRING` (o `DATABASE_URL` como alias). **Phase 3** requiere `JWT_SECRET` para emitir tokens en login (en producción el arranque falla si falta). `JWT_EXPIRES_IN` es opcional (por defecto `15m` en código). **Phase 7** usa `FRONTEND_URL` (obligatorio en producción para forgot-password), `PASSWORD_RESET_TOKEN_TTL_MINUTES` (opcional, default 30 en código) y SMTP para correo real.

## Endpoints públicos

- `GET /health`, `GET /api/health` — estado del proceso
- `GET /api/health/db` — `SELECT 1` contra SQL Server (`503` si no hay conexión)
- `POST /api/auth/register` — registro (Phase 2; ver `docs/auth-phase-2-register.md`)
- `POST /api/auth/login` — login + JWT (Phase 3; ver `docs/auth-phase-3-login.md`)
- `POST /api/auth/change-initial-password` — primera contraseña definitiva + JWT `access` (Phase 4; ver `docs/auth-phase-4-change-initial-password.md`)
- `GET /api/users/me` — perfil autenticado (**Bearer** tipo `access`; Phase 5; ver `docs/auth-phase-5-users-me.md`)
- `POST /api/auth/logout` — revoca el JWT actual por `jti` (**Bearer** tipo `access`; Phase 6; ver `docs/auth-phase-6-logout.md`)
- `POST /api/auth/forgot-password` — solicitud de restablecimiento (**202** genérico; Phase 7; ver `docs/auth-phase-7-password-recovery.md`)
- `POST /api/auth/reset-password` — nueva contraseña con token de un solo uso (**200** + JWT; Phase 7; mismo doc)

**Cierre Auth (Phase 8):** QA manual y checklist — `docs/auth-phase-8-manual-qa.md`. Resumen para frontend/mobile — `docs/auth-final-summary.md`.

**Endpoints previstos fuera de esta fase:** otros módulos de negocio (pujas, pagos, etc.) según roadmap.

## Auth flow quick check (local)

1. `POST /api/auth/register` → obtener contraseña temporal (mock o email).
2. `POST /api/auth/login` con temporal → `mustChangePassword: true`.
3. `POST /api/auth/change-initial-password` con Bearer (token primer login) → nuevo `accessToken`.
4. `GET /api/users/me` con Bearer (`access`).
5. `POST /api/auth/logout` → **204**; mismo token → **401** revocado.
6. `POST /api/auth/forgot-password` → **202** mensaje genérico.
7. `POST /api/auth/reset-password` con token del correo/mock → sesión **200**.

Validación detallada: `docs/auth-phase-8-manual-qa.md`.

## Contrato API

Documentación en `../../docs/api/api-docs.md`.
