# Auth Phase 4 — Change Initial Password

## 1. Executive summary

**Status:** `PHASE_4_READY_FOR_PHASE_5`

El endpoint **`POST /api/auth/change-initial-password`** está implementado: valida Bearer JWT de tipo `initial_password_change`, comprueba la contraseña temporal, persiste la nueva contraseña y devuelve un JWT de tipo `access`.

---

## 2. Scope implemented

- **`POST /api/auth/change-initial-password`** con validación de cuerpo (Zod), extracción `Authorization: Bearer`, verificación JWT y actualización en SQL Server.
- **`apps/api/src/shared/security/bearerToken.ts`** — `extractBearerToken`.
- **`apps/api/src/shared/security/jwt.ts`** — `verifyAccessToken` endurecido: errores de librería JWT mapeados a **`UnauthorizedError`** (`401`) sin filtrar detalles internos al cliente.
- **`apps/api/src/modules/auth/auth.repository.ts`** — `findUserByIdWithPassword`, `updateInitialPassword` (incluye `updated_at` si existe en esquema).

---

## 3. Endpoint behavior

### Headers

- **`Authorization: Bearer <jwt>`** — obligatorio; debe ser un JWT emitido en login cuando `requires_password_change = 1` (tipo `initial_password_change`).

### Request body

```json
{
  "currentPassword": "temporary-password",
  "newPassword": "NuevaPassword123"
}
```

| Campo | Reglas |
|-------|--------|
| `currentPassword` | Obligatorio, longitud ≥ 1 |
| `newPassword` | ≥ 8 caracteres, al menos una minúscula, una mayúscula y un dígito; no puede ser igual a `currentPassword` |

### Respuesta exitosa — HTTP 200

Misma forma que login: `accessToken`, `user` (objeto público vía `mapUserRowToApi`), `mustChangePassword: false`, `isFirstLogin: false`, y `user.requiresPasswordChange: false`.

### Errores

| Situación | HTTP | `error` típico |
|-----------|------|----------------|
| Sin `Authorization`, esquema distinto de Bearer, token vacío | **401** | `UnauthorizedError` — *Token ausente o inválido.* |
| JWT inválido, expirado o payload inválido | **401** | `UnauthorizedError` — *No autorizado.* |
| JWT tipo `access` (flujo ya completado para este endpoint) | **409** | `ConflictError` |
| Usuario ya sin `requires_password_change` | **409** | `ConflictError` — *El usuario ya completó el cambio inicial de contraseña.* |
| Contraseña actual incorrecta | **401** | `UnauthorizedError` — *La contraseña actual es incorrecta.* |
| Cuerpo inválido (Zod) | **422** | `ValidationError` |
| Error inesperado | **500** | `InternalServerError` |

---

## 4. Password lifecycle

- **Antes** de completar este endpoint y con **`requires_password_change = 1`**: `password_hash` almacena el **hash de la contraseña temporal** (registro Phase 2).
- **Tras** una respuesta **200**: `password_hash` almacena el **hash de la contraseña definitiva** y **`requires_password_change = 0`**.
- **No** se puede completar el flujo dos veces: segunda llamada con token antiguo o usuario ya migrado → **409**.

---

## 5. JWT behavior

| Aspecto | Detalle |
|---------|---------|
| Entrada esperada | Tipo **`initial_password_change`** (emitido en login mientras el usuario debe cambiar contraseña). |
| Salida | Nuevo token firmado con tipo **`access`** (no se reutiliza el JWT del primer login). |
| Expiración | `JWT_EXPIRES_IN` (por defecto **`15m`** en código si no está definido en env). |
| Secreto | `JWT_SECRET` (igual que login). |

---

## 6. Security decisions

- La **contraseña actual** se valida con **`verifyPassword`** contra `password_hash` antes de actualizar.
- **Complejidad** de la nueva contraseña validada en servidor (Zod).
- **Sin** contraseñas ni hashes en logs.
- **Sin** `password_hash` en respuestas JSON.
- Tokens JWT malformados/expirados se responden con mensajes controlados (**401**), sin exponer stack ni mensajes de `jsonwebtoken`.
- Coincidencia **`sub` + email** del JWT con el usuario en base para reducir riesgo de uso incoherente del token.

---

## 7. Manual validation

### Paso 1 — login con contraseña temporal

```bash
curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "nasser.phase2.fix@example.com",
    "password": "<temporary-password-from-email-or-dev-mock>"
  }'
```

Guardar `accessToken` (tipo `initial_password_change`).

### Paso 2 — cambiar contraseña inicial

```bash
curl -s -X POST http://localhost:3000/api/auth/change-initial-password \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <initial-password-token>" \
  -d '{
    "currentPassword": "<temporary-password-from-email-or-dev-mock>",
    "newPassword": "NuevaPassword123"
  }'
```

**Esperado:** `200`, nuevo `accessToken`, `mustChangePassword` / `isFirstLogin` en `false`, `user.requiresPasswordChange` en `false`.

### Paso 3 — repetir el mismo endpoint

**Esperado:** **409** (usuario ya completó el cambio o token `access`).

### Paso 4 — login con la nueva contraseña

**Esperado:** **200**, `mustChangePassword` / `isFirstLogin` en `false`, JWT tipo `access`.

### Paso 5 — login con la contraseña temporal antigua

**Esperado:** **401**.

---

## 8. Automated validation

Desde `apps/api` (cierre de implementación):

| Command | Result |
|---------|--------|
| `npm run typecheck` | Pass |
| `npm run build` | Pass |
| `npm test` | Pass *(script placeholder: “No tests configured yet”)* |

**Validación en vivo contra SQL Server / curls:** no ejecutada en esta sesión — marcar pendiente hasta probar contra tu instancia y `.env`.

---

## 9. Remaining gaps for Phase 5

- Middleware **`requireAuth`** / **`requireOperationalUser`** y protección de rutas operativas.
- **`GET /api/users/me`** — pendiente (501).
- **Logout** y revocación de sesiones — pendiente (501).
- Política explícita sobre tokens `initial_password_change` vs rutas operativas (rechazo en middleware).
