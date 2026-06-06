# Backend Delivery Blockers Fix Report

**Fecha:** 2026-05-23  
**Estado:** `DELIVERY_BLOCKERS_FIXED_WITH_LIMITATIONS`  
**Base de datos modificada:** **No**

---

## 1. Executive summary

Se resolvieron los blockers principales de demo identificados en la auditoría DoD:

1. **API de admisión de clientes** — empleado puede setear `clientes.admitido` y `categoria` sin SQL manual.
2. **Inspección admin y estado cliente** — endpoints para verificar admisión y preparación para pujar.
3. **Auth/documentación alineados** — forgot/reset explícitos como no implementados (`501` + código); logout documentado como descarte local del JWT.
4. **Checklist de demo** — flujo único documentado en `docs/demo/backend-demo-checklist.md`.

**Pendiente (limitaciones aceptadas):** recuperación de contraseña no implementada (tablas legacy `dbo.users` / `password_reset_tokens` no alineadas con `cliente_credenciales`); revocación JWT no activada (`revoked_tokens` no forma parte del despliegue académico mínimo); sesión live sigue en memoria.

---

## 2. Implemented/updated endpoints

| Method | Route | Auth | Purpose | Status |
|--------|-------|------|---------|--------|
| PATCH | `/api/admin/clientes/:id/admitir` | Empleado | Admitir/rechazar cliente + categoría | OK |
| PATCH | `/api/admin/clients/:id/admit` | Empleado | Alias inglés | OK |
| GET | `/api/admin/clientes/:id` | Empleado | Detalle admisión + resumen medios de pago | OK |
| GET | `/api/users/me/status` | Cliente operativo | `canBid` / motivos | OK |
| GET | `/api/clientes/me/status` | Cliente | Alias | OK |
| GET | `/api/clients/me/status` | Cliente | Alias inglés | OK |
| POST | `/api/auth/logout` | Bearer access | Mensaje descarte local (antes 204 vacío) | OK |
| POST | `/api/auth/forgot-password` | — | 501 `PASSWORD_RESET_NOT_IMPLEMENTED` | Alineado |
| POST | `/api/auth/reset-password` | — | 501 `PASSWORD_RESET_NOT_IMPLEMENTED` | Alineado |

---

## 3. Auth/documentation alignment

| Tema | Decisión | Detalle |
|------|----------|---------|
| Forgot / reset | **Opción B** | No implementado: repos legacy usan `dbo.users` (UUID), no `cliente_credenciales`. Código `PASSWORD_RESET_NOT_IMPLEMENTED`. |
| Logout | **Opción B** | Sin revocación server-side; respuesta `{ ok, message }`. README corregido (ya no afirma revocación por `jti`). |

---

## 4. Demo readiness

El flujo **register → admit (API) → verify PM → live → bid → close → result** puede ejecutarse sin `UPDATE` manual de `admitido`.

Requisitos de entorno sin cambios: scripts SQL existentes (`schema.sql`, `cliente_credenciales.sql`, `001_medios_pago_*`), variables en `.env.example`, subasta/ítem sembrados.

---

## 5. Schema usage

| Campo / tabla | Uso |
|---------------|-----|
| `clientes.admitido` | PATCH admitir |
| `clientes.categoria` | PATCH admitir (valores CHECK del esquema) |
| `cliente_credenciales.created_at` | `registeredAt` derivado en detalle admin |
| `mediosPago` | Conteo verificados en detalle admin + status cliente |

Sin `ALTER TABLE`, sin migraciones nuevas, sin tablas nuevas.

---

## 6. Tests

| Test file | Scenario | Result |
|-----------|----------|--------|
| `tests/client-admission.test.ts` | Admitir, 404, detalle admin, status cliente, guard pujas, auth codes | PASS |
| `tests/auth.essential.test.ts` | Logout message, forgot/reset codes | PASS (actualizado) |

**Total:** 133 tests passed.

---

## 7. Validation commands

| Command | Result |
|---------|--------|
| `npm run typecheck` | PASS |
| `npm run build` | PASS |
| `npm test` | PASS (133) |

---

## 8. Known limitations

- Forgot/reset password fuera de alcance hasta modelo unificado con `cliente_credenciales`.
- Logout no invalida JWT en servidor.
- `GET /admin/clientes/:id` requiere tabla `mediosPago` (migración 001) para conteos de pago.
- Sesión live en memoria (reinicio API).
- Cierre sin pujas: `COMPANY_CLIENT_ID`.

---

## 9. Recommended next phase

**Phase 2 — Documentation & contract sync:** actualizar `docs/swagger.yaml` y `docs/api/api-docs.md` con rutas de admisión y auth real; opcional smoke HTTP con supertest.

Alternativa funcional: **insurance/storage/owner visibility** solo si el esquema del profesor lo permite sin migraciones.
