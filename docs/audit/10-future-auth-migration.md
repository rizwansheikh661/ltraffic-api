# 10 — Future Authentication Migration Plan (documentation only)

> **Status:** DOCUMENTATION ONLY. Nothing in this document is scheduled
> for implementation. It exists so that when the PHP web application is
> eventually upgraded, replaced, or retired, the team has a pre-agreed,
> zero-downtime path to move both audiences off MD5.
>
> **Ground rule during Phase 1:** `login_users.password` (MD5) is the
> canonical password. `lt_user_credentials.bcrypt_hash` is a derived
> performance cache. Nothing in this document changes that.

---

## 1. Where we are today (T0)

- **Canonical store:** `login_users.password` — 32-char lowercase MD5.
- **Setting:** `login_settings.pw-encryption = 'MD5'` (drives PHP's
  `hashPassword()` / `validatePassword()` in
  `employeesarea-php/classes/generic.class.php`).
- **Derived cache:** `lt_user_credentials.bcrypt_hash` with
  `md5_snapshot` — used only by the Node mobile API to skip MD5 on
  repeat logins.
- **Writers to `login_users.password`:** PHP forgot-reset, PHP profile
  password change, PHP admin add-user, Node mobile change-password,
  Node mobile reset-password. All write MD5.
- **Readers:** PHP `validate()` and everything that calls it; Node auth
  flow (as the fallback / cache-refresh source of truth).

The MD5 store is the *single* logical truth. Bcrypt is a shadow that
self-heals from MD5 on any mismatch.

---

## 2. Why we cannot flip the switch today

- `login_settings.pw-encryption` is read by *every* PHP page that
  authenticates or changes a password. Changing it to `'BCRYPT'` while
  the DB still contains MD5 hashes locks every existing user out of the
  PHP portal (because `password_verify($plaintext, $md5Hash)` returns
  false).
- PHP's `hashPassword()` produces exactly one format at a time — there
  is no per-row algorithm marker on `login_users.password`, so PHP
  cannot mix MD5 and bcrypt hashes in the same column.
- The PHP portal is the production system with hundreds of active
  users. Any change that requires them to reset their password on the
  next login is unacceptable.

Therefore any migration must (a) upgrade both apps in lockstep, or
(b) make PHP algorithm-agnostic first.

---

## 3. Target end-state (T∞)

- `login_users.password` holds a modern hash (`$2b$…` bcrypt cost 12,
  or `$argon2id$…`). Format is self-describing (prefix identifies the
  algorithm) so both apps can verify without a global setting.
- `login_settings.pw-encryption` is either removed or repurposed as a
  *default-for-new-hashes* hint only.
- `lt_user_credentials` is dropped (no longer needed — the canonical
  column is already strong).
- No user experiences a forced reset; no user is locked out.

---

## 4. Two viable migration paths

Both paths reach the same T∞. Path A is cheaper if PHP stays; Path B is
cleaner if PHP is being replaced.

### Path A — Dual-format PHP (recommended if PHP keeps running)

Prerequisite: a **small, targeted PHP patch** that makes
`validatePassword()` and `hashPassword()` format-aware.

1. **Patch PHP `generic.class.php`.**
   ```php
   public static function validatePassword($password, $correctHash) {
       if (str_starts_with($correctHash, '$2y$') || str_starts_with($correctHash, '$2b$')) {
           return password_verify($password, $correctHash);
       }
       if (str_starts_with($correctHash, '$argon2')) {
           return password_verify($password, $correctHash);
       }
       if (strlen($correctHash) === 32 && ctype_xdigit($correctHash)) {
           return md5($password) === $correctHash;
       }
       return false;
   }
   public static function hashPassword($password) {
       // always emit the modern format going forward
       return password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);
   }
   ```
   PHP now accepts *any* stored format on read and always writes the
   modern format on new writes.
2. **Deploy PHP patch.** Zero user impact — every existing MD5 still
   verifies via the MD5 branch.
3. **Flip Node's write path.** Node's change-password / reset-password
   now writes the modern hash into `login_users.password` directly.
   The `lt_user_credentials` cache-refresh path also promotes to
   modern format on any successful MD5 verify.
4. **Lazy rehash on read.** Both PHP and Node, on successful MD5 verify,
   opportunistically UPDATE `login_users.password` with a fresh
   bcrypt/argon2 hash of the plaintext they just verified (they have
   the plaintext at that moment). No user action needed.
5. **Progress metric.** A cheap SQL check gives the migration curve:
   ```sql
   SELECT
     SUM(LENGTH(password)=32 AND password REGEXP '^[a-f0-9]{32}$') AS legacy_md5,
     SUM(password LIKE '$2%' OR password LIKE '$argon2%')          AS modern,
     COUNT(*)                                                       AS total
   FROM login_users;
   ```
6. **Bulk sweep for inactive users.** When the modern-hash count
   plateaus (users who haven't logged in), pick one:
   - Force-reset the tail via the existing forgot-password flow
     (email link → PHP writes modern hash on completion).
   - Or leave the tail on MD5 indefinitely — the dual-format layer
     costs nothing.
7. **Retire `lt_user_credentials`.** Once modern hashes dominate,
   Node reads the canonical column directly. Drop the sidecar table
   and its module.
8. **Optional final cleanup.** Remove the MD5 branch from
   `validatePassword` after the sweep. Retire the `pw-encryption`
   setting.

Downtime: **zero.** User-visible changes: **none.**

### Path B — PHP is being replaced (recommended if PHP is going away)

If a PHP → Node rewrite is the plan, migration collapses into the
cutover itself:

1. Freeze PHP writes to `login_users.password` (announce a maintenance
   window measured in minutes, not hours).
2. In one transaction, for every user with a `lt_user_credentials`
   row, copy `bcrypt_hash` → `login_users.password` and delete the
   sidecar row. Users without a sidecar row (haven't used the mobile
   app) stay on MD5.
3. Point traffic at Node. Node's login flow already accepts both
   formats (MD5 fallback path) — remaining MD5 users transparently
   upgrade to bcrypt on their next login via the sidecar-refresh path
   the mobile API has been running for months.
4. When the bcrypt share reaches ~100%, drop the MD5 fallback branch
   from Node.

Downtime: single-digit minutes for the cutover. User-visible changes:
none.

---

## 5. Cross-cutting concerns

- **Bcrypt cost.** Start at 12 (~250ms on current hardware). Re-benchmark
  at each server refresh. `BCRYPT_COST` already exists in `.env`.
- **Argon2 option.** If PHP ≥ 7.3 (which supports Argon2id via
  `password_hash($p, PASSWORD_ARGON2ID)`), we can skip bcrypt entirely
  and go straight to Argon2id. Recommended if the hosting stack allows
  it — memory-hard hashing is materially stronger than bcrypt.
- **Password length ceiling.** Enforce 8-72 char range on write in
  both apps (bcrypt truncates at 72 bytes). Argon2id has no such limit
  but keep the 72 ceiling for consistency.
- **Peppering.** Optional server-side pepper (env-injected, HMAC-SHA256
  of the plaintext before hashing). Decision deferred; simpler to leave
  out unless a specific threat model demands it.
- **Rate limiting.** Independent of hash migration — the
  `AUTH_RATE_LIMIT_*` values already in `.env` protect both formats
  equally.
- **Recovery.** During Path A steps 3-6, keep `lt_user_credentials`
  intact as a rollback safety net: if a bulk operation corrupts
  `login_users.password`, we can restore the MD5 baseline for every
  cached row from `md5_snapshot`.

---

## 6. What triggers this plan

Any one of the following should prompt re-opening this document and
picking Path A or Path B:

- The PHP web application is scheduled for upgrade to PHP 8.x+.
- A compliance requirement (PCI-DSS, ISO 27001) mandates removal of
  MD5.
- The PHP application is scheduled for replacement or decommission.
- A credential breach or plaintext leak requires forced rotation.
- Bcrypt/Argon2 becomes the default in `login_settings.pw-encryption`
  for any reason.

Until one of those happens, we run in the dual-store steady state
described in `08-pre-p1-report.md` and `09-pre-p1-addendum.md`.

---

## 7. Explicit non-goals of this document

- No code is written today.
- No PHP file is patched today.
- No `login_settings` value is changed today.
- No plan step is scheduled — the "when" is deliberately open.
- `lt_user_credentials` remains a cache with `login_users.password` as
  the single logical source of truth, exactly as approved in the
  addendum.
