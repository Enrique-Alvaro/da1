# Phase Auth-1 — Registro y perfil (`personas` / `clientes`)

## Resumen

Se alinearon **POST /api/auth/register** y **GET /api/users/me** con el modelo relacional actual (`personas`, `clientes`, `paises`, `empleados`). El registro **ya no** inserta en `dbo.users` ni envía correo con contraseña temporal. El perfil autenticado se obtiene por **identificador numérico** en el claim `sub` del JWT; los tokens emitidos por el login **legacy** (UUID) **no** sirven para `GET /users/me` hasta una fase posterior que unifique login.

## Archivos modificados o creados

| Archivo | Cambio |
| --- | --- |
| `apps/api/src/config/env.ts` | Variable opcional `DEFAULT_CLIENT_VERIFIER_EMPLOYEE_ID`. |
| `apps/api/src/modules/auth/auth.schemas.ts` | Nuevo cuerpo Zod de registro (`documentNumber`, `fullName`, `address`, `countryId`, `photoBase64`). |
| `apps/api/src/modules/auth/auth.types.ts` | Tipo `DbPersonaClienteProfileRow` para joins de perfil. |
| `apps/api/src/modules/auth/auth.repository.ts` | `createPersonaAndCliente`, `getConfiguredClientVerifierEmployeeId`, `findLegacyDbUserById`; se mantienen funciones legacy sobre `dbo.users` para login/reset. |
| `apps/api/src/modules/auth/auth.service.ts` | `registerUser` simplificado; `LoginResult.user` pasa a `LegacyLoginUserPublic`; mapeo con `mapLegacyDbUserToLoginUser`. |
| `apps/api/src/modules/users/users.repository.ts` | `findProfileByPersonId` (personas + clientes + paises). |
| `apps/api/src/modules/users/users.service.ts` | `getCurrentUser` exige `sub` numérico y carga el perfil nuevo. |
| `apps/api/src/modules/users/user.mapper.ts` | `UserPublic` (perfil nuevo), `LegacyLoginUserPublic`, `mapPersonaClienteToUserPublic`, `mapLegacyDbUserToLoginUser`. |
| `apps/api/src/shared/types/express.d.ts` | `currentUser` tipado como `LegacyLoginUserPublic`. |
| `apps/api/src/shared/middlewares/requireOperationalUser.ts` | Usa `findLegacyDbUserById` + mapper legacy. |
| `apps/api/.env.example` | Documentación de `DEFAULT_CLIENT_VERIFIER_EMPLOYEE_ID`. |
| `apps/api/tests/register-phase1.test.ts` | **Nuevo** — registro delegado y forma de respuesta. |
| `apps/api/tests/users-profile-phase1.test.ts` | **Nuevo** — perfil con `sub` entero y rechazo de UUID. |

## Endpoints afectados

| Método | Ruta | Comportamiento |
| --- | --- | --- |
| POST | `/api/auth/register` | Inserta en `dbo.personas` y `dbo.clientes` en transacción; respuesta 201 con `id` entero y campos en español (`admitted`, `category`). |
| GET | `/api/users/me` | Lee `personas` + `clientes` + `paises`; requiere JWT cuyo `sub` sea **solo dígitos** (id de persona). |

## Comportamiento dejado sin cambiar (intencionalmente)

- **POST /api/auth/login**, **logout**, **change-initial-password**, **forgot-password**, **reset-password**: siguen basados en **`dbo.users`** y DTO **`LegacyLoginUserPublic`**.
- **JWT**: `sub` y `email` en claims sin rediseño; solo el consumo de **`GET /users/me`** exige `sub` numérico.
- **Logout / revocación**: sin cambios; siguen usando `dbo.revoked_tokens` con `user_id` UUID.

## Flujos de auth aún incompatibles con el nuevo modelo de datos

- Login y recuperación de contraseña dependen de tablas/columnas que **no** están en el `schema.sql` académico puro (`users`, `password_reset_tokens`, etc.).
- Tras registrarse con Phase-1, **no hay token** emitido automáticamente: el cliente no puede llamar `GET /users/me` hasta exista un flujo de sesión que firme `sub` = id de persona.

## Variable de entorno obligatoria para registro

- **`DEFAULT_CLIENT_VERIFIER_EMPLOYEE_ID`**: entero positivo que debe existir en **`empleados.identificador`**. Si falta o el empleado no existe, el registro responde **500** con mensaje explícito de configuración.

## Pruebas ejecutadas

```bash
cd apps/api && npm run typecheck   # OK
cd apps/api && npm run build       # OK
cd apps/api && npm test            # 13 tests OK (auth.essential + phase1 nuevos)
```

## Riesgos y preguntas abiertas

1. **Hueco post-registro:** sin login alineado, el usuario recién creado no obtiene JWT con `sub` numérico.
2. **`findLegacyDbUserById` con `sub` numérico:** el middleware operacional usa `UniqueIdentifier`; un `sub` `"7"` podría fallar en SQL si se usara ese camino con token nuevo.
3. **Datos mínimos en BD:** debe existir al menos un **`empleados`** fila coincidente con `DEFAULT_CLIENT_VERIFIER_EMPLOYEE_ID` y **`paises`** con el `countryId` enviado.
4. **Foto:** validación Base64 es heurística (tamaño + decodificación); no valida formato de imagen.

## Próxima fase sugerida (Auth-2)

- Credenciales y login emitiendo JWT con `sub` = `personas.identificador` (string decimal).
- Decidir tabla auxiliar de autenticación o flujo MVP sin `dbo.users`.
