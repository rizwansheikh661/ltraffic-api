# 16 — Production Readiness Checklist

**Verdict for P1 (Auth + Devices):** ✅ **GO**
**Date:** 2026-07-11
**Companion documents:** [12 — Security](12-security-review-report.md), [13 — Performance](13-performance-review-report.md), [14 — Tests](14-test-report.md), [15 — Tech Debt](15-tech-debt.md).

---

## Go / no-go matrix

| Dimension              | Status | Evidence |
|------------------------|--------|----------|
| **Security**           | ✅ Go  | All approved Critical/High findings fixed. Deferrals tracked in `15-tech-debt.md`. |
| **Performance**        | ✅ Go  | Every hot query at `const` or `ref`. SEC-04 timing delta 4 ms. Migration is idempotent. |
| **PHP parity**         | ✅ Go  | 6/6 cross-system tests pass. `login_users.password` stays canonical MD5 through every Node write path. Sidecar self-heals on divergence. |
| **API contract**       | ✅ Go  | No breaking changes. `openapi.json` diff limited to added component schemas (SWAG-01/02/03) and copy fixes. |
| **Tests**              | ✅ Go  | 70/70 Jest + 20/20 E2E. Coverage is scenario-driven (see `14-…`). |
| **Operational**        | ✅ Go  | Rate limits per-account and per-user. Winston with PII redaction. Health endpoint exposes DB status. Graceful shutdown wired. |
| **Runbook / rollback** | ⚠️ Follow-up | Migration is additive-only (safe to leave in place on rollback). No runbook for cache-rebuild flag yet — see below. |

---

## Pre-deploy checklist

Run through this in order the day of the deploy.

### 1. Environment
- [ ] `.env.production` has non-empty `CORS_ORIGINS` (SEC-01 fail-closed guard will refuse to boot otherwise).
- [ ] `JWT_SECRET` is set and ≥ 32 bytes of entropy.
- [ ] `JWT_ACCESS_EXPIRES` and `JWT_REFRESH_EXPIRES` are set (defaults are safe but should be explicit in prod).
- [ ] `DB_*` variables point to the correct MariaDB instance.
- [ ] `RATE_LIMIT_MAX` / `AUTH_RATE_LIMIT_MAX` are at production values (defaults: 300 / 10 per 15 min).
- [ ] `NODE_ENV=production`.

### 2. Database migrations
Both are idempotent — safe to apply more than once.
- [ ] Apply `scripts/schema/007-auth-hardening.sql` (adds `ix_email`, `ix_key_type`, `ix_user_ts`, `ix_expires`; drops redundant `user_id` index on `login_users`).
- [ ] Verify PHP 2FA columns exist on prod. If missing (they shouldn't be — PHP `upgrade_410` adds them), apply `scripts/schema/008-php-2fa-columns.sql`.

### 3. Boot + smoke
- [ ] `npm ci` — clean install.
- [ ] `node src/server.js` — must log `[levels] cached N rows` and `[server] listening on ...` without errors.
- [ ] `GET /api/v1/health` — expect `{"success":true,"data":{"status":"ok","dependencies":{"db":{"ok":true}}}}`.
- [ ] `POST /api/v1/auth/login` with a known good account — expect 200 + tokens.
- [ ] `GET /api/v1/auth/me` with the returned bearer — expect 200 with the correct `userType`.
- [ ] `POST /api/v1/auth/login` with a **wrong** password twice, capture round-trip time. Compare against a login for an **unknown** email. Expect delta < ~200 ms (SEC-04).
- [ ] `GET /api/v1/openapi.json` — expect ≥ 10 paths and all Auth + Device schemas present.

### 4. Post-deploy monitoring (first 24 h)
- [ ] Watch application logs for `[app]`, `[auth]`, `[levels]` warnings.
- [ ] Watch for rate-limit `429`s from real users — indicates the per-account limit needs tuning.
- [ ] Watch DB for `lt_user_credentials` growth — steady increase means the sidecar is populating; sudden zero means the self-heal path is broken.

---

## Rollback

The migration is **additive** (`ADD INDEX`, `ADD COLUMN NULL`, one `DROP INDEX` that was redundant with `PRIMARY`). The old Node code will keep working against the migrated schema. Rollback is therefore purely a code redeploy:

```bash
git checkout <previous-tag>
npm ci
pm2 restart ltraffic-api   # or your process supervisor of choice
```

No schema rollback required. The dropped `login_users.user_id` index was redundant with `PRIMARY` — dropping it does not change plans for any query.

---

## Known non-blockers (see `15-tech-debt.md`)

- SEC-06 reset key TTL (PHP-parity: deferred to joint migration).
- SEC-09 shared rate-limit store (single-instance today).
- SEC-11 refresh-token reuse detection (P3).
- Forgot-password email delivery (still lives in PHP; mobile uses PHP-hosted reset link).
- Sidecar bulk backfill (lazy path is correct; batch backfill is opportunistic).

None of these gate P1 shipping.

---

## Sign-off

- **Auth module:** ready for production traffic.
- **Devices module:** ready for production traffic.
- **P2 unblocked:** business modules (Attendance / HS Reports / Time Sheet) can begin against the current codebase.
