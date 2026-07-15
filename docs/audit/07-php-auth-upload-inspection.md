# 07 — PHP Auth & Upload Inspection

Source-code-level inspection of the LTraffic PHP web app (employee portal at
`C:\rizwan\LTraffic\employeesarea-php\` and admin portal at
`C:\rizwan\LTraffic\admin\`) to inform mobile-API compatibility decisions.
Every claim below quotes actual code paths.

---

## 1. Executive summary

- Both portals share one login table (`login_users`) and one login flow. `admin/login.php` and `admin/logout.php` are one-line redirects to the employee-portal endpoints (`C:\rizwan\LTraffic\admin\login.php:1`, `C:\rizwan\LTraffic\admin\logout.php:1`).
- Authentication is classic PHP session (`$_SESSION['jigowatt']`) set in `employeesarea-php/classes/login.class.php`. There is **no** JWT, refresh token, device token, or audit log table anywhere in the codebase.
- Passwords are stored per the `login_settings.pw-encryption` value, which is `'MD5'` in the shipped DB (`mysql/lt_employee.sql:3031`). Every non-empty real password in the dump is a 32-char MD5 hex; there is a single unused `accounts` row with a bcrypt hash but that table is not read by the two portals.
- `user_level` is a **PHP-serialized array of level IDs** (e.g. `a:1:{i:0;s:1:"1";}`). Level IDs come from `login_levels`; page gates use human-readable level NAMES (`protect("Admin, Admin1")`).
- Uploads are handled by ~40 different PHP endpoints. All use `move_uploaded_file` with either `rand(1000,1000000).$originalName` or `uniqid()` naming, dropped into per-form folders directly under the PHP web root. DB stores either the full sub-path or just the filename, depending on the endpoint. No signed URLs, no ACL — files are served as static assets by Apache.
- Mobile-facing infrastructure is therefore effectively absent; the Node API must synthesize JWT + refresh + device tokens on top of the same MD5 passwords, and must standardize a single upload store.

---

## 2. Authentication mechanics

### 2.1 Session shape

Set in `C:\rizwan\LTraffic\employeesarea-php\classes\login.class.php` `login()` (~line 352):

```php
$user_level = unserialize($this->result['user_level']);
$_SESSION['jigowatt'] = array(
    'user_level'      => $user_level,
    'email'           => $this->result['email'],
    'gravatar'        => md5(strtolower(trim($this->result['email']))),
    'username'        => $this->result['username'],
    'user_id'         => $this->result['user_id'],
    'restricted'      => $this->result['restricted'],
    'level_disabled'  => $this->result['level_disabled'],
    'activate'        => $this->result['activate'],
    'referer'         => ...,
    'token'           => md5(uniqid(rand(), true)),
    'forcePwUpdate'   => ...
);
```

There is no expiry stamp in the session payload; PHP's own session GC is the only timeout.

### 2.2 Login flow

- `validate()` in `login.class.php:293` runs:
  ```
  SELECT * FROM login_users WHERE {$username} = :username
  ```
  where `{$username}` is either `username` or `email` depending on `parent::isEmail($_POST['username'])`.
- Password check delegates to `Generic::validatePassword` (see 6.1). MD5 comparison via `md5($password) === $correctHash`.
- Optional Twilio 2FA path (`sms_time`, `tmp_auth_token` columns on `login_users`) is config-gated and unused in the shipped settings.
- Account state checks: `activate`, `level_disabled`, `restricted` are read but only `activate == 0` blocks login; `restricted`/`level_disabled` are surfaced to the UI later.

### 2.3 Password reset / email change

- `employeesarea-php/classes/forgot.class.php` writes a row into `login_confirm` with `type = 'forgot_pw'` and a 32-char `md5(uniqid())` key. Consumption runs (line 105):
  ```
  UPDATE login_users SET password = :password, tmp_auth_token = NULL, sms_time = NULL WHERE email = :email
  ```
  where `:password` is `hashPassword($new)` (so MD5 hex under current settings).
- `employeesarea-php/classes/profile.class.php` uses the same `login_confirm` table with `type='update_emailPw'`, storing the pre-hashed new password in the `data` column until the user clicks the confirmation link.

### 2.4 Admin login

`C:\rizwan\LTraffic\admin\login.php:1`:
```php
<?php header('Location: ../login.php?e=1'); exit(); ?>
```
`C:\rizwan\LTraffic\admin\logout.php:1`:
```php
<?php header('Location: ../logout.php'); exit(); ?>
```
So the admin portal has no separate auth surface — the mobile API only needs one login endpoint to cover both audiences.

### 2.5 Admin user creation

`C:\rizwan\LTraffic\admin\classes\add_user.class.php:48` generates the initial password as:
```php
$this->password = substr(md5(rand().rand()), 0, 6);
```
Then stores it hashed via `parent::hashPassword($this->password)` (line 146) and emails the plaintext. The record is inserted with a hard-coded default level from `getOption('default-level')` (line 142).

---

## 3. Level → role/permission resolution

### 3.1 `login_levels` rows (from `mysql\lt_employee.sql:2956-2965`)

| id | level_name              |
|----|-------------------------|
| 1  | Admin                   |
| 2  | Driving Operatives      |
| 3  | Operatives              |
| 4  | Admin1                  |
| 5  | Civils TFL Driver       |
| 6  | Civils Trailer Driver   |
| 7  | Admin2                  |
| 8  | Essex Supervisor        |
| 9  | Customer                |

### 3.2 How pages gate access

`employeesarea-php/classes/check.class.php` — `protectPage()` (~lines 115-142) and `protectThis()` (~lines 150-181) both resolve a **comma-separated string of names** to IDs at runtime:

```
SELECT level_name, id FROM login_levels
 WHERE level_name IN (...) OR id IN (...)
```

Every page in both portals uses names, never numeric IDs. Grepped examples:
- `admin/index.php:8`  → `protect("Admin");`
- `admin/passwordchange.php:6` → `protect("Admin, Admin1");`
- Employee pages commonly use `protect("Admin, Admin1, Admin2, Essex Supervisor")` or similar strings.

### 3.3 `user_level` column

`login_users.user_level` is `longtext` holding a **PHP-serialized array of stringified level IDs**, e.g. `a:1:{i:0;s:1:"1";}` for a single-level user. It is unserialized in `login.class.php` at login time and matched against page allow-lists via `array_intersect`.

### 3.4 Implication for the Node API

The mobile API must:
1. Read the serialized column and map IDs → canonical role names.
2. Expose those names as JWT claims (e.g. `roles: ["Admin", "Admin1"]`).
3. Provide a role/permission helper that accepts the same name list PHP uses so gates translate 1:1.

---

## 4. Exhaustive upload inventory

Pattern used by almost every endpoint:

```php
$path = 'folder/';
$final_image = rand(1000,1000000).$img;               // or uniqid().$ext
move_uploaded_file($_FILES['image']['tmp_name'][$i], $path.strtolower($final_image));
// DB row stores $path.$final_image (or just $final_image) in `file_name`/`image`/`upload`
```

### 4.1 Admin portal AJAX uploaders (`admin\ajaxupload*.php`)

| Endpoint          | Folder            | Table            | Column     | Extra cols                 |
|-------------------|-------------------|------------------|-----------|----------------------------|
| `ajaxupload.php`  | `hsupload/`       | `upload_hs`      | file_name | —                          |
| `ajaxupload1.php` | `vehicleupload/`  | `upload_vehicle` | file_name | —                          |
| `ajaxupload2.php` | `hrfiles/`        | `upload_hr`      | file_name | doctype, docdesc           |
| `ajaxupload3.php` | `vrfiles/`        | `upload_vr`      | file_name | —                          |
| `ajaxupload4.php` | `erfiles/`        | `upload_er`      | file_name | —                          |
| `ajaxupload5.php` | `prfiles/`        | `upload_pr`      | file_name | —                          |

### 4.2 Employee portal AJAX uploaders (`employeesarea-php\ajaxupload*.php`)

| Endpoint          | Folder         | Table                |
|-------------------|----------------|----------------------|
| `ajaxupload.php`  | `uploads/`     | `upload_data`        |
| `ajaxupload1.php` | `tfl/`         | `upload_tfl`         |
| `ajaxupload2.php` | `presite/`     | `upload_presite`     |
| `ajaxupload3.php` | `maintenance/` | `upload_maintenance` |

### 4.3 Multi-file form uploaders (`employeesarea-php\insert*.php`, `*upload.php`)

Loop over `$_FILES['image']` array; final field `image` on the target table gets `implode(', ', $img_Arr)`.

| Endpoint(s)                                        | Folder(s)                          | Table            |
|----------------------------------------------------|------------------------------------|------------------|
| `insert1.php`                                      | `../admin/hsupload/`               | (H&S incident — cross-portal write) |
| `insertwr.php`                                     | `wr/`                              | `workrecord`     |
| `insertwah.php`                                    | `wah/`                             | `wah`            |
| `insertug.php`                                     | `ug/`                              | `ug`             |
| `insertmewp.php`                                   | `mewp/`                            | `mewp`           |
| `insertct.php`                                     | `clegg/`                           | (clegg table)    |
| `insertcheck.php`                                  | `equipmentcheck/`                  | `equipmentcheck` |
| `insp1upload.php` … `insp8upload.php`              | `insp1/` … `insp8/`                | `insp` (INSERT step 1, UPDATE image1..image7 for 2-8) |
| `winsp1upload.php` … `winsp8upload.php`            | `winsp1/` … `winsp8/`              | `winsp` (same shape as insp) |
| `ra1upload.php` … `ra9upload.php`                  | `ra/`, `ra1/` … `ra4/`             | `ra`  (INSERT + UPDATEs)     |
| `wra1upload.php` … `wra9upload.php`                | `wra/`, `wra1/` … `wra4/`          | `wra` (INSERT + UPDATEs)     |
| `vic1upload.php` … `vic7upload.php`                | `vic1/` … `vic4/`                  | `vic`            |
| `virupload.php`                                    | `vir/`                             | `vir`            |
| `vrrupload.php`                                    | `vrr/`                             | `vrr`            |
| `wildanetupload.php`                               | `jobpacks/`                        | `wildanet`       |
| `wajaxupload.php`                                  | `wildanet/`                        | —                |
| `psupload.php`                                     | `presite/`                         | —                |

### 4.4 Other / atypical

- `gatewayupload.php` → `gatewaycheck/` → `gateway`. Uses `basename($_FILES['image']['name'])` with no random prefix (collision-prone).
- `civilsimages.php` → `civilsupload/`, `UPDATE civils SET upload=basename(...)` using legacy `mysql_*` functions.
- `tflimages.php` → `civilsupload/`, `UPDATE tfl SET upload=basename(...)` (same bug — reuses `civilsupload/` instead of a `tfl/` folder).
- `insert2.php` → `presite/` with `uniqid()` filename → `presite.image`.
- Profile avatar: `admin\classes\profile.class.php:89` → `assets/uploads/avatar/`, filename `md5($user_id . $email).ext`.

### 4.5 Cross-portal write

`employeesarea-php\insert1.php` writes into `../admin/hsupload/`. Any Node re-implementation must preserve one shared filesystem root; two independent per-service buckets would break the H&S report flow.

---

## 5. File retrieval convention

- **All files are served as static assets by Apache directly from their upload folder.** There is no PHP file-serving proxy or auth check on downloads.
- Display code across the portals uses raw `<img>` / `<a>` tags with the stored path, e.g. `<img src='hsupload/12345image.jpg'>`.
- Consequences:
  - Anyone with the URL can fetch the file — no per-user ACL.
  - Filename randomization (`rand(1000,1000000)`) is the only obscurity layer.
  - No thumbnail generation, no signed URL, no expiring token, no MIME sniffing.
- For the mobile API this means the *current* file store is publicly reachable at `https://<host>/<folder>/<filename>` and the mobile client can keep loading images that way *until* we choose to lock it down.

---

## 6. Mobile-adjacent infra audit

| Concern                 | Present? | Evidence |
|-------------------------|----------|----------|
| Device tokens (push)    | No       | No column on `login_users`; no table matching `device_*` / `push_*` in `lt_employee.sql`. |
| Refresh tokens          | No       | `login_users` has `tmp_auth_token` used only for SMS OTP. No `refresh_tokens` table. |
| API keys / JWT secrets  | No       | No `jwt`, `api_key`, `access_token` references in either portal. |
| Audit log               | No       | Only `login_timestamps` (last-login stamp, single column). No CRUD audit table. |
| Rate limiting           | No       | No throttle logic in `login.class.php`; failed attempts merely re-render the form. |
| MFA                     | Optional | Twilio SMS path in `login.class.php` guarded by `sms-enable` option; disabled in shipped DB. |
| CSRF token              | Per session | `$_SESSION['jigowatt']['token']` (used on forms only). |
| Session revocation      | No       | No server-side token blacklist; PHP session ID rotation only. |

**Verdict:** the mobile API layer starts from zero for JWT, refresh, and push. There is nothing in the current schema to migrate.

---

## 7. Password format audit

### 7.1 Setting-driven dispatch

`employeesarea-php\classes\generic.class.php` — `hashPassword()` (~lines 546-570) reads `login_settings.pw-encryption`:

```php
switch ( strtoupper( self::getOption('pw-encryption') ) ) {
    case 'MD5':    return md5($password);
    case 'SHA256': return hash('sha256', $password);
    case 'BCRYPT': return password_hash($password, PASSWORD_BCRYPT, ...);
}
```

`validatePassword()` (~lines 581-606):

```php
case 'MD5':
    if ( strlen( $correctHash ) == 32 ) $valid = ( md5( $password ) === $correctHash );
    break;
case 'BCRYPT':
    $valid = password_verify( $password, $correctHash );
    break;
```

### 7.2 Shipped configuration

`mysql\lt_employee.sql:3031`:
- `pw-encryption` = `'MD5'`
- `pw-encrypt-force-enable` = `'0'`

### 7.3 Actual data

Sampling `login_users` in the SQL dump (line 14131 onward):
- **All real user passwords are 32-char lowercase hex** — MD5 hashes.
- User 60 has `d41d8cd98f00b204e9800998ecf8427e` (md5 of the empty string).
- User 94 has plaintext `'N/a'` (broken row — cannot log in).
- One BCRYPT hash exists in the `accounts` table (line 56-68): `$2y$10$SfhYIDtn.iOuCW7zfoFLuuZHX6lja4lF4XA4JqNmpiH/.P3zB8JCa`. **That table is not read by either portal** — grepping `employeesarea-php\` and `admin\` for `FROM accounts` / `FROM \`accounts\`` returns zero hits. The only consumer is the nested `employeesarea-php\timesheet\` sub-app, which anyway uses its own `admin` and `users` tables (both MD5).

### 7.4 Mobile-API implications

- The Node auth must accept the raw MD5 for existing users.
- Lazy rehash on successful login (as decided in `MEMORY.md` → `project_ltraffic_unification.md`) is the correct migration: verify MD5 → on success, write bcrypt back into the same column.
- `validatePassword` already tolerates both formats when `pw-encryption` is left at MD5 because BCRYPT is a distinct case — but we cannot rely on the PHP portal to accept a bcrypt hash unless we also flip `pw-encryption` to `BCRYPT`. Safer path: keep the setting on MD5, have Node detect prefix (`$2y$` → bcrypt, else MD5), and rehash quietly.

---

## 8. Recommendations for the Node mobile API

1. **Single auth endpoint** for both audiences. Emit a JWT with claims `{ userId, username, roles: string[], userType: 'admin'|'employee' }`. Derive `userType` from `Admin`/`Admin1`/`Admin2` membership.
2. **Level resolution** — cache `login_levels` at boot into an `id → name` map. Deserialize `login_users.user_level` server-side (a PHP-serialize parser is a ~30-line helper; alternatively store a canonicalized `roles JSON` shadow column populated on write).
3. **Password strategy** — verify against MD5 first; on success, rehash with bcrypt and UPDATE the row. Do not change the `pw-encryption` setting unless/until PHP is retired, to avoid locking out the PHP portal.
4. **Refresh tokens** — add a new table (`refresh_tokens(user_id, token_hash, device_id, expires_at, revoked_at)`) rather than shoehorning into `login_users.tmp_auth_token` which the SMS 2FA path still uses.
5. **Device tokens** — new table (`device_tokens(user_id, platform, token, last_seen)`); no existing column to migrate.
6. **Audit log** — new table (`audit_events(user_id, action, entity, entity_id, ip, ua, created_at)`); the app currently has none.
7. **Uploads** — standardize on the existing PHP web root as the file store (see MEMORY: `project_ltraffic_uploads.md`). Preserve the per-form folders exactly as listed in section 4 so that PHP screens continue to render the same URLs. Do not invent a Node-owned `uploads/` directory. Filename convention: keep the `rand(...) + originalName` pattern for compatibility with `insp*`/`ra*`/`wra*`/`vic*` UPDATE logic that stores comma-joined lists.
8. **Cross-portal write** — the mobile API's H&S incident endpoint must write into `../admin/hsupload/` (relative to the PHP web root), matching `employeesarea-php\insert1.php`.
9. **Static file serving** — the client can continue fetching `https://<host>/<folder>/<file>` as long as Apache is in front. If we later add auth on downloads, do it via a Node proxy route (e.g. `GET /files/:kind/:name`) that streams from the same folder after checking JWT + row-level ownership.
10. **Legacy quirks to fix while migrating**:
    - `gatewayupload.php` has no random prefix (collision risk) — fix in Node.
    - `tflimages.php` reuses `civilsupload/` — split into `tfl/` in the Node handler.
    - User 94's plaintext `'N/a'` password must be excluded from lazy-rehash logic (treat as forced reset).
11. **No API-key layer needed at MVP** — session-equivalent JWT is enough; add API keys only for a future service-to-service story.
