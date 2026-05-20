# Checklist manual — Medios de pago y pujas (backend)

Usar con API en `http://localhost:3000` (o `baseUrl` de Postman). Requiere migración `database/migrations/001_medios_pago_subasta_moneda.sql` aplicada.

Colección Postman: `docs/postman/CrownBid-Payment-Methods-Bids.postman_collection.json` (complementa `CrownBid-Auth-Phase2.postman_collection.json`).

---

## Base de datos

- [ ] Migración `001` aplicada sin errores.
- [ ] Tabla `dbo.mediosPago` existe.
- [ ] Columna `dbo.subastas.moneda` existe (`ARS` / `USD`).
- [ ] Índices `UX_asistentes_cliente_subasta` y `UX_asistentes_subasta_numeroPostor` existen.
- [ ] Sin duplicados en `asistentes` antes de índices (consultas en `database/migrations/README.md`).

## Autenticación

- [ ] Cliente: registro → login → contraseña definitiva → `accessToken` (tipo `access`).
- [ ] Empleado: `POST /api/auth/employee/login` → `employeeAccessToken` (`role: empleado`, `employeeId`).

## Medios de pago — cliente

- [ ] `GET /api/users/me/payment-methods` → `{ items: [] }` inicialmente.
- [ ] `POST` tarjeta con `ultimosDigitos` (4 dígitos) → `status: pendiente`.
- [ ] `POST` con `cvv` → 400 `CVV_NOT_ALLOWED`.
- [ ] `POST` con `cardNumber` / PAN → 400 `FULL_CARD_NUMBER_NOT_ALLOWED`.
- [ ] Body con `estado` / `verificador` / `cliente` → rechazado.
- [ ] `POST` cheque certificado con `montoGarantia` → `availableAmount` inicializado.
- [ ] `PATCH .../:id/disable` propio → `deshabilitado` (idempotente).
- [ ] `PATCH disable` de medio ajeno → 404 `PAYMENT_METHOD_NOT_FOUND`.
- [ ] Alta de medio **no** exige `admitido = si`.

## Medios de pago — empleado

- [ ] Cliente con `accessToken` → `GET /api/admin/payment-methods` → 403.
- [ ] Empleado → `GET ?status=pendiente` lista cola (máx. 100).
- [ ] `PATCH .../verify` pendiente → `verificado`.
- [ ] `PATCH .../reject` con `{ "reason": "..." }` → `rechazado`.
- [ ] `PATCH verify` sobre `deshabilitado` → 409 `PAYMENT_METHOD_DISABLED`.
- [ ] `PATCH reject` sobre `verificado` → revocación administrativa (`rechazado`).

## Pujas — prerequisitos

- [ ] `clientes.admitido = 'si'` para el postor de prueba (SQL o proceso admin futuro).
- [ ] Subasta con `estado = abierta` y `moneda` definida.
- [ ] Ítem en catálogo: `itemId` = `itemsCatalogo.identificador` (no `productos.identificador`).

## Pujas — flujo feliz

- [ ] Medio verificado por empleado.
- [ ] `POST /api/subastas/:id/asistentes` → 201 (categoría suficiente).
- [ ] `POST /api/subastas/:id/pujos` con `itemId`, `amount`, `paymentMethodId` → 201.

## Pujas — casos negativos

- [ ] `admitido != si` → inscripción/puja `CLIENT_NOT_APPROVED`.
- [ ] Categoría cliente &lt; subasta → `CLIENT_CATEGORY_NOT_ALLOWED` (asistente y puja).
- [ ] Sin inscripción asistente → `AUCTION_ATTENDANCE_REQUIRED`.
- [ ] Sin `paymentMethodId` → `PAYMENT_METHOD_REQUIRED`.
- [ ] Medio `pendiente` / `rechazado` / `deshabilitado` → códigos `PAYMENT_METHOD_*`.
- [ ] Medio de otro cliente → 404 `PAYMENT_METHOD_NOT_FOUND`.
- [ ] Moneda distinta a subasta → `PAYMENT_METHOD_CURRENCY_NOT_ALLOWED`.
- [ ] Cheque con `montoDisponible` &lt; amount → `PAYMENT_METHOD_INSUFFICIENT_FUNDS`.
- [ ] Importe bajo / alto (categorías normales) → `BID_AMOUNT_TOO_LOW` / `BID_AMOUNT_TOO_HIGH`.
- [ ] Subasta `oro`/`platino`: sin tope 20% pero debe superar mejor oferta.
- [ ] Body con `cliente` / `asistente` → `BODY_FIELD_NOT_ALLOWED`.
- [ ] Token empleado en puja → `CLIENT_AUTH_REQUIRED`.
- [ ] (Opcional) dos pujas concurrentes: solo la válida ante mejor oferta actual.

## Cierre

- [ ] `npm run typecheck` y `npm test` en `apps/api` OK.
- [ ] Informe de cierre: `docs/payment-methods-backend-closure.md`.
