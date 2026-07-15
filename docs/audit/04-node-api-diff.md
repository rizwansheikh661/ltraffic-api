# 04 — Node API Diff: `employee-api/` vs `ltraffic-admin-api/` → Merge Plan

## Executive summary

Both existing Node projects are **nearly identical skeletons** with divergent feature modules. Same `package.json`, same tech stack (Express + `mysql2/promise` + JWT + Swagger-jsdoc + Winston + Multer + express-validator). Infrastructure files differ only cosmetically (header comments, port numbers, rate-limits). Feature modules diverge meaningfully because each project implements only its own half of the domain plus one bespoke auth model.

**Merge is straightforward.** Copy the (mostly identical) infra layer once, then port each feature module into a domain folder that both admin and employee routes mount into.

## Package.json comparison

Both are **byte-for-byte identical dependency sets:**

```
express, mysql2, bcryptjs, jsonwebtoken, express-validator, helmet, cors,
morgan, winston, winston-daily-rotate-file, multer, swagger-jsdoc,
swagger-ui-express, express-rate-limit, dotenv, md5   (dev: nodemon)
```

Everything the unified project needs is already covered. Additions for the merged repo:
- `firebase-admin` — FCM (per Step 7 in the brief).
- (Optional) `zod` or `joi` if we want typed validators alongside express-validator.

## File-tree comparison

### Shared filenames (present in both)

| Kind | File | emp lines | adm lines | Verdict |
|---|---|---:|---:|---|
| infra | `app.js` | 76 | 76 | **~99% same** — differ only in header comment, port info, rate-limit (200 vs 300) |
| infra | `config/db.js` | 41 | 41 | Cosmetic diff only |
| infra | `config/logger.js` | 27 | 33 | Admin version adds a JSDoc header block — behaviour same |
| infra | `config/swagger.js` | 124 | 143 | Same shape, divergent schemas (see below) |
| infra | `middlewares/auth.middleware.js` | 70 | 82 | **Meaningful diff** — see Auth section below |
| infra | `middlewares/error.middleware.js` | 58 | 58 | Cosmetic only |
| infra | `middlewares/validate.middleware.js` | 33 | 33 | Cosmetic only |
| infra | `routes/index.js` | 13 | 14 | Just the mount list |
| infra | `utils/url.helper.js` | 46 | 45 | Port only |
| feature | `controllers/auth.controller.js` | ? | ? | Different login flows |
| feature | `controllers/bulletin.controller.js` | 67 | 132 | Admin is publisher, employee is reader |
| feature | `services/bulletin.service.js` | 81 | 99 | Same pattern above |
| feature | `models/bulletin.model.js` | 109 | 149 | Admin has more fields |
| feature | `routes/bulletin.routes.js` | 78 | 232 | Admin has more endpoints (publish, delete, read-log) |
| feature | `controllers/dashboard.controller.js` | ? | ? | Different tile aggregations |
| feature | `controllers/document.controller.js` | 63 | 170 | Admin does CRUD; employee is read-only |
| feature | `controllers/incident.controller.js` | 110 | 134 | Employee creates; admin closes |
| feature | `controllers/timesheet.controller.js` | 143 | 128 | Employee submits; admin approves |
| feature | `controllers/vehicle.controller.js` | 83 | 104 | Employee submits daily check; admin triages |

### Employee-only

| File | Purpose |
|---|---|
| `controllers/profile.controller.js` | Own-profile CRUD |
| `models/profile.model.js` | HR row lookup by `ltrafficid = employeeid` |
| `routes/profile.routes.js` | `/profile` endpoints |
| `services/profile.service.js` | Profile service |
| `controllers/contact.controller.js` | Company contact directory |
| `routes/contact.routes.js` | `/contacts` |

### Admin-only

| File | Purpose |
|---|---|
| `controllers/equipment.controller.js` | Equipment/Plant/Vehicle registers (ER/PR/VR) |
| `models/equipment.model.js` | " |
| `routes/equipment.routes.js` | `/equipment` |
| `services/equipment.service.js` | " |
| `controllers/hr.controller.js` | HR/employee CRUD (admin managing others) |
| `models/hr.model.js` | " |
| `routes/hr.routes.js` | `/hr` |
| `services/hr.service.js` | " |
| `controllers/user.controller.js` | User management (create/edit/delete login_users) |
| `models/user.model.js` | Admin's user model (differs from employee's) |
| `routes/user.routes.js` | `/users` |
| `services/user.service.js` | " |

## Critical divergences

### 1. Auth middleware
Employee `auth.middleware.js` and admin `auth.middleware.js` implement the **same JWT-verify pattern** but with different level tables and different `authorize()` wrappers:

- **Employee version** (70 lines): `authenticate` → `authorize(...levelIds)` → `adminOnly = authorize(1, 4, 7)`. Levels documented: 1=Admin, 2=Employee, 4=Admin1, 7=Admin2.
- **Admin version** (82 lines): `authenticate` also *rejects non-admin JWTs* (`ADMIN_LEVELS = [1,4,7,8]`) → returns 403 immediately. Exports 3 wrappers: `adminOnly=[1,4]`, `adminAll=[1,4,7,8]`, `adminAndSuper=[1,4,8]`. Levels documented: 1=Admin, 4=Admin1, 7=Admin2, 8=Essex Supervisor.

These are **contradictory** — an employee's JWT (`level=2`) is accepted by employee auth but instantly rejected by admin auth. The single unified API needs one `authenticate` that verifies any valid JWT plus multiple `authorize(...levels)` wrappers, and a `userType` claim carried in the JWT so route handlers can also gate on it (`requireAdmin`, `requireEmployee`).

Full merged level table (from PHP audit):
| ID | Name | Type |
|---|---|---|
| 1 | Admin | admin |
| 2 | Driving Operatives | employee |
| 3 | Operatives | employee |
| 4 | Admin1 | admin |
| 5 | Civils TFL Driver | employee |
| 6 | Civils Trailer Driver | employee |
| 7 | Admin2 | admin |
| 8 | Essex Supervisor | admin |
| 9 | Customer | employee |

Note the employee auth middleware's claim that "level 2 = Employee" is a coarse simplification of the 6 real employee-side levels — must be corrected in the merge.

### 2. Swagger schema definitions
Both projects declare the same schema names (`User`, `Timesheet`, `Vehicle`, `Bulletin`, `Incident`, `Document`) but with divergent fields:
- Admin `User` uses `id`, `level` (int), `level_name` — employee `User` uses `user_id`, `user_level` (string).
- Admin `Timesheet.status` enum = `['Draft','Submitted','Approved','Rejected']` — employee enum = `['Draft','Submitted','Approved']` (no Rejected).
- Admin adds an `Equipment` schema absent from employee.

**Resolution:** align on DB column names (`user_id`, `user_level` numeric-array). Superset the status enum. One Swagger config file lists both admin and employee tag groups. Schema names may need `Admin` / `Employee` prefixes only where the shape genuinely differs (rare — usually the shape is the same, only field visibility differs).

### 3. App configuration
- Employee: port 3000, rate-limit 200 req/15min, cors default.
- Admin: port 4000, rate-limit 300 req/15min, cors default.

**Resolution:** one port from env (`PORT=3000` by default), a single rate-limit tuned to expected mobile-client burstiness (start at 300 across both — the admin app has smaller user base but heavier per-request payloads).

### 4. Route mount lists (`routes/index.js`)

Employee mounts:
```
/auth /profile /timesheets /vehicles /dashboard /incidents /bulletins /documents /contacts
```
Admin mounts:
```
/auth /dashboard /vehicles /timesheets /incidents /bulletins /documents /hr /equipment /users
```

Union (unified project):
```
/auth
/dashboard
/profile         (employee-facing)
/timesheets      (shared shape; different actions per userType)
/vehicles        (shared)
/incidents       (shared)
/bulletins       (shared; admin gets publish, employee gets read+ack)
/documents       (shared; admin gets CRUD, employee gets read)
/contacts        (employee-facing; admins can also use it)
/hr              (admin-facing)
/equipment       (admin-facing)
/users           (admin-facing)
/notifications   (new — FCM device registration)
/uploads         (new — unified static serving of upload folders)
```

### 5. Feature-code divergence
100–240 diff lines per matching feature file. This is **not a mechanical merge** — each admin/employee feature has different endpoints, different SQL, and different response shapes because they solve different halves of the workflow.

**Migration approach:** treat the two Node APIs as reference implementations for a *fresh* set of modules under the merged project. Do not attempt a line-by-line merge. For each domain (bulletins, timesheets, vehicles, incidents, documents), design a clean set of endpoints that supports both user types, using the two source files as behavioural references only.

## Merge plan (file-by-file)

### Infra layer — copy from either project, unify
| Target in `ltraffic-api/src/` | Source | Change |
|---|---|---|
| `app.js` | employee | Update rate-limit to 300; make port from env |
| `config/db.js` | either | Same |
| `config/logger.js` | admin (has header) | Same |
| `config/swagger.js` | fresh | Superset schemas; group tags: Auth, Admin, Employee, Shared |
| `middlewares/error.middleware.js` | either | Same |
| `middlewares/validate.middleware.js` | either | Same |
| `middlewares/auth.middleware.js` | **rewrite** | `authenticate`, `authorize(...levels)`, `requireAdmin`, `requireEmployee`, plus level-set constants from unified table |
| `middlewares/rbac.middleware.js` | new | Named-role wrappers: `admin`, `admin1`, `essexSupervisor`, `driver`, etc., built on `authorize()` |
| `utils/url.helper.js` | either | Port from env |
| `utils/date.helper.js` | new | Parse the two legacy date formats (ISO + UK long form) into `Date` |
| `utils/legacy-hash.js` | new | Detect MD5 hash (32-hex), verify, then rehash to bcrypt |
| `routes/index.js` | fresh | Mount union above |

### Feature modules — build fresh, keep source refs

Structure per module (following the brief's Step 5 target):

```
src/modules/<domain>/
  <domain>.controller.js       — HTTP handlers, thin
  <domain>.service.js          — Business logic
  <domain>.repository.js       — SQL via mysql2/promise (new — the current projects put SQL in a "model", rename for clarity)
  <domain>.routes.js           — Route table with authorize() guards
  <domain>.validator.js        — express-validator chains
  <domain>.dto.js              — Request/response shapes (optional)
```

Modules to build (in phasing order):

1. **auth** — `/auth/login`, `/auth/logout`, `/auth/me`, `/auth/change-password`, `/auth/refresh` (if refresh tokens), `/auth/forgot`, `/auth/reset`. Single login endpoint; response includes `userType`. Legacy MD5 lazy rehash. 2FA opt-in.
2. **users / hr / profile** — `/profile` (own profile, employee), `/users` (admin CRUD `login_users`), `/hr` (admin CRUD `hr`). Consolidates `user.*`, `hr.*`, `profile.*` from the two current APIs.
3. **timesheets** — `/timesheets` GET (own or, for admin, all), POST create, PUT edit, PATCH status transitions (`submit`, `approve`, `reject`), DELETE (admin only). Consolidates two current APIs.
4. **vehicles / vehicle-checks / vr / vic / vinsp** — daily check, wizard checks, VR fleet, VIR/VRR repair reports. Big module — split into `vehicles.check`, `vehicles.register`, `vehicles.inspection` submodules.
5. **incidents / h-and-s / equipment-check / wah / mewp / ug** — safety module. `/incidents` for `healthsafety`, plus sub-endpoints for the safety-form variants.
6. **bulletins** — `/bulletins` list (unread first for employee, all for admin), POST publish (admin), POST ack (employee), DELETE (admin).
7. **documents** — `/documents` for CoSHH / Method Statements / Policies / SOP (read for employee, CRUD for admin) + per-record galleries (upload_hr, upload_vr, etc.).
8. **equipment / plant / vehicle registers** — `/equipment/er`, `/equipment/pr`, `/equipment/vr` admin CRUD.
9. **projects** — Civils, TFL, Wildanet unified as `Project + Job`. Deferred until phase 4.
10. **risk-assessments / inspections** — RA + INSP wizards, deferred until phase 4.
11. **contacts** — read-only company directory.
12. **notifications** — device token registration, FCM send, notification history.
13. **dashboard** — aggregation queries for admin home tiles and employee home tiles.

### Files worth NOT porting from the current Node APIs
- Anything using `md5` package in feature paths — only `utils/legacy-hash.js` may import it, and only for the lazy-rehash flow.
- Employee `contact.*` files if the PHP admin doesn't expose them (verify with client).
- Duplicate `dashboard.service.js` implementations — write one unified aggregator.

### Recommendations for the merged project

1. **Introduce a `modules/` folder** grouped by domain rather than the current top-level `controllers/services/models/routes/`. The current layout scales badly across 13+ modules (60+ files at the top level).
2. **Repository layer** (rename `model` → `repository`) — matches the brief's Step 5.
3. **Central `constants/roles.js`** with the 9-level table + `isAdmin(level)`, `isEmployee(level)` helpers.
4. **`common/response.js`** with `ok(res, data)`, `fail(res, status, code, message)` helpers so every controller emits the same envelope.
5. **`common/apiError.js`** for the `ApiError` class (per Step 9), thrown by services, caught by `error.middleware.js`.
6. **Config namespacing**: env-driven for DB creds, JWT secret, upload paths, FCM key file, log level, CORS origins. Never hardcode credentials as the PHP does.
7. **Swagger grouping**: 4 tags per Step 8 — `Authentication`, `Admin`, `Employee`, `Shared`. Every route file adds itself under the correct tag(s). Tag ordering enforced via `swagger.tags` array.

## Delete / migrate matrix

| Item | Action |
|---|---|
| `employee-api/` folder | Keep as reference until phase 8 complete; then archive |
| `ltraffic-admin-api/` folder | Same |
| Any code from either project that uses the `md5` package outside `utils/legacy-hash.js` | Delete |
| Divergent Swagger schemas | Consolidate |
| Divergent auth middlewares | Discard both; write fresh unified `auth.middleware.js` + `rbac.middleware.js` |
| Divergent `routes/index.js` | Discard both; new union list |
| Feature modules (bulletin, timesheet, vehicle, incident, document, dashboard) | Refactor into fresh unified modules — do not merge line-by-line |
| Employee `profile`, `contact` | Port as-is initially, then normalise |
| Admin `hr`, `equipment`, `user` | Port as-is initially, then normalise |
