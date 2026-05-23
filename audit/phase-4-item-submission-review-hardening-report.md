# Phase 4 — Item Submission Review Hardening Report

## 1. Executive summary

**Final status:** `PHASE_4_ITEM_SUBMISSION_HARDENED_WITH_LIMITATIONS`

**What was fixed**

- Error codes aligned on repository/API layer (`PRODUCT_NOT_FOUND`, `SUBMISSION_NOT_FOUND`, `AUCTION_NOT_FOUND`, `CATALOG_NOT_FOUND`, `ITEM_ALREADY_ASSIGNED`, `PRODUCT_NOT_APPROVED`).
- Employee cannot create client submissions (`CLIENT_AUTH_REQUIRED`).
- Accept/assign pre-checks prevent duplicate catalog assignment.
- Reject endpoint remains honest: `409 REJECTION_NOT_SUPPORTED_BY_SCHEMA`.
- Owner terms endpoints: `409 TERMS_ACCEPTANCE_NOT_SUPPORTED_BY_SCHEMA`.
- Catalog validation on assign (exists + optional auction match).
- Integration verified: assigned `itemsCatalogo` row surfaces in `GET /api/subastas/:id/items` (`id` = catalog item, `productId` = product).

**What remains limited**

- Submission status is **derived** from `productos.disponible` + presence in `itemsCatalogo` / `registroDeSubasta`.
- Rejection reason cannot be persisted (`NO_REJECTION_REASON_SUPPORT`).
- Declarations validated on create but not stored.
- Owner terms acceptance not in schema.
- Commission on accept is informational only until assignment (`NO_COMMISSION_SCHEMA_SUPPORT` on accept response).

**Database changed:** **No**

---

## 2. Route map

| Method | Route | Auth | Purpose | Status |
| ------ | ----- | ---- | ------- | ------ |
| POST | `/api/productos/solicitudes` | Cliente operativo | Create submission (TPO body) | OK |
| POST | `/api/productos/submissions` | Cliente | Legacy create | OK |
| POST | `/api/items/submissions` | Cliente | English alias | OK |
| GET | `/api/productos/mis-solicitudes` | Cliente | Own list | OK |
| GET | `/api/productos/mis-solicitudes/:id` | Cliente | Own detail | OK |
| GET | `/api/items/my-submissions` | Cliente | English alias | OK |
| POST | `/api/productos/mis-solicitudes/:id/aceptar-condiciones` | Cliente | → 409 schema | OK |
| POST | `/api/productos/mis-solicitudes/:id/rechazar-condiciones` | Cliente | → 409 schema | OK |
| GET | `/api/admin/productos/solicitudes` | Empleado | Admin list (`?status`, `search`) | OK |
| GET | `/api/admin/productos/solicitudes/:id` | Empleado | Admin detail | OK |
| POST | `/api/admin/productos/solicitudes/:id/aceptar` | Empleado | Approve (`disponible=si`) | OK |
| POST | `/api/admin/productos/solicitudes/:id/rechazar` | Empleado | → 409 schema | OK |
| POST | `/api/admin/productos/solicitudes/:id/asignar-subasta` | Empleado | Assign to catalog | OK |
| GET/POST | `/api/admin/items/submissions/*` | Empleado | English aliases | OK |
| GET | `/api/admin/productos/revision` | Empleado | Legacy pending queue | OK |
| POST | `/api/admin/productos/:id/decision` | Empleado | Legacy approve/reject | OK |
| PATCH | `/api/admin/productos/:id/auction-assignment` | Empleado | Legacy assign | OK |

Spanish routes are source of truth; English aliases reuse the same handlers.

---

## 3. Business rules verified

| Rule | Endpoint/service | Status | Notes |
| ---- | ---------------- | ------ | ----- |
| Min 6 photos on create | Zod + `parseProductImages` | OK | `INSUFFICIENT_PHOTOS` on accept |
| Ownership/legal declarations | `createSolicitudBodySchema` | OK | Not persisted |
| Client-only create | `createSolicitud` | OK | Employee blocked |
| Own submissions only | `listSubmissionsByDuenio` | OK | Other user → 404 |
| Admin-only review | `requireEmployeeAuth` on admin routes | OK | |
| Approve sets `disponible=si` | `applyAdminDecision` | OK | Derived `ACCEPTED` |
| Reject not persisted | `rejectSolicitudApi` | OK | 409 honest |
| Assign inserts `itemsCatalogo` | `assignProductToAuction` TX | OK | |
| Duplicate assign blocked | Repository + API pre-check | OK | `ITEM_ALREADY_ASSIGNED` |
| Assign requires approved product | `disponible=si` | OK | `PRODUCT_NOT_APPROVED` |
| Auction exists | `assertSubastaExists` | OK | `AUCTION_NOT_FOUND` |
| Appears in auction items | `listCatalogItemsBySubasta` | OK | `id` vs `productId` documented |

---

## 4. Submission/review/assignment behavior

**Storage:** `productos` row + `fotos` blobs; owner via `duenios` (same PK as `personas`/`clientes`).

**Status derivation:**

| State | Signals |
| ----- | ------- |
| `PENDING_REVIEW` | `disponible=no`, no `itemsCatalogo` |
| `ACCEPTED` | `disponible=si`, no `itemsCatalogo` |
| `ASSIGNED_TO_AUCTION` | row in `itemsCatalogo` |
| `UNKNOWN` | sold / edge cases |

**Photos:** JPEG/PNG/WebP base64; min 6, max 20; size cap 5MB.

**Accept:** Updates `productos.disponible` and `revisor`; does not store `basePrice` until assignment (accept body is advisory for demo).

**Reject:** Always `409 REJECTION_NOT_SUPPORTED_BY_SCHEMA` — academic schema has no rejection reason column.

**Assign:** Transaction inserts `itemsCatalogo` or creates `catalogos` when only `auctionId` provided; sets `precioBase` / `comision` on catalog item.

**ID semantics:** `submissionId` = `productId` = `productos.identificador`; after assign, `catalogItemId` = `itemsCatalogo.identificador` (used by live/bid endpoints).

---

## 5. Error handling

| Error case | Error code | HTTP status | Endpoint |
| ---------- | ---------- | ----------- | -------- |
| Not authenticated | `UNAUTHENTICATED` / validation | 401 | All protected |
| Employee on client route | `CLIENT_AUTH_REQUIRED` | 403 | POST solicitudes |
| Not owner | `SUBMISSION_NOT_FOUND` | 404 | GET mis-solicitudes/:id |
| Product missing | `PRODUCT_NOT_FOUND` / `SUBMISSION_NOT_FOUND` | 404 | Admin/assign |
| Auction missing | `AUCTION_NOT_FOUND` | 404 | Assign |
| Catalog missing | `CATALOG_NOT_FOUND` | 404 | Assign |
| Already assigned | `ITEM_ALREADY_ASSIGNED` | 409 | Accept/assign |
| Not approved | `PRODUCT_NOT_APPROVED` | 409 | Assign |
| Rejection unsupported | `REJECTION_NOT_SUPPORTED_BY_SCHEMA` | 409 | POST rechazar |
| Terms unsupported | `TERMS_ACCEPTANCE_NOT_SUPPORTED_BY_SCHEMA` | 409 | Owner terms |
| Insufficient photos | `INSUFFICIENT_PHOTOS` | 400 | POST aceptar |
| Invalid body | ValidationError | 400 | Zod |

---

## 6. Schema limitations

| Requirement | Current support | Implemented behavior | Limitation label |
| ----------- | --------------- | -------------------- | ---------------- |
| Submission status column | None | Derived from `disponible` + catalog | `DERIVED_SUBMISSION_STATUS` |
| Inspection workflow | `productos.revisor` only | No inspection states | `NO_EXPLICIT_INSPECTION_STATUS` |
| Rejection reason | None | 409 on rechazar | `NO_REJECTION_REASON_SUPPORT` |
| Return charge | None | Ignored in body | `NO_RETURN_CHARGE_SUPPORT` |
| Owner terms | None | 409 on condiciones | `NO_OWNER_TERMS_ACCEPTANCE_SUPPORT` |
| Commission on accept | `itemsCatalogo.comision` at assign | Accept returns derived % | `NO_COMMISSION_SCHEMA_SUPPORT` |
| Legal origin evidence | Validated in request | Not stored | `PARTIAL_LEGAL_ORIGIN_SUPPORT` |
| Owner link | `duenios` + `productos.duenio` | findOrCreate on submit | `AMBIGUOUS_PRODUCT_OWNER_RELATION` |
| Catalog auto-create | `catalogos` INSERT | When only `auctionId` | `PARTIAL_ASSIGNMENT_SUPPORT` |

---

## 7. Tests added/updated

| Test file | Scenario | Result |
| --------- | -------- | ------ |
| `tests/item-submission-flow.test.ts` | Create, accept, reject, assign, terms | Pass (updated) |
| `tests/phase-4-item-submission-review-hardening.test.ts` | Employee block, duplicate assign, auction items | Pass (new) |
| `tests/producto-submissions.test.ts` | Legacy flow | Pass |

**Total:** 156 tests passing.

---

## 8. Documentation updated

- `audit/phase-4-item-submission-review-hardening-report.md` (this file)
- `apps/api/README.md` — Fase 4 notes
- `docs/demo/backend-demo-checklist.md` — section 3.6 submission flow + troubleshooting

---

## 9. Validation commands

From `apps/api`:

```bash
npm run typecheck
npm run build
npm test
```

| Command | Result |
| ------- | ------ |
| `npm run typecheck` | Pass |
| `npm run build` | Pass |
| `npm test` | Pass — 156 tests |

---

## 10. Known limitations

1. Cannot distinguish rejected vs pending in DB (`disponible=no` for both).
2. `POST .../rechazar` always fails with schema error — by design.
3. Accept `basePrice` / `commissionPercent` are not stored until assignment.
4. Legacy English/legacy routes coexist; Spanish TPO routes preferred for demo.
5. Insurance (`productos.seguro`) blocks cancel only; not part of this phase.

---

## 11. Recommended next phase

**Phase 5 — API contract polish:** sync OpenAPI/Postman with all Spanish routes and error codes; optional password reset; insurance/storage only if schema extended in a future approved migration (out of scope for TP schema lock).
