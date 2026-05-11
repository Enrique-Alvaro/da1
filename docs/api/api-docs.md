# CrownBid API(1.2.2)

Download OpenAPI specification: Download

API REST para la aplicación móvil de CrownBid (UADE DA1 MVP).

## Trazabilidad con la consigna (DA1)

Este contrato documenta el mismo dominio funcional del TP: registro con verificación externa y
categoría asignada por la empresa, catálogos públicos con restricción de precios, participación
condicionada por categoría y medios de pago verificados, límites de puja salvo subastas oro/platino,
liquidaciones al vendedor, incumplimiento de pago del comprador (multa 10%, 72 h, bloqueo),
propuestas comerciales post-inspección, compra de la empresa al valor base ante ausencia de pujas,
seguro con posibilidad de ampliación de cobertura y mensajería privada (modelada como
notificaciones y desgloses de facturación).

## Resumen general

Esta API impulsa un sistema móvil de gestión de subastas donde los usuarios pueden:

```
Registrarse con datos personales; recibir una contraseña temporal por email , iniciar sesión y
luego definir una contraseña definitiva en el primer acceso antes de usar completamente la app.
Explorar catálogos (esquemas públicos *Catalog* sin precios base; Auction /
ItemDetail autenticados incluyen precios) y acceder a campos monetarios en vivo al iniciar
sesión.
Participar en subastas ascendentes con actualizaciones en tiempo real (WebSocket/SSE
recomendado; polling soportado como alternativa MVP).
Ver catálogos de ítems (incluyendo piezas compuestas por múltiples subelementos, números de
pieza y metadatos opcionales de arte/diseño).
Enviar sus propios ítems para subasta (incluyendo envío físico para inspección y
aceptación/rechazo explícito del precio base y comisión tras la inspección).
Gestionar medios de pago tipados por modalidad (cuenta bancaria, tarjeta de crédito, cheque
certificado), incluyendo garantías de participación para cheques certificados.
Declarar una cuenta bancaria de cobro del vendedor y consultar liquidaciones de bienes
consignados vendidos.
```

## Business Rules

```
Autenticación : Registro → correo con clave temporal → POST /auth/login (la respuesta lleva
mustChangePassword / isFirstLogin mientras aplique) → POST /auth/change-
initial-password obligatorio antes de considerar el perfil operativo para flujos sensibles
(medios de pago, pujas, etc.). Recuperación opcional: /auth/forgot-password +
/auth/reset-password. JWT requerido en el resto de rutas salvo catálogo público y
referencias.
Visibilidad de precios (TP) : los catálogos públicos modelan AuctionCatalogItem,
AuctionDetailCatalog, AuctionItemCatalog e ItemDetailCatalog sin propiedades
monetarias. Con JWT válido, las mismas rutas devuelven Auction, AuctionDetail,
AuctionItem e ItemDetail (incluyen AuctionPricingFields / AuctionItemPricing).
El estado en vivo y el historial de pujas siguen exigiendo token por montos competitivos.
Categories : Users have varying access levels (common, special, silver, gold,
platinum) — map to común / especial / plata / oro / platino in domain documentation. Certain
premium auctions require a minimum category level to place bids.
Bidding Restrictions :
Una puja siempre debe ser estrictamente mayor que currentBid.
Minimum bid: currentBid + 1% * basePrice. Maximum bid: currentBid + 20% *
basePrice. These limits do NOT apply to gold/platinum auctions.
Los usuarios DEBEN poseer al menos un medio de pago verificado para participar.
Con garantía limitada (cheque certificado / fondos reservados), se rechazan ofertas por
encima del tope garantizado (TP).
Sesión activa única de subasta (TP) : un usuario NO DEBE mantener una sesión interactiva en vivo
en más de una subasta al mismo tiempo. Se aplica vía
/auctions/{auctionId}/live/session (ver respuestas 409).
Incumplimiento de pago del ganador (TP) : Si el pago falla, aplica una multa del 10% sobre el
monto ofertado, el usuario tiene 72 horas para regularizar fondos, no puede unirse a otra subasta
hasta resolver la situación y la persistencia del incumplimiento puede derivar en suspensión del
servicio (User.accountServiceSuspended).
Publicación de ítems : Las publicaciones siguen un flujo interno de revisión que incluye términos
comerciales post-inspección (terms_proposed). El envío físico es obligatorio tras la aceptación
inicial. Si el usuario rechaza el precio base / comisión propuestos, el bien se devuelve (pueden
aplicar costos — ver rejectionReason / notificaciones). Los términos comerciales aceptados
hacen avanzar el ítem hacia la programación.
Sin pujas (TP) : Cuando un ítem no recibe pujas en la subasta, la empresa puede comprarlo al
precio base publicado — reflejado bajo AuctionItem.status ==
company_purchased_at_base.
Seguro (TP) : Todo ítem consignado cuenta con un seguro corporativo base. Los dueños pueden
solicitar monto asegurado adicional ; cualquier diferencia de prima se cobra antes de actualizar la
póliza.
Pagos al vendedor (TP) : los ingresos de bienes vendidos propiedad de clientes se transfieren a
una cuenta de cobro previamente declarada (/users/me/seller/payout-account). Los
registros de liquidación exponen el estado de transferencia para auditoría.
```

# Auth

Registro, login (incluye primer acceso con clave temporal y flags mustChangePassword /
isFirstLogin), logout, cambio obligatorio de contraseña inicial, y recuperación opcional de acceso.

## Registrar usuario con datos personales

Registra el legajo (nombre, apellido, documento, domicilio legal, país, imágenes del DNI y correo). Si el
alta es exitosa, el sistema **envía por email una contraseña temporal** (no devuelve la clave en el cuerpo
de la API).

El usuario vuelve a la pantalla de **inicio de sesión** e ingresa esa clave temporal en POST
/auth/login. La **categoría** asignada por la empresa y demás datos de perfil siguen el circuito
manual de backoffice y aparecen en GET /users/me cuando corresponda.

REQUEST BODY SCHEMA: application/json

```
string
```
```
string
```
```
string<email>
```
```
string
```
```
string
Domicilio legal del usuario.
```
```
string
Código ISO-3166 alpha-2 del país de origen del usuario.
```
```
string<uri>
URL de la imagen frontal del documento nacional cargada.
```
```
string<uri>
URL de la imagen trasera del documento nacional cargada.
```
```
firstName
required
```
```
lastName
required
```
```
email
required
```
```
documentId
required
```
```
address
required
```
```
country
required
```
```
documentFrontImageUrl
required
```
```
documentBackImageUrl
required
```

### Responses

```
201 Alta aceptada; se disparó el envío de la contraseña temporal al correo indicado.
```
```
400 Solicitud incorrecta (parámetros o query strings inválidos)
```
```
409 Conflicto (p. ej., el email ya existe, la puja es menor al mínimo)
```
```
422 Entidad no procesable (falló la validación del esquema)
```
#### Request samples

```
Payload
```
#### Response samples

```
201 400 409 422
```
```
POST /auth/register
```
```
application/json
```
```
Copy
{
"firstName": "string",
"lastName": "string",
"email": "user@example.com",
"documentId": "string",
"address": "string",
"country": "string",
"documentFrontImageUrl": "http://example.com",
"documentBackImageUrl": "http://example.com"
}
```
```
application/json
```
```
Copy Expand all Collapse all
{
"message": "Se envió una contraseña temporal al correo indicado. Revisá t
```
```
Content type
```
```
Content type
```

- "user": {
    "id": "497f6eca-6276-4993-bfeb-53cbbbba6f08",
    "firstName": "string",
    "lastName": "string",
    "email": "user@example.com",
    "documentId": "string",
    "address": "string",
    "country": "AR",
    "photoUrl": "http://example.com",
    "documentFrontImageUrl": "http://example.com",
    "documentBackImageUrl": "http://example.com",
    "category": "common",
    "status": "pending_verification",
    "biddingBlockedUntilResolved": true,
    "delinquentWinId": "9a9b588f-b2b3-4db1-9faa-82754cda1452",
    "accountServiceSuspended": true,
    "requiresPasswordChange": true
},
"emailSentTo": "user@example.com"
}

## Iniciar sesión (clave temporal o definitiva)

Autentica con email + password. El campo password admite tanto la **clave temporal** recibida
por mail como la **clave definitiva** ya definida por el usuario.

Si el backend detecta **primer acceso** aún con clave temporal (proceso inicial de seguridad incompleto),
la respuesta incluye mustChangePassword: true e isFirstLogin: true, más un
accessToken **acotado** a ese estado: la app debe mostrar **obligatoriamente** la pantalla de nueva
contraseña y llamar a POST /auth/change-initial-password antes de tratar al usuario como
plenamente operativo (pujas, medios de pago, etc.).

Tras el cambio de contraseña inicial, nuevos inicios de sesión devuelven mustChangePassword:
false e isFirstLogin: false (sesión normal).

REQUEST BODY SCHEMA: application/json

```
string<email>
```
```
string<password>
Clave temporal recibida por email o contraseña definitiva ya definida.
```
```
email
required
```
```
password
required
```

### Responses

```
200 Autenticación exitosa (revisar flags de primer acceso en el cuerpo).
```
```
400 Solicitud incorrecta (parámetros o query strings inválidos)
```
```
401 No autorizado (token ausente, manipulado o expirado)
```
#### Request samples

```
Payload
```
#### Response samples

```
200 400 401
```
```
POST /auth/login
```
```
application/json
```
```
Copy
{
"email": "user@example.com",
"password": "pa$$word"
}
```
```
application/json
```
```
Copy Expand all Collapse all
{
"accessToken": "eyJhbGciOiJIUzI1NiIsInR5c... (token jwt)",
```
```
Content type
```
```
Content type
```

- "user": {
    "id": "497f6eca-6276-4993-bfeb-53cbbbba6f08",
    "firstName": "string",
    "lastName": "string",
    "email": "user@example.com",
    "documentId": "string",
    "address": "string",
    "country": "AR",
    "photoUrl": "http://example.com",
    "documentFrontImageUrl": "http://example.com",
    "documentBackImageUrl": "http://example.com",
    "category": "common",
    "status": "pending_verification",
    "biddingBlockedUntilResolved": true,
    "delinquentWinId": "9a9b588f-b2b3-4db1-9faa-82754cda1452",
    "accountServiceSuspended": true,
    "requiresPasswordChange": true
},
"mustChangePassword": true,
"isFirstLogin": true
}

## Cerrar sesión

Invalida la sesión del **JWT actual** en el servidor (p. ej. lista de revocación o rotación de sesión). La app
móvil debe **eliminar el token** almacenado localmente aunque la llamada falle con red intermitente
(comportamiento idempotente recomendado en cliente).

##### AUTHORIZATIONS: BearerAuth

### Responses

```
— 204 Sesión cerrada correctamente (sin cuerpo).
```
```
401 No autorizado (token ausente, manipulado o expirado)
```

#### Response samples

```
401
```
```
POST /auth/logout
```
```
application/json
```
```
Copy
{
"error": "InvalidBidAmountError",
"message": "El monto de puja debe ser estrictamente mayor a la puja actua
"statusCode": 409
}
```
## Definir la contraseña definitiva tras el primer login

Pantalla obligatoria del primer acceso: el usuario autenticado (JWT del login con clave temporal) envía
la **clave temporal actual** y la **nueva contraseña** definitiva.

El backend valida la temporal, persiste la nueva clave, marca el perfil como **sin**
requiresPasswordChange, y devuelve un AuthResponse **normalizado** (mustChangePassword e
isFirstLogin en false, token apto para el resto de la app).

Si el usuario ya completó este paso, responder 409.

##### AUTHORIZATIONS: BearerAuth

REQUEST BODY SCHEMA: application/json

```
string<password>
Contraseña temporal vigente (la recibida por email en el registro).
```
```
string<password> >= 8 characters
Nueva contraseña definitiva. Mismas reglas de complejidad que el resto del
sistema (p. ej. mayúscula + minúscula según política del backend).
```
### Responses

```
currentPassword
required
```
```
newPassword
required
```
```
Content type
```

```
200 Contraseña definitiva guardada; sesión actualizada.
```
```
400 Solicitud incorrecta (parámetros o query strings inválidos)
```
```
401 No autorizado (token ausente, manipulado o expirado)
```
```
409 El usuario ya no está en flujo de primer cambio de contraseña.
```
```
422 Entidad no procesable (falló la validación del esquema)
```
#### Request samples

```
Payload
```
#### Response samples

```
200 400 401 409 422
```
```
POST /auth/change-initial-password
```
```
application/json
```
```
Copy
{
"currentPassword": "pa$$word",
"newPassword": "pa$$word"
}
```
```
application/json
```
```
Copy Expand all Collapse all
{
"accessToken": "eyJhbGciOiJIUzI1NiIsInR5c... (token jwt)",
```
```
Content type
```
```
Content type
```

- "user": {
    "id": "497f6eca-6276-4993-bfeb-53cbbbba6f08",
    "firstName": "string",
    "lastName": "string",
    "email": "user@example.com",
    "documentId": "string",
    "address": "string",
    "country": "AR",
    "photoUrl": "http://example.com",
    "documentFrontImageUrl": "http://example.com",
    "documentBackImageUrl": "http://example.com",
    "category": "common",
    "status": "pending_verification",
    "biddingBlockedUntilResolved": true,
    "delinquentWinId": "9a9b588f-b2b3-4db1-9faa-82754cda1452",
    "accountServiceSuspended": true,
    "requiresPasswordChange": true
},
"mustChangePassword": true,
"isFirstLogin": true
}

## Solicitar un correo de restablecimiento de contraseña

Envía un enlace de restablecimiento de un solo uso (o token) al correo del usuario cuando la cuenta
existe y está habilitada para autenticarse. La respuesta es intencionalmente genérica para evitar
revelar si un correo está registrado.

REQUEST BODY SCHEMA: application/json

```
string<email>
Correo de la cuenta para recibir instrucciones de restablecimiento.
```
### Responses

###### 202

```
Las instrucciones de restablecimiento se encolaron para envío si el correo coincidió con una cuenta
activa.
```
```
email
required
```

```
400 Solicitud incorrecta (parámetros o query strings inválidos)
```
```
422 Entidad no procesable (falló la validación del esquema)
```
#### Request samples

```
Payload
```
#### Response samples

```
202 400 422
```
```
POST /auth/forgot-password
```
```
application/json
```
```
Copy
{
"email": "user@example.com"
}
```
```
application/json
```
```
Copy
{
"message": "Si existe una cuenta para este correo, las instrucciones de r
}
```
## Definir una nueva contraseña usando un token de

## restablecimiento

Consume el token de un solo uso del correo de restablecimiento y reemplaza la contraseña del
usuario. Devuelve una sesión nueva para que el cliente continúe sin una llamada extra de login.

```
Content type
```
```
Content type
```

REQUEST BODY SCHEMA: application/json

```
string
Token de un solo uso del correo de restablecimiento (o contenido de enlace
profundo).
```
```
string<password> >= 8 characters
Debe contener al menos una letra mayúscula y una letra minúscula.
```
### Responses

###### 200

```
Contraseña actualizada; nueva sesión. AuthResponse con mustChangePassword: false e
isFirstLogin: false (flujo de recuperación, distinto del primer acceso con clave temporal).
```
```
400 Solicitud incorrecta (parámetros o query strings inválidos)
```
```
401
El token de restablecimiento es inválido, ya fue usado o no coincide con ningún restablecimiento
pendiente.
```
```
410 El token de restablecimiento expiró.
```
```
422 Entidad no procesable (falló la validación del esquema)
```
#### Request samples

```
Payload
```
```
token
required
```
```
password
required
```
```
POST /auth/reset-password
```
```
application/json
```
```
Copy
{
"token": "string",
"password": "pa$$word"
}
```
```
Content type
```

# Users

Perfiles autenticados de usuario y métricas

#### Response samples

```
200 400 401 410 422
```
```
application/json
```
```
Copy Expand all Collapse all
{
"accessToken": "eyJhbGciOiJIUzI1NiIsInR5c... (token jwt)",
```
- "user": {
    "id": "497f6eca-6276-4993-bfeb-53cbbbba6f08",
    "firstName": "string",
    "lastName": "string",
    "email": "user@example.com",
    "documentId": "string",
    "address": "string",
    "country": "AR",
    "photoUrl": "http://example.com",
    "documentFrontImageUrl": "http://example.com",
    "documentBackImageUrl": "http://example.com",
    "category": "common",
    "status": "pending_verification",
    "biddingBlockedUntilResolved": true,
    "delinquentWinId": "9a9b588f-b2b3-4db1-9faa-82754cda1452",
    "accountServiceSuspended": true,
    "requiresPasswordChange": true
},
"mustChangePassword": true,
"isFirstLogin": true
}

## Obtener perfil autenticado actual

```
Content type
```

Incluye requiresPasswordChange: la app puede usarlo junto con los flags de AuthResponse para
bloquear navegación a flujos sensibles hasta completar el cambio de contraseña inicial.

##### AUTHORIZATIONS: BearerAuth

### Responses

```
200 Perfil obtenido correctamente
```
```
401 No autorizado (token ausente, manipulado o expirado)
```
#### Response samples

```
200 401
```
```
GET /users/me
```
```
application/json
```
```
Copy
{
"id": "497f6eca-6276-4993-bfeb-53cbbbba6f08",
"firstName": "string",
"lastName": "string",
"email": "user@example.com",
"documentId": "string",
"address": "string",
"country": "AR",
"photoUrl": "http://example.com",
"documentFrontImageUrl": "http://example.com",
"documentBackImageUrl": "http://example.com",
"category": "common",
"status": "pending_verification",
"biddingBlockedUntilResolved": true,
"delinquentWinId": "9a9b588f-b2b3-4db1-9faa-82754cda1452",
"accountServiceSuspended": true,
"requiresPasswordChange": true
}
```
```
Content type
```

## Métricas agregadas del usuario

Devuelve estadísticas agregadas sobre la actividad del usuario: participaciones, victorias, montos
pagados/ofertados, desglose por categoría de subasta. Alimenta la sección de métricas de la pantalla
de Perfil.

##### AUTHORIZATIONS: BearerAuth

### Responses

```
200 Métricas agregadas del usuario
```
```
401 No autorizado (token ausente, manipulado o expirado)
```
#### Response samples

```
200 401
```
```
GET /users/me/metrics
```
```
application/json
```
```
Copy Expand all Collapse all
{
"totalAuctionsAttended": 0 ,
"totalWins": 0 ,
"totalBidsPlaced": 0 ,
"totalAmountOffered": 0 ,
"totalAmountPaid": 0 ,
"winRate": 0 ,
```
- "byCategory": [
    + { ... }
]
}

```
Content type
```

# Auctions

Exploración global de subastas (GET /auctions incluye filtro opcional featured para la UI de
**Subastas Destacadas** ). Catálogo público vs. autenticado se diferencia por esquema (sin vs. con
precios).

## Listar subastas disponibles

**Catálogo (TP):** sin Authorization, cada elemento cumple AuctionCatalogItem (sin
basePrice ni currentBid). Con JWT válido, el cuerpo es un arreglo de Auction (catálogo +
AuctionPricingFields).

**Subastas destacadas (UI):** featured=true limita el resultado al conjunto promocionado para la

##### pantalla Subastas Destacadas; featured=false u omitido no aplica este filtro.

Si se envía un Authorization mal formado o expirado, el servidor **debe** responder 401 (no
degradar silenciosamente a vista anónima).

##### AUTHORIZATIONS: None or BearerAuth

###### QUERY PARAMETERS

```
string (AuctionStatus)
Enum: "scheduled" "live" "closed"
Filtro opcional por estado.
```
```
boolean
true = solo subastas destacadas para la pantalla de Subastas
Destacadas. Omitido o false = no filtrar por destacado (pueden convivir
con otros filtros como status).
```
## Responses

###### 200

```
Anónimo: AuctionCatalogItem[]. Autenticado: Auction[] (mismas entidades con capa de
precios).
```
```
status
```
```
featured
```

```
401 No autorizado (token ausente, manipulado o expirado)
```
#### Response samples

```
200 401
```
```
GET /auctions
```
```
application/json
```
```
Copy Expand all Collapse all
[
```
- {
    "id": "497f6eca-6276-4993-bfeb-53cbbbba6f08",
    "title": "string",
    "description": "string",
    "coverImageUrl": "http://example.com",
    "categoryRequired": "common",
    "currency": "ARS",
    "startDate": "2019-08-24T14:15:22Z",
    "endDate": "2019-08-24T14:15:22Z",
    "status": "scheduled",
    "location": "string",
+ "auctioneer": { ... }
}
]

## Obtener detalle de subasta

**Catálogo (TP):** sin JWT la respuesta es AuctionDetailCatalog (sin precios). Con Bearer válido,
AuctionDetail (incluye AuctionPricingFields). Misma política 401 que /auctions.

##### AUTHORIZATIONS: None or BearerAuth

###### PATH PARAMETERS

```
Content type
```

```
string<uuid>
Identificador único de la subasta.
```
### Responses

```
200 Anónimo AuctionDetailCatalog; autenticado AuctionDetail.
```
```
401 No autorizado (token ausente, manipulado o expirado)
```
```
404 Recurso no encontrado
```
#### Response samples

```
200 401 404
```
```
auctionId
required
```
```
GET /auctions/{auctionId}
```
```
application/json
```
```
Copy Expand all Collapse all
{
"id": "497f6eca-6276-4993-bfeb-53cbbbba6f08",
"title": "string",
"description": "string",
"coverImageUrl": "http://example.com",
"categoryRequired": "common",
"currency": "ARS",
"startDate": "2019-08-24T14:15:22Z",
"endDate": "2019-08-24T14:15:22Z",
"status": "scheduled",
"location": "string",
```
- "auctioneer": {
    "id": "497f6eca-6276-4993-bfeb-53cbbbba6f08",
    "firstName": "string",
    "lastName": "string",
    "licenseNumber": "string",
    "region": "string"
},

```
Content type
```

```
"itemsCount": 0 ,
```
- "rules": [
    "string"
]
}

## Listar ítems pertenecientes a una subasta

**Catálogo (TP):** anónimo → AuctionItemCatalog[]; autenticado → AuctionItem[] (agrega
AuctionItemPricing).

##### AUTHORIZATIONS: None or BearerAuth

###### PATH PARAMETERS

```
string<uuid>
Identificador único de la subasta.
```
### Responses

```
200 Lista de ítems; forma depende de autenticación (ver descripción de operación).
```
```
401 No autorizado (token ausente, manipulado o expirado)
```
```
404 Recurso no encontrado
```
#### Response samples

```
200 401 404
```
```
auctionId
required
```
```
GET /auctions/{auctionId}/items
```
```
application/json
```
```
Copy Expand all Collapse all
```
```
Content type
```

# Items

Vista detallada de recursos subastables (incluyendo seguro)

###### [

###### - {

```
"id": "497f6eca-6276-4993-bfeb-53cbbbba6f08",
"auctionId": "1b0383e0-fa9f-4f21-bfb0-a5423e98b82d",
"pieceNumber": "string",
"title": "string",
"status": "unsold",
+ "imageUrls": [ ... ]
}
]
```
## Obtener especificación detallada del ítem

**TP — visibilidad de precios:** sin JWT la respuesta es ItemDetailCatalog (sin capa de precios). Con
Bearer válido, ItemDetail (AuctionItem + extensiones).

##### AUTHORIZATIONS: None or BearerAuth

###### PATH PARAMETERS

```
string<uuid>
```
## Responses

```
200 Anónimo ItemDetailCatalog; autenticado ItemDetail.
```
```
401 No autorizado (token ausente, manipulado o expirado)
```
```
404 Recurso no encontrado
```
```
itemId
required
```

#### Response samples

```
200 401 404
```
```
GET /items/{itemId}
```
```
application/json
```
```
Copy Expand all Collapse all
{
"id": "497f6eca-6276-4993-bfeb-53cbbbba6f08",
"auctionId": "1b0383e0-fa9f-4f21-bfb0-a5423e98b82d",
"pieceNumber": "string",
"title": "string",
"status": "unsold",
```
- "imageUrls": [
    "http://example.com"
],
"description": "string",
"artistOrDesigner": "string",
"creationOrEraLabel": "string",
"historicalContext": "string",
"currentOwnerId": "2adf8857-cc6e-4581-bb66-004f674d7900",
- "components": [
    + { ... }
]
}

## Obtener póliza de seguro que cubre este ítem

Devuelve la póliza de seguro contratada por la empresa para este ítem. Disponible para el dueño actual
(beneficiario) y para el comprador una vez cerrada la venta.

##### AUTHORIZATIONS: BearerAuth

###### PATH PARAMETERS

```
itemIdrequired string<uuid>
```
```
Content type
```

### Responses

```
200 Detalles de la póliza de seguro
```
```
401 No autorizado (token ausente, manipulado o expirado)
```
```
403 Prohibido (token válido provisto, pero privilegios/requisitos insuficientes)
```
```
404 Recurso no encontrado
```
#### Response samples

```
200 401 403 404
```
```
GET /items/{itemId}/insurance
```
```
application/json
```
```
Copy Expand all Collapse all
{
"policyNumber": "string",
"insurerName": "string",
"baselineInsuredAmount": 0 ,
"upgradedInsuredAmount": 0 ,
"lastCoverageUpgradePaidAt": "2019-08-24T14:15:22Z",
```
- "coveredItemIds": [
    "497f6eca-6276-4993-bfeb-53cbbbba6f08"
],
"insuredAmount": 0 ,
"currency": "ARS",
"startDate": "2019-08-24T14:15:22Z",
"endDate": "2019-08-24T14:15:22Z",
"beneficiaryUserId": "6a2c1627-563b-4f3b-9b61-aee95dd555f6",
"depotLocation": "string"
}

```
Content type
```

## Solicitar mayor monto asegurado (diferencia a cargo del

## dueño)

**TP — ampliación de cobertura:** el dueño consignante solicita incrementar el capital asegurado. El
backend calcula la prima adicional; el cargo se confirma contra un medio de pago verificado.

##### AUTHORIZATIONS: BearerAuth

###### PATH PARAMETERS

```
string<uuid>
```
REQUEST BODY SCHEMA: application/json

```
number<float> >= 0
Capital asegurado deseado (debe superar la cobertura vigente).
```
```
string<uuid>
Medio verificado del dueño para debitar la diferencia de prima.
```
### Responses

```
200 Póliza actualizada tras cobro exitoso / validación de suscripción
```
```
400 Solicitud incorrecta (parámetros o query strings inválidos)
```
```
401 No autorizado (token ausente, manipulado o expirado)
```
```
402 Falló el cobro por diferencia de prima.
```
```
403 Prohibido (token válido provisto, pero privilegios/requisitos insuficientes)
```
```
404 Recurso no encontrado
```
```
409 El aumento no está permitido para el estado actual del ciclo de vida del ítem.
```
```
422 Entidad no procesable (falló la validación del esquema)
```
```
itemId
required
```
```
targetInsuredAmount
required
```
```
paymentMethodId
required
```

#### Request samples

```
Payload
```
#### Response samples

```
200 400 401 402 403 404 409 422
```
```
POST /items/{itemId}/insurance/coverage-increase
```
```
application/json
```
```
Copy
{
"targetInsuredAmount": 0 ,
"paymentMethodId": "b6df8625-cd25-4123-b345-638aa7b5d011"
}
```
```
application/json
```
```
Copy Expand all Collapse all
{
"policyNumber": "string",
"insurerName": "string",
"baselineInsuredAmount": 0 ,
"upgradedInsuredAmount": 0 ,
"lastCoverageUpgradePaidAt": "2019-08-24T14:15:22Z",
```
- "coveredItemIds": [
    "497f6eca-6276-4993-bfeb-53cbbbba6f08"
],
"insuredAmount": 0 ,
"currency": "ARS",
"startDate": "2019-08-24T14:15:22Z",
"endDate": "2019-08-24T14:15:22Z",
"beneficiaryUserId": "6a2c1627-563b-4f3b-9b61-aee95dd555f6",
"depotLocation": "string"
}

```
Content type
```
```
Content type
```

# Live Bids

Seguimiento de subastas en vivo, pujas y **sesión única** por usuario. El TP exige actualizaciones en
tiempo real: usar WebSocket/SSE cuando esté disponible y GET /auctions/{auctionId}/live
como snapshot + alternativa de polling (suggestedPollIntervalMs).

## Inspeccionar la vinculación interactiva actual a subasta en

## vivo

Permite al cliente móvil saber si ya existe una sesión activa antes de llamar a POST
/auctions/{auctionId}/live/session (TP: una sola subasta simultánea).

##### AUTHORIZATIONS: BearerAuth

## Responses

```
200 Estado actual de sesión (id de subasta activa si existe)
```
```
401 No autorizado (token ausente, manipulado o expirado)
```
#### Response samples

```
200 401
```
```
GET /users/me/live-session
```
```
application/json
```
```
Copy
{
"activeAuctionId": "5354e8d3-3578-4411-9bc5-5ae0e9f1af36",
"connectedSince": "2019-08-24T14:15:22Z"
```
```
Content type
```

###### }

## Obtener estado de subasta en vivo

Devuelve el estado corriente de la subasta (ítem activo, temporizador, mejor postura y reglas de
siguiente puja). **Requiere JWT** porque expone montos competitivos (TP: precios sensibles solo para
registrados).

**Tiempo real (TP):** el producto debe notificar cambios en tiempo real. La implementación recomendada
es un canal **WebSocket** o **SSE** (LiveAuctionStatus.realtimeChannelHint); este GET sirve
como sincronización inicial y como **respaldo por polling** (suggestedPollIntervalMs).

##### AUTHORIZATIONS: BearerAuth

###### PATH PARAMETERS

```
string<uuid>
Identificador único de la subasta.
```
### Responses

```
200 Progreso actual en vivo
```
```
401 No autorizado (token ausente, manipulado o expirado)
```
```
404 Recurso no encontrado
```
#### Response samples

```
200 401 404
```
```
auctionId
required
```
```
GET /auctions/{auctionId}/live
```
```
application/json
```
```
Copy
```
```
Content type
```

###### {

```
"auctionId": "1b0383e0-fa9f-4f21-bfb0-a5423e98b82d",
"status": "scheduled",
"currentItemId": "d50a91bf-9368-4971-949f-5572e7578bba",
"currentBid": 0 ,
"highestBidderId": "be95e659-ffa4-4485-87bb-d519c285dfa6",
"minNextBid": 0 ,
"maxNextBid": 0 ,
"secondsRemaining": 0 ,
"serverTime": "2019-08-24T14:15:22Z",
"suggestedPollIntervalMs": 2000 ,
"realtimeChannelHint": "string"
}
```
## Vincular al usuario autenticado a la sala en vivo de esta

## subasta

**TP — exclusividad:** registra la intención explícita de seguir/interactuar en vivo con esta subasta. Si ya
existe otra sesión activa, responde 409 hasta que se libere con DELETE.

##### AUTHORIZATIONS: BearerAuth

###### PATH PARAMETERS

```
string<uuid>
Identificador único de la subasta.
```
### Responses

```
201 Sesión en vivo establecida para esta subasta
```
```
401 No autorizado (token ausente, manipulado o expirado)
```
```
404 Recurso no encontrado
```
```
409 El usuario ya está vinculado a una sesión en vivo de otra subasta.
```
```
auctionId
required
```

#### Response samples

```
201 401 404 409
```
```
POST /auctions/{auctionId}/live/session
```
```
application/json
```
```
Copy
{
"activeAuctionId": "5354e8d3-3578-4411-9bc5-5ae0e9f1af36",
"connectedSince": "2019-08-24T14:15:22Z"
}
```
## Liberar la sesión en vivo de esta subasta

Cierra la sesión interactiva del usuario sobre **esta** subasta, liberando el cupo para conectarse a otra
(TP).

##### AUTHORIZATIONS: BearerAuth

###### PATH PARAMETERS

```
string<uuid>
Identificador único de la subasta.
```
### Responses

```
— 204 Sesión liberada (o no había sesión activa en esta subasta)
```
```
401 No autorizado (token ausente, manipulado o expirado)
```
```
404 Recurso no encontrado
```
```
auctionId
required
```
```
Content type
```

#### Response samples

```
401 404
```
```
DELETE /auctions/{auctionId}/live/session
```
```
application/json
```
```
Copy
{
"error": "InvalidBidAmountError",
"message": "El monto de puja debe ser estrictamente mayor a la puja actua
"statusCode": 409
}
```
## Crear una puja

Reglas de negocio aplicadas:

```
El usuario debe tener un medio de pago verificado.
La categoría del usuario debe cumplir la categoría mínima requerida por la subasta.
El usuario no debe estar bloqueado por morosidad de pago hasta regularizar (TP).
El monto de puja debe superar estrictamente el monto actual.
El monto de puja debe estar dentro de [minNextBid, maxNextBid] (salvo que la categoría de
subasta sea gold/platinum).
Se rechazan ofertas por encima de una garantía de cheque certificado (o tope de fondos
reservados) (TP).
El cliente DEBERÍA mantener una sesión en vivo activa vía POST
/auctions/{auctionId}/live/session antes de pujar en la UX móvil (el servidor PUEDE
exigirlo).
```
##### AUTHORIZATIONS: BearerAuth

###### PATH PARAMETERS

```
string<uuid>
Identificador único de la subasta.
```
REQUEST BODY SCHEMA: application/json

```
auctionId
required
```
```
Content type
```

```
number<float>
Debe ser estrictamente mayor que currentBid y estar dentro de
[minNextBid, maxNextBid].
```
### Responses

```
201 Puja procesada correctamente
```
```
400 La subasta no está en un estado participable (cerrada o no iniciada)
```
```
401 No autorizado (token ausente, manipulado o expirado)
```
```
403
Prohibido por falta de medios de pago verificados, categoría de usuario insuficiente, suspensión para
pujar por morosidad, o monto de puja por encima de la garantía de participación.
```
```
404 Recurso no encontrado
```
```
409
Conflicto de puja (el monto está fuera del rango permitido [minNextBid, maxNextBid] o es menor
al monto actual).
```
```
422 Entidad no procesable (falló la validación del esquema)
```
#### Request samples

```
Payload
```
#### Response samples

```
amount
required
```
```
POST /auctions/{auctionId}/bids
```
```
application/json
```
```
Copy
{
"amount": 0
}
```
```
Content type
```

```
201 400 401 403 404 409 422
```
```
application/json
```
```
Copy
{
"id": "497f6eca-6276-4993-bfeb-53cbbbba6f08",
"auctionId": "1b0383e0-fa9f-4f21-bfb0-a5423e98b82d",
"userId": "2c4a230c-5085-4924-a3e1-25fb4fc5965b",
"amount": 0 ,
"createdAt": "2019-08-24T14:15:22Z",
"isWinning": true
}
```
## Obtener historial de pujas de una subasta

Historial de pujas exitosas con montos identificables. **Solo usuarios autenticados (TP)** — el listado no
es parte del catálogo público anónimo.

##### AUTHORIZATIONS: BearerAuth

###### PATH PARAMETERS

```
string<uuid>
Identificador único de la subasta.
```
### Responses

```
200 Historial cronológico de pujas exitosas
```
```
401 No autorizado (token ausente, manipulado o expirado)
```
```
404 Recurso no encontrado
```
```
auctionId
required
```
```
GET /auctions/{auctionId}/bids/history
```
```
Content type
```

# User Activity

Trazabilidad de acciones históricas del usuario (pujas, victorias, pagos de ganadores)

#### Response samples

```
200 401 404
```
```
application/json
```
```
Copy Expand all Collapse all
{
"totalBids": 0 ,
```
- "bids": [
    + { ... }
]
}

## Listar subastas en las que el usuario participa / participó

Siempre autenticado: incluye datos monetarios completos alineados al TP (no aplica la anonimización
del catálogo público).

##### AUTHORIZATIONS: BearerAuth

## Responses

```
200 Devuelve una lista de subastas
```
```
401 No autorizado (token ausente, manipulado o expirado)
```
```
Content type
```

#### Response samples

```
200 401
```
```
GET /users/me/auctions
```
```
application/json
```
```
Copy Expand all Collapse all
[
```
- {
    "id": "497f6eca-6276-4993-bfeb-53cbbbba6f08",
    "title": "string",
    "description": "string",
    "coverImageUrl": "http://example.com",
    "categoryRequired": "common",
    "currency": "ARS",
    "startDate": "2019-08-24T14:15:22Z",
    "endDate": "2019-08-24T14:15:22Z",
    "status": "scheduled",
    "location": "string",
+ "auctioneer": { ... },
"basePrice": 0 ,
"currentBid": 0
}
]

## Listar pujas históricas del usuario en todas las subastas

##### AUTHORIZATIONS: BearerAuth

### Responses

```
200 Devuelve un arreglo con las pujas del usuario
```
```
Content type
```

```
401 No autorizado (token ausente, manipulado o expirado)
```
#### Response samples

```
200 401
```
```
GET /users/me/bids
```
```
application/json
```
```
Copy Expand all Collapse all
[
```
- {
    "id": "497f6eca-6276-4993-bfeb-53cbbbba6f08",
    "auctionId": "1b0383e0-fa9f-4f21-bfb0-a5423e98b82d",
    "userId": "2c4a230c-5085-4924-a3e1-25fb4fc5965b",
    "amount": 0 ,
    "createdAt": "2019-08-24T14:15:22Z",
    "isWinning": true
}
]

## Listar subastas ganadas por el usuario

##### AUTHORIZATIONS: BearerAuth

### Responses

```
200 Devuelve un arreglo de subastas concluidas donde el usuario ganó
```
```
401 No autorizado (token ausente, manipulado o expirado)
```
```
Content type
```

#### Response samples

```
200 401
```
```
GET /users/me/wins
```
```
application/json
```
```
Copy Expand all Collapse all
[
```
- {
    "id": "497f6eca-6276-4993-bfeb-53cbbbba6f08",
    "title": "string",
    "description": "string",
    "coverImageUrl": "http://example.com",
    "categoryRequired": "common",
    "currency": "ARS",
    "startDate": "2019-08-24T14:15:22Z",
    "endDate": "2019-08-24T14:15:22Z",
    "status": "scheduled",
    "location": "string",
+ "auctioneer": { ... },
"basePrice": 0 ,
"currentBid": 0
}
]

## Obtener desglose de pago del ganador

Devuelve el desglose tipo factura enviado al ganador por mensaje privado: monto de puja, comisión,
costo de envío a la dirección declarada y total adeudado.

##### AUTHORIZATIONS: BearerAuth

###### PATH PARAMETERS

```
string<uuid>
Identificador único del registro de subasta ganada.
```
```
winId
required
```
```
Content type
```

### Responses

```
200 Desglose de pago de la subasta ganada
```
```
401 No autorizado (token ausente, manipulado o expirado)
```
```
403 Prohibido (token válido provisto, pero privilegios/requisitos insuficientes)
```
```
404 Recurso no encontrado
```
#### Response samples

```
200 401 403 404
```
```
GET /users/me/wins/{winId}/payment
```
```
application/json
```
```
Copy
{
"winId": "e8abd73a-ae52-4739-9b76-4fc0911d1a0e",
"auctionId": "1b0383e0-fa9f-4f21-bfb0-a5423e98b82d",
"itemId": "f11b669d-7201-4c21-88af-d85092f0c005",
"bidAmount": 0 ,
"commission": 0 ,
"shippingCost": 0 ,
"total": 0 ,
"currency": "ARS",
"shippingAddress": "string",
"deadline": "2019-08-24T14:15:22Z",
"settled": true,
"penaltyPercent": 0 ,
"penaltyAmount": 0 ,
"regularizationDeadline": "2019-08-24T14:15:22Z",
"biddingBlockedUntilPayment": true
}
```
```
Content type
```

## Liquidar el pago del ganador

Debita el medio de pago elegido por el monto total (puja + comisión + envío). Si el cobro falla, el
usuario recibe una multa del 10% y dispone de 72 h para presentar fondos.

##### AUTHORIZATIONS: BearerAuth

###### PATH PARAMETERS

```
string<uuid>
Identificador único del registro de subasta ganada.
```
REQUEST BODY SCHEMA: application/json

```
string<uuid>
```
```
boolean
Default: false
Si es true, el comprador retirará el ítem en persona (se elimina el costo de
envío pero la cobertura de seguro queda sin efecto al retirarlo).
```
### Responses

```
200 Pago liquidado correctamente
```
```
401 No autorizado (token ausente, manipulado o expirado)
```
```
402
Pago fallido — cobro rechazado por el proveedor o fondos insuficientes. Inicia el circuito de multa 10% ,
regularización en 72 h y bloqueo de participación hasta saneamiento (TP). Si el incumplimiento
persiste, accountServiceSuspended pasa a true.
```
```
404 Recurso no encontrado
```
```
409 El pago ya fue liquidado para esta victoria.
```
```
winId
required
```
```
paymentMethodId
required
```
```
pickupInPerson
```
```
POST /users/me/wins/{winId}/payment
```

# Payment Methods

CRUD de alternativas de pago tipadas (banco, tarjeta, cheque) + verificación y reserva de fondos

#### Request samples

```
Payload
```
#### Response samples

```
200 401 402 404 409
```
```
application/json
```
```
Copy
{
"paymentMethodId": "b6df8625-cd25-4123-b345-638aa7b5d011",
"pickupInPerson": false
}
```
```
application/json
```
```
Copy
{
"winId": "e8abd73a-ae52-4739-9b76-4fc0911d1a0e",
"paidAmount": 0 ,
"currency": "ARS",
"paidAt": "2019-08-24T14:15:22Z",
"paymentMethodId": "b6df8625-cd25-4123-b345-638aa7b5d011"
}
```
## Listar medios de pago del usuario

##### AUTHORIZATIONS: BearerAuth

```
Content type
```
```
Content type
```

### Responses

```
200 Listado de fuentes de pago conectadas
```
```
401 No autorizado (token ausente, manipulado o expirado)
```
#### Response samples

```
200 401
```
```
GET /users/me/payment-methods
```
```
application/json
```
```
Copy Expand all Collapse all
[
```
- {
    "id": "497f6eca-6276-4993-bfeb-53cbbbba6f08",
    "type": "credit_card",
    "displayName": "Visa ending in 4432",
    "holderName": "string",
    "currency": "ARS",
    "reservedAmount": 0 ,
    "verificationStatus": "pending",
    "verified": true,
    "status": "active",
+ "details": { ... }
}
]

## Registrar un nuevo medio de pago

Acepta un cuerpo tipado según el discriminador type: bank_account → BankAccountDetails,
credit_card → CreditCardDetails, certified_check → CertifiedCheckDetails.

##### AUTHORIZATIONS: BearerAuth

```
Content type
```

REQUEST BODY SCHEMA: application/json

```
string (PaymentMethodType)
Enum: "credit_card" "bank_account" "certified_check"
```
```
string
```
```
string (CurrencyEnum)
Enum: "ARS" "USD"
```
```
number<float>
Reserva inicial opcional para bank_account / credit_card.
```
```
any
```
```
string
PAN en crudo. Solo se acepta para credit_card; nunca se persiste en
texto claro.
```
```
string
Valor de verificación de tarjeta. Solo se acepta para credit_card; nunca
se persiste.
```
### Responses

```
201 Medio de pago almacenado de forma segura
```
```
400 Solicitud incorrecta (parámetros o query strings inválidos)
```
```
401 No autorizado (token ausente, manipulado o expirado)
```
```
422 Entidad no procesable (falló la validación del esquema)
```
#### Request samples

```
Payload
```
```
type
required
```
```
holderName
required
```
```
currency
```
```
reservedAmount
```
```
details
required
```
```
cardNumber
```
```
cvv
```
```
POST /users/me/payment-methods
```

#### Response samples

```
201 400 401 422
```
```
application/json
```
```
Copy Expand all Collapse all
{
"type": "credit_card",
"holderName": "string",
"currency": "ARS",
"reservedAmount": 0 ,
```
- "details": {
    "type": "bank_account",
    "bankName": "string",
    "country": "string",
    "accountNumber": "string",
    "swiftBic": "string",
    "currency": "ARS"
},
"cardNumber": "string",
"cvv": "string"
}

```
application/json
```
```
Copy Expand all Collapse all
{
"id": "497f6eca-6276-4993-bfeb-53cbbbba6f08",
"type": "credit_card",
"displayName": "Visa ending in 4432",
"holderName": "string",
"currency": "ARS",
"reservedAmount": 0 ,
"verificationStatus": "pending",
"verified": true,
"status": "active",
```
```
Content type
```
```
Content type
```

- "details": {
    "type": "bank_account",
    "bankName": "string",
    "country": "string",
    "accountNumber": "string",
    "swiftBic": "string",
    "currency": "ARS"
}
}

## Actualizar detalles del medio de pago

##### AUTHORIZATIONS: BearerAuth

###### PATH PARAMETERS

```
string<uuid>
Identificador único del medio de pago.
```
REQUEST BODY SCHEMA: application/json

```
string
```
```
string
Enum: "active" "inactive"
```
### Responses

```
200 Cuerpo aplicado correctamente
```
```
400 Solicitud incorrecta (parámetros o query strings inválidos)
```
```
401 No autorizado (token ausente, manipulado o expirado)
```
```
404 Recurso no encontrado
```
```
paymentMethodId
required
```
```
holderName
```
```
status
```

#### Request samples

```
Payload
```
#### Response samples

```
200 400 401 404
```
```
PUT /users/me/payment-methods/{paymentMethodId}
```
```
application/json
```
```
Copy
{
"holderName": "string",
"status": "active"
}
```
```
application/json
```
```
Copy Expand all Collapse all
{
"id": "497f6eca-6276-4993-bfeb-53cbbbba6f08",
"type": "credit_card",
"displayName": "Visa ending in 4432",
"holderName": "string",
"currency": "ARS",
"reservedAmount": 0 ,
"verificationStatus": "pending",
"verified": true,
"status": "active",
```
- "details": {
    "type": "bank_account",
    "bankName": "string",
    "country": "string",
    "accountNumber": "string",
    "swiftBic": "string",
    "currency": "ARS"
}
}

```
Content type
```
```
Content type
```

## Desvincular un medio de pago

##### AUTHORIZATIONS: BearerAuth

###### PATH PARAMETERS

```
string<uuid>
Identificador único del medio de pago.
```
### Responses

```
— 204 Eliminado (lógico o físico) correctamente
```
```
401 No autorizado (token ausente, manipulado o expirado)
```
```
404 Recurso no encontrado
```
#### Response samples

```
401 404
```
```
paymentMethodId
required
```
```
DELETE /users/me/payment-methods/{paymentMethodId}
```
```
application/json
```
```
Copy
{
"error": "InvalidBidAmountError",
"message": "El monto de puja debe ser estrictamente mayor a la puja actua
"statusCode": 409
}
```
```
Content type
```

## Enviar un código de verificación para este medio de pago

Completa el flujo de verificación (p. ej., código de 6 dígitos para tarjetas, confirmación de
microdepósito para cuentas bancarias, confirmación de recepción para cheques certificados). Solo los
medios de pago verificados habilitan pujas.

##### AUTHORIZATIONS: BearerAuth

###### PATH PARAMETERS

```
string<uuid>
Identificador único del medio de pago.
```
REQUEST BODY SCHEMA: application/json

```
string
Código de verificación de 6 dígitos para tarjetas, o referencia provista por el
emisor bancario/del cheque.
```
### Responses

```
200 Medio de pago verificado
```
```
400 Solicitud incorrecta (parámetros o query strings inválidos)
```
```
401 No autorizado (token ausente, manipulado o expirado)
```
```
404 Recurso no encontrado
```
```
422 El código de verificación es inválido o expiró.
```
#### Request samples

```
Payload
```
```
paymentMethodId
required
```
```
code
required
```
```
POST /users/me/payment-methods/{paymentMethodId}/verify
```

#### Response samples

```
200 400 401 404 422
```
```
application/json
```
```
Copy
{
"code": "string"
}
```
```
application/json
```
```
Copy Expand all Collapse all
{
"id": "497f6eca-6276-4993-bfeb-53cbbbba6f08",
"type": "credit_card",
"displayName": "Visa ending in 4432",
"holderName": "string",
"currency": "ARS",
"reservedAmount": 0 ,
"verificationStatus": "pending",
"verified": true,
"status": "active",
```
- "details": {
    "type": "bank_account",
    "bankName": "string",
    "country": "string",
    "accountNumber": "string",
    "swiftBic": "string",
    "currency": "ARS"
}
}

## Reservar fondos para participar en subastas

Para medios bank_account y credit_card. Define o actualiza el monto reservado como garantía
de participación. Para certified_check el monto reservado se fija al emitir el cheque y no puede
modificarse aquí.

```
Content type
```
```
Content type
```

##### AUTHORIZATIONS: BearerAuth

###### PATH PARAMETERS

```
string<uuid>
Identificador único del medio de pago.
```
REQUEST BODY SCHEMA: application/json

```
number<float> >= 0
```
```
string (CurrencyEnum)
Enum: "ARS" "USD"
```
### Responses

```
200 Reserva aplicada
```
```
400 Solicitud incorrecta (parámetros o query strings inválidos)
```
```
401 No autorizado (token ausente, manipulado o expirado)
```
```
404 Recurso no encontrado
```
```
422 Entidad no procesable (falló la validación del esquema)
```
#### Request samples

```
Payload
```
```
paymentMethodId
required
```
```
amount
required
```
```
currency
required
```
```
POST /users/me/payment-methods/{paymentMethodId}/reserve-funds
```
```
application/json
```
```
Copy
```
```
Content type
```

# Item Submissions

Módulo para que clientes ofrezcan sus pertenencias para futuras subastas, incluyendo seguimiento de
envío físico

#### Response samples

```
200 400 401 404 422
```
###### {

```
"amount": 0 ,
"currency": "ARS"
}
```
```
application/json
```
```
Copy Expand all Collapse all
{
"id": "497f6eca-6276-4993-bfeb-53cbbbba6f08",
"type": "credit_card",
"displayName": "Visa ending in 4432",
"holderName": "string",
"currency": "ARS",
"reservedAmount": 0 ,
"verificationStatus": "pending",
"verified": true,
"status": "active",
```
- "details": {
    "type": "bank_account",
    "bankName": "string",
    "country": "string",
    "accountNumber": "string",
    "swiftBic": "string",
    "currency": "ARS"
}
}

```
Content type
```

## Crear solicitud de publicación de ítem

Permite a un usuario enviar detalles de un ítem que desea poner en subasta. Requiere al menos 6
imágenes, declaración de titularidad y declaración de origen lícito.

##### AUTHORIZATIONS: BearerAuth

REQUEST BODY SCHEMA: application/json

```
string
```
```
string
```
```
Array of strings<uri> >= 6 items
```
```
string
```
```
string
```
```
Array of objects (ItemComponent)
Subelementos de la pieza cuando es compuesta.
```
```
boolean
Explicit legal acknowledgement.
```
```
boolean
Proof of non-illicit provenance.
```
### Responses

```
201 Solicitud registrada correctamente
```
```
400 Solicitud incorrecta (parámetros o query strings inválidos)
```
```
401 No autorizado (token ausente, manipulado o expirado)
```
```
422 Entidad no procesable (falló la validación del esquema)
```
```
title
required
```
```
description
required
```
```
imageUrls
required
```
```
artistOrDesigner
```
```
historicalContext
```
```
components
```
```
declaredOwnershipAccepted
required
```
```
lawfulOriginDeclarationAccepted
required
```

#### Request samples

```
Payload
```
#### Response samples

```
201 400 401 422
```
```
POST /item-submissions
```
```
application/json
```
```
Copy Expand all Collapse all
{
"title": "string",
"description": "string",
```
- "imageUrls": [
    "http://example.com",
    "http://example.com",
    "http://example.com",
    "http://example.com",
    "http://example.com",
    "http://example.com"
],
"artistOrDesigner": "string",
"historicalContext": "string",
- "components": [
    + { ... }
],
"declaredOwnershipAccepted": true,
"lawfulOriginDeclarationAccepted": true
}

```
application/json
```
```
Copy Expand all Collapse all
{
"id": "497f6eca-6276-4993-bfeb-53cbbbba6f08",
"title": "string",
"description": "string",
```
```
Content type
```
```
Content type
```

- "imageUrls": [
    "http://example.com",
    "http://example.com",
    "http://example.com",
    "http://example.com",
    "http://example.com",
    "http://example.com"
],
"declaredOwnershipAccepted": true,
"lawfulOriginDeclarationAccepted": true,
"status": "pending",
"rejectionReason": "string",
"scheduledAuctionId": "0b5a254a-939c-464a-8de2-21d69ca56cef",
"basePrice": 0 ,
"commissionPercent": 0 ,
"termsProposalExpiresAt": "2019-08-24T14:15:22Z",
"termsProposalVenue": "string",
"termsProposalEventAt": "2019-08-24T14:15:22Z",
- "shippingInstructions": {
    "address": "string",
    "city": "string",
    "country": "string",
    "venueName": "string",
    "scheduledPreviewAt": "2019-08-24T14:15:22Z",
    "deadline": "2019-08-24T14:15:22Z",
    "instructions": "string"
},
"physicalShipmentStatus": "not_required",
"shipmentTrackingNumber": "string",
"shipmentCarrier": "string",
"createdAt": "2019-08-24T14:15:22Z"
}

## Listar todas mis publicaciones de ítems

##### AUTHORIZATIONS: BearerAuth

### Responses


```
200 Listado que sigue los estados de los ítems propuestos por el usuario
```
```
401 No autorizado (token ausente, manipulado o expirado)
```
#### Response samples

```
200 401
```
```
GET /users/me/item-submissions
```
```
application/json
```
```
Copy Expand all Collapse all
[
```
- {
    "id": "497f6eca-6276-4993-bfeb-53cbbbba6f08",
    "title": "string",
    "description": "string",
+ "imageUrls": [ ... ],
"declaredOwnershipAccepted": true,
"lawfulOriginDeclarationAccepted": true,
"status": "pending",
"rejectionReason": "string",
"scheduledAuctionId": "0b5a254a-939c-464a-8de2-21d69ca56cef",
"basePrice": 0 ,
"commissionPercent": 0 ,
"termsProposalExpiresAt": "2019-08-24T14:15:22Z",
"termsProposalVenue": "string",
"termsProposalEventAt": "2019-08-24T14:15:22Z",
+ "shippingInstructions": { ... },
"physicalShipmentStatus": "not_required",
"shipmentTrackingNumber": "string",
"shipmentCarrier": "string",
"createdAt": "2019-08-24T14:15:22Z"
}
]

```
Content type
```

## Obtener detalle puntual de una publicación

##### AUTHORIZATIONS: BearerAuth

###### PATH PARAMETERS

```
string<uuid>
Identificador único de la publicación del ítem.
```
### Responses

```
200 Respuesta detallada del elemento publicado
```
```
401 No autorizado (token ausente, manipulado o expirado)
```
```
403 Prohibido (token válido provisto, pero privilegios/requisitos insuficientes)
```
```
404 Recurso no encontrado
```
#### Response samples

```
200 401 403 404
```
```
submissionId
required
```
```
GET /item-submissions/{submissionId}
```
```
application/json
```
```
Copy Expand all Collapse all
{
"id": "497f6eca-6276-4993-bfeb-53cbbbba6f08",
"title": "string",
"description": "string",
```
```
Content type
```

- "imageUrls": [
    "http://example.com",
    "http://example.com",
    "http://example.com",
    "http://example.com",
    "http://example.com",
    "http://example.com"
],
"declaredOwnershipAccepted": true,
"lawfulOriginDeclarationAccepted": true,
"status": "pending",
"rejectionReason": "string",
"scheduledAuctionId": "0b5a254a-939c-464a-8de2-21d69ca56cef",
"basePrice": 0 ,
"commissionPercent": 0 ,
"termsProposalExpiresAt": "2019-08-24T14:15:22Z",
"termsProposalVenue": "string",
"termsProposalEventAt": "2019-08-24T14:15:22Z",
- "shippingInstructions": {
    "address": "string",
    "city": "string",
    "country": "string",
    "venueName": "string",
    "scheduledPreviewAt": "2019-08-24T14:15:22Z",
    "deadline": "2019-08-24T14:15:22Z",
    "instructions": "string"
},
"physicalShipmentStatus": "not_required",
"shipmentTrackingNumber": "string",
"shipmentCarrier": "string",
"createdAt": "2019-08-24T14:15:22Z"
}

## Cancelar una publicación antes de que inicie la subasta

Permitido mientras la publicación esté en pending, under_review o accepted (nunca después
de terms_proposed o scheduled). Corresponde a la acción "Cancelar publicación" en la pantalla
Mis Productos.

##### AUTHORIZATIONS: BearerAuth

###### PATH PARAMETERS


```
string<uuid>
Identificador único de la publicación del ítem.
```
### Responses

```
— 204 Publicación cancelada
```
```
401 No autorizado (token ausente, manipulado o expirado)
```
```
403 Prohibido (token válido provisto, pero privilegios/requisitos insuficientes)
```
```
404 Recurso no encontrado
```
```
409 La publicación ya no puede cancelarse (ya está programada o vendida).
```
#### Response samples

```
401 403 404 409
```
```
submissionId
required
```
```
DELETE /item-submissions/{submissionId}
```
```
application/json
```
```
Copy
{
"error": "InvalidBidAmountError",
"message": "El monto de puja debe ser estrictamente mayor a la puja actua
"statusCode": 409
}
```
## Aceptar o rechazar la propuesta de precio base y

## comisión de la empresa

```
Content type
```

**TP — post-inspección:** cuando la empresa informa fecha, lugar, valor base y comisiones (status ==
terms_proposed), el usuario **acepta** (avanza hacia programación) o **rechaza** (el bien se devuelve;
pueden aplicarse costos logísticos — ver notificación / rejectionReason).

##### AUTHORIZATIONS: BearerAuth

REQUEST BODY SCHEMA: application/json

```
string
Enum: "accept" "reject"
accept confirma base y comisión propuestas y habilita la transición hacia
scheduled. reject inicia la logística de devolución del bien (posibles
costos — TP).
```
### Responses

```
200 Decisión aplicada; la publicación refleja el nuevo estado de ciclo de vida
```
```
400 Solicitud incorrecta (parámetros o query strings inválidos)
```
```
401 No autorizado (token ausente, manipulado o expirado)
```
```
403 Prohibido (token válido provisto, pero privilegios/requisitos insuficientes)
```
```
404 Recurso no encontrado
```
```
409 No hay términos comerciales pendientes o la decisión no está permitida en este estado.
```
```
422 Entidad no procesable (falló la validación del esquema)
```
#### Request samples

```
Payload
```
```
decision
required
```
```
POST /item-submissions/{submissionId}/terms-decision
```
```
application/json
```
```
Copy
```
```
Content type
```

#### Response samples

```
200 400 401 403 404 409 422
```
###### {

```
"decision": "accept"
}
```
```
application/json
```
```
Copy Expand all Collapse all
{
"id": "497f6eca-6276-4993-bfeb-53cbbbba6f08",
"title": "string",
"description": "string",
```
- "imageUrls": [
    "http://example.com",
    "http://example.com",
    "http://example.com",
    "http://example.com",
    "http://example.com",
    "http://example.com"
],
"declaredOwnershipAccepted": true,
"lawfulOriginDeclarationAccepted": true,
"status": "pending",
"rejectionReason": "string",
"scheduledAuctionId": "0b5a254a-939c-464a-8de2-21d69ca56cef",
"basePrice": 0 ,
"commissionPercent": 0 ,
"termsProposalExpiresAt": "2019-08-24T14:15:22Z",
"termsProposalVenue": "string",
"termsProposalEventAt": "2019-08-24T14:15:22Z",
- "shippingInstructions": {
    "address": "string",
    "city": "string",
    "country": "string",
    "venueName": "string",
    "scheduledPreviewAt": "2019-08-24T14:15:22Z",
    "deadline": "2019-08-24T14:15:22Z",
    "instructions": "string"
},
"physicalShipmentStatus": "not_required",
"shipmentTrackingNumber": "string",

```
Content type
```

```
"shipmentCarrier": "string",
"createdAt": "2019-08-24T14:15:22Z"
}
```
## Registrar el envío físico de una publicación aceptada para

## inspección

Una vez que la publicación se marca como accepted, el usuario debe enviar físicamente el ítem a la
dirección de inspección devuelta en ItemSubmission.shippingInstructions. Este endpoint
registra el transportista y número de seguimiento para que la empresa pueda rastrear la recepción.

##### AUTHORIZATIONS: BearerAuth

REQUEST BODY SCHEMA: application/json

```
string
```
```
string
```
```
string<date-time>
```
### Responses

```
200 Envío registrado
```
```
400 Solicitud incorrecta (parámetros o query strings inválidos)
```
```
401 No autorizado (token ausente, manipulado o expirado)
```
```
403 Prohibido (token válido provisto, pero privilegios/requisitos insuficientes)
```
```
404 Recurso no encontrado
```
```
409 El envío no está permitido en el estado actual de la publicación.
```
```
carrier
required
```
```
trackingNumber
required
```
```
shippedAt
```

#### Request samples

```
Payload
```
#### Response samples

```
200 400 401 403 404 409
```
```
POST /item-submissions/{submissionId}/shipment
```
```
application/json
```
```
Copy
{
"carrier": "DHL",
"trackingNumber": "string",
"shippedAt": "2019-08-24T14:15:22Z"
}
```
```
application/json
```
```
Copy Expand all Collapse all
{
"id": "497f6eca-6276-4993-bfeb-53cbbbba6f08",
"title": "string",
"description": "string",
```
- "imageUrls": [
    "http://example.com",
    "http://example.com",
    "http://example.com",
    "http://example.com",
    "http://example.com",
    "http://example.com"
],
"declaredOwnershipAccepted": true,
"lawfulOriginDeclarationAccepted": true,
"status": "pending",
"rejectionReason": "string",
"scheduledAuctionId": "0b5a254a-939c-464a-8de2-21d69ca56cef",
"basePrice": 0 ,
"commissionPercent": 0 ,

```
Content type
```
```
Content type
```

# Seller Settlements

Declaración de cuenta de cobro y trazabilidad de liquidaciones para bienes consignados vendidos en
nombre del usuario (TP)

```
"termsProposalExpiresAt": "2019-08-24T14:15:22Z",
"termsProposalVenue": "string",
"termsProposalEventAt": "2019-08-24T14:15:22Z",
```
- "shippingInstructions": {
    "address": "string",
    "city": "string",
    "country": "string",
    "venueName": "string",
    "scheduledPreviewAt": "2019-08-24T14:15:22Z",
    "deadline": "2019-08-24T14:15:22Z",
    "instructions": "string"
},
"physicalShipmentStatus": "not_required",
"shipmentTrackingNumber": "string",
"shipmentCarrier": "string",
"createdAt": "2019-08-24T14:15:22Z"
}

## Obtener la cuenta bancaria declarada para recibir el

## producido de ventas

**TP — cuenta predeclarada:** los fondos por bienes vendidos del cliente se transfieren a la cuenta
informada previamente. Este recurso modela esa cuenta (no es un medio de pago para comprar/pagar
subastas).

##### AUTHORIZATIONS: BearerAuth

## Responses

```
200 Instrucciones de cobro almacenadas (identificadores enmascarados según corresponda)
```

```
401 No autorizado (token ausente, manipulado o expirado)
```
```
404 El usuario todavía no configuró una cuenta de cobro.
```
#### Response samples

```
200 401 404
```
```
GET /users/me/seller/payout-account
```
```
application/json
```
```
Copy
{
"bankName": "string",
"country": "string",
"accountNumberMasked": "string",
"currency": "ARS",
"holderName": "string",
"updatedAt": "2019-08-24T14:15:22Z"
}
```
## Crear o reemplazar la cuenta de cobro para bienes

## consignados

##### AUTHORIZATIONS: BearerAuth

REQUEST BODY SCHEMA: application/json

```
string
```
```
string
```
```
string
CBU/CVU/IBAN local según país; se almacena tokenizado.
```
```
bankName
required
```
```
country
required
```
```
accountNumber
required
```
```
Content type
```

```
string
Requerido para cuentas extranjeras.
```
```
string (CurrencyEnum)
Enum: "ARS" "USD"
```
```
string
```
### Responses

```
200 Cuenta de cobro guardada
```
```
400 Solicitud incorrecta (parámetros o query strings inválidos)
```
```
401 No autorizado (token ausente, manipulado o expirado)
```
```
422 Entidad no procesable (falló la validación del esquema)
```
#### Request samples

```
Payload
```
#### Response samples

```
swiftBic
```
```
currency
required
```
```
holderName
required
```
```
PUT /users/me/seller/payout-account
```
```
application/json
```
```
Copy
{
"bankName": "string",
"country": "string",
"accountNumber": "string",
"swiftBic": "string",
"currency": "ARS",
"holderName": "string"
}
```
```
Content type
```

```
200 400 401 422
```
```
application/json
```
```
Copy
{
"bankName": "string",
"country": "string",
"accountNumberMasked": "string",
"currency": "ARS",
"holderName": "string",
"updatedAt": "2019-08-24T14:15:22Z"
}
```
## Listar liquidaciones de ítems consignados vendidos

**TP — liquidaciones:** cada venta de un bien consignado genera un registro de liquidación con importes,
comisiones descontadas y estado de transferencia a la cuenta declarada.

##### AUTHORIZATIONS: BearerAuth

### Responses

```
200 Resúmenes de liquidación ordenados de más nuevos a más antiguos
```
```
401 No autorizado (token ausente, manipulado o expirado)
```
#### Response samples

```
200 401
```
```
GET /users/me/seller/settlements
```
```
application/json
```
```
Content type
```
```
Content type
```

```
Copy Expand all Collapse all
[
```
- {
    "id": "497f6eca-6276-4993-bfeb-53cbbbba6f08",
    "submissionId": "23243110-f447-42f4-a433-27cb8d276b19",
    "auctionId": "1b0383e0-fa9f-4f21-bfb0-a5423e98b82d",
    "itemId": "f11b669d-7201-4c21-88af-d85092f0c005",
    "hammerAmount": 0 ,
    "commissionAmount": 0 ,
    "netToSeller": 0 ,
    "currency": "ARS",
    "transferStatus": "pending",
    "createdAt": "2019-08-24T14:15:22Z"
}
]

## Obtener detalle de liquidación (trazabilidad de auditoría)

##### AUTHORIZATIONS: BearerAuth

###### PATH PARAMETERS

```
string<uuid>
Identificador de un registro de liquidación de vendedor.
```
### Responses

```
200 Liquidación detallada incluyendo referencias a subasta/ítem/submission
```
```
401 No autorizado (token ausente, manipulado o expirado)
```
```
403 Prohibido (token válido provisto, pero privilegios/requisitos insuficientes)
```
```
404 Recurso no encontrado
```
```
settlementId
required
```
```
GET /users/me/seller/settlements/{settlementId}
```

# Notifications

Notificaciones de usuario (ganada, superada, comienza pronto, pago fallido, etc.)

#### Response samples

```
200 401 403 404
```
```
application/json
```
```
Copy Expand all Collapse all
{
"id": "497f6eca-6276-4993-bfeb-53cbbbba6f08",
"submissionId": "23243110-f447-42f4-a433-27cb8d276b19",
"auctionId": "1b0383e0-fa9f-4f21-bfb0-a5423e98b82d",
"itemId": "f11b669d-7201-4c21-88af-d85092f0c005",
"hammerAmount": 0 ,
"commissionAmount": 0 ,
"netToSeller": 0 ,
"currency": "ARS",
"transferStatus": "pending",
"createdAt": "2019-08-24T14:15:22Z",
```
- "deductions": [
    + { ... }
],
- "payoutAccountSnapshot": {
    "bankName": "string",
    "country": "string",
    "accountNumberMasked": "string",
    "currency": "ARS",
    "holderName": "string",
    "updatedAt": "2019-08-24T14:15:22Z"
},
"notes": "string"
}

```
Content type
```

## Listar notificaciones del usuario

Devuelve el feed de notificaciones (ganada, liderando, superada, pago fallido, comienza pronto,
detalles de pago del ganador, etc.).

##### AUTHORIZATIONS: BearerAuth

###### QUERY PARAMETERS

```
boolean
Default: false
```
### Responses

```
200 Notificaciones del usuario
```
```
401 No autorizado (token ausente, manipulado o expirado)
```
#### Response samples

```
200 401
```
```
unreadOnly
```
```
GET /users/me/notifications
```
```
application/json
```
```
Copy Expand all Collapse all
```
```
Content type
```

###### [

###### - {

```
"id": "497f6eca-6276-4993-bfeb-53cbbbba6f08",
"type": "won",
"title": "string",
"message": "string",
"read": true,
"createdAt": "2019-08-24T14:15:22Z",
"auctionId": "1b0383e0-fa9f-4f21-bfb0-a5423e98b82d",
"itemId": "f11b669d-7201-4c21-88af-d85092f0c005",
"winId": "e8abd73a-ae52-4739-9b76-4fc0911d1a0e"
}
]
```
## Marcar una notificación como leída

##### AUTHORIZATIONS: BearerAuth

###### PATH PARAMETERS

```
string<uuid>
```
REQUEST BODY SCHEMA: application/json

```
boolean
```
### Responses

```
200 Notificación actualizada
```
```
401 No autorizado (token ausente, manipulado o expirado)
```
```
404 Recurso no encontrado
```
```
notificationId
required
```
```
read
required
```
```
PATCH /users/me/notifications/{notificationId}
```

# Reference

Static reference data (countries)

#### Request samples

```
Payload
```
#### Response samples

```
200 401 404
```
```
application/json
```
```
Copy
{
"read": true
}
```
```
application/json
```
```
Copy
{
"id": "497f6eca-6276-4993-bfeb-53cbbbba6f08",
"type": "won",
"title": "string",
"message": "string",
"read": true,
"createdAt": "2019-08-24T14:15:22Z",
"auctionId": "1b0383e0-fa9f-4f21-bfb0-a5423e98b82d",
"itemId": "f11b669d-7201-4c21-88af-d85092f0c005",
"winId": "e8abd73a-ae52-4739-9b76-4fc0911d1a0e"
}
```
## Listar países soportados

```
Content type
```
```
Content type
```

Devuelve la lista canónica de países usada para poblar selectores en el formulario de registro y en el
flujo de creación de cuenta bancaria.

### Responses

```
200 Arreglo de países
```
#### Response samples

```
200
```
```
GET /countries
```
```
application/json
```
```
Copy Expand all Collapse all
[
```
- {
    "code": "AR",
    "name": "Argentina"
}
]

```
Content type
```

