# 02 — Employee PHP Audit (`employeesarea-php/`)

Codebase: 426 files (approx. 260 PHP scripts at the project root plus subdirectories for uploads, PDFs, per-module classes, the third-party Jigowatt/HybridAuth libraries under `classes/`, and a legacy CKEditor-based mini-app under `timesheet/`).

The application is a monolithic PHP script bundle written on top of a purchased **Jigowatt PHP Login & User Management** package (CodeCanyon item #49008, version 4.1.3, DB schema tag `1706120`). All business modules were bolted on to that auth layer over time. There is no framework, no router, no MVC, no autoloader — each URL is a `.php` file, and most `xxx.php` "pages" contain the HTML view plus its own SQL.

---

## File count by naming pattern

Approximate root-level counts (top-level `*.php` files only, ignoring the 3rd-party libraries under `classes/integration/` and the `pdf/vendor/` autoloader):

| Pattern                          | Count | Notes                                                              |
|----------------------------------|-------|--------------------------------------------------------------------|
| `insp*.php`                      | ~40   | Site inspections 1–8 (view/edit/upload each) + com/delete/home     |
| `winsp*.php`                     | ~34   | Wildanet-project inspection variant of the above                   |
| `ra*.php`, `wra*.php`            | ~50   | Risk Assessments (RA1–RA9) + Wildanet RAs (wra1–wra9)              |
| `vic*.php`, `vehiclecheck*.php`, `vinsp*.php`, `vr*`, `vrr*`, `virupload.php` | ~25 | Vehicle checks, inspections, VR reports          |
| `timesheet*.php`, `admintimesheet*.php` | 7 | Employee + admin timesheets                                        |
| `bulletin*.php`                  | 8     | Bulletins CRUD + read-receipt                                      |
| `civils*.php`                    | 12    | Essex/Gigaclear project                                            |
| `tfl*.php`                       | 15    | Transport-for-London project                                       |
| `wildanet*.php`                  | 13    | Wildanet fibre project                                             |
| `workrecord*.php`, `insertwr.php`, `wr/` | ~13 | Work-record workflow                                         |
| `methodstatements.php`, `policies.php`, `coshh.php`, `sop.php`, `documents.php`, `documentation.php` | 6 | Document lists |
| `maintenance*.php`, `material*.php`, `mewpadd.php`, `mewpdelete.php` | ~16 | Maintenance & material CRUD |
| `presite*.php`, `dailyra*.php`, `siteinsp.php` | ~10 | Site pre-work workflow      |
| `equipmentcheck*.php`, `insertcheck.php` | 5 | Equipment checks                                    |
| `insert*.php` (numbered POST handlers) | 6 | Legacy vehicle-check inserts (`insert.php`, `insert1.php`…`insert5.php`) |
| `ajaxupload*.php`, `psupload.php`, `gatewayupload.php`, `wajaxupload.php` | ~7 | File-upload handlers |
| `pdf/*.php`                      | ~30   | TCPDF renderers for each form type                                 |
| Auth/session (`login.php`, `logout.php`, `activate.php`, `passwordchange.php`, `forgot.php`, `sign_up.php`, `confirmform.php`, `home.php`, `home1.php`, `index.php`, `disabled.php`, `protected.php`) | 12 | Jigowatt-managed |
| DB config (`database.php`, `database1.php`, `dbConfig.php`, `form_db_connect.php`, `config.php`) | 5 | Duplicate credential files |
| `header*.php`, `footer.php`      | 3     | Layout partials                                                    |
| `cleggtesting*.php`, `test.php`, `test1.php`, `php.php`, `editct.php`, `editec.php`, `editwr.php` | ~7 | Dev/test scratch |
| `ugoh*.php`, `ugadd.php`, `ugdelete.php`, `insertug.php` | 5 | Underground/overhead fibre risk assessments |
| `wahadd.php`, `wahdelete.php`, `insertwah.php` | 3 | Working-at-height forms |
| `contact*.php`                   | 3     | Contact directory                                                  |
| `calender.php`                   | 1     | Calendar view (timezone hardcoded to Asia/Tokyo — bug)             |

The `search.php`, `records.php`, `settings.php`, `useradd.php`, `users.php`, `levels.php` filenames suggested in the brief **do not exist** at the root — user/level administration is delegated to the Jigowatt Admin control panel (linked as `admin/` from `header.php`).

---

## Global patterns (apply to all modules)

### Session handling
- Sessions are managed by `classes/generic.class.php` (Jigowatt). `session_start()` is called once inside `Generic::__construct()` when any Jigowatt class is instantiated. All session keys are namespaced under `$_SESSION['jigowatt'][...]`.
- Key session fields set on login (`classes/login.class.php`, lines 307–406): `user_id`, `username`, `email`, `user_level` (unserialize'd array of level IDs), `gravatar`, `activate`, `restricted`, `level_disabled`, `forcePwUpdate`, `token` (CSRF for the login form), `referer`.
- Session cookie lifetime is a config option (`default_session`), extended to ~3 months if "Stay signed in" is checked (`session.cookie_lifetime = 60*60*24*100`).
- Extra bespoke cookie: `ltraffic_limited_cookie` (8h) is set by `insert.php` / `bulletinreadinsert.php` and read by `vehiclecheck.php` — used as a "vehicle check completed today" flag to bypass the vehicle-check gate.

### DB connection — three coexisting patterns
1. **Jigowatt PDO (proper)**: `classes/connect.class.php` opens `PDO("mysql:host=...")` with credentials read from a `config.php` at repo root. Used by every `classes/*.class.php` file. Queries are prepared statements via `parent::query($sql, $params)` in `generic.class.php`.
2. **Per-module `mysqli` singletons**: files like `civilsdbcontroller.php`, `radbcontroller.php`, `bulletindbcontroller.php`, `tfldbcontroller.php`, `contactdbcontroller.php`, `vehiclecheckdbcontroller.php`, `maintenancedbcontroller.php`, `materialdbcontroller.php` all define a `class DBController` with the SAME hard-coded credentials and a single `runQuery($query)` method that concatenates SQL as a string.
3. **Inline `mysqli_connect` / `mysql_connect`**: every `xxxupload.php`, `xxxinsert.php`, `insert.php`, `insertwr.php`, `bulletininsert*.php`, `timesheetupload.php`, `admintimesheetupload.php`, `vic1upload.php`, `ra1upload.php`, `insp1upload.php`, etc. re-declares `$servername = "localhost"; $username = "users1"; $password = "LTraffic2021!#"; $dbname = "lt_employee";` and opens its own connection.

**Credentials are hardcoded and identical everywhere** — MySQL user `users1`, password `LTraffic2021!#`, database `lt_employee`, host `localhost`. `bulletininsert.php` still uses the deprecated `mysql_connect()` PHP-4 API.

### Auth guard (typical top-of-file check)
Almost every page begins with:
```php
include_once('classes/check.class.php');
include_once('header1.php');
protect("Admin, Admin1, Driving Operatives, Civils Trailer Driver, ...");
```
`protect()` instantiates `Check`, which runs `isGuest → isActivated → isRestricted → forcePwUpdate`, then `protectPage($level)` compares the requested level names against `$_SESSION['jigowatt']['user_level']` by joining against the `login_levels` table. `protectThis()` is the boolean variant used in view templates to conditionally show admin links.

**Level catalogue:** 1=Admin, 2=Driving Operatives, 3=Operatives, 4=Admin1, 5=Civils TFL Driver, 6=Civils Trailer Driver, 7=Admin2, 8=Essex Supervisor, 9=Customer, plus a rarely-seen "Maintenance Operative".

Many upload/delete endpoints (`insert.php`, `timesheetupload.php`, `civilsdelete.php`, most `xxxupload.php`) have **no `protect()` call at all**.

### Shared partials
- `header.php`: outer marketing chrome, includes `classes/generic.class.php` (session boot).
- `header1.php`: inner-app chrome, includes `classes/profile.class.php` for `$profile->getField('name')`, `getField('ltrafficid')`, `getField('teamup')`, etc.
- `footer.php`: closing HTML.
- `classes/profile.class.php`: exposes the profile of the currently-logged-in user via `$profile->getField('xxx')` — heavily depended on by every business page to inject the operative's name into `WHERE name='...'` clauses.

---

## Modules

### Auth & Session
**Files:** `login.php`, `logout.php`, `activate.php`, `passwordchange.php`, `forgot.php`, `sign_up.php`, `confirmform.php`, `home.php`, `home1.php`, `index.php`, `disabled.php`, `protected.php`, plus the entire `classes/` library (Jigowatt: `login.class.php`, `check.class.php`, `generic.class.php`, `connect.class.php`, `forgot.class.php`, `profile.class.php`, `signup.class.php`, `upgrade.class.php`, `integration.class.php`, `translate.class.php`, `prereqs.php`).

**Tables:** `login_users`, `login_levels`, `login_confirm` (activation & password-reset keys), `login_integration` (social login mapping), `login_timestamps` (access log), `login_options` (K/V config store — read via `Generic::getOption()`).

**Actions:**
- POST `login.php` — validate credentials, optional two-factor SMS via Twilio.
- GET `activate.php?key=...` — email-link account activation, resend link via `?resend=1`.
- POST `forgot.php` — reset request, sends email with token.
- GET `logout.php` — `session_unset()`/`session_destroy()`, redirect.
- `sign_up.php` — new user with optional captcha/HybridAuth social linking.
- `passwordchange.php`, `profile.php` — change password, edit profile fields, upload avatar (multipart).
- `home.php` — landing page after login; renders the tile menu, gated by `protect(...)` for the full employee level list.

**Auth pattern:** Jigowatt sessions (see Global patterns). CSRF token `$_SESSION['jigowatt']['token']` is generated and validated only for the login form.

**Password handling:** `Generic::hashPassword()` supports MD5, SHA256 (with salt), or BCRYPT depending on the `pw-encryption` option in `login_options`. `validatePassword` accepts all three. Legacy accounts may still be MD5; `forcePwUpdate` flags such users on login and redirects to `profile.php?pe=1`.

**Security concerns:**
- Two-factor auth stores the tmp SMS code as plaintext in `login_users.tmp_auth_token` and echoes previous values back into hidden fields.
- `user_level` in `login_users` is stored as a PHP `serialize()`d array — `unserialize()` on trusted DB data is acceptable but couples PHP to the persistence format.
- `activate.php` line 56 executes `DELETE FROM login_confirm WHERE username = '$username' ...` via string concatenation after fetching the username from the DB — safe here but the pattern is copied unsafely elsewhere.
- `disable-logins-enable` and `block-msg-out-enable` are administrable — the whole app can be turned off from the admin panel.

**Node migration notes:**
- Replace `$_SESSION['jigowatt']['user_id']` + `user_level` with a JWT carrying `sub` (user_id), `userType` (admin|employee), and `roles` (array of level IDs), signed with HS256.
- Replace `protect("Admin, Admin1, ...")` with a role-checking middleware `authorize(...roleIds)`.
- Password validation: lazy rehash MD5→bcrypt on next successful login (per project decision).
- Replace `login_confirm` with a dedicated table `user_tokens (id, user_id, type, token, expires_at)`; `type ∈ {activation, password_reset, sms_2fa}`.
- Log accesses to `login_timestamps` → migrate to a proper `audit_log`.

### Bulletins
**Files:** `bulletin.php`, `bulletin1.php`, `bulletin2.php`, `bulletinmanagement.php`, `bulletininsert.php`, `bulletininsert1.php`, `bulletininsert2.php`, `bulletinreadinsert.php`, `bulletinperpage.php`, `bulletindbcontroller.php`, plus `bulletin/` upload folder.

**Tables:** `bulletin`, `bulletinnew` (staging queue with a `new='1'` flag), `bulletinread` (per-user read receipt: `bulletin, user_id`).

**Actions provided:**
- Admin creates a bulletin (`bulletinmanagement.php` → `bulletininsert.php`).
- On next login every user hits `bulletin.php`, which queries `SELECT * FROM bulletinnew WHERE new='1'` and forces a modal until they click "acknowledge", which posts to `bulletinreadinsert.php` inserting `(bulletin, user_id)`. If no unread bulletins exist, redirects to `vehiclecheck.php`.
- `bulletinperpage.php` — pagination component.

**Auth pattern:** Reading pages call `protect("Admin, Admin1, Admin2, Driving Operatives, Civils Trailer Driver, Civils TFL Driver, Maintenance Operative, Essex Supervisor")`. Insert endpoints (`bulletininsert.php`) have **no auth guard**.

**Security concerns (severe):**
- `bulletininsert.php` uses PHP-4 `mysql_connect()` + `mysql_query()` (removed in PHP 7+).
- SQL built by `INSERT INTO bulletin (arrival_datetime, submittedby, title, ref, confirm) VALUES ('$_POST[arrival_datetime]', ...)` — classic injection.
- After insert, `header('location:vehiclecheck.php')` — no ACL check that the poster had permission to write bulletins.

**Node migration notes:** Model as `Bulletin { id, title, body, publishedAt, publishedBy }` + `BulletinRead { bulletinId, userId, readAt }`. Gate the "must acknowledge before continuing" behaviour with a middleware that queries unread bulletins for the current user.

### Timesheets
**Files:** `timesheets.php`, `timesheetsall.php`, `timesheetsclosed.php`, `timesheetadd.php` (weekly form), `timesheetupload.php` (POST handler), `admintimesheetadd.php`, `admintimesheetssview.php`, `admintimesheetupload.php`, plus `timesheet/` (a separate legacy PHP app with CKEditor + Dashboard/User admin — likely dead).

**Tables:** `timesheet(week, ltrafficid, name, date1..date7, hours1..hours7, location1..location7, activity1..activity7, contract1..contract7, comments, status)`.

**Actions provided:**
- Employee opens `timesheets.php` → seed searches `WHERE name='$profile->name' AND status IN ('Submitted','Rejected')`.
- Click "Add" → `timesheetadd.php` renders 7 day-rows (mon..sun) with fields for hours, location, activity (Civils Installation / Defects / Supervision / Validation / Holiday / Sick), contract (Essex Gigaclear / London TFL).
- Submit → `timesheetupload.php` INSERTs a row with `status='Submitted'`.
- Admin opens `timesheetsall.php` / `admintimesheetssview.php` to review; `admintimesheetadd.php` allows admin to enter on behalf of an employee.

**Auth pattern:** All pages `protect(...)`. `timesheetupload.php` and `admintimesheetupload.php` are **unguarded and identical** (byte-for-byte the same INSERT statement).

**Validation:** None server-side. Activity dropdown is `required` in HTML but nothing prevents empty POSTs.

**SQL patterns:** 100% string-interpolated `$_POST[...]` — every field is injectable.

**Notable business rules:**
- Week Commencing is computed server-side with `strtotime('monday this week')` — **not from user input** — but the client can override the hidden `week` field.
- Status state machine: `Submitted → Approved → Closed` (Approved/Closed pages filter by status; there's a `Rejected` path visible to submitters).

**Node migration notes:** Normalise the 7-day denormalised row into `TimesheetWeek { id, userId, weekCommencing, status, comments }` + `TimesheetDay { weekId, dayIndex, hours, location, activity, contract }`. Compute weekCommencing server-side. Enforce that operatives can only insert timesheets whose `userId` matches their JWT subject.

### Vehicle Reports (VR) & Vehicle Checks
**Files:** `vehiclecheck.php`, `vehiclecheck1.php`, `vehiclecheck1a.php`, `vehiclechecka.php`, `vehicleinspectionchecklist.php`, `vehicleinspectionchecklistpg2..4.php`, `vehiclecheckperpage.php`, `vehiclecheckdbcontroller.php`, `completedvehiclechecks.php`, `insert.php`, `insert1..5.php`, `vic.php`, `vic1upload.php..vic7upload.php`, `vicdelete.php`, `vichome.php`, `vinsp.php`, `vinspdelete.php`, `vinsprepair.php`, `vinsprepairdelete.php`, `vinspreportedrepair.php`, `vinspreportedrepairdelete.php`, `vinspservice.php`, `vinsptrailer.php`, `vir/`, `virupload.php`, `vrr/`, `vrrupload.php`, `gatewaycheck.php`, `gatewayupload.php`, `pdf/vrpdf.php`, `pdf/vicpdf.php`, `pdf/vcpdf.php`, `pdf/virpdf.php`, `pdf/vrrpdf.php`.

**Tables:** `vehicle` (daily pre-trip check, 27 columns); `vic` (Vehicle Inspection Checklist with vic1..vic36 + status, vrid, vehid, type, image); `vr`, `vir`, `vrr`, `upload_vr`, `upload_vir`, `upload_vrr`.

**Actions provided:**
- Daily pre-trip vehicle check gate: after login, `vehiclecheck.php` is enforced unless the `ltraffic_limited_cookie` (set by `insert.php` for 8h) is present.
- Weekly/spot inspection: 4-page walkaround chained via `?id=$last_id`.
- Repair reports (`vinsp*.php`), service records (`vinspservice.php`), trailer-specific (`vinsptrailer.php`).
- PDF export gated by `protect("Admin, Admin1, Essex Supervisor")`.
- Gateway camera upload (`gatewaycheck.php` + `gatewayupload.php`) → `gatewaycheck/` folder.

**Auth pattern:** List/view pages `protect(...)`. All `insertN.php` and `vicNupload.php` are unguarded.

**File upload:** Multipart to `vic1/..vic4/`, `vir/`, `vrr/`, `vcupload/`, `gatewaycheck/`. Extension whitelist `jpeg,jpg,png,gif,bmp,pdf,doc,ppt,zip,xlsx,docx` (except `gatewayupload.php`, images only). Filenames prefixed with `rand(1000,1000000)` — collision-prone and predictable.

**Business rules:**
- The 8-hour cookie gate is a state hack — a proper table `vehicle_checks_daily(userId, checkedAt)` should replace it.
- Progressive multi-page save uses `?id=$last_id` from `mysqli_insert_id` — implicit wizard state machine.

**Node migration notes:** Normalise `vehicle` into `VehicleCheck` + `VehicleCheckAnswer`. Replace daily-cookie gate with server-side check. Deprecate the 6 `insertN.php` variants — collapse into one endpoint.

### Employee Reports (ER) / Health & Safety
**Files:** `h&safetyform.php` (Report an Incident form — visible in the top nav on every page), `hsupload/`, `pdf/h&safetyformpdf.php`, plus `insertcheck.php`, `equipmentcheck.php`, `equipmentchecks.php`, `equipmentchecklist.php`, `equipmentchecksdetails.php`, `equipmentcheckdelete.php`, `insertwah.php`/`wahadd.php`/`wahdelete.php` (Working At Height), `insertmewp.php`/`mewpadd.php`/`mewpdelete.php` (MEWP), `insertct.php`/`editct.php`, `insertug.php`/`ugadd.php`/`ugdelete.php`/`ugoh.php`/`ugoh1.php`/`ugoh2.php` (Underground/Overhead), `reportedrepair.php`.

**Tables:** `hsform`, `equipmentcheck`, `wah`, `mewp`, `ct`, `ug`, `ugoh`.

**Actions provided:** File incident reports and periodic safety checks. Every employee can post; admins review.

**Auth pattern:** `h&safetyform.php` is reachable by all levels including Customer. Equipment/WAH/MEWP list pages `protect("Admin, Admin1, ...")`; delete/insert handlers frequently unguarded.

**Notable:** `h&safetyform.php` prepends an unusual block that unconditionally builds a "New Visitor" email from `$drivername` (never set) and calls `mail()` before including `check.class.php`. Dead / leaked debug code.

### Civils / TFL / Wildanet (project workspaces)
**Files (Civils, Essex/Gigaclear):** `civils.php`, `civilsadd.php`, `civilsedit.php`, `civilsdelete.php`, `civilsdetails.php`, `civilsdocuments.php`, `civilsdocumentsdbcontroller.php`, `civilsdocumentsdelete.php`, `civilsdocumentsperpage.php`, `civilsimages.php`, `civilsadmin.php`, `civilsconfig.php`, `civilsdbcontroller.php`, `civilsperpage.php`.

**Files (TFL, London):** `tfl.php`, `tfladd.php`, `tfledit.php`, `tfldelete.php`, `tfldetails.php`, `tfldocuments.php`, `tfldocumentsdbcontroller.php`, `tfldocumentsdelete.php`, `tfldocumentsperpage.php`, `tflimages.php`, `tfladmin.php`, `tflconfig.php`, `tfldbcontroller.php`, `tflperpage.php`, `tflmaterial*.php`.

**Files (Wildanet):** `wildanet.php`, `wildanetadd.php`, `wildanetedit.php`, `wildanetdelete.php`, `wildanetdetails.php`, `wildanetdocuments.php`, `wildanetdocumentsdelete.php`, `wildanetupload.php`, `wildanetadmin.php`, `wildanetallinsp.php`, `wildanetallinspcom.php`, `wildanetdailyra.php`, `wildanetdailyracom.php`, `wildanetra.php`, `wildanetradelete.php`, `wildanetrahome.php`, `wildanetsiteinsp.php`, plus `winsp1..winsp8.*.php`, `wra1..wra9*.php`, and `wr/` uploads.

**Tables:** `civils`, `tfl`, `wildanet`, `civilsdocuments`, `tfldocuments`, `wildanetdocuments`, `workrecord`, plus join tables per project.

**Actions provided:** Full CRUD on jobs. Fields include `jobstatus, assignedto, client, authority, community, solonumber, location, postcode, permitstatus, startdate, enddate, notes`. Attached docs (RAMS, permits) upload to `civils/`, `tfl/`, `wildanet/` folders.

**Auth pattern:** Admins + supervisors for CRUD; drivers see their own assignments. Deletes are unguarded (`civilsdelete.php`: `DELETE FROM civils WHERE id=".$_GET["id"]` — SQL injection + missing auth).

**Business rules:**
- `jobstatus` state machine: `Pending → Live → Completed → Invoiced` (with `workrecord*.php` enumerating intermediate states: `Pending → Approved → Submitted → Completed → Invoiced → Closed`, plus `Issues`, `Quotation`, `Fibre` variants).
- `permitstatus` is a separate concurrent state.

**Node migration notes:** Consolidate the three near-identical Civils/TFL/Wildanet projects into a single `Project { id, code, name, ... }` + `Job { id, projectId, ... }` + enums. Move the parallel `xxxdbcontroller.php` classes onto one repository layer. Deduplicate the ~50 `raN.php`/`wraN.php` pages into a single wizard endpoint.

### Risk Assessments (RA) & Inspections (INSP / WINSP)
**Files:** `ra.php`, `ra1..ra5.php`, `ra*edit.php`, `ra*view.php`, `raN.php`, `raNupload.php` (ra1upload..ra9upload), `radbcontroller.php`, `raperpage.php`, `radelete.php`, `racom.php`, `racustomer.php`, `racustomercom.php`, `rahome.php`, `raview.php`. Wildanet variants: `wra1..wra5.php` + `wraNupload.php`. `insp1..insp8.php` + edit + upload; `winsp1..winsp8.php` + edit + upload. `insphome.php`, `inspcom.php`, `inspcom1.php`, `inspcomdelete.php`, `inspdelete.php`, `inspview.php`.

**Tables:** `ra`, `wra`, `insp`, `winsp`, plus `upload_*` join tables for images.

**Structure:** Each is a multi-step wizard — up to 9 pages of text answers + image attachments. Page N POSTs to `raNupload.php`, which inserts into a wide table (`ra1..ra12, status, client, image`) and redirects to page N+1 with the row ID.

**Business rules:**
- Status flow: `In Progress → Submitted → Approved`.
- The `image` column stores a **comma-separated list of file paths** (e.g. `ra/12345image1.jpg, ra/67890image2.pdf`) — every consumer `explode(',', ...)` parses it. Normalised-table candidate.

### Documents (methodstatements, policies, coshh, sop, downloads)
**Files:** `documents.php` (index), `documentation.php`, `methodstatements.php`, `policies.php`, `coshh.php`, `sop.php`, `downloads/` folder.

**Tables:** `methodstatements`, `policies`, `coshh`, `sop` — each with columns `id, ms1..msN` or `pol1..polN` describing title/description/file paths.

**Actions:** Read-only lists with title/description columns, keyword search (POST `search[ms1]` LIKE '%value%'), download links to `downloads/`.

**Node migration notes:** One `Document { id, category, title, description, url, uploadedBy, uploadedAt }` table replaces the four parallel tables. Use presigned URLs.

### HR / Profile / Onboarding
**Files:** `profile.php` (Jigowatt-driven), `passwordchange.php`, `onboarding.php`, `employeesignature/` folder, `signature/` folder, `sign_up.php`.

**Tables:** `login_users` (Jigowatt), plus custom profile fields visible via `$profile->getField('name')`, `getField('ltrafficid')` (Employee Number), `getField('teamup')` (per-user Teamup calendar URL), `getField('email')`.

**Actions:** Update profile via `profile.php`; onboarding form collects employment paperwork; signature image captured.

**Node migration notes:** Extend `users` table with the extra HR columns Jigowatt tacked on rather than shoehorning into `login_users`.

### Uploads / AJAX
**Files:** `ajaxupload.php`, `ajaxupload1.php`, `ajaxupload2.php`, `ajaxupload3.php`, `wajaxupload.php`, `psupload.php`, `gatewayupload.php`, plus all the `xxxupload.php` per-module handlers (~100 files).

**Target folders (root-level):** `uploads/`, `hsupload/`, `vcupload/`, `gatewaycheck/`, `insp1/..insp8/`, `ra/`, `ra1/..ra5/`, `wr/`, `vic1/..vic4/`, `vir/`, `vrr/`, `civils/`, `tfl/`, `wildanet/`, `downloads/`, `employeesignature/`, `signature/`.

**Allowed types:** Uniform whitelist `jpeg, jpg, png, gif, bmp, pdf, doc, ppt, zip, xlsx, docx`. `gatewayupload.php` restricts to images.

**Filenames:** `rand(1000,1000000) . $originalName` — collision-prone; original filename appended (path traversal risk).

### Records / Search / Calendar / Settings
Only `calender.php` exists at root. Global search is per-module (each list page has its own `search[key]` POST form). Settings live in Jigowatt's admin panel.

**Calendar bug:** timezone hardcoded to `Asia/Tokyo` (`date_default_timezone_set('Asia/Tokyo')`) — leftover from template origin, buggy for a UK company.

### Header / Footer / Layout
`header.php` (outer/marketing), `header1.php` (inner/app), `footer.php`, plus `install/header.php` and `install/footer.php`. `header.php` also hardcodes `http://www.ltraffic.co.uk/employeesarea/favicon.ico` — breaks non-prod hosts.

### DB Config
`database.php`, `database1.php`, `dbConfig.php`, `form_db_connect.php`, `config.php` (Jigowatt PDO), `config.sample.php`, `classes/connect.class.php`, each `xxxdbcontroller.php`. Credentials hardcoded in every one.

---

## Cross-cutting findings

### Duplicated code patterns
- **Every** `*upload.php` file (~100 of them) opens its own `mysqli_connect` with the same hardcoded credentials, redeclares `$valid_extensions`, redeclares the `rand()`-prefix + `move_uploaded_file` loop, and executes a string-concatenated `INSERT`. Copy-paste count easily 3,000+ duplicated lines.
- **Every** list page duplicates the same "build `$queryCondition` via `foreach ($_POST['search'])`" block with `LIKE 'value%'` interpolation.
- **Every** `xxxdbcontroller.php` is byte-identical apart from the class name / included by different pages.
- The 8 `insp1..insp8.php` and 8 `winsp1..winsp8.php` are near-identical modulo table name and level check — should be a single templated wizard.
- The 5–9 `raN.php`, `wraN.php`, `vicNupload.php` are ditto.

### SQL injection hot-spots
- `insert.php`, `insert1..5.php`, `bulletininsert.php`, `bulletininsert1..2.php`, `bulletinreadinsert.php`, `timesheetupload.php`, `admintimesheetupload.php`, `insertwr.php`, `insertct.php`, `insertwah.php`, `insertmewp.php`, `insertug.php`, `insertcheck.php`, `vic1upload.php..vic7upload.php`, `insp1upload.php..insp8upload.php` (+ each variant), `ra1upload.php..ra9upload.php` (+ upload1 variants), `wra1upload.php..wra9upload.php`, `winsp1upload.php..winsp8upload.php`, `virupload.php`, `vrrupload.php`, `wildanetupload.php`, `civilsadd.php`, `civilsedit.php`, `civilsdelete.php` — **every** insert/edit/delete file interpolates raw `$_POST`/`$_GET` into the SQL string.
- Every delete endpoint has `DELETE FROM tbl WHERE id=".$_GET["id"]` with **no auth check**. An attacker with any valid session can wipe any record.
- Every list-page search filter (`LIKE '" . $v . "%'`) is injectable.

### File upload risks
- Whitelist relies on client-supplied extension only — no MIME sniff. `.pdf.php` slips through.
- Uploads land in web-accessible folders — no `.htaccess` shipped alongside them.
- `$_FILES['image']['name'][$i]` is concatenated into `$path` — `../../` traversal possible.
- File size not checked; no antivirus scan.
- `rand(1000,1000000)` filename uniqueness insufficient at scale.

### Dead / obsolete files (should not be migrated)
- `cleggtesting.php` and siblings — developer's test fixture.
- `test.php`, `test1.php`, `php.php` — dev scratchpads.
- `editct.php`, `editec.php`, `editwr.php` — orphaned "quick edit" variants.
- `home1.php`, `header1.php` — `1` suffix indicates "next-version" copy; only one should survive (`header1.php` is actually the current one; drop `header.php`?).
- `database1.php` — duplicate of `database.php`.
- `insert1..5.php` — five near-identical variants of `insert.php`, superseded by module-specific handlers.
- `bulletin1.php`, `bulletin2.php`, `bulletininsert1..2.php` — versioned duplicates.
- The whole `install/` folder (Jigowatt installer, one-shot use).
- `classes/integration/hybridauth/tests/` and `examples/` — third-party test fixtures.
- `timesheet/assets/ckeditor/samples/old/` — CKEditor demo pages.
- `documentation.php` — links to Jigowatt's docs, not customer docs.
- `pdf/vendor/` — TCPDF bundle; replace with a Node PDF library.

---

## Business rules worth preserving

1. **Daily vehicle-check gate.** A driver cannot access most of the site until they submit today's vehicle check. Currently enforced by an 8-hour cookie set inside `insert.php`; must be re-implemented in Node as a server-side "hasSubmittedTodayCheck(userId)" middleware for driver-role users.
2. **Bulletin acknowledgement gate.** Any unread `bulletinnew.new='1'` row blocks access until read. Persist read-receipts in `bulletin_reads(bulletinId, userId, readAt)`.
3. **Timesheet week-commencing.** Server computes via `strtotime('monday this week')` on Europe/London time. Preserve Monday–Sunday week convention and the fixed activity vocabulary (Civils Installation, Defects, Supervision, Validation, Holiday, Sick) and two contracts (Essex – Gigaclear, London – TFL).
4. **Timesheet lifecycle.** `Submitted → Approved | Rejected → Closed`. Rejected state is visible on the operative's default view so they can amend and resubmit.
5. **Job lifecycle across Civils/TFL/Wildanet.** Job status: `Pending → Live → Completed → Invoiced`, plus concurrent `permitstatus`. `workrecord*.php` filenames enumerate all intermediate states: `Pending → Approved → Submitted → Completed → Invoiced → Closed`, plus `Issues`, `Quotation`, `Fibre`. Verify with client SME before dropping any.
6. **RA / Inspection multi-page wizard.** Each RA/insp record accumulates data across 8–9 steps, each with its own image upload set stored comma-joined in the `image` column. Preserve "continue where I left off" behaviour keyed by row ID.
7. **Role-gated home tiles.** `home.php` shows a different tile grid per role. Preserve this per-role landing when building the mobile frontend menu.
8. **Per-user Teamup calendar link.** `$profile->getField('teamup')` returns a user-specific external URL. Preserve as a `teamupUrl` field on user.
9. **Employee number (LT ID).** Displayed on every page via `$profile->getField('ltrafficid')`. Business identity distinct from DB `user_id`; keep as `employeeNumber` and expose in JWT claims.
10. **Two-factor SMS (Twilio).** Optional per-user (`login_users.use_two_factor_auth`). Migrate to TOTP (preferred over SMS) but preserve the per-user opt-in flag.
11. **Signatures.** `employeesignature/` and `signature/` folders hold captured operative signatures used on generated PDFs — preserve the "signature-on-file" concept and re-attach signature PNGs to PDF exports.
12. **Incident report ("Report an Incident") available to every level including Customer** — must remain the one action a Customer can perform.
