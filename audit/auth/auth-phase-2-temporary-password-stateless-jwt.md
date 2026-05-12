# Auth-2 — Contraseña temporal, JWT stateless y circuito completo

## Resumen ejecutivo

Se restauró el flujo producto **registro → correo con contraseña temporal → login → cambio de contraseña inicial → sesión normal → perfil → logout**, alineado con **`personas` / `clientes` / `paises`** y una tabla auxiliar **`cliente_credenciales`** (solo credenciales: email, hash, `requires_password_change`). Los JWT son **stateless**; **no** se consulta ni persiste **`dbo.revoked_tokens`**. **Forgot / reset password** responden **501** hasta una fase posterior con tablas de reset.

## Flujo activo final

1. **POST /api/auth/register** — Transacción: inserta `personas`, `clientes`, `cliente_credenciales` (hash de contraseña temporal, `requires_password_change = 1`). Tras commit, envía correo; si el envío falla, **compensa** borrando credencial + cliente + persona.
2. **POST /api/auth/login** — Busca credencial por email, valida bcrypt, emite JWT con `sub` = **string del id de persona**, `type` = `initial_password_change` o `access`.
3. **POST /api/auth/change-initial-password** — Bearer con `initial_password_change`; valida contraseña actual, actualiza hash y apaga `requires_password_change`; emite JWT `access`.
4. **GET /api/users/me** — Requiere token `access`; carga perfil + email desde BD.
5. **POST /api/auth/logout** — Solo valida JWT en middleware; **no** toca base de datos.

## Persistencia de credenciales

- **`database/cliente_credenciales.sql`**: script de despliegue (no modifica `database/schema.sql` académico). Tabla `dbo.cliente_credenciales` con PK `persona_id` → `personas.identificador`, `email` único, `password_hash`, `requires_password_change`, timestamps.
- **No** se usa `dbo.users` en registro/login/perfil/logout de esta fase. El archivo `password-reset.repository.ts` sigue referenciando `dbo.users` para código legacy no invocado por endpoints activos de reset.

## Estrategia de token

- JWT firmado con `JWT_SECRET`; claims mínimos: `sub` (id persona, solo dígitos), `email`, `type`, `jti` (no persistido).
- Verificación rechaza `sub` no numérico, token mal formado, expirado o tipo inválido.
- **Sin** comprobación de revocación en `requireAuth`.

## Endpoints activos

| Método | Ruta | Notas |
| --- | --- | --- |
| POST | `/api/auth/register` | Cuerpo Figma: `firstName`/`lastName` o `fullName`, `email`, `documentNumber`, `address`, `countryId`, imágenes Base64 opcionales; `photoBase64` legacy. |
| POST | `/api/auth/login` | `email` + `password`. |
| POST | `/api/auth/change-initial-password` | Bearer `initial_password_change`. |
| GET | `/api/users/me` | Bearer `access`. |
| POST | `/api/auth/logout` | Bearer `access`; 204 sin DB. |

## Endpoints deshabilitados (501)

- **POST /api/auth/forgot-password**
- **POST /api/auth/reset-password**

## Archivos tocados (principal)

| Archivo | Cambio |
| --- | --- |
| `database/cliente_credenciales.sql` | **Nuevo** — DDL tabla credenciales. |
| `apps/api/src/modules/auth/auth.repository.ts` | Transacción registro + consultas credencial + update cambio inicial + compensación. |
| `apps/api/src/modules/auth/auth.service.ts` | Registro con email/temp password; login/cambio/logout; forgot/reset → `NotImplementedError`. |
| `apps/api/src/modules/auth/auth.schemas.ts` | Esquema de registro Figma + refinamientos Base64. |
| `apps/api/src/modules/auth/auth.types.ts` | `DbClientCredentialLoginRow`; perfil con `email`. |
| `apps/api/src/shared/security/jwt.ts` | `buildLoginTokenPayload({ personaId })`; `sub` numérico obligatorio en verify. |
| `apps/api/src/shared/middlewares/requireAuth.ts` | Eliminada consulta a tokens revocados. |
| `apps/api/src/shared/middlewares/requireOperationalUser.ts` | Usa `cliente_credenciales` + perfil por id persona. |
| `apps/api/src/modules/users/users.repository.ts` | LEFT JOIN email desde `cliente_credenciales`. |
| `apps/api/src/modules/users/user.mapper.ts` | `UserPublic` unificado con `email`. |
| `apps/api/src/modules/users/users.service.ts` | Mensajes de error simplificados. |
| `apps/api/src/shared/types/express.d.ts` | `currentUser` como `UserPublic`. |
| `apps/api/.env.example` | Nota script SQL + SMTP. |
| `apps/api/tests/*.test.ts` | Ajustados a Auth-2. |

## Pruebas

```bash
cd apps/api && npm run typecheck && npm run build && npm test
```

Resultado: **13 tests OK**.

## Riesgos y siguientes fases

1. **Despliegue**: sin ejecutar `cliente_credenciales.sql`, el registro fallará en SQL.
2. **Dorso del documento**: `documentBackImageBase64` se valida pero **no** se persiste (el esquema académico solo tiene una `foto` en `personas`); hoy se prioriza frente o `photoBase64`.
3. **Recuperación de contraseña**: reactivar implica nuevo modelo (sin `dbo.users` UUID) o migración de `password_reset_tokens`.
4. **`revoked-token.repository.ts`**: código huérfano; se puede borrar en limpieza posterior si no hay otros usos.

## Preguntas abiertas

- ¿Almacenar segunda imagen de documento en tabla futura o en blob externo?
- ¿Política de expiración / rotación de JWT solo por TTL (actual)?
