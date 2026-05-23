# Backend Demo Checklist

Guía para demostrar el backend CrownBid **solo con llamadas API** (sin `UPDATE` manual en SQL para admisión).

Ver también: [`apps/api/README.md`](../../apps/api/README.md) y [`audit/backend-dod-architecture-senior-audit.md`](../../audit/backend-dod-architecture-senior-audit.md).

---

## 1. Environment requirements

| Variable | Obligatorio | Uso |
| -------- | ----------- | --- |
| `SQLSERVER_CONNECTION_STRING` (o alias) | Sí | Conexión SQL Server |
| `JWT_SECRET` | Sí en producción | Tokens Bearer |
| `JWT_EXPIRES_IN` | No | Default `15m` |
| `DEFAULT_REVIEWER_EMPLOYEE_ID` | Sí (envíos producto) | FK `productos.revisor` |
| `EMPLOYEE_ADMIN_EMAIL` / `PASSWORD` / `ID` | Sí (demo admin) | Login empleado |
| `COMPANY_CLIENT_ID` | Si se cierra ítem **sin pujas** | Comprador empresa en `registroDeSubasta` |
| SMTP (`SMTP_*`, `SMTP_FROM`) | Prod registro | Contraseña temporal por correo |

---

## 2. Required SQL/bootstrap scripts

Ejecutar **en este orden** sobre la base del profesor (sin modificar el script académico):

1. `database/schema.sql` — esquema base.
2. `database/cliente_credenciales.sql` — login de clientes.
3. `database/migrations/001_medios_pago_subasta_moneda.sql` — `mediosPago` + `subastas.moneda`.
4. Datos semilla mínimos: empleado admin, países, subasta abierta con catálogo/ítem (según scripts del equipo).

No crear migraciones nuevas en esta fase.

---

## 3. Manual API flow

Sustituir `{{base}}` por `http://localhost:3000` y tokens por los obtenidos en login.

### 3.1 Health

| Paso | Method | Route | Auth | Expected | Keys |
| ---- | ------ | ----- | ---- | -------- | ---- |
| 1 | GET | `/api/health` | — | 200 | `status` |
| 2 | GET | `/api/health/db` | — | 200 o 503 | `ok` / error DB |

### 3.2 Register + login client

| Paso | Method | Route | Auth | Expected | Keys |
| ---- | ------ | ----- | ---- | -------- | ---- |
| 3 | POST | `/api/auth/register` | — | 201 | `user`, email |
| 4 | POST | `/api/auth/login` | — | 200 | token first-login o `accessToken` |
| 5 | POST | `/api/auth/change-initial-password` | Bearer initial | 200 | `accessToken` |

### 3.3 Employee + admit client

| Paso | Method | Route | Auth | Expected | Keys |
| ---- | ------ | ----- | ---- | -------- | ---- |
| 6 | POST | `/api/auth/employee/login` | — | 200 | `accessToken`, `employeeId` |
| 7 | PATCH | `/api/admin/clientes/:id/admitir` | Bearer empleado | 200 | `admitido: "si"`, `categoria` |
| 8 | GET | `/api/admin/clientes/:id` | Bearer empleado | 200 | `admitido`, `paymentMethods` |

Body paso 7:

```json
{ "admitido": "si", "categoria": "comun" }
```

### 3.4 Client readiness

| Paso | Method | Route | Auth | Expected | Keys |
| ---- | ------ | ----- | ---- | -------- | ---- |
| 9 | GET | `/api/users/me/status` | Bearer cliente | 200 | `canBid`, `cannotBidReason` |
| 10 | GET | `/api/users/me` | Bearer cliente | 200 | `admitted: "si"` |

Tras admitir y **sin** medio verificado: `canBid: false`, `cannotBidReason: "PAYMENT_METHOD_NOT_VERIFIED"`.

### 3.5 Payment methods

| Paso | Method | Route | Auth | Expected | Keys |
| ---- | ------ | ----- | ---- | -------- | ---- |
| 11 | POST | `/api/users/me/payment-methods` | Cliente operativo | 201 | `id`, `status: pendiente` |
| 12 | PATCH | `/api/admin/payment-methods/:id/verify` | Empleado | 200 | `status: verificado` |
| 13 | GET | `/api/users/me/status` | Cliente | 200 | `canBid: true` (sin subasta en query) |

### 3.6 Auctions + live + bid

| Paso | Method | Route | Auth | Expected | Keys |
| ---- | ------ | ----- | ---- | -------- | ---- |
| 14 | GET | `/api/subastas?featured=true` | Opcional | 200 | `items[]` |
| 15 | GET | `/api/subastas/:id` | Opcional | 200 | `id`, `status` |
| 16 | POST | `/api/subastas/:id/asistentes` | Cliente | 201 | `bidderNumber` |
| 17 | POST | `/api/subastas/:id/live/session` | Cliente | 200/201 | sesión activa |
| 18 | GET | `/api/subastas/:id/live` | Cliente | 200 | `currentItemId`, `canBid` |
| 19 | POST | `/api/subastas/:id/pujos` | Cliente | 201 | `id`, `amount` |
| 20 | POST | `/api/subastas/:id/pujos` (monto bajo) | Cliente | 409 | `BID_TOO_LOW` |
| 21 | GET | `/api/subastas/:id/pujos/history` | Cliente | 200 | historial |

Body puja (ejemplo):

```json
{ "itemId": 10, "amount": 15100, "paymentMethodId": 3 }
```

`itemId` = `itemsCatalogo.identificador`.

### 3.7 Close + result

| Paso | Method | Route | Auth | Expected | Keys |
| ---- | ------ | ----- | ---- | -------- | ---- |
| 22 | POST | `/api/subastas/:id/items/:itemId/cerrar` | Empleado | 200 | ganador / empresa |
| 23 | GET | `/api/subastas/:id/items/:itemId/resultado` | Bearer | 200 | `winner`, `finalPrice` |
| 24 | GET | `/api/users/me/metrics` | Bearer | 200 | métricas |
| 25 | GET | `/api/users/me/purchases` | Cliente | 200 | compras |

---

## 4. Known limitations

- **Sesión live en memoria:** tras reiniciar el API, repetir `POST .../live/session` antes de pujar.
- **Forgot/reset password:** no implementado (`501`, código `PASSWORD_RESET_NOT_IMPLEMENTED`).
- **Logout:** descarte del token en el cliente; no hay revocación server-side en esta versión.
- **Rechazo de envío con motivo:** `POST .../rechazar` → `409` si no hay columna de motivo.
- **Cierre sin pujas:** requiere `COMPANY_CLIENT_ID` en `.env`.

---

## 5. Demo troubleshooting

| Síntoma | Causa probable | Acción |
| ------- | -------------- | ------ |
| `CLIENT_NOT_APPROVED` / `USER_NOT_ADMITTED` | Cliente no admitido | Paso 7 PATCH admitir |
| `PAYMENT_METHOD_NOT_VERIFIED` | Medio pendiente | Paso 12 verify |
| `CATEGORY_NOT_ALLOWED` | Categoría cliente baja | Subir `categoria` en admitir o usar subasta `comun` |
| `LIVE_SESSION_REQUIRED` | Sin entrar a sala | Paso 17 |
| `AUCTION_NOT_OPEN` | Subasta no `abierta` | Abrir subasta en BD o usar otra |
| `AUCTION_ATTENDANCE_REQUIRED` | Sin asistente | Paso 16 |
| Error al cerrar sin pujas | Falta `COMPANY_CLIENT_ID` | Configurar `.env` |
| 401 en rutas protegidas | Token expirado o initial | Renovar login |
