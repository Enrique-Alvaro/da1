# Backend Final Definition of Done

Status legend: `DONE` | `DONE_WITH_LIMITATIONS` | `PARTIAL` | `NOT_SUPPORTED_BY_SCHEMA` | `NOT_REQUIRED_FOR_DEMO`

| Area | Requirement | Status | Evidence | Notes |
| ---- | ----------- | ------ | -------- | ----- |
| Health/startup | Process and DB health endpoints | DONE | `GET /api/health`, `/api/health/db` | DB may 503 if offline |
| Auth | Register, login, initial password | DONE | `tests/auth.essential.test.ts` | |
| Auth | Forgot/reset password | NOT_SUPPORTED_BY_SCHEMA | 501 documented | No `password_reset_tokens` in professor schema |
| Auth | Logout | DONE_WITH_LIMITATIONS | 200 client-side discard | No server revocation |
| Client admission | Admin admit + client status | DONE | `tests/client-admission.test.ts` | Phase 1 |
| Payment methods | Create/list/disable + admin verify | DONE | `tests/payment-methods-*.test.ts` | Needs migration 001 |
| Payment methods | Verified required to bid | DONE | `pujos.service`, `/users/me/status` | |
| Auctions | List, featured, detail, items | DONE | Phase 2 tests | Derived featured |
| Catalog/items | Item detail by catalog id | DONE | `GET /api/items/:id` | |
| Live session | Enter/leave in-memory | DONE_WITH_LIMITATIONS | Phase 2 | Restart clears session |
| Live state | min/max bid, finalized overlay | DONE | Phase 2–3 | |
| Bidding | Validations + transaction | DONE | `tests/pujos-phase4.test.ts` | UPDLOCK in repo |
| Bid history | Newest first | DONE | Phase 2 | |
| Closing/result | Employee close, result GET | DONE | Phase 3 tests | |
| Closing/result | Company purchase no bids | DONE_WITH_LIMITATIONS | Needs `COMPANY_CLIENT_ID` | |
| Metrics/purchases | From registroDeSubasta | DONE_WITH_LIMITATIONS | No persisted `finalizedAt` | |
| Item submission | 6 photos + declarations | DONE | Phase 4 tests | |
| Admin review | List/detail/accept/assign | DONE | Phase 4 | |
| Admin review | Reject with reason | NOT_SUPPORTED_BY_SCHEMA | 409 honest | |
| Assignment | Appears in auction items | DONE | Phase 4 integration test | |
| Documentation | API docs + demo QA | DONE | `docs/api/api-docs.md`, final QA | |
| Manual QA | End-to-end script | DONE | `backend-final-manual-qa.md` | |
| TypeScript/build/tests | CI-quality gate | DONE | 157 tests (incl. health smoke) | |
| Schema compliance | No migrations in delivery | DONE | Audit reports | Use professor + approved scripts only |

**Verdict:** Backend suitable for TP delivery with documented limitations.
