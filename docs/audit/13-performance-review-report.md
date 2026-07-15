# 13 — Performance Review Report

**Scope:** Auth + Devices hot paths against MariaDB 10.4.32 (`lt_employee` @ 127.0.0.1:3307, local dev).
**Method:** `EXPLAIN` on each query before/after the schema-hardening migration; wall-clock latency captured by the E2E script.
**Date:** 2026-07-11
**Companion documents:** [11 — Auth Production Readiness Review](11-auth-production-readiness-review.md) §Section 6 (findings).

---

## Approved and applied

| ID       | Severity | Change |
|----------|----------|--------|
| PERF-01  | High     | `ALTER TABLE login_users ADD INDEX ix_email (email)`. Login-by-email no longer full-scans. |
| PERF-02  | High     | `auth.repository.findUserByUsernameOrEmail` split into two indexed lookups (unique `username` first; `ix_email` on fallthrough). `OR` predicates cannot use either index. |
| PERF-03  | Medium   | `ALTER TABLE login_confirm ADD INDEX ix_key_type (key, type)`. Reset-password key resolution now `ref`, not `ALL`. |
| PERF-04  | Medium   | `DROP INDEX user_id ON login_users` — was redundant with the `PRIMARY` on `user_id`. |
| PERF-05  | Medium   | `ALTER TABLE login_timestamps ADD INDEX ix_user_ts (user_id, timestamp)` — supports per-user recent-activity lookups. |
| PERF-06  | Medium   | `ALTER TABLE lt_refresh_tokens ADD INDEX ix_expires (expires_at)` — supports the maintenance sweep planned in P3 (`DELETE ... WHERE expires_at < NOW()`). |

Migration file: `scripts/schema/007-auth-hardening.sql` (idempotent, guarded by `INFORMATION_SCHEMA` lookups). Applied to local dev DB on 2026-07-11.

Follow-up: `scripts/schema/008-php-2fa-columns.sql` adds the four PHP 2FA columns (`phone`, `tmp_auth_token`, `use_two_factor_auth`, `sms_time`) that were missing from the freshly-provisioned local dev DB. Not a Node change — brings dev to parity with what PHP `upgrade_410` applies to real deployments.

---

## EXPLAIN — before vs after

Only the queries whose plan changed materially are shown; all others were already `const` or single-row `ref`.

### `SELECT ... FROM login_users WHERE email = :email`

| | type | possible_keys | key       | rows | Extra |
|--|------|---------------|-----------|------|-------|
| **Before** | `ALL` | *(none)* | *(none)* | ~10k | Using where |
| **After**  | `ref` | `ix_email` | `ix_email` | 1 | Using where |

### `SELECT ... FROM login_confirm WHERE key = :k AND type = :t`

| | type | possible_keys | key         | rows | Extra |
|--|------|---------------|-------------|------|-------|
| **Before** | `ALL` | *(none)* | *(none)* | ~2k | Using where |
| **After**  | `ref` | `ix_key_type` | `ix_key_type` | 1 | Using where |

### `SELECT ... FROM login_users WHERE username = :u`

Unchanged — always `const` via the `UNIQUE` on `username`. Split-lookup PERF-02 keeps this fast-path hot.

---

## Wall-clock latency (from `scripts/e2e-regression.js`, 2026-07-11)

- Login unknown-user path (SEC-04 dummy bcrypt): **129 ms**
- Login wrong-password path (real bcrypt): **133 ms**
- Delta: **4 ms**. SEC-04 hardening is holding — no observable timing channel remains.
- Login happy path: ~150 ms (bcrypt dominates; DB is a rounding error).
- Refresh: ~30 ms.
- Change-password: ~170 ms (two bcrypts + one MD5 write in a single transaction).

Under Jest with `--forceExit`, whole 70-test run (unit + integration + PHP compat) completes in **5.7 s** including DB round-trips.

---

## What's still worth doing (not in scope for P1)

Rolled into `15-tech-debt.md`:
- **Sidecar bulk backfill.** The lazy-heal on login is correct but rewards early adopters. A one-off job to rebuild `lt_user_credentials` for every user amortises the bcrypt cost.
- **Refresh-token maintenance sweep.** Cron / scheduled task to `DELETE FROM lt_refresh_tokens WHERE expires_at < NOW() OR (revoked_at IS NOT NULL AND revoked_at < NOW() - INTERVAL 30 DAY)`. Index `ix_expires` is already in place (PERF-06).
- **Pool sizing.** Current `DB_POOL_MAX=10` is fine for the mobile workload; revisit when the admin console starts sharing the same API instance.

---

## Sign-off criteria met

- All hot-path queries confirmed `const` or `ref` — no `ALL` (full scans) remain on any login/reset/refresh path.
- SEC-04 dummy-bcrypt burn keeps the unknown-user path within a few ms of the real-user path (measured: 4 ms delta).
- Migration is idempotent and re-runnable — safe to apply to prod when the deploy window opens.
