# Backend DoD and Senior Architecture Audit

**Fecha:** 2026-05-23  
**Alcance:** solo `apps/api` (read-only)  
**Base de datos modificada en esta auditoría:** **No**

---

## 1. Executive summary

**Estado global:** `BACKEND_READY_WITH_LIMITATIONS`

El backend CrownBid está **funcionalmente avanzado** para un TP de subastas móvil: auth/registro, medios de pago, subastas en vivo, pujas con reglas de negocio, cierre/adjudicación, métricas/compras y envío de productos están implementados con capas claras (routes → controllers → services → repositories) y **123 tests unitarios** pasan. TypeScript compila sin errores.

No alcanza “listo sin reservas” por: **(a)** dependencias de esquema/scripts fuera del `schema.sql` puro del profesor (`cliente_credenciales`, migración `001` para `mediosPago` y `subastas.moneda`), **(b)** ausencia de API admin para **admitir clientes** (`clientes.admitido` queda en `no` al registrarse), **(c)** recuperación de contraseña **501** pese a rutas/documentación, **(d)** limitaciones de inspección/rechazo de productos por esquema, **(e)** sesión live **solo en memoria**, **(f)** brecha documentación vs implementación (logout, forgot-password, rutas legacy).

| Pregunta | Respuesta |
| -------- | --------- |
| ¿Cumple DoD general del TP? | **Sí, con limitaciones documentables** en admisión, rechazo de ítems, password recovery y despliegue DB |
| ¿Defendible en TP? | **Sí**, si el equipo explica limitaciones de esquema y demo usa datos sembrados (`admitido=si`, medios verificados, `COMPANY_CLIENT_ID`) |
| ¿Demo-ready? | **Parcial** — riesgo alto si no hay seed SQL previo o si se prueba forgot-password / rechazo persistido |
| ¿Mantenible? | **Sí a nivel medio-alto** — módulos por dominio; algunos servicios grandes y capa API duplicada en envíos |
| ¿DB cambiada en esta auditoría? | **No** |

### Hallazgos más importantes (10)

1. **Registro deja `clientes.admitido = 'no'`** y **no existe endpoint admin** para aprobar admisión → pujas fallan con `CLIENT_NOT_APPROVED` hasta intervención manual en BD.
2. **`POST /api/auth/forgot-password` y `reset-password` lanzan `NotImplementedError` (501)** aunque README/Swagger/documentación de fases los listan como flujo Phase 7.
3. **Medios de pago y moneda de subasta** dependen de `database/migrations/001_*.sql` + `cliente_credenciales.sql` — no están en `database/schema.sql` del profesor (`SCHEMA_LIMITATION` / dependencia de despliegue).
4. **Pujas:** reglas 1%/20%, categoría, admisión, medio verificado, subasta abierta, asistente y sesión live están **enforzadas en backend** (`pujos.service`, `subastas-access`, transacción con `UPDLOCK`).
5. **Cierre/adjudicación** server-side con transacción, empate por menor `identificador`, compra empresa sin pujas si `COMPANY_CLIENT_ID` — documentado en informe de cierre.
6. **Envío de productos:** crear/listar/asignar OK; **rechazo con motivo → 409** `REJECTION_NOT_SUPPORTED_BY_SCHEMA`; términos dueño → 409; estados derivados.
7. **Sesión live en `live-session.store.ts` (Map en memoria)** — reinicio de proceso o segundo nodo rompe coherencia de demo (`NO_PERSISTED_LIVE_SESSION`).
8. **Logout documentado como revocación por `jti`** pero `auth.service.logout` es no-op y `requireAuth` no consulta `revoked_tokens` — tokens siguen válidos hasta expiración.
9. **Tests:** buena cobertura unitaria de reglas; **sin tests HTTP/integration** (supertest); QA manual documentada en README/audit parciales.
10. **TypeScript limpio** (`tsc --noEmit`, build, 123 tests); **sin script `lint`** en `package.json`.

---

## 2. Sources reviewed

| Fuente | Uso |
| ------ | --- |
| `apps/api/src/**` (~113 archivos TS) | Rutas, servicios, repos, middlewares, validación |
| `apps/api/tests/*.test.ts` (11 archivos) | Cobertura de reglas |
| `apps/api/package.json`, `tsconfig.json`, `.env.example`, `README.md` | Scripts, env, endpoints |
| `database/schema.sql` | Esquema académico base |
| `database/migrations/001_medios_pago_subasta_moneda.sql`, `cliente_credenciales.sql` | Extensiones usadas por el código |
| `docs/api/api-docs.md`, `docs/swagger.yaml`, `docs/postman/*` | Contrato vs implementación |
| `audit/item-submission-backend-flow-implementation-report.md` | Verificado parcialmente |
| `audit/auction-closing-backend-flow-implementation-report.md` | Verificado parcialmente |
| `audit/backend-typescript-comments-cleanup-report.md` | TS baseline |
| `audit/backend-functional-gap-audit.md` | **No presente** en el repo actual |

---

## 3. Validation commands

| Command | Result | Notes |
| ------- | ------ | ----- |
| `npm run typecheck` | **PASS** | 0 errores |
| `npm run build` | **PASS** | `dist/` generado |
| `npm test` | **PASS** | 11 files, 123 tests |
| `npm run lint` | **N/A** | Script no definido en `package.json` |

---

## 4. General backend DoD checklist

| DoD Item | Expected | Current evidence | Status | Risk | Required action |
| -------- | -------- | ---------------- | ------ | ---- | --------------- |
| Backend starts | Proceso levanta | `server.ts` + `createApp()`; warmup DB opcional con warn | PASSED | Low | — |
| Health endpoint | Liveness | `GET /health`, `GET /api/health` | PASSED | Low | — |
| DB health | Connectivity | `GET /api/health/db` → `testSqlConnection()` | PASSED | Med | Documentar que 503 es esperable sin SQL |
| Env documented | `.env.example` + README | JWT, SQL, SMTP, reviewer, employee, `COMPANY_CLIENT_ID` | PASSED_WITH_LIMITATIONS | Med | Aclarar scripts SQL obligatorios además de `schema.sql` |
| API base path | `/api` | `app.use("/api", apiRouter)` | PASSED | Low | — |
| Errors don't crash | Middleware global | `errorMiddleware` + `asyncHandler` | PASSED | Low | — |
| Registration | Alta cliente | `POST /api/auth/register` → personas+clientes+credenciales | PASSED | Med | `admitido=no` por defecto |
| Login + JWT | Access / first-login | `auth.service`, `jwt.ts`, middlewares | PASSED | Low | — |
| RBAC | Cliente vs empleado | `requireClienteAuth`, `requireEmployeeAuth` | PASSED | Low | — |
| First login / temp password | Cambio inicial | `change-initial-password`, email temp | PASSED_WITH_LIMITATIONS | Med | SMTP en prod |
| Forgot/reset password | Recovery | `auth.service` → **501** | **FAILED** | **High** | Implementar o marcar explícitamente fuera de alcance en demo |
| Password hashing | bcrypt | `passwords.ts`, `auth.repository` | PASSED | Low | — |
| User admission | Backend enforced | `assertClienteAdmitted`, `subastas-access` | PARTIAL | **High** | API admin o seed `admitido=si` |
| User category | Enforced | `auction-categories.ts`, pujos + access | PASSED | Low | — |
| Payment methods CRUD | Cliente | `users/me/payment-methods` | PASSED_WITH_LIMITATIONS | Med | Requiere tabla `mediosPago` (migración) |
| Admin verify/reject PM | Empleado | `/api/admin/payment-methods` | PASSED | Low | — |
| Verified PM to bid | Backend | `assertPaymentMethodForBid` + TX | PASSED | Low | — |
| Auction list/detail | Público/opcional auth | `subastas` + alias `auctions` | PASSED | Low | — |
| Featured auctions | Derivado | `?featured=true`, open, limit 6 | PASSED_WITH_LIMITATIONS | Low | Derivado, no columna featured |
| Auction items | Catálogo | `GET .../items`, `GET /api/items/:id` | PASSED | Low | — |
| basePrice visibility | Solo cliente JWT | `canShowBasePrice` en mapper | PASSED | Low | — |
| Live state | Polling | `GET .../live` + session POST/DELETE | PASSED_WITH_LIMITATIONS | **High** | Memoria; reinicio pierde sesión |
| Bid endpoint | POST pujos/bids | `pujos.controller` | PASSED | Low | — |
| Bid history | GET history | `getBidHistory` | PASSED | Low | — |
| Bid rules (1%/20%) | Backend | `validateBidAmountRules`, `computeBidLimits` | PASSED | Low | — |
| Premium bypass | oro/platino | `isPremiumAuctionCategory` | PASSED | Low | — |
| Guarantee cheque | montoDisponible | `GUARANTEE_LIMIT_EXCEEDED` | PASSED | Low | No descuenta saldo |
| TX-safe bid | Locks | `insertBidInTransaction` READ_COMMITTED + UPDLOCK | PASSED_WITH_LIMITATIONS | Med | Condiciones de carrera documentadas |
| Close item | Empleado | `POST .../cerrar` | PASSED | Med | `COMPANY_CLIENT_ID` para sin pujas |
| Winner server-side | SQL ORDER BY | `subastas-closing.repository` | PASSED | Low | — |
| Result / purchases | GET | `resultado`, `users/me/purchases` | PASSED_WITH_LIMITATIONS | Med | Sin estado de pago persistido |
| User metrics | GET | `users-metrics.service` | PASSED | Low | — |
| Item submission | 6 fotos, declaraciones | Zod + `parseProductImages` | PASSED | Low | Declaraciones no persistidas |
| Admin review | List/accept/assign | `/api/admin/productos/solicitudes` | PASSED_WITH_LIMITATIONS | Med | Rechazo → 409; legacy reject ambiguo |
| Consistent errors | AppError | `errorMiddleware` JSON | PASSED | Low | 422 Validation vs algunos 400 |
| API docs match | Swagger/Postman/README | Parcial | **PARTIAL** | **High** | Alinear logout, forgot-password, rutas españolas |
| Manual QA documented | Checklists | README + audit reports | PASSED_WITH_LIMITATIONS | Med | Falta checklist único end-to-end TP |
| Honest schema limits | Documented | audit reports + `schemaLimitations` en API | PASSED | Low | Repetir en defensa oral |

---

## 5. Functional readiness by module

| Module/Flow | Status | Evidence | Main gaps | Delivery risk |
| ----------- | ------ | -------- | --------- | ------------- |
| Auth | PARTIAL | `auth.routes`, `auth.service`, tests `auth.essential` | forgot/reset 501; logout sin revocación real | Alto en demo si se muestran esas rutas |
| Users/admission | PARTIAL | `users.repository`, registro `admitido=no` | Sin API admin admitir; perfil OK | **Alto** para pujas post-registro |
| Payment methods | PASSED_WITH_LIMITATIONS | Fases 2–3 tests, admin verify | Depende migración `mediosPago` | Medio en deploy |
| Auctions/catalog/items | PASSED | `subastas.service`, `items` | `moneda` vía migración | Bajo si migración aplicada |
| Live auction | PASSED_WITH_LIMITATIONS | live session + `getLiveAuctionState` | Memoria; polling only | Alto en demo multi-instancia |
| Bidding | PASSED | `pujos.service`, `pujos.repository`, phase4 tests | Carreras bajo carga extrema | Medio |
| Closing/result | PASSED_WITH_LIMITATIONS | closing service/repo, tests | Comisión fija, sin shipping, sin transferir dueño | Bajo con env configurado |
| Item submission | PASSED_WITH_LIMITATIONS | solicitudes + legacy routes | Rechazo/términos no persistibles | Medio en narrativa TP |
| Metrics/history | PASSED | `users-metrics`, `users-purchases` | Métricas dependen de `registroDeSubasta` | Bajo |
| Documentation | PARTIAL | README actualizado; swagger/api-docs desfasados | Rutas `/productos/solicitudes`, auth Phase 7 | Alto para integradores |
| Error handling | PASSED | `httpErrors`, middleware | Algunos códigos solo en servicio | Bajo |

---

## 6. Senior architecture review

### Estructura

```
apps/api/src/
  config/          env (zod)
  db/              pool SQL Server
  modules/         dominio (auth, users, subastas, pujos, productos, payment-methods, admin, …)
  routes/          apiRouter
  shared/          middlewares, errors, security, domain helpers
```

**Fortalezas:** convención por módulo (`*.routes`, `*.controller`, `*.service`, `*.repository`, `*.schema`); validación Zod en controllers; errores tipados `AppError`; alias inglés concentrado en `auctions.routes` e `items.routes`.

| Area | Current assessment | Evidence | Risk | Recommendation | Priority |
| ---- | ------------------ | -------- | ---- | -------------- | -------- |
| Modular boundaries | Buena separación por dominio | `modules/*` | Low | Mantener; evitar nuevos “god services” | P3_LOW |
| Controller thinness | Adecuada | Controllers parsean Zod y delegan | Low | — | — |
| Service layer | Sólida pero algunos archivos grandes | `subastas.service.ts` (~360 LOC) | Med | Extraer live/closing helpers sin cambiar contrato | P2_MEDIUM |
| Repository layer | SQL parametrizado, transacciones en writes críticos | `pujos.repository`, `subastas-closing.repository` | Low | — | — |
| Duplication | Capa API envíos duplicada | `productos-submissions-api.service` envuelve servicio legacy | Med | Unificar mappers respuesta a medio plazo | P3_LOW |
| Config | Centralizado `env.ts` | zod + cache | Low | Documentar dependencias SQL scripts | P1_HIGH |
| Auth middleware chain | Clara y composable | requireAuth → access → cliente/employee/operational | Low | — | — |
| Cross-module coupling | subastas ↔ pujos ↔ payment-methods | Imports directos entre servicios | Med | Aceptable en TP; interfaces si crece | P3_LOW |
| In-memory state | live-session.store | Map process-local | **High** | Documentar en demo; no escalar horizontal | P1_HIGH |
| Dead / unused code | `revoked-token.repository` sin uso en logout | grep solo define repo | Med | Implementar revocación o quitar docs | P2_MEDIUM |

### SOLID / GRASP (síntesis)

| Principio | Evaluación |
| --------- | ---------- |
| **SRP** | En general OK; excepción: `subastas.service` agrupa listado, live, history y helpers de ítem actual. |
| **OCP** | Alias de rutas permiten extender sin tocar handlers españoles; nuevas reglas de puja tocan `pujos.service` + tests. |
| **LSP** | Tipos de fila SQL y mappers coherentes; pocos interfaces formales. |
| **ISP** | Módulos no exponen interfaces gigantes; acoplamiento por funciones exportadas. |
| **DIP** | Lógica de negocio acoplada a `mssql` vía repos concretos (aceptable en TP). |
| **Controller** | Controllers delgados — cumple. |
| **Information Expert** | Reglas de puja en `pujos.service` + validación en TX — cumple. |
| **Low Coupling** | Medio: subastas conoce live store y closing. |
| **High Cohesion** | Alta por módulo de dominio. |
| **Protected Variations** | Limitaciones de esquema aisladas en mappers (`schemaLimitations`, 409 honestos). |

---

## 7. Function-level technical review

| File | Function/Class | Issue | Why it matters | Suggested correction | Priority |
| ---- | -------------- | ----- | -------------- | -------------------- | -------- |
| `auth.service.ts` | `forgotPassword`, `resetPassword` | Siempre `NotImplementedError` | Ruta expuesta y documentada | Implementar o devolver 501 desde controller sin prometer 202 | P0_BLOCKER (si demo incluye recovery) |
| `auth.service.ts` | `logout` | No-op | README afirma revocación por `jti` | Usar `revokeToken` + check en `requireAuth` o corregir docs | P1_HIGH |
| `subastas.service.ts` | módulo completo | Múltiples responsabilidades | Mantenimiento y pruebas | Split live/list/detail (sin cambiar rutas) | P2_MEDIUM |
| `productos-submissions.repository.ts` | `assignProductToAuction` | ~550 LOC archivo, TX larga | Riesgo regresión en asignación | Mantener TX; tests integración manual | P2_MEDIUM |
| `pujos.repository.ts` | `insertBidInTransaction` | Re-valida monto tras lock | Correcto anti-carrera; complejidad | Documentar; test concurrencia opcional | P2_MEDIUM |
| `productos-submissions-api.service.ts` | `rejectSolicitudApi` | Siempre 409 | Correcto vs esquema; legacy `decision:reject` aún confunde | Deprecar legacy reject en docs | P1_HIGH |
| `subastas-access.service.ts` | `evaluateAuctionAccess` | Centraliza admission/category/PM/live | Punto crítico único | Mantener; ampliar tests admission | P1_HIGH |
| `live-session.store.ts` | `enterSession` | Estado no durable | Demo falla tras restart | Seed demo: re-enter session | P1_HIGH |
| `auth.repository.ts` | `registerCliente` | `admitido='no'` hardcoded | Bloquea flujo TP post-registro | API admin PATCH o seed SQL | **P0_BLOCKER** |

**`any`:** no se detectó uso de `any` en `apps/api/src` (grep).

---

## 8. Business rule enforcement audit

| Business rule | Required by TP | Enforced where | Status | Risk | Notes |
| ------------- | -------------- | -------------- | ------ | ---- | ----- |
| Authenticated to bid | Sí | `requireAuth` chain + `requireClienteAuth` | BACKEND_ENFORCED | Low | — |
| User admitted | Sí | `assertClienteAdmitted`, `evaluateAuctionAccess` | BACKEND_ENFORCED | **High** | Sin API para cambiar `admitido` |
| Category allows auction | Sí | `assertCategoryAllowed` | BACKEND_ENFORCED | Low | — |
| Verified payment method | Sí | `assertPaymentMethodForBid` (pre + TX) | BACKEND_ENFORCED | Low | Tabla vía migración |
| Bid > current | Sí | `validateBidAmountRules` | BACKEND_ENFORCED | Low | — |
| Min increment 1% base | Sí | `validateBidAmountRules` | BACKEND_ENFORCED | Low | No premium |
| Max increment 20% base | Sí | idem | BACKEND_ENFORCED | Low | — |
| Gold/platinum no % limits | Sí | `isPremiumAuctionCategory` | BACKEND_ENFORCED | Low | — |
| Guarantee / cheque limit | Sí | `GUARANTEE_LIMIT_EXCEEDED` | BACKEND_ENFORCED | Low | No decrementa saldo |
| Disabled/unverified PM | Sí | estados en validación | BACKEND_ENFORCED | Low | — |
| Auction open | Sí | `assertSubastaAbierta` | BACKEND_ENFORCED | Low | — |
| TX-safe bid insert | Sí | `insertBidInTransaction` | BACKEND_ENFORCED | Med | READ_COMMITTED |
| Bids ordered / winner | Sí | closing repo ORDER BY | BACKEND_ENFORCED | Low | — |
| Submission ≥6 photos | Sí | Zod + `MIN_PRODUCT_IMAGES` | BACKEND_ENFORCED | Low | — |
| Ownership declaration | Sí | Zod declarations / solicitud | BACKEND_ENFORCED | Med | No persistida |
| Client ≠ employee routes | Sí | middlewares | BACKEND_ENFORCED | Low | — |
| No IDOR on submissions | Sí | `requireOwnedSubmission` / duenio check | BACKEND_ENFORCED | Low | — |
| Live session before bid | Implementación propia | `assertLiveSessionForBid` | BACKEND_ENFORCED | Med | No en TP literal; documentar |
| Rejection reason stored | TP ideal | `rejectSolicitudApi` → 409 | SCHEMA_LIMITATION | Med | Honesto |
| Owner accepts terms | TP ideal | 409 TERMS_* | SCHEMA_LIMITATION | Low | — |

---

## 9. Database/schema usage review

**Esquema del profesor (`database/schema.sql`):** personas, clientes, empleados, subastas (sin `moneda`), productos, fotos, catalogos, itemsCatalogo, asistentes, pujos, registroDeSubasta, seguros, etc. **No incluye** `mediosPago`, `cliente_credenciales`, `revoked_tokens`.

| Requirement | Current schema support | Backend usage | Risk | Classification |
| ----------- | ---------------------- | ------------- | ---- | -------------- |
| Login email/password | `cliente_credenciales` (script aparte) | `auth.repository` | High si no se ejecuta script | PARTIAL_SCHEMA_SUPPORT |
| Payment methods | `mediosPago` (migración 001) | payment-methods module | High sin migración | PARTIAL_SCHEMA_SUPPORT |
| Auction currency | `subastas.moneda` (ALTER migración) | pujos, PM currency match | High sin migración | PARTIAL_SCHEMA_SUPPORT |
| Product workflow status | Solo `disponible` | Estados API derivados | Med | SCHEMA_LIMITATION |
| Rejection reason | No columna | 409 en rechazar | Med | SCHEMA_LIMITATION |
| Bid winner flag | `pujos.ganador` | closing UPDATE | Low | SUPPORTED |
| Sale record | `registroDeSubasta` | closing INSERT | Low | SUPPORTED |
| Item sold flag | `itemsCatalogo.subastado` | closing | Low | SUPPORTED |
| Client admission | `clientes.admitido` | enforced; registro `no` | High | SUPPORTED_WITH_CODE_VALIDATION |
| Insurance on product | `productos.seguro` | blocks DELETE submission | Low | SUPPORTED |
| Live “connected” | No columna | in-memory Map | High | SCHEMA_LIMITATION |
| Password reset tokens | No en schema.sql | repo legacy / 501 service | Med | SCHEMA_LIMITATION |

**Nota de despliegue:** el README de API indica ejecutar `001_medios_pago_subasta_moneda.sql`. Eso **altera** `subastas` (ADD COLUMN) y **crea** `mediosPago`. Para defensa “solo schema del profesor”, el equipo debe aclarar si el entorno de corrección incluye estos scripts aditivos (habitual en el proyecto, pero no es el `.sql` único del profesor).

---

## 10. API documentation vs implementation

| Route | Documentation status | Implementation status | Mismatch | Priority |
| ----- | -------------------- | ----------------------- | -------- | -------- |
| `POST /api/productos/solicitudes` | Parcial (README) | Implementado | api-docs/swagger usan `/item-submissions` | P2_MEDIUM |
| `GET /api/admin/productos/solicitudes` | README | Implementado | Swagger incompleto | P2_MEDIUM |
| `POST /api/auth/forgot-password` | Phase 7 docs, 202 | **501** en servicio | **Crítico** | **P0_BLOCKER** |
| `POST /api/auth/logout` | “Revoca jti” | No revoca | **Crítico** | P1_HIGH |
| `GET /api/auctions/*` | Swagger | Alias OK | Rutas españolas también | P3_LOW |
| `POST .../live/session` | README audit live | Implementado | No en api-docs antiguo | P2_MEDIUM |
| `POST .../rechazar` (admin) | Informe 409 | 409 schema | Legacy `decision:reject` aún muta `disponible` | P1_HIGH |
| Admin admit client | No documentado | **No implementado** | Gap funcional TP | **P0_BLOCKER** |

---

## 11. Security and reliability risks

| Risk | Location | Impact | Evidence | Recommendation | Priority |
| ---- | -------- | ------ | -------- | -------------- | -------- |
| No admin admission API | users/auth | Usuarios nuevos no pujan | `INSERT ... admitido N'no'` | Seed SQL o endpoint empleado | **P0_BLOCKER** |
| JWT not revoked on logout | auth | Token robado usable hasta exp | `logout` vacío | Wire `revoked_tokens` o doc | P1_HIGH |
| Forgot-password advertised | auth.controller | Confusión / falsa seguridad | 501 vs 202 en controller unreachable success | Fix service o 501 explícito | P1_HIGH |
| Live session memory | live-session.store | Estado inconsistente | Map global | Document demo; single instance | P1_HIGH |
| Large base64 payloads | productos submissions | DoS / memoria | `express.json()` default limit | Límite body + validar tamaño imágenes | P2_MEDIUM |
| No CORS middleware | `app.ts` | Mobile web/debug | No cors package | Configurar si cliente browser | P2_MEDIUM |
| Employee login env-based | `auth-employee` | Credenciales en `.env` | Aceptable TP | No commitear `.env` | P1_HIGH |
| SQL injection | repositories | Bajo | Parámetros `@input` | Mantener | P3_LOW |
| IDOR submissions/photos | productos-submissions | Medio si falla check | duenio en queries | Tests ya parciales | P2_MEDIUM |
| Race on concurrent bids | pujos TX | Medio | locks + 2627 → BID_CONFLICT | QA manual concurrente | P2_MEDIUM |
| Error stack in dev | errorMiddleware | Bajo | stack si no production | OK | P3_LOW |
| Sensitive log | email mock | Medio dev | password en console dev | No demo en prod sin SMTP | P2_MEDIUM |

---

## 12. Testing and manual QA review

| Flow | Test coverage | Missing cases | Risk | Recommendation |
| ---- | ------------- | ------------- | ---- | -------------- |
| Auth login/first password | `auth.essential.test.ts` | forgot/reset, logout revoke | Med | Tests 501 forgot; doc |
| Register | `register-phase1.test.ts` | admission flow | Med | Test admitido=no |
| Payment methods | phase2/3 tests | HTTP e2e | Med | Postman collection exists |
| Bidding rules | `pujos-phase4`, live tests | true DB concurrency | Med | Manual QA checklist |
| Live auction | `live-auction-flow.test.ts` (mocked) | restart session | High | Manual re-enter live |
| Closing | `auction-closing-flow.test.ts` | company buy sin env | Med | Test COMPANY_CLIENT_ID |
| Item submission | `item-submission-flow`, producto-submissions | HTTP e2e, legacy reject | Med | Manual 6 fotos |
| Admin admission | **None** | API missing | **High** | SQL seed doc |
| Integration HTTP | **None** | supertest | **High** | Opcional pre-entrega |

**Manual QA:** README incluye listas para productos, live, cierre; no hay un único “script de demo TP” de extremo a extremo.

---

## 13. Priority correction roadmap

### Phase 1 — Delivery blockers (P0/P1)

| Objetivo | Tareas | Áreas | Criterio de aceptación | QA manual |
| -------- | ------ | ----- | ---------------------- | --------- |
| Usuarios pueden pujar tras registro | Seed `UPDATE clientes SET admitido='si'` **o** `PATCH /api/admin/clientes/:id/admitir` | auth, admin, users | Cliente registrado puja con PM verificado | Registro → SQL admit → PM → puja |
| Documentación honesta auth | Corregir README/Swagger: forgot=501, logout sin revocación | docs | Sin rutas “falsas positivas” | Llamar forgot → 501 esperado |
| Entorno DB completo | Ejecutar `schema.sql` + `cliente_credenciales.sql` + `001_*.sql` | database | PM y moneda funcionan | `GET /api/health/db` OK |
| Demo subasta | Semilla: subasta abierta, ítems, asistente, live session | SQL + API | Flujo live+bid OK | enter live → bid → history |

### Phase 2 — Backend correctness and consistency (P1/P2)

- Alinear `api-docs.md` / `swagger.yaml` con rutas españolas y alias.
- Deprecar en docs `POST .../decision reject` frente a `.../rechazar` (409).
- Documentar `COMPANY_CLIENT_ID` obligatorio para cierre sin pujas.
- Checklist único TP en `apps/api/README.md`.

### Phase 3 — Architecture cleanup (P2/P3)

- Dividir `subastas.service.ts` (live vs catalog).
- Consolidar respuestas de envíos (un mapper API).
- Opcional: activar revocación JWT o eliminar código muerto `revoked_tokens`.

### Phase 4 — Hardening and QA (P2/P3)

- Límite `express.json` para submissions con fotos.
- Tests supertest smoke (health, login, list subastas).
- Prueba manual dos pujas concurrentes.
- CORS si cliente web.

---

## 14. Minimal backend DoD for final delivery

Estado **mínimo aceptable** para entregar/defender el TP:

1. `npm run typecheck` + `npm test` en verde (cumplido).
2. SQL aplicado: `schema.sql` + scripts que el código **realmente** usa (`cliente_credenciales`, `001_medios_pago_*`).
3. Variables: `JWT_SECRET`, `SQLSERVER_*`, `DEFAULT_REVIEWER_EMPLOYEE_ID`, `EMPLOYEE_ADMIN_*`, datos de demo `COMPANY_CLIENT_ID` si se cierra sin pujas.
4. Flujos demostrables en vivo:
   - registro + login + cambio contraseña inicial;
   - **cliente admitido** (manual o API futura);
   - medio de pago verificado por empleado;
   - listar subasta → live session → puja válida → historial;
   - cierre ítem por empleado → resultado + métricas/compras;
   - envío producto 6 fotos → admin aceptar → asignar → visible en ítems de subasta.
5. Limitaciones de esquema explicadas oralmente y en `audit/*` (rechazo, términos, live en memoria).
6. No prometer forgot-password ni logout seguro sin implementación.

---

## 15. Open questions

1. ¿El corrector exige **estrictamente** `database/schema.sql` sin scripts aditivos, o acepta `migrations/001` y `cliente_credenciales` como en el README del repo?
2. ¿La admisión de clientes debe ser **solo por empleado vía API** o basta con actualización manual en SQL para la demo?
3. ¿El TP exige **recuperación de contraseña** en backend o puede quedar fuera de alcance con 501 documentado?
4. ¿La sesión live en memoria es aceptable como `NO_PERSISTED_LIVE_SESSION` o se espera persistencia en `asistentes`/otra tabla?
5. ¿El frontend mobile ya consume rutas **españolas** (`/productos/solicitudes`) o solo inglés legacy?

---

## 16. Final verdict

| Criterio | Veredicto |
| -------- | --------- |
| ¿Listo para entrega TP? | **Sí, con limitaciones** — núcleo de subasta/pujas/cierre/envíos es defendible |
| ¿Demo-ready? | **Condicionado** a seed de admisión, medios verificados, migración SQL y re-ingreso live tras restart |
| ¿Mantenible? | **Sí** — arquitectura modular razonable; deuda en servicios grandes y docs |
| Arreglar primero | (1) admisión cliente, (2) alinear docs auth, (3) confirmar scripts SQL en entorno demo, (4) no demo forgot-password hasta implementar |

**DB modificada en esta auditoría:** No.
