# 06 — Proposed Architecture (LTraffic Unified API)

**Status:** draft — awaits sign-off before any implementation code is written.

Synthesises deliverables 01–05. Every decision below is traceable to a finding in those documents; where a choice is a judgement call the reasoning is stated inline.

---

## 1. Guiding principles

1. **Single API, two audiences.** One codebase serves both Admin and Employee mobile apps. Web PHP is left alone and keeps its session auth.
2. **PHP is the behavioural source of truth.** Figma is a subset (deliverable 05). We build the full PHP surface first; Figma-only additions are gated behind client confirmation.
3. **Clean Architecture with a pragmatic mysql2 core.** Controllers stay thin; business rules live in services; SQL lives in repositories. No ORM (matches both existing Node APIs).
4. **Backwards-compatible with legacy data.** MD5 lazy rehash, PHP-serialised `user_level` decoded on read, text-typed dates parsed at the boundary. The schema is not migrated in phase 1 — new tables added; legacy tables left untouched.
5. **Mobile-first API contract.** JSON response envelope, pagination on every list, `If-Modified-Since` on read-heavy endpoints, FCM push for the async flows.
6. **Fail loud in dev, fail safe in prod.** ApiError class, central error middleware, structured Winston logs, request IDs on every log line.

---

## 2. Repository layout

Target root: `C:\rizwan\LTraffic\ltraffic-api\`. The two existing Node folders (`employee-api/`, `ltraffic-admin-api/`) stay in place as reference until phase 8.

```
ltraffic-api/
├─ src/
│  ├─ app.js                       # Express bootstrap; wires middleware + routes
│  ├─ server.js                    # HTTP listen; graceful shutdown; unhandled-rejection hook
│  │
│  ├─ config/
│  │  ├─ env.js                    # dotenv load + zod-validated config export
│  │  ├─ db.js                     # mysql2/promise pool
│  │  ├─ logger.js                 # winston + daily-rotate transports
│  │  ├─ swagger.js                # swagger-jsdoc setup; 4 tag groups
│  │  ├─ firebase.js               # firebase-admin init from service-account JSON
│  │  └─ constants.js              # rate-limit, upload paths, CORS origins
│  │
│  ├─ common/
│  │  ├─ apiError.js               # ApiError(status, code, message, details?)
│  │  ├─ response.js               # ok(res, data, meta), fail(res, err)
│  │  ├─ pagination.js             # parse ?page & ?limit; build meta
│  │  ├─ asyncHandler.js           # wraps async controllers → next(err)
│  │  └─ requestId.js              # uuid per request; header X-Request-Id
│  │
│  ├─ middlewares/
│  │  ├─ auth.middleware.js        # authenticate() — verifies JWT, loads user
│  │  ├─ rbac.middleware.js        # authorize(...levels), requireAdmin, requireEmployee
│  │  ├─ validate.middleware.js    # express-validator result handler
│  │  ├─ upload.middleware.js      # multer factories → UPLOADS_ROOT/<php-subpath>
│  │  ├─ rateLimit.middleware.js   # express-rate-limit configured per route group
│  │  └─ error.middleware.js       # last-resort handler → response envelope
│  │
│  ├─ utils/
│  │  ├─ url.helper.js             # absolute URL builder (from env, not host header)
│  │  ├─ date.helper.js            # parse ISO + UK long form ("Wednesday 06 September 2023 (08:53:31)")
│  │  ├─ legacy-hash.js            # detectMd5(hash); verifyMd5(pw, hash); needsRehash()
│  │  ├─ php-serialize.js          # unserialize PHP array → JS (for user_level)
│  │  ├─ boolean.js                # 'Yes'/'No'/'' → true/false/null
│  │  └─ pdf.helper.js             # optional — pdfkit wrapper for report exports
│  │
│  ├─ constants/
│  │  ├─ roles.js                  # LEVELS = {1:'Admin',...9:'Customer'}; isAdmin(), isEmployee()
│  │  ├─ status.js                 # timesheet/incident/vehicle-check enums (supersets)
│  │  └─ tables.js                 # table-name constants — one place to rename during migration
│  │
│  ├─ modules/
│  │  ├─ auth/
│  │  │  ├─ auth.controller.js
│  │  │  ├─ auth.service.js
│  │  │  ├─ auth.repository.js
│  │  │  ├─ auth.routes.js
│  │  │  ├─ auth.validator.js
│  │  │  └─ auth.dto.js
│  │  ├─ users/                    # login_users CRUD (admin) + /me
│  │  ├─ hr/                       # hr table CRUD (admin)
│  │  ├─ profile/                  # employee's own profile
│  │  ├─ timesheets/               # shared; branches on userType
│  │  ├─ vehicles/
│  │  │  ├─ check/                 # daily walk-round (vehicle table)
│  │  │  ├─ register/              # fleet register (vr table)
│  │  │  └─ inspection/            # vir/vrr/vic
│  │  ├─ incidents/                # healthsafety; employee create, admin close
│  │  ├─ safety/                   # mewp, wah, ug, equipmentcheck
│  │  ├─ bulletins/                # publish (admin), list+ack (employee)
│  │  ├─ documents/                # policies, coshh, methodstatements, processes + galleries
│  │  ├─ equipment/                # er / pr / vr registers (admin)
│  │  ├─ projects/                 # civils / tfl / wildanet / maintenance / presite (phase 4)
│  │  ├─ risk/                     # ra / wra / insp / winsp wizards (phase 4)
│  │  ├─ contacts/                 # read-only directory (both)
│  │  ├─ dashboard/                # aggregated tiles (both, branched by userType)
│  │  ├─ notifications/            # FCM device tokens + send + history
│  │  └─ uploads/                  # polymorphic file listing (thin wrapper over upload_*)
│  │
│  └─ routes/
│     └─ index.js                  # single mount table; version prefix /api/v1
│
├─ tests/
│  ├─ integration/                 # supertest hitting a test DB
│  └─ unit/                        # service/util tests
│
├─ dev-files/                      # DEV-ONLY fallback for UPLOADS_ROOT (gitignored)
│                                  # In prod, UPLOADS_ROOT points at the PHP web docroot instead —
│                                  # never a Node-owned uploads folder.
│
├─ logs/                           # daily-rotate output (gitignored)
├─ scripts/
│  ├─ migrate-md5-audit.js         # optional: reports on how many MD5 rows still exist
│  └─ seed-dev.js                  # dev-only seed
├─ docs/audit/                     # this folder — deliverables 01-06
├─ .env.example
├─ .eslintrc.json                  # airbnb-base + prettier
├─ .prettierrc
├─ jest.config.js
└─ package.json
```

**Rationale for `modules/`** — deliverable 04 flagged that the current `controllers/services/models/routes/` split scales badly across 13+ domains (60+ files at root). Grouping by domain keeps related code together and is the pattern the brief's Step 5 asked for.

---

## 3. Authentication & Authorization

### 3.1 Single login endpoint

```
POST /api/v1/auth/login
Body: { username | email, password, deviceToken?, platform? }
Response: {
  token: "<jwt>",
  refreshToken: "<opaque>",
  userType: "admin" | "employee",
  user: { id, ltrafficid, name, email, level, levelName }
}
```

**Flow:**
1. Look up user in `login_users` (single source of truth for both audiences — the two-table `accounts`/`account` split from the audit is legacy).
2. Decode `user_level` (PHP-serialised) → integer array; take the first level.
3. Verify password:
   - If hash length == 32 hex chars → MD5. Verify with `md5(input) === stored`. If ok, **rehash to bcrypt** in-place (`login_users.password = bcrypt(input)`), log the rehash.
   - Else assume bcrypt → `bcrypt.compare`.
4. Classify `userType` from level using `constants/roles.js`:
   - `[1, 4, 7, 8]` → `admin`
   - `[2, 3, 5, 6, 9]` → `employee`
5. Sign JWT with claims `{ sub: user_id, ltrafficid, level, userType, iat, exp }`. Expiry 12h. Refresh token 30d, stored server-side (new `refresh_tokens` table) so it can be revoked.
6. If `deviceToken` supplied, upsert into `device_tokens` (new table) linked to `user_id` + `platform`.

### 3.2 Middleware pipeline

```js
authenticate            // verifies JWT, loads req.user
authorize(...levels)    // any level in the set
requireAdmin            // shorthand for admin level set
requireEmployee         // shorthand for employee level set

// Named-role wrappers built on authorize()
roles.admin             // [1, 4]
roles.admin1            // [1, 4]
roles.admin2            // [7]
roles.essexSupervisor   // [8]
roles.anyAdmin          // [1, 4, 7, 8]
roles.driver            // [2, 5, 6]
roles.operative         // [3]
roles.customer          // [9]
```

Deliverable 04 exposed the contradiction between the two existing middlewares (admin version rejects level-2 JWTs outright). The unified `authenticate` accepts any valid JWT and lets `authorize(...)` do the gating.

### 3.3 Level table (canonical)

| ID | Name              | userType   |
|----|-------------------|------------|
| 1  | Admin             | admin      |
| 2  | Driving Operative | employee   |
| 3  | Operative         | employee   |
| 4  | Admin1            | admin      |
| 5  | Civils TFL Driver | employee   |
| 6  | Civils Trailer Dr | employee   |
| 7  | Admin2            | admin      |
| 8  | Essex Supervisor  | admin      |
| 9  | Customer          | employee   |

Levels live in `constants/roles.js`; there is no DB `roles` table (the legacy `role` table only has 2 rows and is only wired to the ~unused `account` table).

### 3.4 Password policy

- New/reset passwords: bcrypt cost 10, min 8 chars, must contain a digit.
- Legacy MD5 accepted **once** — successful login triggers immediate bcrypt rehash.
- `POST /auth/change-password` requires current password.
- `POST /auth/forgot` + `POST /auth/reset` use a signed short-lived token (15 min) delivered via email.

### 3.5 Session/refresh

- Access JWT: 12h, stateless.
- Refresh token: opaque UUID, stored hashed in `refresh_tokens (user_id, token_hash, expires_at, revoked_at, device_id)`. Rotated on every use.
- `POST /auth/logout` revokes the current refresh token and removes the device token.

---

## 4. Response envelope & errors

**Success:**
```json
{
  "success": true,
  "data": { ... } | [...],
  "meta": { "page": 1, "limit": 20, "total": 137 }   // only on list endpoints
}
```

**Failure:**
```json
{
  "success": false,
  "error": {
    "code": "AUTH_INVALID_CREDENTIALS",
    "message": "Username or password incorrect",
    "details": null,
    "requestId": "c1f8...":
  }
}
```

**ApiError class** carries `(status, code, message, details?)`. Services throw it; `asyncHandler` forwards to `error.middleware.js`; the middleware maps unknown errors → 500 `INTERNAL_ERROR` and logs the stack with `requestId`.

Error codes are prefixed by domain: `AUTH_*`, `TIMESHEET_*`, `VEHICLE_*`, `VALIDATION_ERROR`, `NOT_FOUND`, `FORBIDDEN`, etc. Full table in `common/errorCodes.js`.

---

## 5. Swagger organisation

Single Swagger surface at `/api/v1/docs`. Four tag groups (ordered in config):

1. **Authentication** — login, logout, refresh, forgot, reset, change-password.
2. **Admin** — endpoints only usable by admin levels (HR, users, equipment registers, approvals, close-incident, etc.).
3. **Employee** — endpoints only usable by employee levels (own profile, submit timesheet, submit vehicle check, etc.).
4. **Shared** — endpoints both userTypes call with identical semantics (dashboard, documents read, bulletins list, contacts, notifications).

Each route file adds its OpenAPI JSDoc block with the appropriate `tags:` entry. Schemas live in `config/swagger.js` as a superset (union) of admin+employee shapes — a single `Timesheet` schema with `status: enum [Draft, Submitted, Approved, Rejected]`, a single `User` with `user_id + user_level` (numeric). Where shapes genuinely diverge, prefix with `Admin` or `Employee` (rare).

---

## 6. Data access layer

- Single `mysql2/promise` pool from `config/db.js`. Env-driven creds.
- Every repository imports the pool; no per-request connection creation.
- Parameterised queries only. **No string concatenation** — the PHP audit found pervasive SQL injection; we do not repeat it.
- Long-running admin exports use `pool.getConnection()` explicitly, release in `finally`.
- Transactions wrapped by a `withTransaction(fn)` helper in `common/db.js`.
- Repository methods return plain rows (no ORM entity wrappers). Services map to DTOs.

**Boundary conversions** — every repository read passes through:
- `date.helper.parse` for text date columns.
- `boolean.parse` for `'Yes'/'No'/''` columns.
- `phpSerialize.unserialize` for `user_level`.

Writes do the inverse only where the legacy schema demands it (so PHP web keeps working). New tables use proper `DATETIME`, `TINYINT(1)`, `JSON` types.

**Schema migrations** — no migration framework in phase 1. New tables added via `scripts/schema/00X-add-<table>.sql` applied manually. Introduce `knex` migrations only when the schema starts churning.

---

## 7. File uploads — shared with PHP web

**Critical:** the mobile API writes into the same folder the PHP web app already uses. Node never owns an `uploads/` folder.

- Env `UPLOADS_ROOT` = absolute path to the PHP `employeesarea` document root (in production: `C:\Inetpub\vhosts\ltraffic.co.uk\httpdocs\employeesarea`). Dev fallback: `./dev-files/`.
- Env `FILES_BASE_URL` = public URL Apache/IIS serves that folder from (e.g. `https://ltraffic.co.uk/employeesarea`). Dev falls back to `PUBLIC_BASE_URL`.
- `multer` factory (`middlewares/upload.middleware.js`) — `uploadFor(subpath, options)` — writes into `UPLOADS_ROOT/<subpath>`. The `subpath` MUST match the PHP folder name exactly. Existing conventions from the two Node APIs:
  - `admin/hsupload/`        — H&S incident images
  - `admin/employeephoto/`   — employee HR photos
  - `admin/erfiles/`         — equipment register documents
  - `bulletin/`              — bulletin images + downloads
  - (add more per PHP folder as later modules land — never invent new names)
- **Production:** Apache/IIS serves the files. Node has no static-file role.
- **Development only:** app mounts `express.static(UPLOADS_ROOT)` at `/` so DB-stored relative paths (e.g. `admin/hsupload/foo.jpg`) resolve without needing Apache locally.
- URL helper `fileUrl(relativePath)` builds an absolute file URL from `FILES_BASE_URL` (or `PUBLIC_BASE_URL` in dev). Never trusts the `Host` header.
- Long-term plan (phase 5+): collapse the 11 `upload_*` tables into one polymorphic `uploads(parent_type, parent_id, file_name, …)` table (per deliverable 01 recommendation). Phase 1 leaves the split tables as-is to avoid breaking PHP web.

---

## 8. Firebase Cloud Messaging (FCM)

- `firebase-admin` initialised in `config/firebase.js` from a service-account JSON path in env (never committed).
- **New tables:**
  - `device_tokens (id, user_id, token, platform ENUM('ios','android'), created_at, last_seen_at, revoked_at)`
  - `notifications (id, user_id, type, title, body, data JSON, sent_at, read_at)`
- **Triggers** (fired from services after DB write, wrapped in try/catch so a push failure never fails the primary request):
  - Bulletin published → all users targeted (or by team).
  - Timesheet submitted → notify admin group.
  - Timesheet approved/rejected → notify submitter.
  - Incident created → notify admin group.
  - Incident closed → notify reporter.
  - Vehicle check flagged "Un-Safe" → notify admin group.
- `POST /notifications/register` upserts device token; `DELETE /notifications/register` revokes.
- `GET /notifications` lists per-user history; `PATCH /notifications/:id/read` marks read.

---

## 9. Logging & observability

- `winston` + `winston-daily-rotate-file` — one file per day, 14-day retention.
- Log levels: `error` (prod default), `info`, `debug` (dev).
- Every request logged with: `requestId`, `userId` (if authenticated), `method`, `path`, `status`, `duration_ms`.
- Sensitive fields (`password`, `token`, `refreshToken`) redacted by a Winston format.
- No PII in error messages returned to clients.

Health endpoint: `GET /api/v1/health` → `{ status, db, uptime, version }`.

---

## 10. Configuration

All secrets via env — nothing hard-coded (deliverable 03 flagged the PHP codebase hard-coding `root`/blank password in three DB classes).

`.env.example`:
```
NODE_ENV=development
PORT=3000
PUBLIC_BASE_URL=http://localhost:3000

DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=lt_employee
DB_PASSWORD=
DB_NAME=lt_employee
DB_POOL_MAX=10

JWT_SECRET=
JWT_ACCESS_EXPIRES=12h
JWT_REFRESH_EXPIRES=30d

BCRYPT_COST=10

CORS_ORIGINS=http://localhost:5173,https://admin.ltraffic.local
RATE_LIMIT_MAX=300
RATE_LIMIT_WINDOW_MS=900000

UPLOADS_ROOT=./dev-files
# Prod example: UPLOADS_ROOT=C:\Inetpub\vhosts\ltraffic.co.uk\httpdocs\employeesarea
FILES_BASE_URL=
# Prod example: FILES_BASE_URL=https://ltraffic.co.uk/employeesarea
UPLOAD_MAX_MB=25

FCM_SERVICE_ACCOUNT_PATH=./secrets/firebase-service-account.json

LOG_LEVEL=info
LOG_DIR=./logs
```

`config/env.js` validates on boot with `zod`; missing/invalid values crash the process rather than silently defaulting.

---

## 11. Testing strategy

- **Unit** (`tests/unit/`) — services and helpers with mocked repositories. Jest.
- **Integration** (`tests/integration/`) — supertest against Express + a scratch MySQL schema. Runs a fixture seed before each suite; truncates after.
- **Coverage target:** 70% on services, 60% overall. Not a hard gate initially — added to CI once phase 3 lands.
- **Contract tests** for auth, timesheets, and incidents (highest-risk flows).
- Manual Postman collection auto-generated from Swagger for QA.

---

## 12. Security controls

- `helmet()` on all responses.
- `cors()` with explicit origin list from env.
- Rate-limit: 300 req/15min per IP globally; 10 req/15min on `/auth/login` and `/auth/forgot`.
- All list endpoints paginated (default limit 20, max 100).
- Ownership checks in services — an employee cannot fetch another employee's timesheet even by ID. Enforced in the repository query (`WHERE user_id = ?`) unless caller is admin.
- Upload mime whitelist per domain (images-only for vehicle checks, PDF/image for documents, etc.).
- No `eval`, no dynamic `require`, no `child_process.exec` with user input.
- Dependency audit (`npm audit`) in CI.

---

## 13. Migration phasing

Aligned with the brief's Steps 4-12 and sized against deliverables 02, 03, 05.

| Phase | Scope | Output |
|------|-------|--------|
| **P0 — Foundation** | src skeleton, config, db pool, logger, error middleware, response envelope, auth middleware + RBAC, swagger scaffold, health endpoint | Empty app boots; `/health` and `/docs` respond |
| **P1 — Auth** | Login (with lazy MD5 rehash), logout, refresh, forgot/reset, change-password, `/auth/me`. Device-token upsert on login | Mobile can log in |
| **P2 — Employee core (Figma-covered)** | Profile, Dashboard (employee tiles), Timesheets (submit/list/edit), Vehicle Check (daily walk-round), Incidents (create/list/detail), Bulletins (list + ack), Documents (read) | Employee app functional against Figma flows |
| **P3 — Admin core (Figma-covered)** | Dashboard (admin tiles), Users (CRUD login_users), HR (CRUD hr), Timesheets (approve/reject), Incidents (close), Bulletins (publish/delete), Documents (CRUD + attachments) | Admin app functional against Figma flows |
| **P4 — Operational (PHP-only, no Figma)** | Civils / TFL / Wildanet / Maintenance / Presite job registers, Equipment/Plant/Vehicle registers, Vehicle Inspection (VIR/VRR/VIC), MEWP/WAH/UG safety permits, Risk Assessments (ra/wra), Site Inspections (insp/winsp), materials, expenses | Full PHP parity via API |
| **P5 — Notifications & polish** | FCM triggers on all P2/P3 events, notification history, in-app inbox, contacts directory, uploads polymorphic wrapper | Push-notification-driven UX |
| **P6 — Reports & PDF** | PDF export for timesheets, incident reports, risk assessments, inspections (matches PHP `mpdf` output) | Parity with PHP report affordances |
| **P7 — Hardening** | 70% test coverage, load tests, security audit, indexes added to hot join columns (`login_users.ltrafficid`, `civils.id` refs, etc.) | Prod-ready |
| **P8 — Decommission** | Archive `employee-api/` and `ltraffic-admin-api/`; document mobile-only cutover; PHP web keeps its session auth in parallel | Two Node projects removed |

Deliverable 05's client questions (10 items) must be answered before P4 starts.

---

## 14. Open questions for the client (blocking P4+)

Copied from deliverable 05 for visibility:

1. Dashboard tiles (Pending / Overdue / Active Projects) — exact derivation SQL from `civils` / `tfl` / `wildanet` / `maintenance`.
2. Pending Tasks feed — union of what, prioritised how?
3. Team Up Calendar — new feature or based on `login_users.teamup`?
4. PIA & Fibre Risk tile — new derived metric, or wired to `wra`?
5. Vehicle "Un-Safe" gate — does it block submission or notify only?
6. Timesheet close/lock rule — automatic after approval, or manual admin action?
7. Onboarding carousel — one-time or repeatable?
8. "Add Another Witness" repeatable — schema addition to `healthsafety`?
9. Report Incident 8-step wizard — do steps map 1:1 to `healthsafety` columns or is client asking for new fields?
10. Which PHP modules are truly deprecated vs still in daily use (Cleggtesting, Address, etc.)?

---

## 15. Decisions that need explicit sign-off before code

1. **Repo path** = `C:\rizwan\LTraffic\ltraffic-api\`.  ✅ (locked 2026-07-11)
2. **No ORM; raw mysql2 + repository pattern.**  ✅ (locked)
3. **Lazy MD5→bcrypt rehash.**  ✅ (locked)
4. **Mobile only; PHP web untouched.**  ✅ (locked)
5. **Single `login_users` table for both userTypes** — abandon `accounts` and `account` tables. Awaits confirmation.
6. **New tables added, legacy schema untouched in phase 1.** Awaits confirmation.
7. **Phasing order** (§13). Awaits confirmation — in particular whether P4 can wait until client answers §14 questions, or if we start it with best-effort assumptions.
8. **Firebase project + service-account JSON supplied by client** before P5 starts.

Once §5–8 are confirmed, P0 implementation can begin.
