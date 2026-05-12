# CrownBid API

**Versión del contrato documentado:** 2.0.0 (alineación con schema académico)

Documentación del API REST para la aplicación móvil CrownBid (UADE — Desarrollo de aplicaciones I / entrega tipo TPO). El texto está en **español** y describe el contrato público que el equipo de frontend (React Native) puede consumir.

---

## Estado del contrato

Este documento fue **actualizado** tras adoptar como única **fuente de verdad de persistencia** el archivo `database/schema.sql` provisto por la cátedra (modelo relacional en español: `personas`, `clientes`, `subastas`, `pujos`, etc.).

**Qué cambió respecto a versiones anteriores del contrato:**

- Los **identificadores públicos** en ejemplos y descripciones pasan de UUID a **enteros** (`identificador`, `numero`, etc.), coherentes con columnas `INT` / `IDENTITY` del schema.
- Las **categorías** y muchos **estados de dominio** se documentan con los **valores almacenados en base de datos** (p. ej. `comun`, `especial`, `abierta`, `carrada` en subastas según el script del profesor).
- Se deja explícito qué rutas pueden **persistirse** solo con tablas del profesor, qué comportamiento es **derivado** o **solo en memoria/sesión**, y qué funcionalidades quedan **fuera del alcance** del modelo entregado o requieren **tablas auxiliares** no incluidas en ese script.

**Qué no cambió a propósito:**

- Los **nombres de rutas** (paths y métodos HTTP) se mantienen en la medida de lo posible para **no romper** el diseño de pantallas ni el enrutamiento ya acordado con el frontend.

---

## Fuente de verdad de persistencia

Las tablas del `schema.sql` académico que definen el núcleo persistible son:

| Tabla | Rol resumido |
| --- | --- |
| `paises` | Catálogo de países (`numero`, `nombre`, `nombreCorto`, `capital`, `nacionalidad`, `idiomas`). |
| `personas` | Datos generales de persona (`identificador` IDENTITY, `documento`, `nombre`, `direccion`, `estado`, `foto`). |
| `empleados` | Extensión laboral de una persona (`identificador` → `personas`). |
| `sectores` | Sectores organizacionales. |
| `seguros` | Pólizas asociables a productos (`nroPoliza`, `compania`, `polizaCombinada`, `importe`). |
| `clientes` | Cliente de subasta (`identificador` = misma persona; `numeroPais`, `admitido`, `categoria`, `verificador`). |
| `duenios` | Dueño de bienes. |
| `subastadores` | Martillero vinculado a `personas`. |
| `subastas` | Evento de subasta (`fecha`, `hora`, `estado`, `ubicacion`, `categoria`, etc.). |
| `productos` | Bienes (`descripcionCatalogo`, `descripcionCompleta`, `duenio`, `revisor`, `seguro`, …). |
| `fotos` | Imágenes binarias por producto (`foto` VARBINARY). |
| `catalogos` | Catálogo ligado a subasta y responsable. |
| `itemsCatalogo` | Ítem de catálogo (`precioBase`, `comision`, `subastado`, FK a `catalogos` y `productos`). |
| `asistentes` | Postor en una subasta (`cliente`, `subasta`, `numeroPostor`). |
| `pujos` | Ofertas (`importe`, `ganador`, FK a `asistentes` e `itemsCatalogo`). |
| `registroDeSubasta` | Registro económico post-subasta (`importe`, `comision`, vínculos a subasta, dueño, producto, cliente). |

Cualquier campo o tabla **no** listada arriba (email, contraseña, JWT, medios de pago, notificaciones persistidas, sesión live en BD, etc.) **no forma parte** del script del profesor; si el backend las implementa, debe documentarse como **auxiliar** o **fuera de alcance** (ver secciones posteriores).

---

## Convenciones generales

### Identificadores

- En path parameters y cuerpos de ejemplo, use **`type: integer`** (no `format: uuid`).
- Ejemplos típicos: `1`, `10`, `42`.

```yaml
type: integer
example: 1
```

### Mapeo conceptual ID → tabla (referencia rápida)

| Uso en API | Origen en BD (profesor) |
| --- | --- |
| `auctionId` | `subastas.identificador` |
| `itemId` (ítem de catálogo / puja) | `itemsCatalogo.identificador` |
| `productId` | `productos.identificador` |
| `userId` / perfil | `personas.identificador` (cliente: misma clave en `clientes.identificador`) |
| `bidId` | `pujos.identificador` |
| `settlementId` / `winId` (registro económico) | `registroDeSubasta.identificador` |
| `countryId` | `paises.numero` |

### Categorías (valores en BD)

El modelo académico restringe categorías a:

| Valor en BD | Notas |
| --- | --- |
| `comun` | |
| `especial` | |
| `plata` | |
| `oro` | Subastas oro: en la consigna del TPO, reglas de puja máxima/mínima pueden no aplicar igual que en `comun`/`especial`/`plata`. |
| `platino` | Idem oro/platino para límites de puja. |

No use en documentación de persistencia los valores en inglés `common`, `special`, `silver`, `gold`, `platinum` como si fueran los guardados en el schema del profesor. Si la API **normaliza** a inglés en JSON, indíquelo explícitamente como capa de presentación; **este documento** prioriza honestidad con el modelo entregado.

### Valores monetarios

- `decimal` en API (JSON number), coherente con `DECIMAL(18,2)` en tablas.

### Imágenes

- En BD, fotos de producto están en `fotos.foto` como **VARBINARY(MAX)**.
- Si la API expone `imageUrl` o arreglo de URLs, documéntelo como **generado por el backend** (p. ej. endpoint que sirve el binario o CDN intermedio), no como columna URL en el schema del profesor.

### Autenticación

- El `schema.sql` del profesor **no** define correo, hash de contraseña, tokens de recuperación ni revocación JWT.
- Cualquier `POST /auth/login`, JWT o sesión debe considerarse **AUXILIARY_REQUIRED** (implementación técnica aparte) hasta que existan tablas auxiliares explícitas fuera del script académico.

### Estado de subasta (`subastas.estado`)

El script académico define valores literales **`abierta`** y **`carrada`** (convención del material entregado).

Para no acoplar el cliente móvil al typo ni al inglés crudo de BD, la API puede **normalizar** en las respuestas JSON:

| Condición | `status` sugerido en API (inglés, derivado) |
| --- | --- |
| `subastas.estado = 'carrada'` | `closed` |
| `subastas.estado = 'abierta'` y fecha/hora de inicio **≤** ahora | `live` |
| `subastas.estado = 'abierta'` y fecha/hora de inicio **>** ahora | `scheduled` |

Si se prefiere exponer **tal cual** la BD, use solo `abierta` | `carrada` y documente que coincide con el CHECK del profesor.

---

## Matriz de soporte de endpoints

Leyenda de **Estado**:

- **DB_BACKED**: la operación principal puede sustentarse en tablas del `schema.sql` del profesor.
- **DERIVED**: la respuesta se calcula agregando/consultando tablas del profesor sin fila dedicada de “vista materializada”.
- **RUNTIME_ONLY**: no hay tabla equivalente; lógica de aplicación / memoria / token.
- **AUXILIARY_REQUIRED**: mantiene la ruta del contrato pero exige persistencia fuera del script del profesor (auth, JWT, etc.).
- **OUT_OF_SCOPE_FOR_PROFESSOR_SCHEMA**: no hay tabla en el schema académico; no debe presentarse como MVP persistible del modelo entregado.

| Módulo | Endpoint | Estado | Respaldo en BD | Notas |
| --- | --- | --- | --- | --- |
| Países | `GET /countries` | DB_BACKED | `paises` | Lista catálogo. |
| Subastas | `GET /auctions` | DB_BACKED | `subastas`, `subastadores`, `personas` | Filtros y paginación según implementación. |
| Subastas | `GET /auctions/{auctionId}` | DB_BACKED | `subastas`, … | `auctionId` entero. |
| Subastas | `GET /auctions/{auctionId}/items` | DB_BACKED | `catalogos`, `itemsCatalogo`, `productos`, `fotos` | Ítems del catálogo de esa subasta. |
| Subastas | `GET /auctions/{auctionId}/live` | DERIVED | `subastas`, `itemsCatalogo`, `pujos` | “En vivo” inferido de estado + tiempo + pujas recientes. |
| Subastas | `POST /auctions/{auctionId}/live/session` | RUNTIME_ONLY | — | Sin tabla de sesión en el schema del profesor. |
| Subastas | `DELETE /auctions/{auctionId}/live/session` | RUNTIME_ONLY | — | Idem. |
| Pujas | `POST /auctions/{auctionId}/bids` | DB_BACKED | `asistentes`, `pujos`, `itemsCatalogo` | Requiere cliente autenticado mapeado a `clientes`. |
| Pujas | `GET /auctions/{auctionId}/bids/history` | DB_BACKED | `pujos`, `asistentes`, `itemsCatalogo` | Orden sugerido: `pujos.identificador`. |
| Ítems | `GET /items/{itemId}` | DB_BACKED | `itemsCatalogo`, `productos`, `fotos`, `duenios`, `personas` | `itemId` = `itemsCatalogo.identificador`. |
| Ítems | `GET /items/{itemId}/insurance` | DB_BACKED | `seguros`, `productos` | Según `productos.seguro` → `nroPoliza`. |
| Ítems | `POST /items/{itemId}/insurance/coverage-increase` | OUT_OF_SCOPE_FOR_PROFESSOR_SCHEMA | — | No hay persistencia de “solicitud de aumento” en el schema. |
| Usuario | `GET /users/me` | DB_BACKED | `personas`, `clientes`, `paises` | Sin email/contraseña en modelo profesor. |
| Usuario | `GET /users/me/metrics` | DERIVED | `asistentes`, `pujos`, `registroDeSubasta` | Agregados. |
| Usuario | `GET /users/me/auctions` | DB_BACKED | `asistentes`, `subastas` | Subastas donde participó. |
| Usuario | `GET /users/me/bids` | DB_BACKED | `pujos`, `asistentes`, `itemsCatalogo` | |
| Usuario | `GET /users/me/wins` | DB_BACKED | `pujos` (`ganador = 'si'`), `itemsCatalogo`, `subastas` | Ajustar regla de “ganador” con negocio. |
| Usuario | `GET /users/me/live-session` | RUNTIME_ONLY | — | |
| Vendedor | `GET /users/me/seller/settlements` | DB_BACKED | `registroDeSubasta`, `duenios`, `productos`, `subastas` | Dueño = `duenios.identificador` = persona del vendedor. |
| Vendedor | `GET /users/me/seller/settlements/{settlementId}` | DB_BACKED | `registroDeSubasta` | |
| Vendedor | `GET /users/me/seller/payout-account` | OUT_OF_SCOPE_FOR_PROFESSOR_SCHEMA | — | |
| Vendedor | `PUT /users/me/seller/payout-account` | OUT_OF_SCOPE_FOR_PROFESSOR_SCHEMA | — | |
| Notificaciones | `GET /users/me/notifications` | DERIVED o OUT_OF_SCOPE | opcional | Sin tabla `notifications`; solo DERIVED si la API sintetiza eventos. |
| Notificaciones | `PATCH /users/me/notifications/{notificationId}` | OUT_OF_SCOPE_FOR_PROFESSOR_SCHEMA | — | Sin persistencia de leído. |
| Pagos | `GET/POST/PUT/DELETE /users/me/payment-methods…` | OUT_OF_SCOPE_FOR_PROFESSOR_SCHEMA | — | Ver sección fuera de alcance. |
| Consignaciones | `POST /item-submissions` | DB_BACKED (simplificado) | `productos`, `fotos`, `duenios`, `empleados` | Flujo reducido a alta de producto + fotos. |
| Consignaciones | `GET /users/me/item-submissions` | DB_BACKED / DERIVED | `productos` | Listado según criterio de “mis productos”. |
| Consignaciones | `GET /item-submissions/{submissionId}` | DB_BACKED | `productos` | Mapear `submissionId` → `productos.identificador` si se unifica. |
| Consignaciones | `DELETE /item-submissions/{submissionId}` | OUT_OF_SCOPE_FOR_PROFESSOR_SCHEMA | — | No hay máquina de estados de envío en el schema. |
| Consignaciones | `POST …/terms-decision`, `POST …/shipment` | OUT_OF_SCOPE_FOR_PROFESSOR_SCHEMA | — | |
| Auth | `POST /auth/register` | DB_BACKED (MVP académico) | `personas`, `clientes`, `paises` | Sin email/clave en BD profesor. |
| Auth | `POST /auth/login` | AUXILIARY_REQUIRED | — | |
| Auth | `POST /auth/logout` | AUXILIARY_REQUIRED | — | |
| Auth | `POST /auth/change-initial-password` | AUXILIARY_REQUIRED o OUT_OF_SCOPE | — | Sin columnas en schema profesor. |
| Auth | `POST /auth/forgot-password`, `POST /auth/reset-password` | OUT_OF_SCOPE_FOR_PROFESSOR_SCHEMA | — | Salvo tablas auxiliares explícitas. |

---

## Endpoints respaldados por el schema del profesor

### `GET /countries`

**Estado:** DB_BACKED  

**Descripción:** Lista países desde `paises`.

**Respuesta 200** — ejemplo:

```json
[
  {
    "id": 1,
    "nombre": "Argentina",
    "nombreCorto": "AR",
    "capital": "Buenos Aires",
    "nacionalidad": "argentina",
    "idiomas": "es"
  }
]
```

- `id` ↔ `paises.numero`.

---

### `GET /auctions`

**Estado:** DB_BACKED  

**Query:** filtros opcionales (`categoria`, `estado`, paginación) según implementación.

**Respuesta:** lista de subastas; cada elemento incluye al menos:

- `id` (entero) ↔ `subastas.identificador`
- `fecha`, `hora`
- `estadoBd`: `abierta` | `carrada` (opcional, crudo)
- `status` (opcional, **normalizado**): `scheduled` | `live` | `closed` (ver convenciones)
- `categoria`: `comun` | `especial` | `plata` | `oro` | `platino`
- `ubicacion`, `capacidadAsistentes`, `tieneDeposito`, `seguridadPropia`
- Datos del subastador: join `subastadores` + `personas` (`nombre`, `matricula`, `region`)

**Nota:** El schema del profesor **no** incluye flag `featured`. Si el cliente envía o espera `featured`, documéntelo como **no persistido** en este MVP de BD o elimínelo del contrato visual en frontend.

---

### `GET /auctions/{auctionId}`

**Estado:** DB_BACKED  

**Parámetro:** `auctionId` — `integer`, ejemplo `5`.

**Respuesta 200:** mismo shape que un elemento de la lista, con más detalle si aplica.

---

### `GET /auctions/{auctionId}/items`

**Estado:** DB_BACKED  

**Descripción:** Ítems del catálogo de la subasta: `catalogos` donde `subasta = auctionId`, join `itemsCatalogo` → `productos` → `fotos` (conteo o URLs derivadas).

**Elemento ejemplo:**

```json
{
  "id": 100,
  "catalogoId": 12,
  "productoId": 34,
  "precioBase": 1500.00,
  "comision": 150.00,
  "subastado": "no",
  "tituloResumen": "Producto 34",
  "descripcionCatalogo": "No Posee",
  "imageUrls": ["/api/products/34/photos/1"]
}
```

---

### `GET /items/{itemId}`

**Estado:** DB_BACKED  

**Parámetro:** `itemId` — entero, `itemsCatalogo.identificador`.

**Cuerpo de detalle** (campos alineados al profesor):

| Campo API | Origen BD |
| --- | --- |
| `id` | `itemsCatalogo.identificador` |
| `catalogoId` | `itemsCatalogo.catalogo` |
| `productoId` | `itemsCatalogo.producto` |
| `precioBase` | `itemsCatalogo.precioBase` |
| `comision` | `itemsCatalogo.comision` |
| `subastado` | `itemsCatalogo.subastado` (`si`/`no`) |
| `descripcionCatalogo` | `productos.descripcionCatalogo` |
| `descripcionCompleta` | `productos.descripcionCompleta` |
| `duenio` | `productos.duenio` (FK `duenios`) |
| `fotos` / `imageUrls` | Derivado de `fotos` |

**No documentar como persistidos en el schema del profesor:** `artistOrDesigner`, `creationOrEraLabel`, `historicalContext`, `components[]` — salvo extensión auxiliar no incluida en el script.

---

### `GET /items/{itemId}/insurance`

**Estado:** DB_BACKED  

**Condición:** si `productos.seguro` es NULL, responder 404 o payload vacío según política.

**Ejemplo 200:**

```json
{
  "nroPoliza": "POL-2024-001",
  "compania": "Aseguradora SA",
  "polizaCombinada": "no",
  "importe": 50000.00
}
```

**No incluir** en MVP de BD: `baselineInsuredAmount`, `upgradedInsuredAmount`, `lastCoverageUpgradePaidAt`, `coverageStartAt`, `depotLocation`, etc., **no** están en `seguros` del script académico.

---

### `POST /auctions/{auctionId}/bids`

**Estado:** DB_BACKED  

**Descripción:** Registra una puja en `pujos` vinculada a un `asistente` existente o creado para (`cliente`, `subasta`).

**Request body ejemplo:**

```json
{
  "itemId": 100,
  "importe": 2000.00
}
```

**Reglas de negocio (TPO)** — deben implementarse en servicio, no necesariamente con CHECK adicionales:

- La puja debe ser **estrictamente mayor** que la oferta vigente en el ítem (derivada de último `pujos.importe` o precio base si no hay pujas).
- **Mínimo:** oferta vigente + **1%** del `precioBase` del `itemsCatalogo`.
- **Máximo:** oferta vigente + **20%** del `precioBase`.
- **Excepción:** en subastas con categoría `oro` o `platino`, estos límites **no aplican** (según consigna).

**Respuesta:** incluir `bidId` entero (`pujos.identificador`), `ganador` si se actualiza a `'si'`/`'no'`.

---

### `GET /auctions/{auctionId}/bids/history`

**Estado:** DB_BACKED  

**Orden:** por `pujos.identificador` ascendente (cronológico por inserción).

---

### `GET /users/me`

**Estado:** DB_BACKED (perfil sin auth en BD del profesor)

**Descripción:** Perfil del cliente autenticado mapeado a `personas` + `clientes` + `paises`.

**Ejemplo 200:**

```json
{
  "id": 7,
  "documento": "40123456",
  "nombre": "María García",
  "direccion": "Calle Falsa 123",
  "estado": "activo",
  "pais": {
    "id": 1,
    "nombre": "Argentina"
  },
  "admitido": "no",
  "categoria": "plata"
}
```

**Marcar como no persistidos en el schema del profesor** (no deben documentarse como columnas del modelo académico): `email`, `firstName`/`lastName` separados, `documentFrontImageUrl`, `documentBackImageUrl`, `biddingBlockedUntilResolved`, `delinquentWinId`, `accountServiceSuspended`, `requiresPasswordChange`.

---

### `GET /users/me/metrics`

**Estado:** DERIVED  

**Descripción:** Conteos desde `asistentes`, `pujos`, `registroDeSubasta` (definición exacta a cargo del backend).

---

### `GET /users/me/auctions` · `GET /users/me/bids` · `GET /users/me/wins`

**Estado:** DB_BACKED / DERIVED  

- Subastas: vía `asistentes.subasta`.
- Pujas: vía `pujos` + `asistentes`.
- Ganadas: `pujos.ganador = 'si'` (validar reglas de cierre con negocio).

---

### `GET /users/me/seller/settlements` · `GET /users/me/seller/settlements/{settlementId}`

**Estado:** DB_BACKED  

**Mapeo:**

| Campo API | Columna |
| --- | --- |
| `id` | `registroDeSubasta.identificador` |
| `auctionId` | `registroDeSubasta.subasta` |
| `productoId` | `registroDeSubasta.producto` |
| `duenioId` | `registroDeSubasta.duenio` |
| `clienteId` | `registroDeSubasta.cliente` |
| `importe` | `registroDeSubasta.importe` |
| `comision` | `registroDeSubasta.comision` |

---

### `POST /auth/register` (MVP académico / alcance persistente)

**Estado:** DB_BACKED **solo** para persona + cliente.

**Descripción:** Alta de **persona** y extensión **cliente**; no hay correo ni contraseña en el `schema.sql` del profesor.

**Request body recomendado:**

```json
{
  "documento": "40123456",
  "nombre": "María García",
  "direccion": "Calle Falsa 123",
  "numeroPais": 1,
  "foto": null
}
```

- `foto`: opcional; si se envía Base64, el backend persiste en `personas.foto` (VARBINARY). Alternativa: subida por otro endpoint si se define.

**Respuesta 201:**

```json
{
  "id": 7,
  "mensaje": "Cliente registrado pendiente de verificación (admitido = no)."
}
```

- `id` ↔ `personas.identificador` / `clientes.identificador`.

**No documentar:** envío de contraseña temporal por email como parte del modelo del profesor.

---

## Endpoints de tiempo de ejecución o auxiliares

### Autenticación JWT / sesión

| Endpoint | Estado | Notas |
| --- | --- | --- |
| `POST /auth/login` | AUXILIARY_REQUIRED | Credenciales fuera del script académico salvo tablas auxiliares. |
| `POST /auth/logout` | AUXILIARY_REQUIRED | Invalidación de token en memoria o tabla auxiliar. |
| `POST /auth/change-initial-password` | AUXILIARY_REQUIRED o OUT_OF_SCOPE | Sin columnas en profesor; solo si hay módulo técnico paralelo. |
| `POST /auth/forgot-password` | OUT_OF_SCOPE_FOR_PROFESSOR_SCHEMA | Salvo diseño auxiliar explícito. |
| `POST /auth/reset-password` | OUT_OF_SCOPE_FOR_PROFESSOR_SCHEMA | Idem. |

### Sesión en vivo (sin tabla en BD)

| Endpoint | Estado |
| --- | --- |
| `GET /users/me/live-session` | RUNTIME_ONLY |
| `POST /auctions/{auctionId}/live/session` | RUNTIME_ONLY |
| `DELETE /auctions/{auctionId}/live/session` | RUNTIME_ONLY |

**Texto para el cliente móvil:** estas rutas modelan **exclusión mutua** de sala en vivo (regla TPO); la persistencia de “sesión activa” **no** está en el `schema.sql` del profesor. El backend puede usar caché, Redis o estado en JWT hasta que exista tabla auxiliar.

### `GET /auctions/{auctionId}/live`

**Estado:** DERIVED — estado actual construido desde `subastas`, últimas `pujos`, ítems activos.

---

## Endpoints fuera del alcance del MVP persistente (schema del profesor)

Los siguientes **mantienen nombre de ruta** si el producto aún los referencia, pero **no** deben documentarse como soportados por las tablas del script académico:

- **Medios de pago:** `GET/POST/PUT/DELETE /users/me/payment-methods`, `…/verify`, `…/reserve-funds`
- **Cuenta de cobro vendedor:** `GET/PUT /users/me/seller/payout-account`
- **Aumento de cobertura:** `POST /items/{itemId}/insurance/coverage-increase`
- **Workflow envío / términos de consignación:** `DELETE /item-submissions/{id}`, `POST …/terms-decision`, `POST …/shipment`
- **Notificación leída:** `PATCH /users/me/notifications/{notificationId}` (sin columna `read` en BD profesor)
- **Pago ganador / liquidación interactiva** si implicaban tablas no presentes (p. ej. `winner_payments` del modelo antiguo): revisar; el académico cubre cierre económico vía **`registroDeSubasta`** para consultas de vendedor.

**Pagos del ganador** (`GET …/wins/{winId}/payment-breakdown`, `POST …/settle`): si el backend antiguo usaba tablas fuera del profesor, marcar como **AUXILIARY_REQUIRED** o simplificar a lectura derivada de `registroDeSubasta` + reglas de negocio.

---

## Reglas de negocio TPO a mantener (honestas con la BD)

- **Pujas:** mayor que oferta vigente; límites ±1% / ±20% sobre `precioBase` salvo categoría subasta `oro` / `platino`.
- **Sesión única en vivo:** regla de producto; implementación **RUNTIME_ONLY** respecto al schema del profesor.
- **Sin pujas:** lógica “compra empresa al valor base” es de negocio; el estado `company_purchased_at_base` **no** existe como columna en el script mostrado — documentar como **campo derivado** o `itemsCatalogo.subastado` + reglas.
- **Incumplimiento / multa / 72 h:** no hay columnas explícitas en el extracto académico; si se mantiene el requisito, será **AUXILIARY_REQUIRED** o extensión futura.

---

## Notas de implementación para backend

Orientación de repositorios contra el `schema.sql` del profesor:

1. **`subastas` repository:** CRUD lectura de `subastas`, joins a `subastadores` / `personas`, normalización de `status` API vs `estado` + `fecha`/`hora`.
2. **`catalogos` / `itemsCatalogo` / `productos` repository:** catálogo por subasta, precios, dueño, fotos (binario → DTO con URLs).
3. **`pujos` repository:** inserción con validación de montos y categoría de subasta; historial ordenado por `identificador`.
4. **`asistentes` repository:** alta idempotente por par (`cliente`, `subasta`) antes de pujar.
5. **`clientes` / `personas` repository:** registro académico, perfil `GET /users/me`, joins a `paises`.
6. **`paises` repository:** `GET /countries`.
7. **`registroDeSubasta` repository:** listados y detalle de liquidaciones/registros para vendedor (`duenio`) y comprador (`cliente`).

Mantener una capa de **mapeo DTO** entre nombres JSON (camelCase o español, según acuerdo de equipo) y columnas SQL tal cual en el script.

---

## Riesgos y supuestos (sin modificar `schema.sql`)

- El archivo `database/schema.sql` del profesor puede contener **errores de sintaxis** heredados del material (p. ej. tipos en `seguros`, comas finales en `catalogos`, caracteres corruptos en nombres de columna). La **corrección de DDL** es responsabilidad del equipo / docente; **este contrato API** asume que el modelo lógico descrito (tablas y relaciones) es el objetivo.
- `personas.estado` incluye el valor `'incativo'` en el CHECK del script recibido (posible typo de `inactivo`); el backend debe normalizar o alinearse al script real desplegado.
- `subastas.estado` usa el literal **`carrada`** en el CHECK del profesor; la API puede exponer `closed` en JSON para no propagar el typo al cliente, documentando la correspondencia.

---

## Resumen ejecutivo para entrega

- **Rutas:** se conservan los paths principales acordados con diseño.
- **IDs:** documentación y ejemplos en **enteros**.
- **Categorías:** valores **`comun` / `especial` / `plata` / `oro` / `platino`** alineados al CHECK del profesor.
- **Persistencia real:** acotada a las tablas listadas en **Fuente de verdad**; auth rico, medios de pago, notificaciones persistidas y sesión live en BD quedan como **auxiliar**, **runtime** o **fuera de alcance**, según la matriz.

---

*Fin del documento CrownBid API v2.0.0 (alineación schema académico).*
