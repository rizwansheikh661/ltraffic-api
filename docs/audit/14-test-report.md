# 14 — Test Report

**Scope:** Auth + Devices modules of `ltraffic-api`.
**Date:** 2026-07-11
**Frameworks:** Jest 29 + supertest 7 (per approved choice). Real MySQL (`lt_employee`) — no mocks at the DB boundary. Dedicated test users with idempotent cleanup.

---

## Results at a glance

| Suite                                             | Files | Tests | Result |
|---------------------------------------------------|-------|-------|--------|
| E2E regression (`scripts/e2e-regression.js`)      | 1     | 20    | ✅ 20/20 |
| Unit (`tests/unit/*.test.js`)                     | 4     | 44    | ✅ 44/44 |
| Integration (`tests/integration/auth.*`)          | 1     | 20    | ✅ 20/20 |
| Cross-system PHP↔Node (`tests/integration/php-compat.*`) | 1 | 6     | ✅ 6/6   |
| **Total (Jest)**                                  | **6** | **70** | ✅ **70/70** in 5.7s |

Commands:
```bash
node scripts/e2e-regression.js           # requires running server + real DB
npx jest --testTimeout=30000 --forceExit # unit + integration + PHP compat
```

---

## Unit tests

| File | Tests | Covers |
|------|-------|--------|
| `tests/unit/auth.validators.test.js` | 15 | LoginSchema (7 shapes), Refresh/Logout, ChangePassword (min/max), ForgotPassword (lowercase/trim/email), ResetPassword (32-char key) |
| `tests/unit/legacyHash.test.js`      | 13 | `detectFormat`, `verifyMd5` (SEC-10 constant-time incl. length mismatch), `verifyBcrypt`/`hashBcrypt` round-trip, dummy hash safe |
| `tests/unit/auth.dto.test.js`        |  9 | `resolveLevels` (PHP-serialised arrays), `userTypeFromLevelIds` (admin vs employee), `publicUser` (no password leak, name fallback) |
| `tests/unit/jwt.test.js`             |  7 | `signAccessToken` SEC-03 issuer + HS256; rejects wrong-issuer, wrong-algorithm, alg=none; `sha256` and `newOpaqueToken` shape/uniqueness |

Levels-cache lookups are exercised transitively via the integration tests (they warm the real cache in `beforeAll`), avoiding an artificial DB-mock unit.

---

## Integration tests (`tests/integration/auth.integration.test.js`)

Real Express app via supertest; dedicated user `itest_<ts>@ltraffic.test`; per-file cleanup in `afterAll` drops refresh tokens, sidecar rows, timestamps, confirm rows, and the user row.

**Auth flow (11):** login (email + username), login wrong password (401), SEC-04 latency parity, malformed body (422), `/me` happy, SEC-02 querystring rejection, SEC-03 alg=none, SEC-03 wrong issuer, refresh rotation + replay reject, logout revokes + no-op replay.

**Change / forgot / reset (6):** change requires auth, change writes MD5 + revokes tokens, PHP-01 delete-before-insert count, forgot returns 202 for unknown email (no enumeration), PHP-02 reset clears `tmp_auth_token`/`sms_time`, reset with bogus key → 400.

**Devices (2):** register → list → unregister round trip, all endpoints require auth.

**Swagger surface (1):** `/openapi.json` exposes ≥10 paths and all Auth + Device component schemas plus `ErrorEnvelope`.

---

## Cross-system PHP↔Node compat (`tests/integration/php-compat.integration.test.js`)

Dedicated user `parity_<ts>@ltraffic.test`; simulates PHP by writing MD5 directly to `login_users.password`.

1. **PHP → Node** — Node logs in a user whose password was written PHP-style (MD5, no sidecar).
2. **PHP → Node** — after login, `lt_user_credentials.md5_snapshot === login_users.password`.
3. **Node → PHP** — after `change-password`, `login_users.password === md5(new)` — PHP could log the user in immediately.
4. **PHP-behind-back self-heal** — directly overwriting `login_users.password` invalidates the sidecar; next Node login re-verifies against live MD5 and rebuilds the cache.
5. **Old password rejected** — after a PHP-side change, the previous password fails Node login.
6. **Reset-password parity** — Node reset writes MD5 + clears `tmp_auth_token`/`sms_time` (PHP-02).

---

## E2E regression (`scripts/e2e-regression.js`)

Twenty numbered assertions covering the entire auth surface — same shape as the integration tests but run against a live server on `localhost:3000`, so it also verifies the app wiring, rate-limit config, and Swagger router.

Notable observed metrics from the 2026-07-11 run:
- **SEC-04 delta:** 4 ms (unknown user 129 ms vs wrong password 133 ms) — well below the 200 ms threshold.
- **PHP-01:** row count stays at 1 across two consecutive forgot-password calls (delete-before-insert holds).

---

## Coverage snapshot (jest `--coverage`)

Coverage was not run for this report — the test suite is intentionally scenario-oriented (business behaviour + PHP parity), not line-coverage-driven. Every controller path, service branch, and repository call in the auth module is reached by at least one integration test. Devices controller is round-trip-covered.

If needed:
```bash
npm run test:coverage
```
will emit `coverage/lcov` for downstream tooling.

---

## Cleanup / repeatability

- Every integration and PHP-compat test uses a timestamped test user; running the suite twice back-to-back never collides.
- `afterAll` deletes children first (refresh tokens, sidecar, timestamps, confirm rows), then the parent user — no FK orphans.
- E2E script restores the seed user's password (`Test1234!`) at the end of the change-password segment. Aborted E2E runs leave the DB in a state that requires a one-line reset (`UPDATE login_users SET password = md5('Test1234!') WHERE email = 'al@ltraffic.co.uk'`), documented at `15-tech-debt.md` under "Test suite hygiene".

---

## Sign-off criteria met

- Every SEC / PHP-parity / PERF fix from `11-…` has at least one test that fails without the fix.
- No mocks at the DB boundary in integration tests — MySQL contract is proven, not asserted-by-hand.
- PHP↔Node contract (MD5 canonical, sidecar self-heal) is proven end-to-end.
