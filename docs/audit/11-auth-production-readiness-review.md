# Auth Module — Production Readiness Review

**Status:** Report for approval. No code changed yet.
**Scope:** `src/modules/auth/**`, `src/modules/devices/**`, all supporting middlewares/utils/config.
**Date:** 2026-07-11
**Method:** Full file audit + `EXPLAIN` on live MariaDB 10.4.32 (`lt_employee` @ 127.0.0.1:3307) + cross-check against PHP web app at `employeesarea-php/`.

Every finding below has an **ID** (e.g. `SEC-01`), a **severity** (Critical / High / Medium / Low), a **file:line reference**, and a **recommended fix**. The final section is a checklist you approve before I touch code.

---

## Legend

| Severity | Meaning |
|----------|---------|
| **Critical** | Fix before shipping. Exploitable now or breaks PHP parity. |
| **High** | Fix before shipping. Non-exploitable but real risk (DoS, data leak, correctness). |
| **Medium** | Should fix. Hygiene, operational cost, tech debt. |
| **Low** | Nice to have. Cosmetics, dead code, over-cautious hardening. |

---

# Section 1 — Security Review

### SEC-01 · CRITICAL · CORS wildcard when `CORS_ORIGINS` is unset, combined with `credentials: true`
- `src/app.js:33-40` — `if (env.CORS_ORIGINS.length === 0 || ...) return cb(null, true)` allows ANY origin when the env is empty. Combined with `credentials: true` (line 38), a misconfigured prod deploy accepts credentialed requests from any origin — classic CSRF surface for anything cookie-authenticated.
- Fix: fail-closed when `env.CORS_ORIGINS` is empty in `production`. Log a fatal error at boot.

### SEC-02 · CRITICAL · `?access_token=` query-string token accepted
- `src/middlewares/auth.middleware.js:12` — `if (req.query && typeof req.query.access_token === 'string') return req.query.access_token;`
- Tokens end up in web-server access logs (Apache/IIS/CDN), browser history, Referer headers when the page loads any 3rd-party asset. Real, well-known token leak vector.
- Fix: remove the query-string extraction path entirely. Bearer-header only.

### SEC-03 · HIGH · `jwt.verify` does not pin algorithm
- `src/middlewares/auth.middleware.js:22` — `jwt.verify(token, env.JWT_SECRET)` with no options.
- `jsonwebtoken` v9 defaults to safe algorithms, but explicit `{ algorithms: ['HS256'] }` is defense-in-depth against an accidental future key rotation that lets an attacker choose the algorithm.
- Fix: `jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'], issuer: 'ltraffic-api' })` — and set `issuer` when signing (`auth.service.js`).

### SEC-04 · HIGH · User-enumeration timing side-channel on `/auth/login`
- `src/modules/auth/auth.service.js:132` — unknown user returns immediately; known user pays the bcrypt cost. Response-time delta (~30-80ms with bcrypt cost 10) reveals whether a username exists.
- Fix: when `user` is null, still run a dummy `bcrypt.compare(plaintext, DUMMY_HASH)` to equalize timing.

### SEC-05 · HIGH · No per-account rate limiting; IP-only limits are trivially spoofed at scale
- `src/middlewares/rateLimit.middleware.js` — `express-rate-limit` keyed by `req.ip` only. Password stuffing with 10K IPs against one high-value account (e.g. `admin`) is unbounded.
- Also: `logout`, `/me`, `change-password` currently only hit the global limiter (300/15m) — no `auth` limiter.
- Fix: add a second limiter keyed by `identifier` (login) / `userId` (change-password) with a tighter budget, e.g. 5 attempts / 15 min per account. Consider Redis store for horizontal deploys.

### SEC-06 · HIGH · Reset keys never expire in the DB
- `src/modules/auth/auth.repository.js:findConfirmByKeyAndType` — no `WHERE created > NOW() - INTERVAL X HOUR` guard. A key issued a year ago is still valid until consumed.
- PHP has the same defect; not a parity issue, but a real security gap.
- Fix: filter by `created >= NOW() - INTERVAL 1 HOUR` in the SELECT. Also add a nightly cleanup job (later).

### SEC-07 · HIGH · Internal error messages leak to clients
- `src/middlewares/error.middleware.js:31` — `ApiError.internal(err?.message || 'Internal server error')`. Any surprise crash's `err.message` (potentially a MySQL error, stack fragment, file path) is echoed to the response `body.error.message`.
- Fix: for non-operational errors, always return the static string `'Internal server error'` — full detail stays in the log via `requestId`.

### SEC-08 · MEDIUM · PII (email) written to logs in cleartext
- `src/modules/auth/auth.service.js:267,269` — `logger.info` includes the user's email.
- `src/config/logger.js:14` — `SENSITIVE` redaction set is missing: `email`, `apikey`, `cookie`, `set-cookie`, `md5_snapshot`, `bcrypt_hash`, `identifier`.
- Log retention is 14 days (`LOG_MAX_FILES=14d`), so emails persist.
- Fix: extend `SENSITIVE`; also change forgot-password logs to log only `user_id`, not `email`.

### SEC-09 · MEDIUM · No account-lockout after N failed logins
- No lockout / progressive delay. IP rate limit is the only guard.
- Fix (later, after per-account limiter is in): after 5 failed logins in 15 min for a single username, lock the account for 15 min. Requires a small table (`login_lockouts`) or Redis.

### SEC-10 · MEDIUM · Non-constant-time MD5 hash compare
- `src/utils/legacyHash.helper.js:17` — `md5(plain) === hash.toLowerCase()`. Not constant-time.
- Practical exploitability against a 32-char hex string is near-zero, but best practice is `crypto.timingSafeEqual(Buffer.from(md5(plain)), Buffer.from(hash.toLowerCase()))`.
- Fix: swap to `timingSafeEqual`.

### SEC-11 · MEDIUM · Refresh token replay window on rotation failure
- `src/modules/auth/auth.service.js:refresh` (line 172-212) — properly transactional. But if a client's rotation request succeeds server-side and the response is lost (network drop), the client retries with the old token → gets 401 → user has to re-login. No token-reuse detection (RFC 6819 §5.2.2.3).
- Fix: add `family_id` column to `lt_refresh_tokens`. On presenting a revoked-but-not-expired token, revoke the entire family — implies attacker replay.

### SEC-12 · LOW · Logout endpoint is unauthenticated and not rate-limited
- `src/modules/auth/auth.routes.js:358` — `router.post('/logout', validate(...), controller.logout)`. Anyone can hit it with any refresh token; if they guess a valid one (256-bit random, effectively impossible), they revoke it.
- Not exploitable. But: no rate limit means an attacker with a valid token can call it in a loop for mild DoS on the DB.
- Fix: add the `auth` limiter.

### SEC-13 · LOW · User-Agent not truncated before insert into 255-char column
- `src/modules/auth/auth.controller.js:22` — passes `req.headers['user-agent']` verbatim. A 10 KB UA triggers `ER_DATA_TOO_LONG` on insert → 500 error to client.
- Fix: `.slice(0, 255)` before insert.

### SEC-14 · LOW · JWT_SECRET minimum length is only 16 chars
- `src/config/env.js` — `JWT_SECRET` min 16.
- HS256 with a 16-char (128-bit) secret is technically fine but industry standard is ≥32 chars.
- Fix: raise min to 32 in env validator.

### SEC-15 · LOW · `unhandledRejection` does not exit process
- `src/server.js:49` — logs the rejection but keeps the process alive. Corrupt state could persist.
- Fix: in production, `process.exit(1)` after logging; PM2/systemd will restart.

---

# Section 2 — Code Review

### CODE-01 · MEDIUM · Two overlapping validation systems
- `src/middlewares/validate.middleware.js` exports both `validate` (Zod) and `validateExpressResult` (express-validator).
- Only `validate` is used in auth/devices. `express-validator` is legacy from the original scaffolding.
- Fix: delete `validateExpressResult` + `express-validator` dependency.

### CODE-02 · LOW · Dead exports and unused imports
- `src/modules/auth/auth.repository.js` — `deleteCredentials` exported, never called.
- `src/modules/auth/auth.controller.js:3` — `created`, `noContent` imported, never used.
- `src/common/response.js` — `fail` helper unused.
- `src/modules/auth/auth.service.js:305` — `_internal` export leaks private surface for tests only.
- Fix: delete dead code. For `_internal`, rename to `__testonly__` and comment as such.

### CODE-03 · LOW · `clientIp()` helper is redundant given `trust proxy = 1`
- `src/modules/auth/auth.controller.js:7-14` — reads `x-forwarded-for` manually.
- `app.js:27` already sets `trust proxy = 1`, so `req.ip` is correct.
- Fix: replace `clientIp(req)` with `req.ip`.

### CODE-04 · LOW · `login()` service method is long (~40 lines)
- `src/modules/auth/auth.service.js:132-169` — mixes password verify, level gate, token mint, telemetry.
- Fix: extract `mintTokenPair(user, deviceId, ip, ua)` helper. Keeps `login` readable.

### CODE-05 · LOW · Hand-rolled MySQL datetime formatter duplicated in service
- `src/modules/auth/auth.service.js:65-70` — `toMysqlDatetime`. Since pool uses `dateStrings: true` and mysql2 serializes `Date` correctly, this can be replaced with just passing a `Date` object.
- Fix: pass `new Date(...)` directly; delete the helper.

### CODE-06 · LOW · No `refresh` API for the boot-cached `login_levels`
- `src/modules/auth/levels.cache.js:71` — `refresh` alias exists but is not wired to any admin endpoint. If an admin disables a level via PHP, Node keeps stale data until restart.
- Fix (P2): add `POST /admin/system/refresh-levels` protected by admin RBAC. For now, document the restart requirement.

### CODE-07 · LOW · No `admin` RBAC guard on `/devices/*`
- `src/modules/devices/devices.routes.js` — any authenticated user can list/register/unregister their own devices. This is by design (per-user scoping is enforced in the repository). No fix needed, but worth confirming.

---

# Section 3 — Swagger Completeness Review

Verified against the live `/api/v1/openapi.json`. Endpoints: 10 total (7 auth + 3 devices).

| Endpoint | Summary | Description | Tags | Auth | Req example | Success example | Error example | Req schema | Resp schema |
|----------|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| POST /auth/login | ✅ | ✅ | ✅ | (public) | ✅ 3 examples | ✅ | ✅ (401/403/422/429) | ✅ | ✅ |
| POST /auth/refresh | ✅ | ✅ | ✅ | (public) | ⚠ 1 example only | ⚠ inline | ✅ (401/429) | ✅ | ⚠ inline |
| POST /auth/logout | ✅ | ✅ | ✅ | (public) | ⚠ no example | ✅ | ❌ no error responses | ✅ | ⚠ inline |
| GET /auth/me | ✅ | ✅ | ✅ | ✅ bearer | — | ✅ | ✅ (401) | — | ✅ |
| POST /auth/change-password | ✅ | ✅ | ✅ | ✅ bearer | ⚠ inline example only | ✅ | ✅ (401/422) | ✅ | ⚠ inline |
| POST /auth/forgot-password | ✅ | ✅ | ✅ | (public) | ⚠ inline example only | ✅ | ⚠ 422/429 mentioned but no schema | ✅ | ⚠ inline |
| POST /auth/reset-password | ✅ | ✅ | ✅ | (public) | ⚠ inline example only | ✅ | ✅ (400/422/429) | ✅ | ⚠ inline |
| POST /devices/register | ✅ | ❌ **no description** | ✅ | ✅ bearer | ❌ no example | ❌ 200 desc only | ❌ | ⚠ inline | ❌ |
| POST /devices/unregister | ✅ | ❌ | ✅ | ✅ bearer | ❌ | ❌ | ❌ | ⚠ inline | ❌ |
| GET /devices | ✅ | ❌ | ✅ | ✅ bearer | — | ❌ | ❌ | — | ❌ |

### SWAG-01 · HIGH · Devices module has near-zero Swagger detail
- `src/modules/devices/devices.routes.js:22-74` — every endpoint is a one-liner. No description, no example, no response schema, no error responses.
- Fix: rewrite with same treatment as `auth.routes.js` — component schemas (`DeviceRegisterRequest`, `DeviceListResponse`, etc.), REQUIRED/OPTIONAL badges, error responses documented.

### SWAG-02 · MEDIUM · Auth responses use inline `schema:` blocks instead of `$ref`
- `refresh`, `logout`, `change-password`, `forgot-password`, `reset-password` — success bodies are declared inline in the route JSDoc instead of extracted to component schemas.
- Fix: extract `RefreshResponse`, `LogoutResponse`, `ChangeResponse`, `ForgotResponse`, `ResetResponse` component schemas and $ref them.

### SWAG-03 · MEDIUM · Missing error response schema on some paths
- `/auth/logout` — declares no error responses. `/devices/*` — none.
- Fix: add `401` / `422` responses referencing `ErrorEnvelope`.

### SWAG-04 · LOW · Only one example on most endpoints
- `/auth/login` has 3 named examples (good). Every other endpoint has just one.
- Fix (optional): add named examples for edge cases (e.g. `/auth/refresh` — successful rotation).

---

# Section 4 — Response Consistency

Every auth response is `{ success: boolean, data: {...} }` on success and `{ success: false, error: { code, message, details, requestId } }` on error. All routes use `ok(res, data)` from `src/common/response.js` — EXCEPT:

### RESP-01 · LOW · `forgotPassword` hand-rolls `res.status(202).json(...)`
- `src/modules/auth/auth.controller.js:58` — `return res.status(202).json({ success: true, data: { requested: true } });`
- The `response.js` helper only supports `200` (`ok`) and `201` (`created`). No `accepted(res, data)`.
- Envelope shape is correct; only the mechanism differs.
- Fix: add `accepted(res, data)` helper in `response.js`, use it.

### RESP-02 · verified · Status codes are consistent
- `200` OK · `201` Created · `202` Accepted (forgot-password only) · `401` unauthorized · `403` forbidden · `422` validation · `429` rate-limited · `500` internal.
- No divergence.

### RESP-03 · verified · Error codes are stable strings
- All error codes come from `src/constants/errorCodes.js` constants. No stringly-typed drift.

---

# Section 5 — PHP Compatibility (Re-verification)

**MATCH — 100% compatible:**
1. **MD5 password verify:** PHP `generic.class.php:591` vs Node `legacyHash.helper.js:17` — semantically identical.
2. **Password write on change:** Node writes `login_users.password` (MD5) + `lt_user_credentials` (bcrypt cache). PHP reads only `login_users.password` — sees the new MD5 immediately. ✅
3. **Forgot-password key format:** both produce 32-char lowercase hex MD5. ✅
4. **`login_confirm` schema use:** same columns, same `type='forgot_pw'`. ✅
5. **`login_timestamps` write:** same columns (`user_id`, `ip`), `timestamp` from column default. ✅
6. **`user_level` deserialization:** Node handles PHP-serialized arrays via `phpSerialize.helper.js`. ✅
7. **Email case handling:** MySQL default collation is case-insensitive; PHP and Node both work as-is. ✅

**MISMATCH — needs decision:**

### PHP-01 · HIGH · Node does NOT delete old `login_confirm` rows before inserting new forgot-password key
- PHP `forgot.class.php:230-233` — DELETE by email+type before INSERT.
- Node `auth.service.js:257` — INSERT only. Multiple outstanding reset links per email accumulate; each remains valid until consumed.
- **Impact:** User requesting forgot-password twice ends up with 2 valid keys under Node, but only 1 under PHP. Also means if a user's email was compromised at t0, the attacker's captured key stays valid even after the user requests a new one.
- Fix: add `repo.deleteConfirmByEmailAndType(email, 'forgot_pw')` and call it before insert.

### PHP-02 · MEDIUM · Node does NOT clear `login_users.tmp_auth_token` / `sms_time` on password reset
- PHP `forgot.class.php:105` — sets both to `NULL` on successful reset.
- Node `auth.service.js:resetPassword` — does not touch them. Since Node has no 2FA path, stale values don't affect Node; but PHP web users may see stale 2FA state after a Node-initiated reset.
- Fix: mirror the PHP `NULL` update in the same transaction.

### PHP-03 · LOW · Login lookup uses `username OR email` unconditionally
- PHP `login.class.php:293` uses ONE of the two, chosen by admin option `email-as-username-enable`.
- Node `auth.repository.js:20` uses BOTH always.
- **Impact:** Node is more lenient. If LTraffic ever enables the PHP option to force email-only login, Node still accepts by-username. Not a security bypass — same password gate — but a policy divergence.
- Fix: read the config option; scope the lookup accordingly. (Or: document the divergence as intentional.)

### PHP-04 · LOW · Node ignores `login_confirm.type IN ('new_user', 'update_emailPw')`
- PHP uses these for signup activation (`type='new_user'`) and web profile change (`type='update_emailPw'`).
- Node only handles `forgot_pw`.
- **Impact:** feature gap for mobile signup / mobile email-change flows. Not planned for P1.
- Fix (P2 or later): only when the mobile app needs signup / email change.

### PHP-05 · LOW · `changePassword` bypasses the PHP two-step email-confirm flow
- PHP `profile.class.php:320-332` — password change requires email confirmation.
- Node — direct change after re-auth with current password.
- Documented as intentional for the mobile API. No user impact if the mobile UX flow is understood.

---

# Section 6 — Performance Review

DB: MariaDB 10.4.32. All results from live `EXPLAIN` on `lt_employee`.

### PERF-01 · CRITICAL · `login_users.email` has NO index — every login/forgot-password is a full table scan
- `EXPLAIN SELECT ... FROM login_users WHERE username=? OR email=?` → `type=ALL`, `key=NULL`, `rows=22`.
- Current 22-row scan is trivial. Grows linearly with user table.
- Fix: `ALTER TABLE login_users ADD INDEX ix_email (email);`

### PERF-02 · CRITICAL · Login `WHERE username=? OR email=?` cannot use `username` index either
- MariaDB can't index-merge when one side of the OR is unindexed.
- Even after adding `ix_email`, an `OR` across two indexed columns doesn't always use both without hints — often falls back to full scan.
- Fix: split into two lookups in the repository — `SELECT ... WHERE username = :id LIMIT 1` first, if null then `SELECT ... WHERE email = :id LIMIT 1`. Each uses its own index; two `const`/`ref` reads instead of one `ALL` scan.

### PERF-03 · CRITICAL · `login_confirm.key` has NO index
- `EXPLAIN SELECT ... FROM login_confirm WHERE \`key\`=? AND type='forgot_pw'` → `type=ALL`, `key=NULL`.
- Every reset-password validation is a full scan. Table grows with every forgot request.
- Fix: `ALTER TABLE login_confirm ADD INDEX ix_key_type (\`key\`, type);`

### PERF-04 · HIGH · Redundant `UNIQUE KEY user_id` on `login_users` (duplicates `PRIMARY`)
- `SHOW CREATE TABLE login_users` shows both. Wastes buffer pool + slows every write.
- Fix: `ALTER TABLE login_users DROP INDEX user_id;`

### PERF-05 · MEDIUM · `login_timestamps` has 11k rows and only `PRIMARY` index
- Any future query by `user_id` or date range (login history report, audit) is a full scan.
- Not touched on hot paths today, but volume already justifies an index.
- Fix: `ALTER TABLE login_timestamps ADD INDEX ix_user_ts (user_id, timestamp);`

### PERF-06 · MEDIUM · `lt_refresh_tokens` has no index on `expires_at`
- Future cleanup job (`DELETE ... WHERE expires_at < NOW()`) will full-scan.
- Fix: `ALTER TABLE lt_refresh_tokens ADD INDEX ix_expires (expires_at);`

### PERF-07 · LOW · No FK constraints from `lt_refresh_tokens` / `lt_user_credentials` to `login_users`
- User deletion orphans both tables. Legacy PHP schema likely has none either.
- Fix (optional): add `FOREIGN KEY (user_id) REFERENCES login_users(user_id) ON DELETE CASCADE`.

### PERF-08 · verified · Refresh-token hot paths are correctly indexed
- `token_hash` lookup uses `ux_token_hash` (const).
- `revokeAllRefreshTokensForUser` uses `ix_user_active` (range).
- No issue.

### PERF-09 · verified · No N+1 queries in the auth module
- Every request is 1-3 SQL round trips. Confirmed by reading the service.

### PERF-10 · verified · Connection pool and transaction scope are correct
- `withTransaction` in `src/common/db.js` grabs one connection, uses it for the whole callback, releases in `finally`. Rollback on throw. Standard pattern.

---

# Summary — Fix Plan

Grouped by area with proposed order.

## Must fix before P2 (Critical + High)

| ID | Area | Fix |
|----|------|-----|
| SEC-01 | app.js | Fail-closed CORS in production when `CORS_ORIGINS` empty |
| SEC-02 | auth.middleware.js | Remove `?access_token=` extraction |
| SEC-03 | auth.middleware.js + auth.service.js | Pin `algorithms: ['HS256']` on verify; set `issuer` on sign |
| SEC-04 | auth.service.js | Dummy bcrypt compare for unknown users |
| SEC-05 | rateLimit.middleware.js + routes | Per-account limiter on login + change-password |
| SEC-06 | auth.repository.js | Reset key expiry filter (1 hour) |
| SEC-07 | error.middleware.js | Sanitize non-operational error messages |
| SWAG-01 | devices.routes.js | Full Swagger detail parity with auth.routes.js |
| PHP-01 | auth.service.js + repo | Delete old `forgot_pw` rows before insert |
| PERF-01 | schema/003 | `ADD INDEX ix_email` on `login_users` |
| PERF-02 | auth.repository.js | Split username/email lookup into two queries |
| PERF-03 | schema/003 | `ADD INDEX ix_key_type` on `login_confirm` |
| PERF-04 | schema/003 | `DROP INDEX user_id` on `login_users` |

## Should fix (Medium)

| ID | Area | Fix |
|----|------|-----|
| SEC-08 | logger.js + auth.service.js | Extend redaction set; drop email from logs |
| SEC-09 | (deferred) | Account lockout — pairs with SEC-05 |
| SEC-10 | legacyHash.helper.js | `timingSafeEqual` for MD5 compare |
| SEC-11 | (deferred) | Refresh-token family reuse detection — larger change |
| CODE-01 | validate.middleware.js | Remove `validateExpressResult` + `express-validator` dep |
| SWAG-02 | auth.routes.js | Extract remaining inline schemas to components |
| SWAG-03 | routes | Add error responses to `/auth/logout` + all `/devices/*` |
| PHP-02 | auth.service.js | Clear `tmp_auth_token` / `sms_time` on reset |
| PERF-05 | schema/003 | `ADD INDEX ix_user_ts` on `login_timestamps` |
| PERF-06 | schema/003 | `ADD INDEX ix_expires` on `lt_refresh_tokens` |

## Nice to have (Low)

| ID | Area | Fix |
|----|------|-----|
| SEC-12 | routes | Add `auth` limiter to `/auth/logout` |
| SEC-13 | auth.controller.js | Truncate UA to 255 chars |
| SEC-14 | env.js | Raise `JWT_SECRET` min to 32 |
| SEC-15 | server.js | Exit on `unhandledRejection` in prod |
| CODE-02 | multiple | Delete dead code + unused imports |
| CODE-03 | auth.controller.js | Replace `clientIp()` with `req.ip` |
| CODE-04 | auth.service.js | Extract `mintTokenPair` helper |
| CODE-05 | auth.service.js | Delete `toMysqlDatetime`, pass `Date` |
| RESP-01 | response.js | Add `accepted()` helper |
| PERF-07 | schema | FK constraints (optional) |

## Deferred to later phases (Larger changes / need product input)

- **SEC-11** (refresh-token family reuse detection) — 1-2 days work, requires schema change + client coordination.
- **PHP-03** (username-vs-email lookup config toggle) — needs product decision on whether LTraffic will ever enable it.
- **PHP-04** (`new_user` / `update_emailPw` handling) — only when mobile signup/email-change flows are scoped.
- **CODE-06** (`/admin/system/refresh-levels` endpoint) — depends on P2 admin module.
- **Forgot-password email actually sends** — separate work; PHP-parity requires nodemailer + SMTP config + admin-editable subject/body templates. See prior discussion; needs SMTP config from ops before implementation.

---

# Testing Plan (to run after fixes)

## Unit tests (Jest)

| Suite | File | Cases |
|-------|------|-------|
| auth.validators | `tests/unit/auth.validators.test.js` | LoginSchema accepts identifier / username / email; rejects empty; deviceId optional. ChangePasswordSchema min/max. ResetPasswordSchema key length 32. |
| legacyHash | `tests/unit/legacyHash.test.js` | verifyMd5 ok / wrong / empty / non-hex. hashBcrypt roundtrip. |
| auth.dto | `tests/unit/auth.dto.test.js` | resolveLevels for PHP-serialized array / scalar / null. userTypeFromLevelIds for each ADMIN_LEVELS and non-admin. publicUser field whitelist. |
| levels.cache | `tests/unit/levels.cache.test.js` | load populates map; idsToNames handles unknown ids. |
| jwt shape | `tests/unit/jwt.test.js` | mint + verify roundtrip with `algorithms: ['HS256']`; rejects wrong algorithm; rejects expired; rejects wrong issuer. |

## Integration tests (Jest + supertest, real MySQL)

Using dedicated test user seeded once, cleaned after every suite.

| Suite | Cases |
|-------|-------|
| login | valid MD5 login → seeds bcrypt cache; valid bcrypt cache login (hot path); invalid password; unknown user; disabled level → 403; rate-limit 429; PHP-rotated password → self-heal on next login. |
| refresh | valid rotate → old revoked, new pair valid; replayed old refresh → 401; expired refresh → 401. |
| logout | valid refresh revoked; unknown refresh returns `{ revoked: false }` uniformly. |
| /me | valid bearer returns fresh profile; expired token → 401 with `AUTH_TOKEN_EXPIRED`; wrong secret → 401 with `AUTH_TOKEN_INVALID`. |
| change-password | wrong current pw → 401; happy path → MD5 in login_users updates + sidecar updates + refresh tokens revoked + PHP can login with new pw. |
| forgot / reset | insert login_confirm row; delete-before-insert (PHP-01 fix); reset consumes key; PHP can log in with new pw; expired reset → 400. |
| devices | register token; list; unregister own; cannot revoke another user's token. |

## Cross-system integration

| Scenario | Verify |
|----------|--------|
| PHP login still works after Node changes | Log in via `employeesarea-php/index.php` with test user. |
| Password changed from PHP works in Node | Change pw via PHP profile page, log in via Node, self-heal fires. |
| Password changed from Node works in PHP | Change pw via `POST /auth/change-password`, log in via PHP, session works. |
| Password reset from PHP works in Node | Complete PHP forgot flow, log in via Node. |
| Password reset from Node works in PHP | Complete Node forgot flow, log in via PHP. |
| Logout revokes only current device | Two device sessions; logout one → other still valid. |
| Change-password revokes ALL devices | Two sessions; change pw on one → other 401. |

---

# Deliverables (to be produced after fixes + tests pass)

1. `docs/audit/12-security-review-report.md` — final list of what was fixed with file:line, before/after snippets, verification steps.
2. `docs/audit/13-performance-review-report.md` — final index list with `EXPLAIN` before/after.
3. `docs/audit/14-test-report.md` — unit + integration test coverage summary.
4. `docs/audit/15-tech-debt.md` — deferred items with tracking.
5. `docs/audit/16-production-readiness-checklist.md` — go/no-go checklist.

---

# Approval requested

Please pick one of these on each row:

| # | Group | Options |
|---|-------|---------|
| A | Critical + High fixes | (a) Apply all as listed  ·  (b) I want to remove/skip specific IDs  ·  (c) Split into 2 PRs (security first, perf second) |
| B | Medium fixes | (a) Apply all  ·  (b) Skip specific IDs  ·  (c) Defer all to a later pass |
| C | Low fixes | (a) Apply all  ·  (b) Skip |
| D | Deferred items | (a) OK to defer  ·  (b) Move some back into scope |
| E | PHP mismatch PHP-03 (username vs email lookup) | (a) Leave lenient (current)  ·  (b) Match PHP config toggle |
| F | Testing scope | (a) Unit + integration + cross-system as listed  ·  (b) Skip cross-system for now  ·  (c) Unit only |

Once you approve, I execute in this order:
1. Apply schema migration (`scripts/schema/003-auth-hardening.sql` — all `ALTER TABLE`s from PERF-01/03/04/05/06) with backups.
2. Apply code fixes grouped by file for readability.
3. Restart server, re-run the existing 17-step manual E2E to confirm no regression.
4. Add Jest + supertest, write test suites, run them.
5. Produce the 5 deliverable reports.
6. You approve production-readiness → we start P2.
