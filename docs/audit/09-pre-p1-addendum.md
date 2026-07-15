# 09 — Pre-P1 Report Addendum (revisions after review)

Applies changes requested against `08-pre-p1-report.md`. On approval of
this addendum, P1 implementation starts.

---

## A. `lt_user_credentials` — full synchronization strategy

### A.1 Restated design (the sidecar is a cache, MD5 is the truth)

To keep PHP and Node authenticating against **one logical source of truth**,
we treat `login_users.password` (MD5) as the canonical credential and
`lt_user_credentials` purely as a **self-invalidating bcrypt cache** for
mobile logins. If the cache disagrees with the truth, the cache is
discarded and rebuilt.

### A.2 Table shape (revised — adds `md5_snapshot`)

```sql
CREATE TABLE lt_user_credentials (
  user_id       INT UNSIGNED PRIMARY KEY,
  bcrypt_hash   VARCHAR(255) NOT NULL,   -- $2b$... written by Node
  md5_snapshot  CHAR(32)     NOT NULL,   -- copy of login_users.password at the moment we hashed
  updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_ltuc_user FOREIGN KEY (user_id) REFERENCES login_users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

The `md5_snapshot` column is the linchpin — it lets the login flow detect
that PHP silently changed the password behind our back.

### A.3 Login verification flow (with self-healing)

```
Input: (usernameOrEmail, plaintext)

1. row      = SELECT user_id, password FROM login_users WHERE username|email = ?
2. currentMd5 = row.password                     -- the SoT
3. sidecar  = SELECT * FROM lt_user_credentials WHERE user_id = row.user_id

4. IF sidecar EXISTS AND sidecar.md5_snapshot == currentMd5:
       // cache is fresh — bcrypt path
       IF bcrypt.compare(plaintext, sidecar.bcrypt_hash) → 200
       ELSE → 401

5. ELSE:
       // cache is stale (PHP changed it) OR never seeded
       IF NOT isMd5Format(currentMd5) → 401             // e.g. user 94 'N/a' — blocked
       IF md5(plaintext) == currentMd5:
           // verified against source of truth
           UPSERT lt_user_credentials
             SET bcrypt_hash = bcrypt(plaintext), md5_snapshot = currentMd5
           → 200
       ELSE → 401
```

Consequence: **MD5 is always the referee.** Bcrypt is only trusted while
its snapshot matches what PHP currently has in `login_users.password`.

### A.4 Sync matrix (every write path covered)

| Event                                          | Who writes `login_users.password` | Who updates `lt_user_credentials` | How Node stays in sync                          |
|------------------------------------------------|-----------------------------------|-----------------------------------|-------------------------------------------------|
| **PHP user changes password** (`profile.class.php`) | PHP writes new MD5                | Nothing                           | Next mobile login: `md5_snapshot` mismatch → sidecar auto-rebuilt from the new MD5 |
| **PHP user resets via forgot** (`forgot.class.php`) | PHP writes new MD5                | Nothing                           | Same self-heal on next mobile login             |
| **PHP admin creates user** (`add_user.class.php`)   | PHP writes MD5 of temp password   | Nothing                           | Same self-heal on first mobile login            |
| **Mobile user changes password** (`POST /auth/change-password`) | Node writes new MD5           | Node upserts (`bcrypt_hash`, `md5_snapshot=newMd5`) in same transaction | Sidecar always fresh; PHP sees new MD5 immediately |
| **Mobile user resets via forgot** (`POST /auth/reset-password` via `login_confirm`) | Node writes new MD5     | Node upserts sidecar in same transaction | Both apps read same MD5; sidecar fresh          |
| **DBA hand-edits the row**                     | DBA                               | Nothing                           | Same self-heal on next mobile login             |

All Node writes to `login_users.password` and `lt_user_credentials`
happen inside a single MySQL transaction so the two can never diverge
mid-flight.

### A.5 Confirming "one logical source of truth"

- **The truth is `login_users.password`.** Both PHP and Node read from
  it. Both PHP and Node write to it. Format stays MD5, matching
  `login_settings.pw-encryption`.
- `lt_user_credentials` is a **derived cache** — deleting the whole
  table would only cause every mobile user to re-verify by MD5 on next
  login and immediately re-populate. No user is locked out, no password
  is lost.
- PHP is never asked to know about `lt_user_credentials`. The sidecar
  is invisible to PHP.

### A.6 Explicit change vs original report

- Node **does** write to `login_users.password` when the mobile user
  changes or resets their password (previously the report said "never
  writes"). It writes **MD5** in exactly the same format PHP writes, so
  PHP is unaffected. Read-only for `login_users.password` is not
  sustainable — it would leave mobile users unable to change their own
  password.
- `login_settings.pw-encryption` is still never touched by Node.

☐ **Please approve the revised `lt_user_credentials` design (A.2) and the
Node write to `login_users.password` for mobile-initiated password
changes (A.6).**

---

## B. JWT lifetimes

Reduced to enterprise defaults.

| Token          | Old        | New                                    | Env var                |
|----------------|------------|----------------------------------------|------------------------|
| Access         | 12h        | **15 min** (default)                   | `JWT_ACCESS_EXPIRES=15m` |
| Refresh        | 30d        | **60 days** (default; configurable 30–90) | `JWT_REFRESH_EXPIRES=60d` |

- `JWT_ACCESS_EXPIRES` accepts any [ms-style duration](https://github.com/vercel/ms)
  string; 15m is the default, admins can widen to 30m without a code
  change if the mobile team hits UX friction during pilot.
- Refresh remains rotating: every `/auth/refresh` call issues a new
  refresh token and revokes the presented one.
- Both `.env` and `.env.example` will be updated to `15m` / `60d`.

☐ **Approve `JWT_ACCESS_EXPIRES=15m`, `JWT_REFRESH_EXPIRES=60d`, both
env-tunable.**

---

## C. Upload filename generation — exact PHP parity

The Phase-1 rule is now: **byte-for-byte parity with PHP.**

- Filename pattern for standard endpoints: `rand(1000, 1000000) + originalName`
  (lowercased), matching `move_uploaded_file` calls across
  `admin/ajaxupload*.php`, `insp*upload.php`, `ra*upload.php`,
  `wra*upload.php`, `vic*upload.php`, `virupload.php`, `vrrupload.php`,
  `insertwr.php`, `insertwah.php`, `insertug.php`, `insertmewp.php`,
  `insertct.php`, `insertcheck.php`, `wildanetupload.php`,
  `wajaxupload.php`, `psupload.php`.
- Filename pattern for `uniqid()` endpoints (`insert2.php`, employee
  `ajaxupload*.php`): `uniqid()` + original extension — same as PHP.
- Multi-image endpoints (`insp1..8`, `winsp1..8`, `ra1..9`, `wra1..9`,
  `vic1..7`): Node joins with `, ` (comma + space) into the single
  target column exactly as PHP does with `implode(', ', $img_Arr)`.
- Node **does not** append timestamps, request IDs, or any prefix that
  PHP does not use.
- Concurrent-write risk (the reason we originally proposed `_stamp_`) is
  accepted for Phase 1. If a collision is ever observed in production we
  will raise it as a separate change with evidence, not silently.
- Path-traversal guard on the `subpath` parameter stays in place — that
  is a Node-side security control, not a PHP-behavior change.

☐ **Approve exact-PHP filename generation for Phase 1.**

---

## D. Mobile-side upload fixes — deferred

Both proposed deltas are withdrawn from Phase 1:

- Gateway endpoint: **no** random prefix added by Node. Node writes to
  `gatewaycheck/` using `basename($_FILES['image']['name'])` behavior,
  identical to `gatewayupload.php`.
- TFL endpoint: Node writes to `civilsupload/`, identical to
  `tflimages.php`. No new `tfl/` folder in Phase 1.

If we later choose to fix either bug it will be a separate, explicitly
scoped migration after Web + Mobile are proven fully compatible.

☐ **Approve deferring both mobile-side upload fixes.**

---

## E. Nothing else changes

All other items in `08-pre-p1-report.md` (single `/auth/login`, shared
DB, shared business tables, shared uploads root, JWT + rotating refresh,
device registration, notification tables, audit logging, role
resolution using PHP names + level IDs, business logic reuse without
redesign, five other new `lt_*` tables) remain as previously approved.

---

## F. What still needs your ☐ before P1 starts

1. ☐ Revised `lt_user_credentials` design with `md5_snapshot` self-heal
   (§A.2, §A.3)
2. ☐ Node writes MD5 to `login_users.password` on mobile password change
   / reset only (§A.6)
3. ☐ `JWT_ACCESS_EXPIRES=15m`, `JWT_REFRESH_EXPIRES=60d`, both
   env-tunable (§B)
4. ☐ Exact-PHP filename generation for Phase 1 (§C)
5. ☐ Defer gateway + TFL mobile-side fixes (§D)

On approval of all five, P1 begins with:
`auth.login → auth.refresh → auth.logout → auth.me → auth.change-password
→ auth.forgot-password → auth.reset-password → devices.register/unregister`.
