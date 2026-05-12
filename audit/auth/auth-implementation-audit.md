# Auth Implementation Audit

**Alcance:** solo lectura del código en `apps/api` y del archivo `database/schema.sql` vigente en el repositorio.  
**Fecha de referencia:** según el estado del workspace al generar este informe.

---

## Executive summary

**Estado:** `AUTH_NOT_COMPATIBLE`

**Justificación breve:** Toda la autenticación y el perfil de usuario actual están acoplados a la tabla **`dbo.users`** (identificador **UUID**), columnas de correo, hash de contraseña, URLs de documento, categorías y estados en **inglés**, y a tablas auxiliares **`dbo.password_reset_tokens`** y **`dbo.revoked_tokens`**. El **`database/schema.sql`** que el proyecto declara como definitivo **no define** ninguna de esas tablas ni columnas: solo el modelo en español (`paises`, `personas`, `clientes`, …). Sin una capa de migración o tablas auxiliares adicionales desplegadas en la misma base, **registro, login, logout, recuperación de contraseña y GET /users/me dejarán de ser ejecutables** contra únicamente ese script.

**Compatibilidad parcial:** la *idea* de flujos (registro → credenciales → JWT → perfil) puede reutilizarse a nivel de diseño, pero **no** hay compatibilidad de persistencia con el `schema.sql` analizado.

---

## Current implementation map

### Rutas y controladores

| Ruta | Archivo | Responsabilidad |
| --- | --- | --- |
| `POST /api/auth/register` | `apps/api/src/modules/auth/auth.controller.ts` → `register` | Valida cuerpo con Zod, delega en `authService.registerUser`. |
| `POST /api/auth/login` | mismo → `login` | Valida login, delega en `authService.loginUser`. |
| `POST /api/auth/change-initial-password` | mismo → `changeInitialPassword` | Extrae Bearer, valida body, delega en servicio. |
| `POST /api/auth/forgot-password` | mismo → `forgotPassword` | Solicitud de reset por email. |
| `POST /api/auth/reset-password` | mismo → `resetPassword` | Completa reset con token. |
| `POST /api/auth/logout` | mismo → `logout` | Middlewares `requireAuth` + `requireAccessToken`, luego `authService.logout`. |
| `GET /api/users/me` | `apps/api/src/modules/users/users.controller.ts` → `getMe` | `requireAuth` + `requireAccessToken`, `usersService.getCurrentUser`. |

Montaje de rutas: `apps/api/src/modules/auth/auth.routes.ts`, `apps/api/src/modules/users/users.routes.ts`, agregados en `apps/api/src/routes/index.ts` bajo prefijo `/api`.

### Servicios / casos de uso

| Archivo | Responsabilidad |
| --- | --- |
| `apps/api/src/modules/auth/auth.service.ts` | `registerUser`, `loginUser`, `changeInitialPassword`, `logout`, `forgotPassword`, `resetPassword`; orquesta repositorios, JWT, email y mapeo a API. |
| `apps/api/src/modules/users/users.service.ts` | `getCurrentUser`: carga usuario por `authUser.id` desde repositorio y mapea a DTO público. |

### Repositorios y acceso a datos

| Archivo | Responsabilidad |
| --- | --- |
| `apps/api/src/modules/auth/auth.repository.ts` | `findUserByIdWithPassword`, `findUserByEmailWithPassword`, `findUserByEmail`, `createUser`, `updateInitialPassword`, `deleteUserById` — todo contra **`dbo.users`**. |
| `apps/api/src/modules/auth/password-reset.repository.ts` | `createPasswordResetToken`, `findResetTokenByHash`, `completePasswordReset`, `cleanupExpiredPasswordResetTokens` — **`dbo.password_reset_tokens`** y `UPDATE dbo.users`. |
| `apps/api/src/modules/auth/revoked-token.repository.ts` | `revokeToken`, `isTokenRevoked`, `cleanupExpiredRevokedTokens` — **`dbo.revoked_tokens`**. |
| `apps/api/src/modules/users/users.repository.ts` | `findUserById` — **`dbo.users`**. |
| `apps/api/src/db/sqlServer.ts` | (no auditado línea a línea) Pool de conexión usado por los anteriores. |

### Validadores / esquemas

| Archivo | Responsabilidad |
| --- | --- |
| `apps/api/src/modules/auth/auth.schemas.ts` | Zod: `registerBodySchema` (firstName, lastName, email, documentId, address, country ISO-2, URLs de DNI), `loginBodySchema` (email, password), `changeInitialPasswordBodySchema`, `forgotPasswordBodySchema`, `resetPasswordBodySchema`, `formatZodError`. |

### DTOs / mappers

| Archivo | Responsabilidad |
| --- | --- |
| `apps/api/src/modules/users/user.mapper.ts` | `mapUserRowToApi`: convierte fila `DbUserRow` a `UserPublic` (camelCase API: `id`, `firstName`, `lastName`, `email`, `documentId`, `country`, `category`, `status`, flags booleanos, URLs de documento). |

### Tipos de fila BD

| Archivo | Responsabilidad |
| --- | --- |
| `apps/api/src/modules/auth/auth.types.ts` | `DbUserRow`, `DbUserWithPasswordRow` — forma alineada a columnas de `dbo.users`. |

### Middleware

| Archivo | Responsabilidad |
| --- | --- |
| `apps/api/src/shared/middlewares/requireAuth.ts` | Bearer → `verifyAccessToken` → comprobar revocación `isTokenRevoked` → asigna `req.authUser`. |
| `apps/api/src/shared/middlewares/requireAccessToken.ts` | Exige `tokenType === "access"` (bloquea JWT de primer cambio de contraseña). |
| `apps/api/src/shared/middlewares/requireOperationalUser.ts` | Tras auth + access: carga `dbo.users` y bloquea si `requires_password_change`; asigna `req.currentUser`. **No usado** por `users/me` según rutas actuales. |

### JWT y token Bearer

| Archivo | Responsabilidad |
| --- | --- |
| `apps/api/src/shared/security/jwt.ts` | `buildLoginTokenPayload`, `signAccessToken`, `verifyAccessToken`; claims `sub` (userId string), `email`, `type`, `jti`; issuer `crownbid-api`; expiración `JWT_EXPIRES_IN` (default `15m`). |
| `apps/api/src/shared/security/bearerToken.ts` | (referenciado por controladores/middleware) Extracción del header `Authorization`. |

### Contraseñas y reset

| Archivo | Responsabilidad |
| --- | --- |
| `apps/api/src/shared/security/passwords.ts` | `generateTemporaryPassword`, `hashPassword` (bcrypt, rounds desde env), `verifyPassword`. |
| `apps/api/src/shared/security/resetTokens.ts` | `generatePasswordResetToken` (random bytes), `hashPasswordResetToken` (SHA-256 hex para persistir). |

### Email

| Archivo | Responsabilidad |
| --- | --- |
| `apps/api/src/shared/email/email.service.ts` | `sendTemporaryPasswordEmail`, `sendPasswordResetEmail`; SMTP vía env o mock en desarrollo (log de contraseña temporal en no-producción). |

### Contexto de request

| Archivo | Responsabilidad |
| --- | --- |
| `apps/api/src/shared/types/auth.ts` | `AuthUserContext`, `AuthTokenType`. |
| `apps/api/src/shared/types/express.d.ts` | Extiende `Express.Request` con `authUser`, `currentUser`. |

### Configuración / variables de entorno

| Variable / área | Archivo | Uso relevante auth |
| --- | --- | --- |
| `JWT_SECRET`, `JWT_EXPIRES_IN` | `apps/api/src/config/env.ts`, `jwt.ts` | Firma y verificación JWT; en producción `JWT_SECRET` obligatorio (`loadEnv`). |
| `BCRYPT_SALT_ROUNDS` | `env.ts`, `passwords.ts` | Rondas bcrypt (default 12 en código de hash si no se pasa). |
| `SMTP_*`, `FRONTEND_URL` | `env.ts`, `email.service.ts`, `auth.service.ts` | Envío de correos y armado de URL de reset. |
| `PASSWORD_RESET_TOKEN_TTL_MINUTES` | `env.ts`, `getPasswordResetTtlMinutes` | TTL del token de reset. |
| Cadena SQL Server | `env.ts` | Conexión usada por todos los repositorios. |

### Tests

| Archivo | Responsabilidad |
| --- | --- |
| `apps/api/tests/auth.essential.test.ts` | Pruebas unitarias de `loginUser`, `changeInitialPassword`, `forgotPassword`, `resetPassword` con mocks de repositorios/email; asume filas tipo `DbUserWithPasswordRow` con UUID y categoría `common`. |

### Documentación externa al código

| Recurso | Nota |
| --- | --- |
| `docs/api/api-docs.md` | Contrato orientado a frontend (actualizado en el repo); puede divergir del comportamiento real del backend hasta que se implemente la alineación. |

---

## Current endpoints

| Método | Path | Handler | Body esperado (validación Zod) | Respuesta típica | Códigos usados / relevantes | Auth |
| --- | --- | --- | --- | --- | --- | --- |
| POST | `/api/auth/register` | `auth.controller.ts` `register` | `firstName`, `lastName`, `email`, `documentId`, `address`, `country` (2 letras), `documentFrontImageUrl`, `documentBackImageUrl` (URLs) | `201` `{ message, user: UserPublic, emailSentTo }` | 201, 400/422 validación, 409 email duplicado, 500 email fallido | No |
| POST | `/api/auth/login` | `login` | `email`, `password` | `200` `{ accessToken, user: UserPublic, mustChangePassword, isFirstLogin }` | 200, 401, 422 | No |
| POST | `/api/auth/change-initial-password` | `changeInitialPassword` | `currentPassword`, `newPassword` | `200` mismo shape que login con token de acceso | 200, 401, 409, 422 | Bearer (JWT tipo `initial_password_change`) |
| POST | `/api/auth/forgot-password` | `forgotPassword` | `email` | `202` `{ message }` genérico | 202, 422, 500 si falla envío mail | No |
| POST | `/api/auth/reset-password` | `resetPassword` | `token`, `password` | `200` login completo | 200, 400, 401, 410, 422 | No |
| POST | `/api/auth/logout` | `logout` | vacío | `204` sin cuerpo | 204, 401 | Bearer JWT access |
| GET | `/api/users/me` | `users.controller.ts` `getMe` | — | `200` `UserPublic` | 200, 401 | Bearer JWT access |

**Nota:** Los controladores devuelven errores vía middleware de errores del proyecto (`ValidationError` → típicamente 422, etc.); los códigos exactos dependen de `errorMiddleware`.

---

## Database dependency analysis

Referencias explícitas en SQL embebido del código actual vs tablas del **`database/schema.sql`** actual (190 líneas: `paises`, `personas`, `empleados`, … sin `users`).

| Funcionalidad | Tabla / columnas usadas hoy | ¿Existe en el nuevo `schema.sql`? | Riesgo |
| --- | --- | --- | --- |
| Registro de usuario | `INSERT dbo.users` (id UUID, first_name, last_name, email, password_hash, document_id, address, country_code, photo_url, document_front/back URLs, category, status, requires_password_change, flags BIT, …) | **No** existe `users` | **Alto:** INSERT falla. |
| Resolución de país en registro | FK implícita en comentarios de error 547 hacia “país”; en el diseño anterior era `dbo.countries`; el código usa `country_code` NVARCHAR(2) | El nuevo script tiene **`paises.numero`** y no `country_code` en `clientes` como ISO en el mismo formato de API | **Alto:** modelo distinto (`numeroPais` INT). |
| Login / perfil / cambio contraseña | `SELECT`/`UPDATE dbo.users` | **No** | **Alto** |
| Hash contraseña / temporal | `users.password_hash`, `requires_password_change` | **No** columnas equivalentes en `personas`/`clientes` | **Alto** |
| Email como identificador de login | `users.email` | **No** en `personas` | **Alto** |
| Categoría usuario | `users.category` (`common` insertado en código) | `clientes.categoria` con valores **`comun`**, `especial`, … | **Alto:** valores y tabla distintos |
| Estado de verificación | `users.status` (`pending_verification`) | `personas.estado` (`activo`/`incativo`) + `clientes.admitido` (`si`/`no`) | **Alto:** semántica distinta |
| URLs DNI | `document_front_image_url`, `document_back_image_url` | `personas.foto` VARBINARY (una columna foto en persona, no URLs en script) | **Alto** |
| Logout / revocación | `INSERT dbo.revoked_tokens` (`user_id` UUID, `jwt_id`, …) | **No** tabla | **Medio/Alto:** logout sin persistencia de revocación |
| Forgot / reset password | `dbo.password_reset_tokens` + `UPDATE dbo.users` | **No** tablas | **Alto** |
| GET /users/me | `SELECT dbo.users` | **No** | **Alto** |

**Conclusión de dependencias:** el backend actual **no** lee ni escribe `personas`, `clientes` ni `paises` en el código auditado; está 100 % centrado en **`dbo.users`** y dos tablas auxiliares de auth.

---

## Compatibility with new schema.sql

### Suposiciones antiguas detectadas en código

| Suposición | ¿Presente en implementación? | Comentario |
| --- | --- | --- |
| Tabla `dbo.users` | Sí — todos los SQL auditados | Ausente del nuevo `schema.sql` |
| ID usuario UUID (`sql.UniqueIdentifier`, `randomUUID()`) | Sí | Nuevo modelo: `personas.identificador` / `clientes.identificador` **INT IDENTITY** |
| `email` | Sí — login, JWT `email`, perfil | No en `personas`/`clientes` del nuevo script |
| `firstName` / `lastName` | Sí — registro y mapper | Nuevo: `personas.nombre` (un solo campo) |
| `passwordHash` / `password_hash` | Sí | No en nuevo script |
| `requiresPasswordChange`, primer login | Sí | No en nuevo script |
| `mustChangePassword` / `isFirstLogin` | Sí — respuesta JSON de login | Campos de API, no BD nueva |
| `documentFrontImageUrl` / `documentBackImageUrl` | Sí | Nuevo script: solo `foto` VARBINARY en `personas` (y orientado a foto de persona, no necesariamente DNI frente/dorso como URL) |
| `status = pending_verification` | Sí — valor insertado en `createUser` | Nuevo: `admitido` + `estado` distintos |
| `category = common` (inglés) | Sí — literal en `auth.repository.ts` `createUser` | Nuevo CHECK: `comun`, `especial`, … |
| JWT `sub` = UUID string | Sí — `buildLoginTokenPayload({ userId: row.id })` | Contrato deseado: entero persona/cliente |
| Perfil API `UserPublic` con `id` string UUID | Sí — `user.mapper.ts` devuelve `row.id` | Contrato deseado: `id` entero |

### Alineación positiva (conceptual)

- Existe noción de **documento**, **dirección** y **país** en el dominio; en el nuevo modelo están en **`personas`** / **`clientes.numeroPais`** / **`paises`**, pero con **otros nombres y tipos**.
- La **categoría** y **admisión** tienen equivalente en **`clientes.categoria`** y **`clientes.admitido`**, pero el código actual no los escribe así.

---

## Contract mismatch analysis

Comparación: **implementación actual** (mapper + schemas) vs **dirección del contrato frontend** descrita en la solicitud de auditoría.

| Aspecto | Implementación actual | Contrato objetivo (ejemplo solicitado) | ¿Coincide? |
| --- | --- | --- | --- |
| POST register body | `firstName`, `lastName`, `email`, `documentId`, `address`, `country` (ISO-2), URLs obligatorias DNI | `documentNumber`, `fullName`, `address`, `countryId`, `photoBase64` | **No** |
| POST register response | `user` con UUID, email, first/last name, URLs DNI, `category` inglés, `status` inglés, flags | `id` entero, `documentNumber`, `fullName`, `status` tipo persona, `admitted`, `category` español | **No** |
| Login | `email` + `password` | Ejemplo alternativo pedía `documentNumber` + `password`; el código **solo** email | **Parcial / No** según elección de producto |
| GET /users/me | `UserPublic`: `id` string UUID, `firstName`, `lastName`, `email`, `country` string ISO, `documentId`, URLs DNI, `category`/`status` inglés, booleanos varios | `id` int, `documentNumber`, `fullName`, `country: { id, name }`, `admitted`, `category` español, `status` persona | **No** |
| Categorías | Valores como `common`, `silver`, … en BD insertada | `comun`, `plata`, … | **No** |
| Estado usuario | `pending_verification`, `approved`, … | `activo` / similar + `admitted` | **No** |

---

## Security observations

### Alta

- **Desacople BD / despliegue:** Si se despliega solo el `schema.sql` nuevo sin `dbo.users` ni tablas auxiliares, la aplicación puede fallar de forma **dura** (errores SQL) — riesgo operativo más que de lógica de auth aislada.
- **JWT en producción:** `JWT_SECRET` es obligatorio en producción (`loadEnv`); si falta en dev, login puede lanzar error interno al firmar — comportamiento documentado en `jwt.ts`.

### Media

- **Contraseña temporal en desarrollo:** Sin SMTP, `sendTemporaryPasswordEmail` **registra la contraseña en consola** (`email.service.ts`) — aceptable solo en no-producción; riesgo de fuga si `NODE_ENV` mal configurado.
- **Logout:** Sí invalida en BD **si** existe `revoked_tokens` y el insert funciona; si la tabla no existe, el endpoint fallará. La invalidación es por **JTI**, no por lista negra de todo el refresh (no hay refresh token en el diseño auditado).
- **Reset token:** Se persiste **hash** SHA-256, no el token en claro; TTL configurable. **Bien** a nivel de diseño.
- **Login:** Mismo mensaje para usuario inexistente y contraseña incorrecta (`Credenciales inválidas.`) — **no** filtra existencia de cuenta (**bien**).
- **Registro:** Tras INSERT, si falla el email se hace `deleteUserById` — intenta evitar usuarios huérfanos sin correo (**bien**); carrera posible si falla el delete (log + error).

### Baja

- **Bcrypt:** Rondas desde `BCRYPT_SALT_ROUNDS` o default 12 — razonable; no se devuelve hash en respuestas API estándar.
- **Consultas SQL:** Uso de parámetros `.input(...)` en `mssql` — **parametrizado** en los fragmentos auditados.
- **Tamaño de fotos Base64:** El contrato nuevo sugiere `photoBase64`; **no** hay validación en el código actual de registro (que usa URLs). Cualquier migración a Base64 debería imponer límites — **hoy no aplica** al register actual.
- **Middleware:** Token malformado / expirado → `verifyAccessToken` lanza `UnauthorizedError`; revocado → mensaje explícito. Comportamiento coherente.

---

## Frontend integration risks

Riesgos concretos si el frontend adopta `api-docs.md` nuevo y el **backend no cambia**:

1. **Registro:** El cliente envía `documentNumber`, `fullName`, `countryId` → el backend espera **`firstName`**, **`lastName`**, **`email`**, **`country`** (string), **URLs obligatorias** → **422** o rechazo constante.
2. **IDs:** El cliente espera **`id` numérico** → el backend devuelve **UUID string** en `user.id` → tipos/parsing en TypeScript y comparaciones fallan.
3. **Login:** Documento nuevo podría pedir `documentNumber`; el backend **solo** acepta **`email`**.
4. **Perfil:** El cliente espera `admitted`, `country: { id, name }`, `fullName`; el backend devuelve `requiresPasswordChange`, `documentFrontImageUrl`, `country: "AR"`, `firstName`/`lastName`, etc.
5. **Categorías:** Cliente en español (`comun`) vs servidor que inserta `common` y puede devolver categorías en inglés según fila.
6. **Flujo primer acceso:** Contrato nuevo puede omitir `mustChangePassword` / email temporal; el backend **sí** envía correo con temporal y devuelve flags — UX y pantallas desalineadas.
7. **Logout / tokens:** Si `revoked_tokens` no existe en BD desplegada, **logout** falla aunque el cliente envíe Bearer válido.
8. **Forgot/reset:** Endpoints existen en backend pero tablas pueden faltar en BD solo-nueva → errores 500 o SQL.

---

## Recommended phased correction plan

### Fase 1 — Registro alineado a `personas` + `clientes`

- **Objetivo:** `POST /auth/register` inserta en `personas` y `clientes` (y resuelve `numeroPais` desde `countryId` contra `paises.numero`).
- **Archivos probables:** `auth.schemas.ts`, `auth.repository.ts` (nuevo o reemplazo parcial), `auth.service.ts`, posiblemente transacción y semilla de `empleados` para `verificador` obligatorio en `clientes`.
- **Criterio de aceptación:** Registro devuelve `id` entero; no depende de `dbo.users`; validación de país por entero.

### Fase 2 — Perfil `GET /users/me`

- **Objetivo:** Respuesta en forma acordada con frontend (`documentNumber`, `fullName`, `country`, `admitted`, `category` en español).
- **Archivos probables:** `users.repository.ts`, `user.mapper.ts`, tipos compartidos.
- **Criterio de aceptación:** No exponer campos que ya no existan en BD o marcarlos opcionales con contrato versionado.

### Fase 3 — Estrategia de credenciales

- **Opción A — Tablas auxiliares:** p. ej. `autenticaciones` (email, hash, `numeroPersona` FK) fuera del script mínimo del profesor pero en la misma base.
- **Opción B — MVP sin email:** login por documento + PIN (implica diseño de amenazas y almacenamiento seguro distinto).
- **Opción C — Aplazar login real:** solo registro + perfil hasta definir credenciales.
- **Impacto:** Opción A mantiene flujo similar al actual; B/C requieren rediseño de `auth.schemas`, JWT (`sub` entero) y tests.

### Fase 4 — JWT y middleware

- **Objetivo:** `sub` como entero (o string decimal de entero estable); claims mínimos; seguir usando `jti` + revocación si se mantiene tabla auxiliar.
- **Archivos probables:** `jwt.ts`, `auth.types` / `express.d.ts`, `requireAuth.ts`, servicios que lean `payload.sub`.

### Fase 5 — Flujos primer login / reset

- **Objetivo:** Reimplementar sobre tablas auxiliares **o** retirar del contrato público y del router si el producto lo decide.
- **Archivos probables:** `auth.routes.ts`, `auth.service.ts`, `password-reset.repository.ts`, email.

### Fase 6 — Tests y documentación

- **Objetivo:** `auth.essential.test.ts` y documentación alineados a cuerpos y respuestas finales.
- **Criterio de aceptación:** Tests verdes contra BD de integración o mocks que reflejen el nuevo modelo.

---

## Open questions

1. **Verificador en `clientes`:** El `schema.sql` exige `verificador NOT NULL` FK a `empleados`. ¿Qué valor por defecto o empleado sistema se usará en el alta automática de cliente desde la API?
2. **`personas` sin email:** ¿Cómo será el flujo de recuperación de cuenta si solo hay documento/teléfono?
3. **Despliegue real de BD:** ¿La base de ejecución incluirá **solo** el script de 190 líneas o también tablas auxiliares (`users`, `revoked_tokens`) por compatibilidad? La respuesta define si el fallo es inmediato o gradual.
4. **CHECK `estado`:** El script contiene `'incativo'` (posible typo). ¿El API normalizará a otro valor para el cliente?

---

*Fin del informe de auditoría (solo lectura).*
