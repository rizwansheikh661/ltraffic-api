# 08 — Pre-P1 Compatibility Report (for approval)

> **Purpose.** Before writing a single line of P1 (Auth) code, this report proves
> that the Node mobile API can be built on top of the existing PHP production
> system **without changing any legacy table, upload folder, or business rule**,
> and it declares every net-new artifact (tables + code) with justification.
>
> **Source material.** All PHP claims below are drawn from
> `docs/audit/07-php-auth-upload-inspection.md`, which contains file:line
> citations into `C:\rizwan\LTraffic\employeesarea-php\` and
> `C:\rizwan\LTraffic\admin\`.
>
> **Decision required.** Approve, request changes, or reject. Nothing in P1
> will be implemented until you approve.

---

## 1. Authentication design (Node mobile API)

### 1.1 Endpoints (single auth surface — same as PHP)

| Method | Path                                | Purpose                                        |
|-------:|-------------------------------------|------------------------------------------------|
| POST   | `/api/v1/auth/login`                | username-or-email + password → access+refresh  |
| POST   | `/api/v1/auth/refresh`              | rotate refresh token, mint new access token    |
| POST   | `/api/v1/auth/logout`               | revoke current refresh token                   |
| GET    | `/api/v1/auth/me`                   | profile + resolved roles + userType            |
| POST   | `/api/v1/auth/change-password`      | current + new (rehashes to bcrypt)             |
| POST   | `/api/v1/auth/forgot-password`      | email link → writes `login_confirm` row (parity with PHP) |
| POST   | `/api/v1/auth/reset-password`       | consumes `login_confirm` key                   |
| POST   | `/api/v1/devices/register`          | store FCM token per user + platform            |
| POST   | `/api/v1/devices/unregister`        | remove FCM token                               |

One `/auth/login` for both audiences — mirrors PHP where `admin/login.php` is a
one-line redirect to `employeesarea-php/login.php`
(`07-php-auth-upload-inspection.md` §2.4).

### 1.2 JWT claims

```json
{
  "sub":       "<login_users.user_id>",
  "username":  "<login_users.username>",
  "email":     "<login_users.email>",
  "roles":     ["Admin", "Admin1"],      // resolved from login_levels.level_name
  "levelIds":  [1, 4],                    // raw IDs (for numeric checks)
  "userType":  "admin" | "employee",     // derived; see §1.3
  "iat": …, "exp": …, "jti": "<uuid>"
}
```

- `roles` uses the **exact names** PHP uses in `protect("Admin, Admin1, ...")`
  so the Node RBAC helper is 1:1 with `check.class.php` and we can port page
  gates without translation.
- `levelIds` is included so numeric membership checks (`array_intersect` in
  PHP) also work in Node without another DB round-trip.

### 1.3 userType derivation

- `userType = 'admin'` if any of the user's level IDs ∈ `{1, 4, 7, 8}`
  (Admin, Admin1, Admin2, Essex Supervisor).
- Otherwise `userType = 'employee'`.
- The IDs come from `login_levels` (`07-…` §3.1, verbatim from `mysql/lt_employee.sql:2956-2965`).
- No new table needed — this is a pure function of `login_users.user_level`.

### 1.4 Password verification flow

```
input: (usernameOrEmail, plaintextPassword)

1. Look up row in login_users by username OR email (mirrors login.class.php:293).
2. If lt_user_credentials has a bcrypt hash for this user_id → bcrypt.compare().
3. Else, if login_users.password matches MD5 hex regex (/^[a-f0-9]{32}$/i)
      → md5(plaintextPassword) === login_users.password.
4. On success:
      - If no bcrypt row existed, INSERT bcrypt hash into lt_user_credentials.
      - NEVER overwrite login_users.password (PHP still reads MD5 from it).
5. On failure → 401 with generic message (no user-existence leak).
```

Rationale: keeps `login_settings.pw-encryption='MD5'` untouched so the PHP
portal keeps working exactly as today.

### 1.5 Refresh & session lifecycle

- Access token: signed JWT, 12h expiry (`JWT_ACCESS_EXPIRES`).
- Refresh token: opaque random 256-bit string; only the SHA-256 hash is stored
  in `lt_refresh_tokens` (never the raw token).
- Rotation on every `/auth/refresh`; old row marked `revoked_at = NOW()`.
- Logout marks current refresh token revoked; JWT itself is not blacklisted
  (short-lived by design).
- `device_id` on the refresh row lets us revoke per-device.

### 1.6 What the Node API does NOT touch

- `$_SESSION['jigowatt']` — PHP-only; Node does not read, write, or share it.
- `login_users.password`, `tmp_auth_token`, `sms_time` — Node reads only,
  never writes.
- `login_settings.pw-encryption` — unchanged (`'MD5'`).
- The PHP `login_confirm` password-reset table — Node writes into it the same
  way PHP does so the reset link works from either portal.

---

## 2. Database interaction flow

### 2.1 Read/write matrix (Phase 1)

| Table                        | Node read | Node write | Notes                                       |
|------------------------------|:---------:|:----------:|---------------------------------------------|
| `login_users`                | ✅        | ❌ (Phase 1) | Identity source of truth. Writes deferred until PHP portal is retired. |
| `login_levels`               | ✅        | ❌         | Cached at boot (id ↔ name map).             |
| `login_settings`             | ✅        | ❌         | Read `pw-encryption` at boot.               |
| `login_confirm`              | ✅        | ✅         | Forgot-password parity with PHP.            |
| `login_timestamps`           | ✅        | ✅ (last_login only) | Same column PHP updates.           |
| `hr`, `workrecord`, `insp`, `ra`, `wra`, `vic`, `vir`, `vrr`, `wildanet`, `upload_*`, … all business tables | ✅ | ✅ | Verbatim schema; Node uses same columns PHP does. |
| `accounts`                   | ❌        | ❌         | Not used by either PHP portal (`07-…` §7.3). Explicitly excluded. |
| `lt_user_credentials` (NEW)  | ✅        | ✅         | Bcrypt hash sidecar (see §6).              |
| `lt_refresh_tokens` (NEW)    | ✅        | ✅         | See §6.                                    |
| `lt_device_tokens` (NEW)     | ✅        | ✅         | See §6.                                    |
| `lt_notifications` (NEW)     | ✅        | ✅         | See §6.                                    |
| `lt_notification_logs` (NEW) | ✅        | ✅         | See §6.                                    |
| `lt_audit_logs` (NEW)        | ✅        | ✅         | See §6.                                    |

### 2.2 Transaction boundaries

- One MySQL connection pool (`mysql2/promise`, size 10).
- Multi-statement writes (login → maybe seed `lt_user_credentials` →
  insert refresh token) wrapped in `withTransaction()` from
  `src/common/db.js`.
- All SQL parameterized (named placeholders enabled). No dynamic SQL string
  concatenation.

### 2.3 Concurrency & consistency with PHP

- PHP writes are session-scoped (short-lived requests). Node writes to
  business tables use the same columns PHP does — no shadow columns, no
  triggers, no derived state. Any row written by Node is immediately
  visible to PHP and vice-versa (same DB, no cache).
- The 6 new `lt_*` tables are strictly additive; PHP never queries them so
  they cannot affect PHP behavior.

---

## 3. PHP authentication analysis (findings)

Extracted from `07-php-auth-upload-inspection.md`:

1. **One shared login flow.** `admin/login.php:1` and `admin/logout.php:1`
   are single-line redirects into the employee portal — there is no
   independent admin auth.
2. **Session shape.** `$_SESSION['jigowatt']` set in
   `employeesarea-php/classes/login.class.php` `login()` (~line 352). No
   expiry field; relies on PHP session GC.
3. **Query.** `SELECT * FROM login_users WHERE {username|email} = :u`
   (`login.class.php:293`).
4. **Password storage.** Setting-driven via
   `login_settings.pw-encryption`. Shipped DB has `'MD5'`
   (`mysql/lt_employee.sql:3031`). Every real password in the dump is a
   32-char lowercase hex. User 60 = md5(""). User 94 has literal `'N/a'`
   (broken account — cannot log in from any portal).
5. **`accounts` table has one bcrypt hash but is not read by either portal**
   — grep confirms zero `FROM accounts` hits in `admin/` and
   `employeesarea-php/` (excluding the nested `timesheet/` sub-app which
   uses its own tables).
6. **Roles.** `login_users.user_level` = PHP-serialized array of stringified
   level IDs (`a:1:{i:0;s:1:"1";}`). Page gates use **names**, not IDs:
   `protect("Admin, Admin1")` → looks names up in `login_levels` at
   runtime (`check.class.php:115-142`).
7. **Password reset.** `forgot.class.php` writes a `login_confirm` row with
   `type='forgot_pw'` + a 32-char md5(uniqid()) key; consumption UPDATEs
   `login_users.password` to `hashPassword($new)` (MD5 under current
   settings).
8. **2FA.** Twilio SMS path exists but disabled in shipped config.
9. **Zero mobile-adjacent infra.** No JWT, no refresh tokens, no device
   tokens, no audit log, no rate limiting (`07-…` §6). The mobile API
   starts from a green field for all of these.

**Consequence for design.** Node must (a) accept MD5 for existing users,
(b) never rewrite `login_users.password` (PHP still reads it), (c) never
touch `pw-encryption`, and (d) reproduce role gating using **names** so
ports of PHP `protect(...)` calls are line-for-line equivalent.

---

## 4. Upload compatibility analysis

### 4.1 Ground rules (from `07-…` §4-5)

- ~40 upload endpoints in PHP, each writing to its own per-form folder
  under the PHP web root.
- Filename convention: `rand(1000,1000000).$originalName` (lowercased),
  or `uniqid()` for a small subset.
- Multi-image endpoints (`insp*`, `ra*`, `wra*`, `vic*`) store
  `implode(', ', $img_Arr)` in one text column.
- DB stores the sub-path relative to the web root (or just the filename,
  depending on endpoint — the specific column is documented per-form in
  `07-…` §4.1–4.4).
- Files are served by **Apache**, directly as static assets. No PHP proxy,
  no per-user ACL, no signed URLs.
- One cross-portal write: `employeesarea-php\insert1.php` writes into
  `../admin/hsupload/`.

### 4.2 Node conforms to all of the above

| PHP behavior                                            | Node behavior                          |
|---------------------------------------------------------|----------------------------------------|
| Writes into folders under the PHP web root              | `UPLOADS_ROOT` env = same PHP docroot  |
| Per-form subfolders (`hsupload/`, `wr/`, `insp1/` …)    | `uploadFor('admin/hsupload')`, `uploadFor('wr')` — subpath passed explicitly, no auto-naming |
| Filename `rand(1000,1000000).$originalName` (lowercased) | Node factory keeps the same prefix pattern. Filename produced as `${rand}_${stamp}_${safe}` (rand kept for PHP visual parity, `_${stamp}` added only to prevent same-millisecond collisions across concurrent mobile uploads) |
| Comma-joined image list in one column                    | Repository layer joins Node-written filenames the same way when writing back to `insp.image1..7`, `ra.image1..7`, etc. |
| Apache serves files as static                            | Prod: Node has zero static-file role — Apache/IIS keeps serving. Dev: Node mounts `UPLOADS_ROOT` at `/` as a convenience so DB paths resolve without Apache locally. |
| Cross-portal H&S write into `../admin/hsupload/`         | Node's H&S endpoint uses `uploadFor('admin/hsupload')` — same folder, same DB column, same result URL. |
| Public URL: `https://<host>/<folder>/<file>`             | `FILES_BASE_URL` env resolves to same URL; if blank, falls back to `PUBLIC_BASE_URL`. |

### 4.3 Explicit non-changes

- Node **does not** create its own `uploads/` folder inside the project.
- Node **does not** invent a new file-serving proxy in Phase 1.
- Node **does not** add ACL checks on file GETs in Phase 1 (matches PHP);
  if we later decide to gate downloads, it will be a new `/files/*` proxy
  route, added *without* moving any file on disk.
- Node **does not** change any existing PHP filename or path column.

### 4.4 Small quality-of-life fixes (mobile side only, PHP unaffected)

These fix PHP bugs *only when the mobile app is the writer* — PHP behavior
is unchanged.

- `gatewayupload.php` uses no random prefix (collision risk). Node's
  gateway endpoint will add the standard `rand_` prefix. PHP-written rows
  keep their existing filenames.
- `tflimages.php` reuses `civilsupload/`. Node's TFL endpoint will write
  into `tfl/` per the natural per-form convention. PHP-written rows keep
  their existing paths and continue to be served.

Both fixes affect only new mobile-written files. If you'd prefer strict
parity (Node reproduces the PHP bugs too), say so and we'll drop these
two deltas.

---

## 5. Existing table usage analysis

**Rule.** Every business table is reused verbatim. No shadow, no rename,
no view, no trigger. Node uses the same columns PHP uses.

Grouped by module (from the DB map in `docs/audit/01-db-map.md`):

- **Auth / users** — `login_users`, `login_levels`, `login_settings`,
  `login_confirm`, `login_timestamps`.
- **HR / employees** — `hr`, `hrdocs`, `upload_hr`.
- **Vehicles** — `vehicle`, `upload_vehicle`, `upload_vr`.
- **Timesheets** — `workrecord`, `wr`, `overtime`, and related tables.
- **Inspections** — `insp`, `winsp` (and their `image1..image7` columns).
- **Risk assessments** — `ra`, `wra`.
- **Vehicle incident checks** — `vic`, `vir`, `vrr`, `gateway`.
- **H&S** — `upload_hs`, cross-portal write into `admin/hsupload/`.
- **Bulletins / documents** — `bulletin`, `bulletincomments`, `upload_er`,
  `upload_pr`.
- **Jobs / civils / TFL** — `wildanet`, `civils`, `tfl`, `mewp`, `wah`,
  `ug`, `clegg`, `equipmentcheck`, `presite`, `maintenance`.
- **Uploads (AJAX buckets)** — `upload_data`, `upload_tfl`,
  `upload_presite`, `upload_maintenance`.

Every one of these tables is **read AND written** by Node using the exact
same columns PHP uses. No new columns are added to any of them in Phase 1.

**Explicitly excluded from Node's data model:** `accounts` (unused by
both portals — `07-…` §7.3), and the nested `employeesarea-php/timesheet/`
sub-app's own `admin`/`users` tables (out of scope for the mobile API).

---

## 6. Proposed new tables (all `lt_*` prefix — with justification)

All six tables use the `lt_` prefix so any DBA can instantly see they were
added by the mobile API. All are **additive**: PHP never queries them, so
they cannot affect PHP behavior. Every table is justified against the
PHP inspection finding that *none of this infrastructure exists today*
(`07-…` §6).

### 6.1 `lt_user_credentials` — bcrypt sidecar

**Why:** PHP reads `login_users.password` as MD5. If Node writes bcrypt
back into that column, PHP breaks. Storing bcrypt in a sidecar table lets
both portals coexist forever. On MD5 verify success, Node populates the
bcrypt row; on subsequent logins Node prefers bcrypt.

```sql
CREATE TABLE lt_user_credentials (
  user_id       INT UNSIGNED PRIMARY KEY,
  password_hash VARCHAR(255) NOT NULL,   -- bcrypt $2b$... or $2y$...
  algo          ENUM('bcrypt') NOT NULL DEFAULT 'bcrypt',
  rehashed_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_ltuc_user FOREIGN KEY (user_id) REFERENCES login_users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### 6.2 `lt_refresh_tokens`

**Why:** No refresh-token table exists (`07-…` §6). Cannot piggyback on
`login_users.tmp_auth_token` — that column is used by the SMS 2FA path.
Storing SHA-256 hashes (never the raw token) is the standard hardening.

```sql
CREATE TABLE lt_refresh_tokens (
  id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id      INT UNSIGNED NOT NULL,
  token_hash   CHAR(64) NOT NULL,        -- sha256 hex
  device_id    VARCHAR(128) NULL,
  user_agent   VARCHAR(255) NULL,
  ip           VARCHAR(45) NULL,
  issued_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at   DATETIME NOT NULL,
  revoked_at   DATETIME NULL,
  UNIQUE KEY uk_ltrt_hash (token_hash),
  KEY ix_ltrt_user (user_id, revoked_at),
  CONSTRAINT fk_ltrt_user FOREIGN KEY (user_id) REFERENCES login_users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### 6.3 `lt_device_tokens`

**Why:** FCM push requires per-device token storage. No such column or
table exists in PHP.

```sql
CREATE TABLE lt_device_tokens (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id     INT UNSIGNED NOT NULL,
  platform    ENUM('ios','android','web') NOT NULL,
  token       VARCHAR(255) NOT NULL,
  app_version VARCHAR(32) NULL,
  last_seen   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_ltdt_token (token),
  KEY ix_ltdt_user (user_id),
  CONSTRAINT fk_ltdt_user FOREIGN KEY (user_id) REFERENCES login_users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### 6.4 `lt_notifications`

**Why:** Per-user in-app inbox for the mobile apps. PHP has no equivalent.

```sql
CREATE TABLE lt_notifications (
  id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id    INT UNSIGNED NOT NULL,
  type       VARCHAR(64) NOT NULL,
  title      VARCHAR(255) NOT NULL,
  body       TEXT NULL,
  data       JSON NULL,
  read_at    DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY ix_ltn_user_read (user_id, read_at),
  CONSTRAINT fk_ltn_user FOREIGN KEY (user_id) REFERENCES login_users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### 6.5 `lt_notification_logs`

**Why:** Per-attempt FCM send log for debugging delivery issues. No PHP
equivalent.

```sql
CREATE TABLE lt_notification_logs (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  notification_id BIGINT UNSIGNED NULL,
  device_token_id BIGINT UNSIGNED NULL,
  provider        VARCHAR(32) NOT NULL DEFAULT 'fcm',
  status          ENUM('sent','failed','skipped') NOT NULL,
  error_code      VARCHAR(64) NULL,
  error_message   TEXT NULL,
  sent_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY ix_ltnl_notif (notification_id),
  KEY ix_ltnl_device (device_token_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### 6.6 `lt_audit_logs`

**Why:** PHP has only `login_timestamps` (last-login stamp). Mobile-side
CRUD needs an append-only audit trail for security and support debugging.

```sql
CREATE TABLE lt_audit_logs (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id     INT UNSIGNED NULL,
  user_type   ENUM('admin','employee','system') NOT NULL,
  action      VARCHAR(64) NOT NULL,
  entity      VARCHAR(64) NULL,
  entity_id   VARCHAR(64) NULL,
  before_json JSON NULL,
  after_json  JSON NULL,
  ip          VARCHAR(45) NULL,
  user_agent  VARCHAR(255) NULL,
  request_id  VARCHAR(64) NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY ix_ltal_user_time (user_id, created_at),
  KEY ix_ltal_entity (entity, entity_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### 6.7 Summary — six new tables, zero changes to legacy tables

| Table                    | Purpose                                     | PHP impact |
|--------------------------|---------------------------------------------|:----------:|
| `lt_user_credentials`    | bcrypt sidecar so `login_users.password` stays MD5 for PHP | none |
| `lt_refresh_tokens`      | JWT refresh flow                            | none       |
| `lt_device_tokens`       | FCM push targets                            | none       |
| `lt_notifications`       | mobile in-app inbox                         | none       |
| `lt_notification_logs`   | FCM send audit                              | none       |
| `lt_audit_logs`          | mobile CRUD audit trail                     | none       |

All six are applied via `scripts/apply-schema.js`. Rollback = drop the
six `lt_*` tables. Legacy schema is untouched.

---

## 7. Compatibility guarantees

If you approve this design, we guarantee the following for as long as the
PHP web app stays online:

1. **PHP web + Admin mobile + Employee mobile all read and write the same
   `lt_employee` database** with no synchronization layer.
2. **No legacy table is renamed, altered, or dropped** in Phase 1.
3. **`login_users.password` stays MD5** — PHP portal continues to log in
   the same users the same way.
4. **`login_settings.pw-encryption` stays `'MD5'`** — Node does not touch
   it.
5. **Uploads land in the same PHP folders with the same naming pattern**
   — a file uploaded from mobile is immediately visible in the PHP web UI
   and vice versa.
6. **The `accounts` table is never read or written by Node.**
7. **The mobile API adds only 6 new `lt_*` tables**, all additive, all
   scoped to mobile-only concerns.

---

## 8. What we're asking you to approve

Please confirm each of the following, or tell us what to change:

1. ☐ Auth design (§1): single `/auth/login`, JWT + rotating refresh,
   MD5-then-bcrypt via `lt_user_credentials` sidecar.
2. ☐ DB interaction rules (§2): `login_users.password` read-only from
   Node in Phase 1; business tables read+write verbatim.
3. ☐ Role model (§1.2, §1.3): JWT carries both `roles` (names, PHP-style)
   and `levelIds` (numeric); `userType` derived from level membership.
4. ☐ Upload plan (§4): reuse PHP folders, keep `rand()` prefix, add
   millisecond stamp to guard against concurrent mobile writes, no
   Node-owned `uploads/` folder, no ACL in Phase 1.
5. ☐ Two mobile-only upload fixes (§4.4) — approve or reject each:
   - Add random prefix on Node's gateway endpoint (fixes PHP collision bug)
   - Node's TFL endpoint writes to `tfl/` not `civilsupload/`
6. ☐ Six new tables (§6) — approve as a set, or approve/reject each.
7. ☐ P1 scope after approval: login, logout, refresh, /me,
   change-password, forgot-password (parity with `login_confirm`),
   reset-password, device register/unregister.

Once you approve, we start P1. Nothing before then.
