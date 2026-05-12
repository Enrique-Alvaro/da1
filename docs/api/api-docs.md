# CrownBid API

Contrato REST para la aplicación móvil CrownBid (React Native). Todas las rutas bajo el prefijo **`/api`**.

---

## Información general

| Aspecto | Valor |
| --- | --- |
| **Base URL** | `/api` (ej.: `https://servidor.ejemplo.com/api`) |
| **Formato** | `application/json` en cuerpos y respuestas salvo indicación contraria |
| **Autenticación** | `Authorization: Bearer <accessToken>` en rutas protegidas |
| **Identificadores** | Enteros positivos (`integer`) para recursos públicos |
| **Moneda** | Montos en número decimal; moneda de negocio típica `ARS` o `USD` según endpoint |
| **Categorías** | `comun`, `especial`, `plata`, `oro`, `platino` |
| **Estado de subasta (API)** | `scheduled`, `live`, `closed` |

### Salud del servicio

**GET** `/health` y **GET** `/api/health` — sin autenticación. Respuesta típica `200` con estado del servicio (y opcionalmente de base de datos).

---

## Formato de error

Cuerpo JSON estándar ante errores:

```json
{
  "error": "ValidationError",
  "message": "Descripción legible del error",
  "statusCode": 400
}
```

Los campos pueden variar ligeramente (`code`, `details`); el cliente debe leer al menos `message` y el código HTTP.

### Códigos HTTP frecuentes

| Código | Uso |
| --- | --- |
| `200` | OK |
| `201` | Recurso creado |
| `202` | Aceptado (procesamiento diferido) |
| `204` | Sin contenido |
| `400` | Solicitud inválida |
| `401` | No autenticado |
| `403` | Autenticado pero sin permiso |
| `404` | Recurso no encontrado |
| `409` | Conflicto de negocio |
| `422` | Validación de datos fallida |
| `500` | Error interno |

---

## Autenticación

### POST `/auth/register`

**Descripción:** Alta de un nuevo cliente en el sistema.

**Autenticación:** no.

**Cuerpo (JSON):**

```json
{
  "documentNumber": "40123456",
  "fullName": "María García",
  "address": "Calle Falsa 123",
  "countryId": 1,
  "photoBase64": null
}
```

| Campo | Tipo | Obligatorio | Descripción |
| --- | --- | --- | --- |
| `documentNumber` | `string` | Sí | Documento nacional |
| `fullName` | `string` | Sí | Nombre completo |
| `address` | `string` | No | Domicilio |
| `countryId` | `integer` | Sí | Identificador del país |
| `photoBase64` | `string` \| `null` | No | Foto en Base64, si aplica |

**Respuesta `201`:**

```json
{
  "id": 7,
  "documentNumber": "40123456",
  "fullName": "María García",
  "status": "activo",
  "admitted": "no",
  "category": "comun",
  "message": "Cliente registrado correctamente."
}
```

**Errores:** `400`, `409` (documento o registro duplicado), `422`.

---

### POST `/auth/login`

**Descripción:** Obtiene un token de acceso (o token de primer cambio de contraseña) a partir de credenciales.

**Autenticación:** no.

**Cuerpo (JSON):**

```json
{
  "email": "maria@example.com",
  "password": "string"
}
```

| Campo | Tipo | Obligatorio |
| --- | --- | --- |
| `email` | `string` (email) | Sí |
| `password` | `string` | Sí |

**Respuesta `200`:**

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "mustChangePassword": true,
  "isFirstLogin": true,
  "user": {
    "id": 7,
    "firstName": "María",
    "lastName": "García",
    "email": "maria@example.com",
    "documentId": "40123456",
    "address": "Calle Falsa 123",
    "country": "AR",
    "category": "comun",
    "status": "pending_verification",
    "requiresPasswordChange": true
  }
}
```

- Si `mustChangePassword` es `true`, el `accessToken` puede corresponder al flujo de **cambio de contraseña inicial** hasta que el usuario complete **POST** `/auth/change-initial-password`.

**Errores:** `401` (credenciales inválidas), `422`.

---

### POST `/auth/change-initial-password`

**Descripción:** Define la contraseña definitiva tras el primer acceso con contraseña temporal.

**Autenticación:** `Bearer` con el token emitido en el registro/primer login (tipo indicado por el backend).

**Cabecera:** `Authorization: Bearer <token>`

**Cuerpo (JSON):**

```json
{
  "currentPassword": "Temp2026!",
  "newPassword": "NuevaClaveSegura1"
}
```

| Campo | Tipo | Obligatorio |
| --- | --- | --- |
| `currentPassword` | `string` | Sí |
| `newPassword` | `string` | Sí (política de complejidad según servidor) |

**Respuesta `200`:** mismo perfil que login, con `accessToken` de sesión normal y `mustChangePassword: false`.

**Errores:** `401`, `409`, `422`.

---

### POST `/auth/forgot-password`

**Descripción:** Solicita recuperación de contraseña por correo.

**Autenticación:** no.

**Cuerpo (JSON):**

```json
{
  "email": "maria@example.com"
}
```

**Respuesta `202`:** cuerpo genérico (sin revelar si el correo existe).

**Errores:** `422`.

---

### POST `/auth/reset-password`

**Descripción:** Establece nueva contraseña con token recibido por correo.

**Autenticación:** no.

**Cuerpo (JSON):**

```json
{
  "token": "string-opaco-del-correo",
  "password": "NuevaClaveSegura1"
}
```

**Respuesta `200`:** confirmación breve.

**Errores:** `400`, `410` (token vencido o usado), `422`.

---

### POST `/auth/logout`

**Descripción:** Invalida la sesión actual del token de acceso.

**Autenticación:** `Bearer` (token de acceso).

**Cuerpo:** vacío.

**Respuesta `204`:** sin cuerpo.

**Errores:** `401`.

---

## Países

### GET `/countries`

**Descripción:** Lista países disponibles para registro y filtros.

**Autenticación:** no.

**Respuesta `200`:**

```json
[
  {
    "id": 1,
    "name": "Argentina",
    "shortName": "AR",
    "capital": "Buenos Aires",
    "nationality": "argentina",
    "languages": "es"
  }
]
```

**Errores:** `500`.

---

## Usuarios

### GET `/users/me`

**Descripción:** Perfil del usuario autenticado.

**Autenticación:** `Bearer` (token de acceso, no el de primer cambio si el backend lo distingue).

**Respuesta `200` (ejemplo orientativo):**

```json
{
  "id": 7,
  "documentNumber": "40123456",
  "fullName": "María García",
  "address": "Calle Falsa 123",
  "status": "activo",
  "country": {
    "id": 1,
    "name": "Argentina"
  },
  "admitted": "si",
  "category": "plata"
}
```

**Errores:** `401`, `404`.

---

### GET `/users/me/metrics`

**Descripción:** Resumen numérico de actividad del usuario.

**Autenticación:** `Bearer`.

**Respuesta `200`:**

```json
{
  "totalAuctionsAttended": 3,
  "totalWins": 1,
  "totalBidsPlaced": 12,
  "totalAmountOffered": 450000.0,
  "totalAmountWon": 120000.0
}
```

**Errores:** `401`.

---

### GET `/users/me/auctions`

**Descripción:** Subastas en las que el usuario participó o participa.

**Autenticación:** `Bearer`.

**Respuesta `200`:** arreglo de objetos con el mismo shape resumido que **GET** `/auctions` (ver sección Subastas).

**Errores:** `401`.

---

### GET `/users/me/bids`

**Descripción:** Historial de pujas del usuario en todas las subastas.

**Autenticación:** `Bearer`.

**Respuesta `200`:**

```json
[
  {
    "id": 22,
    "auctionId": 5,
    "itemId": 100,
    "amount": 2000.0,
    "isWinning": false
  }
]
```

**Errores:** `401`.

---

### GET `/users/me/wins`

**Descripción:** Subastas o ítems ganados por el usuario.

**Autenticación:** `Bearer`.

**Respuesta `200`:**

```json
[
  {
    "id": 14,
    "auctionId": 5,
    "itemId": 100,
    "amount": 2000.0,
    "commission": 200.0
  }
]
```

**Errores:** `401`.

---

### GET `/users/me/live-session`

**Descripción:** Indica si el usuario tiene una sesión interactiva activa en alguna subasta.

**Autenticación:** `Bearer`.

**Respuesta `200` (ejemplo):**

```json
{
  "active": true,
  "auctionId": 5
}
```

**Errores:** `401`.

---

## Subastas

### GET `/auctions`

**Descripción:** Lista subastas públicas o filtradas.

**Autenticación:** opcional (según política del servidor para campos extra).

**Query (opcionales):**

| Parámetro | Tipo | Descripción |
| --- | --- | --- |
| `status` | `string` | `scheduled`, `live`, `closed` |
| `category` | `string` | `comun`, `especial`, `plata`, `oro`, `platino` |

**Respuesta `200`:**

```json
[
  {
    "id": 5,
    "date": "2026-06-10",
    "time": "18:30:00",
    "status": "scheduled",
    "category": "plata",
    "location": "Av. Corrientes 1234",
    "capacity": 150,
    "hasDeposit": "si",
    "hasOwnSecurity": "no",
    "auctioneer": {
      "id": 3,
      "fullName": "Carlos Pérez",
      "licenseNumber": "MAT-123",
      "region": "CABA"
    }
  }
]
```

**Errores:** `400`, `422`.

---

### GET `/auctions/{auctionId}`

**Descripción:** Detalle de una subasta.

**Autenticación:** opcional.

**Parámetros de ruta:**

| Nombre | Tipo | Obligatorio |
| --- | --- | --- |
| `auctionId` | `integer` | Sí |

**Respuesta `200`:** un objeto como en la lista de **GET** `/auctions`.

**Errores:** `404`, `422`.

---

### GET `/auctions/{auctionId}/items`

**Descripción:** Ítems del catálogo de la subasta.

**Autenticación:** opcional.

**Parámetros de ruta:**

| Nombre | Tipo | Obligatorio |
| --- | --- | --- |
| `auctionId` | `integer` | Sí |

**Respuesta `200`:**

```json
[
  {
    "id": 100,
    "productId": 34,
    "catalogId": 12,
    "basePrice": 1500.0,
    "commission": 150.0,
    "auctioned": "no",
    "catalogDescription": "Reloj antiguo en buen estado",
    "imageUrls": ["/api/products/34/photos/1"]
  }
]
```

**Errores:** `404`, `422`.

---

### GET `/auctions/{auctionId}/live`

**Descripción:** Estado en vivo de la subasta (ítem actual, oferta vigente, límites de siguiente puja).

**Autenticación:** `Bearer`.

**Parámetros de ruta:**

| Nombre | Tipo | Obligatorio |
| --- | --- | --- |
| `auctionId` | `integer` | Sí |

**Respuesta `200`:**

```json
{
  "auctionId": 5,
  "status": "live",
  "currentItem": {
    "id": 100,
    "productId": 34,
    "catalogDescription": "Reloj antiguo en buen estado",
    "basePrice": 1500.0
  },
  "currentBid": 2000.0,
  "highestBidderId": 7,
  "minNextBid": 2015.0,
  "maxNextBid": 2300.0,
  "serverTime": "2026-06-10T18:45:00.000Z"
}
```

- En subastas con categoría `oro` o `platino`, `minNextBid` y `maxNextBid` pueden coincidir con la regla de negocio sin tope porcentual (ver Pujas).

**Errores:** `401`, `404`, `409` (subasta no en vivo).

---

### POST `/auctions/{auctionId}/live/session`

**Descripción:** Vincula al usuario a la sala en vivo de la subasta (una sesión activa a la vez).

**Autenticación:** `Bearer`.

**Parámetros de ruta:** `auctionId` (`integer`).

**Cuerpo:** vacío o `{}`.

**Respuesta `201` o `204`:** según implementación (confirmación de sesión).

**Errores:** `401`, `403`, `409` (ya hay otra sesión activa).

---

### DELETE `/auctions/{auctionId}/live/session`

**Descripción:** Libera la sesión en vivo del usuario para esa subasta.

**Autenticación:** `Bearer`.

**Parámetros de ruta:** `auctionId` (`integer`).

**Respuesta `204`:** sin cuerpo.

**Errores:** `401`, `404`.

---

## Pujas

### POST `/auctions/{auctionId}/bids`

**Descripción:** Envía una oferta en una subasta activa.

**Autenticación:** `Bearer`.

**Parámetros de ruta:** `auctionId` (`integer`).

**Cuerpo (JSON):**

```json
{
  "itemId": 100,
  "amount": 2100.0
}
```

| Campo | Tipo | Obligatorio |
| --- | --- | --- |
| `itemId` | `integer` | Sí |
| `amount` | `number` | Sí |

**Reglas de negocio**

- El monto debe ser **estrictamente mayor** que la oferta vigente del ítem.
- **Mínimo siguiente:** oferta vigente + **1%** del precio base del ítem.
- **Máximo siguiente:** oferta vigente + **20%** del precio base del ítem.
- En subastas con categoría **`oro`** o **`platino`**, los límites porcentuales **no aplican** (solo “mayor que la oferta vigente”, salvo regla adicional del servidor).

**Respuesta `201`:**

```json
{
  "id": 22,
  "auctionId": 5,
  "itemId": 100,
  "userId": 7,
  "amount": 2100.0,
  "isWinning": true
}
```

**Errores:** `400`, `401`, `403`, `404`, `409`, `422`.

---

### GET `/auctions/{auctionId}/bids/history`

**Descripción:** Historial de pujas de la subasta (orden cronológico).

**Autenticación:** `Bearer`.

**Parámetros de ruta:** `auctionId` (`integer`).

**Respuesta `200`:**

```json
{
  "totalBids": 2,
  "bids": [
    {
      "id": 21,
      "itemId": 100,
      "userId": 8,
      "amount": 2000.0,
      "isWinning": false
    },
    {
      "id": 22,
      "itemId": 100,
      "userId": 7,
      "amount": 2100.0,
      "isWinning": true
    }
  ]
}
```

**Errores:** `401`, `404`.

---

## Ítems

### GET `/items/{itemId}`

**Descripción:** Detalle de un ítem de catálogo.

**Autenticación:** opcional.

**Parámetros de ruta:** `itemId` (`integer`).

**Respuesta `200`:**

```json
{
  "id": 100,
  "catalogId": 12,
  "productId": 34,
  "basePrice": 1500.0,
  "commission": 150.0,
  "auctioned": "no",
  "catalogDescription": "Reloj antiguo en buen estado",
  "fullDescriptionUrl": "https://example.com/documento.pdf",
  "owner": {
    "id": 9,
    "fullName": "Roberto Díaz"
  },
  "imageUrls": [
    "/api/products/34/photos/1",
    "/api/products/34/photos/2"
  ]
}
```

**Errores:** `404`, `422`.

---

### GET `/items/{itemId}/insurance`

**Descripción:** Datos de la póliza asociada al producto del ítem.

**Autenticación:** `Bearer`.

**Parámetros de ruta:** `itemId` (`integer`).

**Respuesta `200`:**

```json
{
  "policyNumber": "POL-2024-001",
  "company": "Aseguradora SA",
  "combinedPolicy": "no",
  "amount": 50000.0
}
```

**Errores:** `401`, `404`.

---

## Consignaciones (`/item-submissions`)

Flujo simplificado: alta de producto con descripciones y fotos para revisión.

### POST `/item-submissions`

**Autenticación:** `Bearer`.

**Cuerpo (JSON):**

```json
{
  "catalogDescription": "Reloj antiguo en buen estado",
  "fullDescriptionUrl": "https://example.com/documento.pdf",
  "imageBase64List": ["base64-image-1", "base64-image-2"]
}
```

| Campo | Tipo | Obligatorio |
| --- | --- | --- |
| `catalogDescription` | `string` | Sí |
| `fullDescriptionUrl` | `string` (URL) | Sí |
| `imageBase64List` | `string[]` | No |

**Respuesta `201`:**

```json
{
  "id": 34,
  "catalogDescription": "Reloj antiguo en buen estado",
  "fullDescriptionUrl": "https://example.com/documento.pdf",
  "available": "si"
}
```

**Errores:** `401`, `422`.

---

### GET `/users/me/item-submissions`

**Autenticación:** `Bearer`.

**Respuesta `200`:**

```json
[
  {
    "id": 34,
    "catalogDescription": "Reloj antiguo en buen estado",
    "fullDescriptionUrl": "https://example.com/documento.pdf",
    "available": "si",
    "imageUrls": ["/api/products/34/photos/1"]
  }
]
```

**Errores:** `401`.

---

### GET `/item-submissions/{submissionId}`

**Autenticación:** `Bearer`.

**Parámetros de ruta:** `submissionId` (`integer`).

**Respuesta `200`:** un objeto como cada elemento del listado anterior.

**Errores:** `401`, `404`.

---

## Liquidaciones (vendedor)

### GET `/users/me/seller/settlements`

**Descripción:** Registros de ventas en las que el usuario actúa como vendedor.

**Autenticación:** `Bearer`.

**Respuesta `200`:**

```json
[
  {
    "id": 14,
    "auctionId": 5,
    "productId": 34,
    "ownerId": 9,
    "buyerId": 7,
    "amount": 2000.0,
    "commission": 200.0
  }
]
```

**Errores:** `401`.

---

### GET `/users/me/seller/settlements/{settlementId}`

**Autenticación:** `Bearer`.

**Parámetros de ruta:** `settlementId` (`integer`).

**Respuesta `200`:** un objeto del mismo formato que cada elemento del listado.

**Errores:** `401`, `404`.

---

## Notificaciones

### GET `/users/me/notifications`

**Descripción:** Lista de avisos para el usuario (puede generarse a partir de eventos de subasta y liquidaciones).

**Autenticación:** `Bearer`.

**Respuesta `200`:**

```json
[
  {
    "id": "win-14",
    "type": "auction_won",
    "title": "Ganaste una subasta",
    "message": "Ganaste el ítem 100 por $2000.00",
    "auctionId": 5,
    "itemId": 100
  }
]
```

**Nota:** el campo `id` puede ser string compuesto si no existe recurso persistente de notificación.

**Errores:** `401`.

---

## Endpoints no incluidos en esta versión del contrato

Los siguientes **no** forman parte del alcance documentado aquí (no enviar desde el cliente salvo acuerdo explícito con backend):

- Medios de pago: `GET/POST/PUT/DELETE /users/me/payment-methods`, verificación y reserva de fondos.
- Cuenta de cobro vendedor: `GET/PUT /users/me/seller/payout-account`.
- Aumento de cobertura: `POST /items/{itemId}/insurance/coverage-increase`.
- Marcar notificación leída: `PATCH /users/me/notifications/{notificationId}`.
- Envío / términos / cancelación avanzada de consignaciones: `DELETE /item-submissions/{id}`, `POST .../terms-decision`, `POST .../shipment`.

---

*Documento de contrato API — CrownBid.*
