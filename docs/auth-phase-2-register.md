# Auth Phase 2 — Register

## 1. Executive summary

**Status:** **PHASE_2_READY_WITH_OBSERVATIONS**

`POST /api/auth/register` está implementado con validación Zod, persistencia en `dbo.users`, hash bcrypt de contraseña temporal, envío SMTP o mock en desarrollo, y respuesta alineada al contrato (sin exponer contraseña ni hashes). La validación integral contra una BD real depende de tener **filas en `dbo.countries`** para el código ISO del usuario (FK).

---

## 2. Scope implemented

- **Único endpoint nuevo:** `POST /api/auth/register`
- **Sin:** login, change-initial-password, logout (siguen **501**), `GET /users/me` (**501**).

---

## 3. Endpoint behavior

### Request

`Content-Type: application/json`

| Field | Rules |
|-------|--------|
| firstName, lastName, documentId, address | string trim, min length 1 |
| email | email válido; normalizado a minúsculas |
| country | ISO-3166 alpha-2, 2 caracteres → mayúsculas |
| documentFrontImageUrl, documentBackImageUrl | URL válidas |

### Success — HTTP 201

Cuerpo incluye `message`, `user` (objeto usuario público), `emailSentTo`. **No** incluye contraseña temporal ni `password_hash`.

### Errors

| Code | Cuándo |
|------|--------|
| 422 | Validación Zod fallida |
| 409 | Email duplicado (`ConflictError`) |
| 500 | Error interno (p. ej. fallo SMTP tras INSERT → usuario compensado con DELETE; ver §6) |

Cuerpo estándar: `{ "error", "message", "statusCode" }`.

---

## 4. Security decisions

| Tema | Implementación |
|------|----------------|
| Hash | **bcryptjs** con costo `BCRYPT_SALT_ROUNDS` (env) o **12** por defecto |
| Contraseña temporal | `crypto.randomInt` — longitud 12, incluye mayúsculas, minúsculas y dígitos |
| Persistencia | Solo **hash** en `password_hash`; nunca texto plano |
| Respuesta API | Sin contraseña temporal ni hashes |
| Logs | Contraseña solo en mock de desarrollo (`NODE_ENV !== production`); no en producción |

---

## 5. Database mapping

| Concepto | Tabla / columna |
|----------|-----------------|
| Email | `dbo.users.email` (único) |
| Hash (temporal o definitiva futura) | `dbo.users.password_hash` |
| Contraseña temporal separada | **No** hay columna aparte; solo hash vigente |
| requiresPasswordChange | `dbo.users.requires_password_change` = 1 |
| category | `dbo.users.category` = `'common'` |
| status | `dbo.users.status` = `'pending_verification'` |
| biddingBlocked / suspended | bits en `0` |
| país | `dbo.users.country_code` → FK `dbo.countries(iso_code)` |

---

## 6. Email behavior

| Entorno | Comportamiento |
|---------|----------------|
| **Development / test** sin SMTP completo | Mock: aviso en consola; en no-producción puede loguearse la contraseña temporal marcada como solo dev |
| **Production** sin SMTP | Error claro al enviar (tras crear usuario); usuario eliminado por compensación |
| **SMTP configurado** | **nodemailer** — asunto *CrownBid - Contraseña temporal*, cuerpo con instrucciones |

**Transaccionalidad:** el correo no puede ir dentro de una transacción SQL. Flujo elegido: **INSERT** → **envío email** → si el envío falla (SMTP real), **DELETE** del usuario recién creado y **500** al cliente.

---

## 7. Manual validation (curl)

### Registro exitoso (requiere BD + país `AR` en `countries`, SMTP o mock dev)

```bash
curl -s -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Nasser",
    "lastName": "El Bacha",
    "email": "nasser.test@example.com",
    "documentId": "12345678",
    "address": "Av. Siempre Viva 123",
    "country": "AR",
    "documentFrontImageUrl": "https://example.com/dni-front.jpg",
    "documentBackImageUrl": "https://example.com/dni-back.jpg"
  }'
```

### Email duplicado (segunda vez mismo body) → **409**

### Email inválido → **422**

```bash
curl -s -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"firstName":"A","lastName":"B","email":"not-an-email","documentId":"1","address":"x","country":"AR","documentFrontImageUrl":"https://a.com/a.jpg","documentBackImageUrl":"https://a.com/b.jpg"}'
```

**Ejecución automatizada en CI:** no se corrió contra SQL Server en este entorno; validar localmente con `npm run dev` y credenciales reales.

---

## 8. Automated validation

| Command | Result |
|---------|--------|
| `npm run typecheck` | Pass |
| `npm run build` | Pass |
| `npm test` | Placeholder (sin suite) |

---

## 9. Remaining gaps for Phase 3

- `POST /auth/login`, JWT, refresh, change-initial-password, logout
- `GET /users/me`
- Forgot / reset password
- Auditoría de datos live (Phase 0) si aún pendiente
- Tests automatizados (no añadidos en esta fase)

---

## Definition of Done (Phase 2)

- [x] `POST /api/auth/register` operativo (no 501)
- [x] Validación + 409 + 422 + forma de error estándar
- [x] Hash + sin secreto en respuesta
- [x] Email SMTP o mock documentado
- [x] Otros auth endpoints siguen en 501
- [x] typecheck / build OK
