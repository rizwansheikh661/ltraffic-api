# 12 — Security Review Report

**Scope:** Auth (`src/modules/auth/**`, `src/middlewares/auth.middleware.js`), Devices (`src/modules/devices/**`), supporting middlewares & config.
**Method:** Full code review + targeted E2E and integration tests to verify each fix landed.
**Date:** 2026-07-11
**Companion documents:** [11 — Auth Production Readiness Review](11-auth-production-readiness-review.md) (findings), [14 — Test Report](14-test-report.md) (proofs).

This is the **after-state** report: for every approved finding in `11-…`, the fix, where it landed, and the assertion that proves it holds.

---

## Approved and applied

| ID       | Severity | Fix landed at                                              | Verification |
|----------|----------|-----------------------------------------------------------|--------------|
| SEC-01   | Critical | `src/app.js:32-35` fail-closed CORS guard when `NODE_ENV=production` and `CORS_ORIGINS=[]`. | Code review; not exercised at runtime since dev keeps wildcard. |
| SEC-02   | Critical | `src/middlewares/auth.middleware.js:11-13` — removed `req.query.access_token` extraction. Bearer header only. | `07 SEC-02 querystring token rejected` (E2E); `SEC-02 — query-string token must NOT authenticate` (integration). |
| SEC-03   | High     | `src/middlewares/auth.middleware.js:23-26` — `jwt.verify(..., { algorithms: ['HS256'], issuer: 'ltraffic-api' })`. `src/modules/auth/auth.service.js:52-57` — `jwt.sign(..., { algorithm: 'HS256', issuer: 'ltraffic-api', jwtid: uuid })`. | `08 SEC-03 alg=none rejected` (E2E); `SEC-03 — alg=none tokens are rejected`, `SEC-03 — token with wrong issuer is rejected` (integration); `jwt.test.js` (4 unit tests). |
| SEC-04   | High     | `src/modules/auth/auth.service.js:139-148` — dummy bcrypt compare against `DUMMY_BCRYPT_HASH` on unknown user. | `05 SEC-04 timing equalized` (E2E: delta = 4ms); `SEC-04 — unknown user & wrong password have similar latency` (integration, delta < 400ms slack for CI). |
| SEC-05   | High     | `src/middlewares/rateLimit.middleware.js:43-61` — per-account and per-user limiters (5 / window). `auth.routes.js` wires them onto `/login` and `/change-password`. | Not asserted end-to-end (limits deliberately relaxed in the test env, otherwise the suite would trip its own SEC-05 guard). Code review + local manual repro. |
| SEC-07   | High     | `src/middlewares/error.middleware.js` — 5xx handler returns a fixed `INTERNAL_ERROR` message and body; internal error strings are logged only. | Manual: throwing inside a controller produces `{"code":"INTERNAL_ERROR","message":"Internal server error"}` with no stack in the response. |
| SEC-08   | Medium   | `src/config/logger.js` — extended `SENSITIVE` redaction set to cover `email`, `identifier`, `md5_snapshot`, `bcrypt_hash`, `key`, `cookie`, `apikey`, etc. `auth.service.js:285,288` — forgot-password logs `user_id` only. | Log spot-check: forgot-password lines read `forgot_pw key issued for user_id=99994` — no email string in the log. |
| SEC-10   | Medium   | `src/utils/legacyHash.helper.js:18-24` — MD5 compare uses `crypto.timingSafeEqual` on equal-length hex buffers. | `verifyMd5 (SEC-10 constant-time)` unit tests. |

## Approved and deferred to tech debt

| ID    | Severity | Deferred reason (from approval) | Tracked in |
|-------|----------|--------------------------------|-------------|
| SEC-06 | High    | PHP-parity: PHP's reset key has no expiry. Aligning Node with a TTL would create divergent behaviour between the two systems. | [15 — Tech Debt](15-tech-debt.md) |
| SEC-09 | Medium  | Requires a Redis-backed session store to work across restarts / multi-node. Out of P1 scope. | [15 — Tech Debt](15-tech-debt.md) |
| SEC-11 | Medium  | Introduces schema/API contract change for the token-family concept. Landed in P3 with proper migration. | [15 — Tech Debt](15-tech-debt.md) |

## Low-severity items — all deferred per approval

Full list in `11-auth-production-readiness-review.md` §Section 1 (SEC-12 through SEC-15). All are hygiene / defense-in-depth. Rolled into `15-tech-debt.md` as a single line item.

---

## Test evidence — quick reference

- E2E: `scripts/e2e-regression.js` — **20/20 pass** (2026-07-11).
- Unit: `tests/unit/*.test.js` — **44/44 pass**.
- Integration: `tests/integration/auth.integration.test.js` — **20/20 pass**.
- PHP compat: `tests/integration/php-compat.integration.test.js` — **6/6 pass**.
- Full jest run: `70/70 pass, 5.7s`.

## Sign-off criteria met

- Every Critical / High finding fixed OR explicitly deferred with rationale.
- No production API contract changed (schemas, status codes, error shapes verified via Swagger diff + integration tests).
- PHP compat preserved: `login_users.password` remains canonical MD5. Sidecar cache self-heals on divergence.
