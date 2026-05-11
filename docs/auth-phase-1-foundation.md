# Auth Phase 1 — Backend API Foundation

## 1. Executive summary

**Status:** **PHASE_1_READY_FOR_PHASE_2**

Express está cableado, configuración centralizada, pool SQL Server, health checks y placeholders 501 para Auth/Users sin lógica de negocio. Build y typecheck pasan.

---

## 2. What was implemented

### Created / updated

| Path | Role |
|------|------|
| `apps/api/src/server.ts` | Bootstrap: `loadEnv`, intento de pool DB, `listen`, SIGINT/SIGTERM |
| `apps/api/src/app.ts` | Factory Express: JSON, logger, `/health`, `/api`, 404, error handler |
| `apps/api/src/config/env.ts` | Carga y validación con Zod; `sqlServerConnectionString` resuelto |
| `apps/api/src/db/sqlServer.ts` | `getSqlPool`, `closeSqlPool`, `testSqlConnection` |
| `apps/api/src/routes/index.ts` | Router `/api`: auth + users |
| `apps/api/src/modules/health/*` | Health HTTP + DB probe |
| `apps/api/src/modules/auth/*` | Rutas + controllers placeholder; service/repository/schemas stub |
| `apps/api/src/modules/users/*` | `GET /me` placeholder; service/repository stub |
| `apps/api/src/shared/errors/*` | `AppError`, errores HTTP, middleware global |
| `apps/api/src/shared/middlewares/*` | Logger, 404 |
| `apps/api/src/shared/utils/asyncHandler.ts` | Wrapper async → `next(err)` |
| `apps/api/package.json` | Scripts reales + deps `express`, `zod` |
| `apps/api/tsconfig.json` | CommonJS + `strict` |
| `apps/api/.env.example` | Variables Phase 1 + futuras |
| `apps/api/scripts/test-db-connection.ts` | Usa `loadEnv()` / `sqlServerConnectionString` |
| `apps/api/README.md` | Actualizado |

---

## 3. Backend structure

```
apps/api/src/
  server.ts
  app.ts
  config/
    env.ts
  db/
    sqlServer.ts
  routes/
    index.ts
  modules/
    auth/
      auth.routes.ts
      auth.controller.ts
      auth.service.ts
      auth.repository.ts
      auth.schemas.ts
    users/
      users.routes.ts
      users.controller.ts
      users.service.ts
      users.repository.ts
    health/
      health.routes.ts
      health.controller.ts
  shared/
    errors/
      AppError.ts
      httpErrors.ts
      errorMiddleware.ts
    middlewares/
      notFoundMiddleware.ts
      requestLogger.ts
    responses/
      apiResponse.ts
    utils/
      asyncHandler.ts
```

---

## 4. Environment variables

### Required (Phase 1)

| Variable | Purpose |
|----------|---------|
| `SQLSERVER_CONNECTION_STRING` | Cadena ADO para `mssql` |
| `DATABASE_URL` | Alias opcional si la anterior no está definida |

Also parsed: `NODE_ENV`, `PORT` (default `3000`).

### Optional (Phase 2+)

| Variable | Purpose |
|----------|---------|
| `JWT_SECRET`, `JWT_EXPIRES_IN` | Tokens |
| `BCRYPT_SALT_ROUNDS` | Hash de contraseñas |
| `SMTP_*`, `FRONTEND_URL` | Email y enlaces |

---

## 5. Database connection

- **Module:** `src/db/sqlServer.ts`
- **Pool:** singleton `mssql` via `sql.connect(connectionString)`
- **Startup:** `server.ts` intenta `getSqlPool()`; si falla, el proceso **sigue** y `/api/health/db` devolverá `503`
- **CLI test:** `npm run db:test` (usa la misma cadena resuelta por `env.ts`)

---

## 6. Public health endpoints

| Method | Path | Behavior |
|--------|------|----------|
| GET | `/health` | JSON `status`, `service`, `environment`, `timestamp` |
| GET | `/api/health` | Igual que arriba |
| GET | `/api/health/db` | `200` si `SELECT 1` OK; `503` si no hay conexión o query falla (sin exponer credenciales) |

---

## 7. Placeholder Auth/Users endpoints (501)

Montados bajo prefijo `/api`:

| Method | Path | Phase 2 |
|--------|------|---------|
| POST | `/api/auth/register` | Registro + email clave temporal |
| POST | `/api/auth/login` | Login + JWT |
| POST | `/api/auth/change-initial-password` | Cambio clave inicial |
| POST | `/api/auth/logout` | Revocación / blacklist |
| GET | `/api/users/me` | Perfil usuario autenticado |

Respuesta tipo:

```json
{
  "error": "NotImplementedError",
  "message": "POST /api/auth/register will be implemented in Phase 2.",
  "statusCode": 501
}
```

---

## 8. Error response contract

```json
{
  "error": "ValidationError",
  "message": "El email es obligatorio",
  "statusCode": 422
}
```

Errores no controlados: `500`, mensaje genérico en producción; en desarrollo se puede incluir `stack` en el JSON.

---

## 9. Validation results

| Command | Result |
|---------|--------|
| `npm install` | OK |
| `npm run typecheck` | OK |
| `npm run build` | OK |
| `npm test` | Placeholder: `No tests configured yet` |
| `npm run dev` | No ejecutado en CI; usar localmente |
| Servidor + `curl /health`, `/api/health` | OK (smoke con `PORT=3999`) |
| `GET /api/health/db` | `503` con credenciales inválidas de prueba (esperado) |

---

## 10. Remaining gaps before Phase 2

- Auditoría de datos reales en SQL Server (Phase 0) sigue pendiente si no se ejecutó en servidor.
- Implementar Auth: bcrypt/argon2, JWT, `revoked_tokens`, flujo registro/login/cambio clave.
- Variables JWT/SMTP aún no validadas obligatoriamente en `env.ts`.
- Suite de tests automatizada no configurada.
- Lint (ESLint) no añadido a propósito en Phase 1.

---

## Definition of Done (Phase 1)

- [x] Express app starts successfully  
- [x] `app.ts` / `server.ts` separados  
- [x] Env centralizado  
- [x] Módulo SQL Server + test seguro  
- [x] Health endpoints  
- [x] Placeholders Auth/Users  
- [x] Error handler con forma estándar  
- [x] 404 JSON  
- [x] Scripts build/typecheck reales  
- [x] Este documento  
- [x] Sin lógica Auth implementada  
- [x] Sin modificación de datos en BD  
