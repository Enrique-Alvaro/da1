# Auth Phase 3 — Login + JWT

## 1. Executive summary

**Status:** `PHASE_3_READY_FOR_PHASE_4`

Login with email and password is implemented. JWT access tokens are issued with a minimal payload. Change-initial-password, logout, and operational route protection are deferred.

---

## 2. Scope implemented

- **`POST /api/auth/login`** — validation, credential check, JWT issuance, public user object.
- **`apps/api/src/shared/security/jwt.ts`** — sign / verify helpers and login payload builder.

---

## 3. Endpoint behavior

### Request

`POST /api/auth/login`  
`Content-Type: application/json`

```json
{
  "email": "user@example.com",
  "password": "pa$$word"
}
```

- Email: required, valid email, trimmed and lowercased.
- Password: required non-empty string.

### Successful response — first login (temporary password / `requires_password_change`)

HTTP **200**

```json
{
  "accessToken": "jwt",
  "user": {
    "id": "uuid",
    "firstName": "string",
    "lastName": "string",
    "email": "user@example.com",
    "documentId": "string",
    "address": "string",
    "country": "AR",
    "photoUrl": null,
    "documentFrontImageUrl": "https://example.com/front.jpg",
    "documentBackImageUrl": "https://example.com/back.jpg",
    "category": "common",
    "status": "pending_verification",
    "biddingBlockedUntilResolved": false,
    "delinquentWinId": null,
    "accountServiceSuspended": false,
    "requiresPasswordChange": true
  },
  "mustChangePassword": true,
  "isFirstLogin": true
}
```

### Successful response — after initial password change (Phase 4)

Same shape with `requiresPasswordChange`, `mustChangePassword`, and `isFirstLogin` all **false** once `requires_password_change` is cleared in the database.

### Errors

| Situation | HTTP | Notes |
|-----------|------|--------|
| Invalid body / validation | **422** | `ValidationError` |
| Wrong email or password | **401** | `UnauthorizedError`, message: **Credenciales inválidas.** (same for unknown user and bad password) |
| Unexpected server failure | **500** | e.g. DB down |

Standard error shape:

```json
{
  "error": "UnauthorizedError",
  "message": "Credenciales inválidas.",
  "statusCode": 401
}
```

---

## 4. JWT design

### Environment

| Variable | Role |
|----------|------|
| `JWT_SECRET` | Signing key. **Required in production** (startup fails if missing). In development, login signing/verification throws **500** if missing when issuing a token. |
| `JWT_EXPIRES_IN` | `expiresIn` for `jsonwebtoken` (e.g. `15m`, `1h`). **Optional** — defaults to **`15m`** in code when unset. Document in `.env.example`. |

### Claims (payload body)

Signed claims (minimal, no address, document images, or password material):

- **`sub`** — user id (UUID string)
- **`email`** — normalized lowercase email
- **`type`** — token kind:
  - **`initial_password_change`** — user still has `requires_password_change = true` (first-login / temp password flow; intended for Phase 4).
  - **`access`** — user has completed initial password change (`requires_password_change = false`).

### Options

- **`iss`** (issuer): `crownbid-api`
- **`jti`**: random UUID per token (`crypto.randomUUID()`)
- **`exp`**: from `JWT_EXPIRES_IN` / default `15m`

The JWT does **not** include password hashes, full profile, document id, or image URLs.

---

## 5. Password behavior

- While **`requires_password_change = 1`**, **`password_hash`** holds the **temporary** password hash (Phase 2 registration).
- After Phase 4 changes the initial password, **`password_hash`** stores the **definitive** password hash and **`requires_password_change`** becomes false.

Login always verifies the presented password with **`verifyPassword`** against the current **`password_hash`** column.

---

## 6. Security decisions

- **Generic 401** for both unknown email and wrong password — no account enumeration.
- **Password hash** never returned by the API.
- **JWT** carries only `sub`, `email`, and `type` (plus standard claims); sensitive profile fields stay in the JSON **`user`** object per API contract, not in the token.
- Users with **`status: pending_verification`** can still **log in** to complete the first-password flow (aligned with product expectation for Phase 4).
- Operational routes rejecting **`initial_password_change`** tokens or **`requiresPasswordChange`** users are **not** part of this phase (middleware later).

---

## 7. Manual validation

### Health

```bash
curl -s http://localhost:3000/api/health
```

### First login with temporary password

```bash
curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "nasser.phase2.fix@example.com",
    "password": "<temporary-password-from-email-or-dev-mock>"
  }'
```

**Expected:** `200`, `accessToken` present, `mustChangePassword` and `isFirstLogin` **true**.

### Invalid credentials

```bash
curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "nasser.phase2.fix@example.com",
    "password": "wrong-password"
  }'
```

**Expected:** `401`, generic message.

### Invalid email format

```bash
curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"not-an-email","password":"x"}'
```

**Expected:** `422`.

---

## 8. Automated validation

From `apps/api` (closure run):

| Command | Result |
|---------|--------|
| `npm install` | OK (workspace deps) |
| `npm run typecheck` | Pass |
| `npm run build` | Pass |
| `npm test` | Pass *(placeholder: “No tests configured yet”)* |

**Live login against SQL Server:** not executed in this closure — set `JWT_SECRET` and run the curl examples in §7 when the DB is available.

---

## 9. Remaining gaps for Phase 4+

- **`POST /api/auth/change-initial-password`** — not implemented (still **501**); will consume tokens with `type: initial_password_change`.
- **Logout / session revocation** — not implemented (**501**).
- **`GET /api/users/me`** — still **501** (planned Phase 5).
- **Auth middleware** on operational routes — not implemented; future middleware should treat **`initial_password_change`** tokens and/or **`requiresPasswordChange`** per product rules.
