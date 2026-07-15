# LTraffic Unified API — Audit Index

This folder holds the pre-implementation audit. **No source code will be written until deliverable 6 is approved.**

| # | Deliverable | File | Status |
|---|---|---|---|
| 1 | DB Map (schema, FKs, indexes, ER by domain) | `01-db-map.md` | ✅ complete |
| 2 | Employee PHP audit (426 files by module) | `02-employee-php-audit.md` | ✅ complete |
| 3 | Admin PHP audit (136 files by module) | `03-admin-php-audit.md` | ✅ complete |
| 4 | Node API diff (merge plan) | `04-node-api-diff.md` | ✅ complete |
| 5 | Figma vs PHP screen gap report | `05-figma-gap.md` | ✅ complete |
| 6 | Proposed architecture (folder tree, auth, Swagger, error, FCM, migration phasing) | `06-architecture.md` | ✅ draft — awaits sign-off |
| 7 | PHP auth/upload inspection | `07-php-auth-upload-inspection.md` | ✅ complete |
| 8 | Pre-P1 report | `08-pre-p1-report.md` | ✅ complete |
| 9 | Pre-P1 addendum (bcrypt sidecar strategy) | `09-pre-p1-addendum.md` | ✅ complete |
| 10 | Future auth migration (Phase 4+) | `10-future-auth-migration.md` | ✅ complete |
| 11 | Auth production readiness review (findings) | `11-auth-production-readiness-review.md` | ✅ complete |
| 12 | **Security review report** (before/after with proofs) | `12-security-review-report.md` | ✅ complete |
| 13 | **Performance review report** (EXPLAIN before/after) | `13-performance-review-report.md` | ✅ complete |
| 14 | **Test report** (70/70 Jest + 20/20 E2E) | `14-test-report.md` | ✅ complete |
| 15 | **Remaining technical debt** (deferred items) | `15-tech-debt.md` | ✅ complete |
| 16 | **Production readiness checklist** (go/no-go) | `16-production-readiness-checklist.md` | ✅ GO |

## Locked architectural decisions (2026-07-11)

- **Repo:** new folder `C:\rizwan\LTraffic\ltraffic-api\` — the two existing Node projects stay untouched as reference.
- **Password migration:** lazy rehash MD5 → bcrypt on successful login.
- **API consumers:** mobile only (Android + iOS). PHP web keeps its own session auth.
- **Auth:** single `POST /auth/login` returns `{ token, userType: "admin" | "employee" }`. Middleware branches on `userType`.
- **DB access:** raw `mysql2/promise` (both existing Node APIs already do this) + explicit Repository layer. No ORM.
- **Existing deps to reuse:** express, mysql2, bcryptjs, jsonwebtoken, express-validator, helmet, cors, morgan, winston, multer, swagger-jsdoc, swagger-ui-express, express-rate-limit. `md5` kept temporarily only to verify legacy hashes during lazy rehash.

## Blocking approvals before P0 implementation

Per deliverable 06 §15:
5. Single `login_users` table for both userTypes (abandon `accounts` / `account`).
6. New tables added; legacy schema untouched in phase 1.
7. Phasing order — in particular whether P4 waits for client answers to the 10 questions in deliverable 05 §Recommendations.
8. Firebase project + service-account JSON supplied by client before P5.
