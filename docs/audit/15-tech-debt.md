# 15 — Remaining Technical Debt

**Scope:** Auth + Devices modules only. Items explicitly deferred during the P1 hardening pass, plus known follow-ups uncovered while building the test suite.
**Date:** 2026-07-11
**Source:** Deferred findings from [11 — Auth Production Readiness Review](11-auth-production-readiness-review.md) + operational notes from the test build.

Each item has an **owner-facing summary**, a **why-deferred** line, and a **suggested when-to-do** hook.

---

## Deferred security items (approved for later)

### SEC-06 · Reset-key TTL
- **Summary:** `login_confirm` rows have no expiry column. A reset link is valid forever until claimed or overwritten.
- **Why deferred:** PHP `forgot.class.php` has the same behaviour. Adding a TTL here creates divergent semantics between the two systems while both still run in parallel.
- **When to do:** Same wave as the PHP migration (P4+). Add `expires_at` to `login_confirm` and enforce it in both codebases simultaneously.

### SEC-09 · Refresh-token store is per-process rate-limited
- **Summary:** Rate limits (`express-rate-limit`) use an in-process memory store. Multi-instance deploys will not share counters.
- **Why deferred:** Requires Redis (or equivalent) as a session store dependency. Out of P1 scope.
- **When to do:** When the API scales past a single Node process. Add `rate-limit-redis` adapter.

### SEC-11 · Token-family / reuse-detection on refresh
- **Summary:** Rotation revokes the used token but doesn't detect reuse across a chain (i.e. two clients holding the same pre-rotation token).
- **Why deferred:** Schema change (`family_id` column on `lt_refresh_tokens`) + revocation-cascade logic. Sizable P3 work.
- **When to do:** P3 refresh-token hardening. Migration + service change both need coordinated release.

### SEC-12 through SEC-15 · Low-severity hygiene
- Cookie samesite hardening, more granular request-log filtering, HSTS preload verification, CSP tightening for the Swagger UI.
- **Why deferred:** All defense-in-depth; none exploitable now.
- **When to do:** Pick up opportunistically during a security-week sweep.

---

## Deferred operational items

### Sidecar bulk backfill
- **Summary:** `lt_user_credentials` is populated lazily on first successful login. Users who never log in via Node keep their bcrypt cache empty forever.
- **Why deferred:** Correct behaviour; just slower first-time login for stragglers.
- **When to do:** After the mobile app has 80 %+ user coverage — run a one-off `scripts/backfill-credentials.js` that mirrors the login self-heal path per user.

### Refresh-token maintenance sweep
- **Summary:** Nothing purges expired / long-revoked `lt_refresh_tokens` rows.
- **Why deferred:** Table growth is bounded but unbounded — no query performance issue observed today. Index `ix_expires` (PERF-06) is already in place to support the sweep.
- **When to do:** When P3 lands, wire a scheduled task that runs `DELETE FROM lt_refresh_tokens WHERE expires_at < NOW() OR (revoked_at IS NOT NULL AND revoked_at < NOW() - INTERVAL 30 DAY)`.

### Forgot-password email delivery
- **Summary:** `auth.service.forgotPassword` logs the issued key but does not send the email. `TODO(P5)` in the code.
- **Why deferred:** PHP still owns the mail path (`SMTP` config in the PHP side). Mobile flow uses the web-hosted reset link.
- **When to do:** P5, when PHP retires. Port PHP `mail.class.php` templates + delivery to Node.

---

## Deferred code / hygiene items

### CODE-01 through CODE-07 (from `11-…`)
- Minor refactors (extract dummy hash constant, tighten some Zod schemas, small DTO helpers).
- Rolled up as one line here because every deferred item is <30 minutes and none affects correctness.
- **When to do:** Anytime someone is already in the file for another change.

### SWAG-04 · Swagger schema for legacy PHP-side error envelopes
- **Summary:** Documented all Node error responses; PHP-side error shapes (used only when Node proxies to PHP) not schematised.
- **When to do:** If/when we add proxying endpoints. Not applicable today.

---

## Test-suite hygiene

### Aborted E2E leaves the seed user in a modified state
- **Summary:** `scripts/e2e-regression.js` intentionally changes the seed user's password via `/change-password` and reverts it at the end. If the run aborts, the reversion doesn't fire and subsequent runs see 401 on the first login step.
- **Recovery:**
  ```sql
  UPDATE login_users SET password = MD5('Test1234!') WHERE email = 'al@ltraffic.co.uk';
  DELETE FROM lt_user_credentials WHERE user_id = (SELECT user_id FROM login_users WHERE email = 'al@ltraffic.co.uk');
  ```
- **When to fix:** Rewrite E2E as a Jest integration file with a dedicated test user (already the pattern for the Jest suite). Low priority — Jest suite already covers everything the E2E does.

### Rate-limit windows are relaxed for tests
- **Summary:** Integration tests set `AUTH_RATE_LIMIT_WINDOW_MS=250` and `AUTH_RATE_LIMIT_MAX=10000` so many consecutive logins as the same test user don't trip SEC-05.
- **Why not a bug:** These are `process.env` overrides in the test files only; production uses the `.env` defaults (10 per 15 min, 5 per account per 15 min).
- **When to revisit:** If we ever want to positively assert the SEC-05 limiter (currently only asserted via code review + local manual repro), add a dedicated Jest file that keeps defaults and does exactly 6 logins.

---

## Nothing outstanding for P2 blocking

All P2 work (Attendance / HS Reports / Time Sheet / etc.) is unblocked. The above items are safe to defer past P2.
