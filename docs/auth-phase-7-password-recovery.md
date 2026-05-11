# Auth Phase 7 — Password Recovery

## 1. Executive summary

**Status:** `PHASE_7_READY_FOR_PHASE_8`

Recuperación opcional de contraseña vía **`POST /api/auth/forgot-password`** y **`POST /api/auth/reset-password`**. Tokens de un solo uso con hash SHA-256 en **`dbo.password_reset_tokens`** (esquema ya definido en `database/schema.sql`). Sin enumeración de cuentas en forgot-password.

---

## 2. Scope implemented

- **`POST /api/auth/forgot-password`** — **202** + mensaje genérico siempre.
- **`POST /api/auth/reset-password`** — valida token, actualiza contraseña, JWT **`access`**, respuesta tipo login.
- **`apps/api/src/shared/security/resetTokens.ts`** — generación segura y hash del token.
- **`apps/api/src/modules/auth/password-reset.repository.ts`** — INSERT token, búsqueda por hash, **`completePasswordReset`** transaccional (password + marcar tokens pendientes como usados).
- **`sendPasswordResetEmail`** en **`email.service.ts`**.
- **`GoneError`** (**410**) para token expirado.
- Env **`PASSWORD_RESET_TOKEN_TTL_MINUTES`** (default **30** en código si falta).

---

## 3. Endpoint behavior

### `POST /api/auth/forgot-password`

**Body:** `{ "email": "user@example.com" }` (email válido, normalizado a minúsculas).

**Respuesta:** **202** — `{ "message": "Si existe una cuenta para este correo, las instrucciones de restablecimiento fueron enviadas." }`  
(mismo texto si el email existe o no).

**Errores:** **422** validación; **500** si falla el envío real en infraestructura (p. ej. SMTP en producción); en producción sin **`FRONTEND_URL`** al intentar generar el enlace para un usuario existente → **500** con mensaje claro.

### `POST /api/auth/reset-password`

**Body:** `{ "token": "<raw-token>", "password": "<nueva>" }` — complejidad de contraseña alineada con change-initial-password.

**Respuesta:** **200** — `accessToken`, `user`, `mustChangePassword: false`, `isFirstLogin: false`.

**Errores:**

| Situación | HTTP |
|-----------|------|
| Token inválido o fila ya usada | **401** |
| Token expirado | **410** — *El token de restablecimiento expiró.* |
| Body inválido | **422** |

---

## 4. Reset token design

- Secreto crudo: **`crypto.randomBytes(32).toString("base64url")`**.
- Persistencia: solo **`SHA-256`** hex del token (**`token_hash`**), nunca el token en claro.
- Un solo uso: tras éxito se marca **`used_at_utc`** en todas las filas pendientes del **`user_id`** (transacción con actualización de contraseña).
- TTL: **`PASSWORD_RESET_TOKEN_TTL_MINUTES`** (por defecto **30**).
- El enlace se arma como **`{FRONTEND_URL || http://localhost:3000 en dev}/reset-password?token=...`** (token URL-encoded).

---

## 5. Database changes

No se creó tabla nueva: **`dbo.password_reset_tokens`** ya está en **`database/schema.sql`**:

- `user_id`, `token_hash`, `expires_at_utc`, `used_at_utc`, `created_at`, etc.

Los entornos deben tener este objeto creado (ejecutar el script de esquema si aún no está aplicado). No se ejecutó migración automática contra producción desde este repositorio.

**Helper opcional:** `cleanupExpiredPasswordResetTokens()` elimina filas con **`expires_at_utc < SYSUTCDATETIME()`** — sin cron en esta fase.

---

## 6. Email behavior

- **SMTP completo** (como registro): envío real con asunto *CrownBid - Restablecimiento de contraseña*.
- **Sin SMTP** en dev/test: mock con log; en **no producción** se puede loguear la URL completa marcada como dev.
- **Producción sin SMTP:** fallo explícito al enviar (igual que contraseña temporal).
- **Producción sin `FRONTEND_URL`:** no se puede armar el enlace para usuarios existentes → **500** al procesar forgot-password.

---

## 7. Security decisions

- Sin revelar si el email existe (**mensaje y código idénticos** para forgot).
- Sin JWT ni token en bruto en DB ni en logs en producción.
- Reset devuelve JWT **`type: access`** y **`requires_password_change = 0`** tras **`completePasswordReset`**.
- Revocación JWT previa (logout) no se altera en esta fase; flujos independientes.

---

## 8. Manual validation

### Forgot password

```bash
curl -s -X POST http://localhost:3000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"nasser.phase2.fix@example.com"}'
```

**Esperado:** **202** + mensaje genérico.

### Forgot password — email inexistente

**Esperado:** mismo **202** y mismo mensaje.

### Reset password

```bash
curl -s -X POST http://localhost:3000/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "token":"<token-from-email-or-dev-mock>",
    "password":"NuevaPassword456"
  }'
```

**Esperado:** **200** + `accessToken`, flags en `false`.

### Reutilizar token

**Esperado:** **401**

### Token expirado

**Esperado:** **410**

### Login con nueva / vieja contraseña

**Esperado:** nueva → **200** credenciales OK; vieja → **401**.

---

## 9. Automated validation

| Command | Result |
|---------|--------|
| `npm run typecheck` | Pass |
| `npm run build` | Pass |
| `npm test` | Pass *(placeholder)* |

**Validación en vivo:** pendiente si no hay SQL Server / tabla aplicada.

---

## 10. Remaining gaps for Phase 8

- Endurecimiento / tests automatizados amplios.
- Barrido de documentación OpenAPI / contrato si aplica.
- Ejemplos de handoff frontend (deep link reset).
- Índice dedicado a **`expires_at_utc`** opcional para limpieza masiva en tablas grandes.
