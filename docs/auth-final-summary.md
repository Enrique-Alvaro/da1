# CrownBid Auth Module — Final Summary

## 1. Executive summary

**Status:** `AUTH_MODULE_CLOSED_READY_FOR_FRONTEND_INTEGRATION`

The backend **Auth + Users** slice is implemented through Phase 7; Phase 8 adds **minimal Vitest coverage**, **manual QA docs**, and this handoff. Automated tests are **essential-only** (not exhaustive). Live DB + SMTP verification remains the responsibility of each environment.

---

## 2. Implemented endpoints

| Endpoint | Method | Auth | Notes |
|----------|--------|------|--------|
| `/health`, `/api/health` | GET | No | Process health |
| `/api/health/db` | GET | No | DB probe (`503` if DB down) |
| `/api/auth/register` | POST | No | Creates user + temporary password path |
| `/api/auth/login` | POST | No | JWT + first-login vs access |
| `/api/auth/change-initial-password` | POST | Bearer (`initial_password_change`) | Sets definitive password |
| `/api/auth/logout` | POST | Bearer (`access`) | Revokes JWT by `jti` |
| `/api/auth/forgot-password` | POST | No | Generic **202** (no enumeration) |
| `/api/auth/reset-password` | POST | No | One-time token → session |
| `/api/users/me` | GET | Bearer (`access` only) | Profile from DB |

---

## 3. Main flows

1. **Registration:** temporary password (email/mock); **`requires_password_change`** starts **true**.
2. **First login:** JWT type **`initial_password_change`**; **`mustChangePassword`** / **`isFirstLogin`** true.
3. **Change initial password:** Bearer first-login token → new JWT type **`access`**; flags false.
4. **Normal login:** email + definitive password → **`access`** JWT.
5. **Profile:** **`GET /api/users/me`** only with **`access`** token; data loaded from **DB**.
6. **Logout:** stores **`jti`** in **`dbo.revoked_tokens`**; same JWT rejected afterward.
7. **Recovery:** forgot (**202** always) → email link with raw token → reset (**200** + session).

---

## 4. Frontend / mobile integration contract

### Login `POST /api/auth/login`

- **Body:** `{ "email", "password" }`
- **Success:** `accessToken`, `user`, `mustChangePassword`, `isFirstLogin`
- **If `mustChangePassword === true`:** navigate to **change initial password** screen; use this JWT **only** for `POST /api/auth/change-initial-password` until replaced.
- **After change:** replace stored token with returned **`accessToken`**.
- **Errors:** **401** invalid credentials (generic message); **422** validation.

### Change initial password `POST /api/auth/change-initial-password`

- **Headers:** `Authorization: Bearer <initial_password_change_token>`
- **Body:** `currentPassword`, `newPassword` (complexity rules per API / Zod)
- **Success:** new **`accessToken`** + user flags false.

### Users me `GET /api/users/me`

- **Headers:** `Authorization: Bearer <access_token>`
- **Rejected:** first-login token (**401**); revoked token (**401**); missing Bearer (**401**).

### Logout `POST /api/auth/logout`

- **Headers:** `Authorization: Bearer <access_token>`
- **Success:** **204** empty body.
- **Client:** delete local token even if network fails (server may still have revoked).

### Forgot password `POST /api/auth/forgot-password`

- **Body:** `{ "email" }`
- **Always show the same success copy** after **202** — do not infer whether the account exists.

### Reset password `POST /api/auth/reset-password`

- **Body:** `{ "token", "password" }`
- **Success:** full login-like payload (`accessToken`, `user`, flags false).
- **Errors:** **401** invalid/used token; **410** expired; **422** validation.

---

## 5. Security notes

- Passwords stored as **bcrypt** hashes; API never returns hashes or temporary passwords from register.
- JWT payload is minimal (**`sub`**, **`email`**, **`type`**, **`jti`**, **`exp`**); profile details live in **`user`** JSON from DB-backed endpoints.
- **Logout:** revocation by **`jti`** in **`dbo.revoked_tokens`** (no raw JWT stored).
- **Reset:** **SHA-256** of raw token in **`password_reset_tokens`**; raw token only in email / client; **one-time** use; **forgot-password** does not enumerate accounts.

---

## 6. Environment variables

| Variable | Purpose |
|----------|---------|
| `NODE_ENV` | `development` / `test` / `production` |
| `PORT` | API port (default 3000) |
| `SQLSERVER_CONNECTION_STRING` (or aliases) | SQL Server ADO connection string |
| `JWT_SECRET` | JWT signing (**required in production** startup) |
| `JWT_EXPIRES_IN` | Optional (default **15m** in code) |
| `BCRYPT_SALT_ROUNDS` | Optional (bcrypt cost) |
| `SMTP_*` | Real email in production |
| `FRONTEND_URL` | Deep links (register recovery); **required in production** for forgot-password link generation |
| `PASSWORD_RESET_TOKEN_TTL_MINUTES` | Optional (default **30** in code) |

See **`apps/api/.env.example`**.

---

## 7. Database objects used

| Object | Role |
|--------|------|
| `dbo.users` | Accounts, `password_hash`, flags |
| `dbo.countries` | FK for `country_code` on register |
| `dbo.revoked_tokens` | JWT revocation (`jwt_id`, `expires_at_utc`, …) |
| `dbo.password_reset_tokens` | Reset flow (`token_hash`, `expires_at_utc`, `used_at_utc`, …) |

Schema source: **`database/schema.sql`**. Apply to each environment via your migration process; this repo does not auto-apply to production.

---

## 8. Automated validation

| Command | Role |
|---------|------|
| `npm run typecheck` | TypeScript |
| `npm run build` | Compile `dist/` |
| `npm test` | Vitest — **`tests/auth.essential.test.ts`** |

**Essential tests cover (mocked repositories where needed):**

- Login invalid / wrong password → generic **401** message.
- Login first-access shape (flags + no password in user).
- Change initial password success shape (mocked JWT + repo).
- **`requireAccessToken`** rejects **`initial_password_change`**.
- Forgot-password same message for missing vs existing user (no enumeration).
- Reset-password invalid token **401**; expired row **410**.

SMTP and full HTTP integration are **manual / Postman**.

---

## 9. Manual validation

See **`docs/auth-phase-8-manual-qa.md`** for curl flows and **read-only SQL** checks.

**Status for this closure:** automated tests **pass** in CI-local runs; **live** QA against SQL Server + SMTP remains **environment-dependent** (mark pending if DB not available).

---

## 10. Known observations

- Real SMTP delivery is **not** asserted by automated tests.
- Vitest suite is **minimal** by design (Phase 8 scope).
- **JWT signing fix:** payload must not duplicate **`jti`** when using **`jwtid`** option in `jsonwebtoken` (fixed in Phase 8 — avoids runtime error on login).
