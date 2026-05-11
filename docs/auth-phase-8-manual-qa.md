# Auth Phase 8 — Manual QA

Manual validation checklist for the CrownBid API **Auth + Users** slice. Use against a **non-production** database. Do not paste production secrets into tickets.

---

## 1. Environment required

| Requirement | Notes |
|-------------|--------|
| API base URL | e.g. `http://localhost:3000` |
| SQL Server | CrownBid DB reachable; connection string in `apps/api/.env` |
| SMTP | Optional in dev — mock logs temporary password / reset URL to console |
| `dbo.countries` | Must include `iso_code` used at register (e.g. **`AR`**) |
| `dbo.revoked_tokens` | Present per `database/schema.sql` (JWT `jti` revocation) |
| `dbo.password_reset_tokens` | Present per schema (password recovery) |
| Env | `JWT_SECRET`, `JWT_EXPIRES_IN`; for forgot-password in production **`FRONTEND_URL`**; **`PASSWORD_RESET_TOKEN_TTL_MINUTES`** optional (default 30 in code) |

---

## 2. Full happy path

### Step 1 — Register

```bash
curl -s -w "\nHTTP %{http_code}\n" -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Phase",
    "lastName": "Eight",
    "email": "nasser.phase8@example.com",
    "documentId": "30123456",
    "address": "Test 123",
    "country": "AR",
    "documentFrontImageUrl": "https://example.com/front.jpg",
    "documentBackImageUrl": "https://example.com/back.jpg"
  }'
```

**Expected:** HTTP **201**; **`temporaryPassword` absent** from JSON; **`user.requiresPasswordChange`** === `true`.

### Step 2 — Temporary password

Read from **dev mock** console (`[email mock]`) or real inbox. Do not commit real values.

### Step 3 — Login (temporary password)

```bash
curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "nasser.phase8@example.com",
    "password": "<temporary-password>"
  }'
```

**Expected:** **200**; `accessToken`; `mustChangePassword` **true**; `isFirstLogin` **true**; `user.requiresPasswordChange` **true**.

### Step 4 — Change initial password

```bash
curl -s -X POST http://localhost:3000/api/auth/change-initial-password \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <access-token-from-step-3>" \
  -d '{
    "currentPassword": "<temporary-password>",
    "newPassword": "DefinitivaPass123"
  }'
```

**Expected:** **200**; new `accessToken`; `mustChangePassword` **false**; `isFirstLogin` **false**; `user.requiresPasswordChange` **false**.

### Step 5 — Login (definitive password)

```bash
curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "nasser.phase8@example.com",
    "password": "DefinitivaPass123"
  }'
```

**Expected:** **200**; `mustChangePassword` **false**; `isFirstLogin` **false**.

### Step 6 — GET `/api/users/me`

```bash
curl -s -w "\nHTTP %{http_code}\n" http://localhost:3000/api/users/me \
  -H "Authorization: Bearer <access-token-from-step-5>"
```

**Expected:** **200**; public user object; **no** `password_hash` / `passwordHash`.

### Step 7 — Logout

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3000/api/auth/logout \
  -H "Authorization: Bearer <same-access-token-as-step-6>"
```

**Expected:** **204** (empty body).

### Step 8 — `/users/me` with revoked token

```bash
curl -s http://localhost:3000/api/users/me \
  -H "Authorization: Bearer <same-token-after-logout>"
```

**Expected:** **401**; message indicating revocation (*Token revocado.*).

---

## 3. Password recovery path

### Forgot-password (known email)

```bash
curl -s -w "\nHTTP %{http_code}\n" -X POST http://localhost:3000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"nasser.phase8@example.com"}'
```

**Expected:** **202**; generic message (same text whether user exists or not).

### Forgot-password (unknown email)

Same body with a non-registered email.

**Expected:** **202**, **same** generic message.

### Reset-password

Use token from dev mock URL or email (`reset-password?token=...`):

```bash
curl -s -X POST http://localhost:3000/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "token":"<paste-token>",
    "password":"RecoveryPass456"
  }'
```

**Expected:** **200**; `accessToken`; `mustChangePassword` **false**; `isFirstLogin` **false**.

### Reuse same reset token

**Expected:** **401** (invalid / already used).

### Login with new password

**Expected:** **200** with new credentials.

---

## 4. Negative cases (quick)

| Case | Expected |
|------|----------|
| Register duplicate email | **409** |
| Login wrong password | **401**, *Credenciales inválidas.* |
| `GET /users/me` without `Authorization` | **401** |
| `GET /users/me` with **first-login** JWT | **401** (*sesión normal*) |
| `change-initial-password` wrong `currentPassword` | **401** |
| `change-initial-password` after flow completed | **409** |
| `reset-password` expired token | **410** (if you wait past TTL or simulate expired row) |

---

## 5. Read-only DB verification

Run in **SQL Server Management Studio** or `sqlcmd` against your **dev** database only.

### User row

```sql
SELECT
  id,
  email,
  category,
  status,
  requires_password_change,
  bidding_blocked_until_resolved,
  account_service_suspended
FROM dbo.users
WHERE email = N'nasser.phase8@example.com';
```

### Password reset tokens (hashes only — no plaintext token)

Schema uses **`expires_at_utc`**, **`used_at_utc`**:

```sql
SELECT TOP (5)
  id,
  user_id,
  token_hash,
  expires_at_utc,
  used_at_utc,
  created_at
FROM dbo.password_reset_tokens
ORDER BY created_at DESC;
```

### Revoked JWT entries (`jwt_id` = JWT `jti`)

```sql
SELECT TOP (5)
  jwt_id,
  user_id,
  expires_at_utc,
  revoked_at_utc
FROM dbo.revoked_tokens
ORDER BY revoked_at_utc DESC;
```

### Duplicate emails (should be empty)

```sql
SELECT email, COUNT(*) AS total
FROM dbo.users
GROUP BY email
HAVING COUNT(*) > 1;
```

**Do not** run `DELETE` / `UPDATE` / `INSERT` here except via documented API flows during QA.

---

## 6. Postman

Import `docs/postman/CrownBid-Auth-Phase2.postman_collection.json` and set collection variables (`baseUrl`, `registerEmail`, passwords, tokens). Align email with the curl examples above when running the full chain.
