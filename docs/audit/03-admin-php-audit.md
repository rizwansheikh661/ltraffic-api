# 03 — Admin PHP Audit (`admin/`)

Source folder: `C:\rizwan\LTraffic\admin\` (136 entries, ~120 PHP files + subfolders `assets/`, `bulletin/`, `classes/`, `css/`, `employeephoto/`, `employeesignature/`, `erfiles/`, `hrfiles/`, `hsupload/`, `images/`, `js/`, `page/`, `pdf/`, `prfiles/`, `test/`, `vehicleupload/`, `vrfiles/`).

This admin portal is a distinct sibling of `employeesarea-php/`. Auth, session state and DB schema are shared with the employee portal (same `lt_employee` / `ltraffic_employee` database, same `login_users` / `login_levels` tables). Many admin pages are re-skinned management views of tables the employee portal writes into (timesheets, vehicle, healthsafety, bulletinnew, bulletinread, hr, er, pr, vr, upload_*).

---

## File count by naming pattern

| Naming pattern | Approx count | Notes |
|---|---|---|
| `admin*` prefix (dashboards + incidents + timesheets + vehiclechecks + userindex) | 26 | Includes `adminconfig.php`, `adminhome.php`, `adminreportedincidents*` (9), `admintimesheets*` (4), `adminvehiclecheck*` (9), `adminindex*` (4) |
| `er*` / `hr*` / `pr*` / `vr*` (register modules) | 32 | Six-file CRUD sets (`.php`, `add`, `edit`, `view`, `delete`, `documents`, `documentdelete`) per register + `vrcompleted.php` |
| `bulletin*` / `bulletins*` | 7 | Add/edit/delete/list + management + read-log view |
| `coshh*` / `methodstatements*` / `policies*` / `sop*` | 4×4 = 16 | Static-document register CRUD sets |
| `documentcontrol.php`, `documents1delete.php`, `documentsdelete.php`, `hrdocuments.php`, `erdocuments.php`, `prdocuments.php`, `vrdocuments.php`, `incidentsdocuments.php`, `vehiclecheckdocuments.php` | 9 | Document/gallery pages associated with modules |
| `ajaxupload*.php` | 6 | `ajaxupload.php` (health & safety), `ajaxupload1..5.php` (vehicle, hr, vr, er, pr) |
| `output*.php`, `outputadd.html`, `outputconfig.php`, `outputindex.php` | 7 | Vehicle-check table exporter/editor (largely orphan, see §Cross-cutting) |
| `useradd.php`, `users.php`, `levels.php`, `settings.php`, `records.php`, `search.php`, `passwordchange.php`, `home.php`, `login.php`, `logout.php`, `index.php` | 11 | Auth / shell / global admin utility pages |
| `header.php`, `header1.php`, `footer.php`, `footer1.php` | 4 | Two header/footer variants — `header.php`/`footer.php` for Jigowatt user-mgmt shell, `header1.php`/`footer1.php` for LTraffic admin pages |
| `database.php`, `database1.php`, `adminreportedincidentsdbcontroller.php`, `adminvehiclecheckdbcontroller.php` | 4 | Three parallel DB connections (2 mysqli + 2 `DBController` classes) with hard-coded creds |
| `classes/` | 9 | `add_level.class.php`, `add_user.class.php`, `edit_level.class.php`, `edit_user.class.php`, `profile.class.php`, `reports.class.php`, `send_email.class.php`, `settings.class.php`, `functions.php` (Jigowatt library) |
| `page/` | 20 | Sub-templates for the Jigowatt `index.php`/`settings.php`/`users.php`/`levels.php` shell |
| `test/` | 2 | Ad-hoc `change_password.php` + `styles.css` — likely dead |

---

## Global patterns

### Session handling
- All pages that require auth include `dirname(dirname(__FILE__)) . '/classes/check.class.php'` — that resolves to `employeesarea-php/classes/check.class.php`. So the admin folder does not own its auth layer; it re-uses the employee portal's `Check` class and its `$_SESSION['jigowatt']` bag (`user_id`, `user_level`, `username`, `activate`, `restricted`, `level_disabled`, `forcePwUpdate`, `referer`).
- `login.php` and `logout.php` in `admin/` are one-liners that redirect back to `../login.php` / `../logout.php` (the employee portal entry points). There is no admin-only login flow.
- `home.php` is also a one-liner redirect to `../home.php`.

### DB connections (three-way schizophrenia)
1. `database.php` — mysqli, DB `ltraffic_employee`, user `users`/`j88_Sag7`. Used by all `ajaxupload*.php`, `records.php`.
2. `database1.php` — mysqli, DB `lt_employee`, user `users1`/`LTraffic2021!#`. Used by search/legacy pages.
3. `adminreportedincidentsdbcontroller.php` and `adminvehiclecheckdbcontroller.php` — both instantiate a `DBController` class with hard-coded creds pointing at `lt_employee`. Used by ~80% of admin pages via `require_once`.
- `output.php`, `bulletinmanagement.php` etc. inline a fourth `mysqli_connect('localhost','users1','LTraffic2021!#','lt_employee')` on top of the DBController.
- `search.php` still uses deprecated `mysql_connect`/`mysql_select_db`/`mysql_query`.

### Auth guard
Two enforcement helpers imported from `employeesarea-php/classes/check.class.php`:
- `protect("Admin, Admin1, ...")` — redirects unauthorised users (via `Check::protectPage`); called at the top of every LTraffic admin page.
- `protectThis("Admin, ...")` — returns bool for inline conditional rendering of Add/Edit/Delete links.

Both accept a comma-separated string of level *names* (not IDs) and resolve them against `login_levels` (matching `level_name` or `id`). The empty-check on the session `user_level` array uses PHP `array_intersect` against the numeric IDs resolved from those names.

`user_level` is stored serialized in `login_users` (see `adminindexadd.php` which literally hardcodes `a:1:{i:0;s:1:"1";}` etc. as option values), which explains the `unserialize($row['user_level'])` in `classes/functions.php`.

Effective allow-list per page (dominant patterns):
- `Admin` only → `useradd.php`, `users.php`, `levels.php`, `settings.php`, `output.php`, `adminindex.php`; also gating all Delete links and most Add New links inline.
- `Admin, Admin1` → default for the vast majority of admin management pages (timesheets, HR, ER, PR, coshh, methodstatements, policies, sop, bulletin*, hrdocuments, index, useradd).
- `Admin, Admin1, Admin2` → `adminvehiclecheck.php`.
- `Admin, Admin1, Essex Supervisor` → `adminreportedincidents.php`, `adminreportedincidentsclosed.php`.
- `Admin, Admin1, Essex Supervisor, Admin2` → `adminhome.php` header, `vr.php`, `allocation.php`.
- No guard at all → `adminreportedincidentsdelete.php` (bare `$_GET["id"]` → `DELETE`), most `*delete.php` files, all `ajaxupload*.php`, `search.php`, `records.php`.

### Shared includes
- Every LTraffic-styled admin page loads `header1.php` + `footer1.php`, which pulls in `../classes/generic.class.php` + `admin/classes/functions.php`. `header1.php` also starts output buffering (`ob_start()`) and emits a stray `error_log( "HELLO ADMINISTRATION HEADER" )` on every request.
- Jigowatt-styled shell pages (`index.php`, `users.php`, `levels.php`, `settings.php`) use `header.php` + `footer.php` and pull in `page/*.php` fragments.

---

## Modules

### Auth
| File | Purpose |
|---|---|
| `login.php` | 1-liner redirect to `../login.php?e=1`. Dead in admin. |
| `logout.php` | 1-liner redirect to `../logout.php`. |
| `passwordchange.php` | `protect("Admin, Admin1")`, then `UPDATE vehicle SET ... WHERE id=$id` — despite the filename, this page actually edits a *vehicle-check* row (all the vehicle-check fields), interpolated from `$_POST` with no escaping. Almost certainly misnamed and misplaced; do not migrate as-is. |
| `adminconfig.php` | 1-liner redirect to `../login.php?e=1`. Dead. |

**DB tables touched:** none for real auth (delegated to employee portal). `passwordchange.php` writes to `vehicle`.
**User levels allowed:** N/A (redirects) or `Admin, Admin1` (passwordchange).

### Admin Dashboard / Home
| File | Purpose |
|---|---|
| `adminhome.php` | Main tile grid. Guard: `protect("Admin, Admin1, Admin2, Essex Supervisor")`. Uses `protectThis(...)` per-tile: Reported Incidents (Admin/Admin1/Essex Sup), Vehicle Checks (Admin/Admin1/Admin2), Timesheets (Admin/Admin1), Bulletin Manager (Admin/Admin1), HR Manager (Admin/Admin1), Equipment Allocation (Admin/Admin1/Essex Sup/Admin2), Document Control (Admin/Admin1), Site Inspections (`../insp.php`), Vehicle Inspections (`../vic.php`), User Admin (Admin/Admin1). |
| `home.php` | Redirect to `../home.php`. |
| `index.php` | Jigowatt "Control Panel" tabbed shell (Users / Levels / Reports / Send email / Settings). Loads `page/user-control.php` etc. Guard: `protect("Admin")`. |
| `adminindex.php` | Custom user-management list keyed on `login_users`. Search by `name` and `onboarding`. Pagination via `showperpage`. Add/Edit/Delete links gated to Admin only. |
| `adminindexadd.php` | Insert into `login_users`. Hard-codes 9 `user_level` options as pre-serialized PHP strings (`a:1:{i:0;s:1:"1";}` … `s:1:"9";}`), also fixed `team` dropdown. Guard: `Admin, Admin1`. **No password hashing** for the plain form; `password` is stored as-is. |
| `adminindexedit.php` / `adminindexdelete.php` | CRUD siblings (edit/delete of `login_users`). |

**DB tables touched:** `login_users`, `login_levels`.

### Incidents (Reported Incidents)
Files: `adminreportedincidents.php`, `adminreportedincidentsadd.php`, `adminreportedincidentsall.php`, `adminreportedincidentsclosed.php`, `adminreportedincidentsdelete.php`, `adminreportedincidentsedit.php`, `adminreportedincidentsperpage.php`, `adminreportedincidentsview.php`, `adminreportedincidentsdbcontroller.php`, `incidentsdocuments.php`.

- Guard: list/all/closed accept `Admin, Admin1, Essex Supervisor`; add is `Admin` only; edit is `Admin, Admin1`; delete is `Admin` (link-gated) but the `delete.php` file itself has *no* server-side guard.
- Table: `healthsafety`. Statuses: `Open` (list default), `Closed` (`adminreportedincidentsclosed.php`); `all` variant drops the status filter.
- Search: `id`, `type` on the open list; `operativesname`, `arrival_datetime` on the closed list.
- CRUD via `DBController::runQuery`/`executeQuery`; edit is straight `UPDATE healthsafety SET ... WHERE id='$id'` with unsanitised `$_POST`.
- Reporting: each row links out to `https://ltraffic.co.uk/employeesarea/pdf/h&safetyformpdf.php?id=…` (PDF is generated by the employee portal, not admin).
- Admin-only workflow: setting `status` from `Open` → `Closed` (visible via edit form's `<select>` with `Open`/`Closed` options).

Naming pattern `xxxperpage.php` = shared pagination helper (`perpage($count, $per_page, $href)` and `showperpage($sql, ..., $href)`); this file is `require_once`'d by many other modules.

`incidentsdocuments.php` is analogous to `hrdocuments.php` — a per-incident uploaded-file gallery.

### Timesheets (Admin View)
Files: `admintimesheets.php`, `admintimesheetsall.php`, `admintimesheetsclosed.php`, `admintimesheetsdelete.php`. **No admin-side edit or add file** — links point at `admintimesheetsedit.php` and `../admintimesheetadd.php`, both of which do not exist in `admin/` (the edit link is a dangling reference; add link expects a file one level up in `employeesarea-php`). Migration should treat "admin add" as N/A.

- Guard: `protect("Admin, Admin1")`.
- Table: `timesheet`. Filters:
  - `admintimesheets.php` (default) → `status = 'Submitted' OR status = 'Rejected'` (staff submitted, awaiting approval).
  - `admintimesheetsclosed.php` → `status = 'Approved'` (title "Completed Timesheets"). This is the admin approval workflow — the admin flips the status through the edit form (referenced but missing).
  - `admintimesheetsall.php` → no status filter.
- Search field `week` (Week Commencing).
- Report/export: per row → `https://ltraffic.co.uk/employeesarea/pdf/timesheetspdf.php?id=…`.
- Delete: `admintimesheetsdelete.php` (analogous to other delete files, no guard).
- Admin-only workflow: **timesheet approval / rejection** (setting `status` to `Approved` / `Rejected` / back to `Submitted`).

### Vehicle Checks (Admin View)
Files: `adminvehiclecheck.php`, `adminvehiclecheckadd.php`, `adminvehiclecheckall.php`, `adminvehiclecheckclosed.php`, `adminvehiclecheckdelete.php`, `adminvehiclecheckedit.php`, `adminvehiclecheckperpage.php`, `adminvehiclecheckview.php`, `adminvehiclecheckdbcontroller.php`.

- Guard: default list uses `protect("Admin, Admin1, Admin2")`; add is Admin only (link-gated); view/edit/delete link-gated to Admin/Admin1/Admin.
- Table: `vehicle` (huge column list — driver, reg, mileage, arrival_datetime, and ~20 checklist columns: tires, lights, windows, loads, washer, oil, fluid, belts, seatbelt, horn, mirrors, brakes, vehiclecondition, safe, report, upload).
- Filters:
  - `adminvehiclecheck.php` → `safe = 'Unsafe' OR vehiclecondition IN ('Average','Poor','Very Poor','Dangerous')` — the "Action Required" queue.
  - `adminvehiclecheckclosed.php` → checks that have been resolved.
  - `adminvehiclecheckall.php` → no filter.
- Search: `drivername`, `arrival_datetime`.
- Report/export: `https://ltraffic.co.uk/employeesarea/pdf/vcpdf.php?id=…`.
- File uploads: `vehicleupload/` folder holds check-attached images (`upload` column) — ajaxed via `ajaxupload1.php`.

`adminvehiclecheckdbcontroller.php` is a byte-for-byte duplicate of `adminreportedincidentsdbcontroller.php` — same class, same creds. Consolidate.

### Bulletins (Publishing + Management)
Files:
- `bulletinmanagement.php` — admin manager list of `bulletinnew` (title, ref, image, description, arrival_datetime, download URL, `new` (1/0 active), and per-row list of employees who confirmed reading pulled from `bulletinread ⋈ login_users`). Guard: `Admin, Admin1`. Search by `submittedby`, `ref`.
- `bulletinadd.php` — inserts into `bulletinnew`. Guard: `Admin, Admin1`. Fields include image filename, title, ref, description, arrival_datetime (auto), download link, `new`, `readby`.
- `bulletinmanagementedit.php`, `bulletinmanagementdelete.php` — CRUD siblings for `bulletinnew`.
- `bulletins.php` — read-log style list over table `bulletin` (id, submittedby, arrival_datetime, title, ref, confirm). Distinct from `bulletinnew`.
- `bulletinsdelete.php` — delete from `bulletin`.
- `bulletin/` directory holds the actual image / PDF assets referenced by the `image` and `download` columns.

**DB tables touched:** `bulletinnew` (publisher-managed), `bulletin` (read receipts?), `bulletinread` (per-user read record joined against `login_users`).
**Admin-only workflow:** publishing bulletins, toggling `new` (active), and viewing who has read each bulletin.

### Documents (COSHH, Method Statements, Policies, SOP)
Four parallel CRUD sets sharing the same shape:
- `coshh.php` / `coshhadd.php` / `coshhedit.php` / `coshhdelete.php` — table `coshh` (cols `cos1` reference, `cos2` link text, `cos3` issue). Links to physical PDFs at `../downloads/coshh/<cos1>.pdf`.
- `methodstatements.php` + siblings — table `methodstatements` (assumed same shape).
- `policies.php` + siblings — table `policies`.
- `sop.php` + siblings — table `sop` / `processes` (labelled "Processes" in the UI).
- `documentcontrol.php` — landing page with 4 tiles linking to the above.
- `documentsdelete.php`, `documents1delete.php` — generic delete helpers; likely older or shared between modules.

Guard: list is `Admin, Admin1`; add/edit/delete link-gated to `Admin`. All read via the shared `DBController`. Pagination via `showperpage` (perPage=40 for coshh).

Also present: `vehiclecheckdocuments.php`, `incidentsdocuments.php`, `hrdocuments.php`, `erdocuments.php`, `prdocuments.php`, `vrdocuments.php` — per-record document galleries. Each reads from the corresponding `upload_*` table (`upload_hr`, `upload_vr`, `upload_er`, `upload_pr`, `upload_hs`, `upload_vehicle`) and filters by the parent record's id. Deletes: `hrdocumentdelete.php`, `erdocumentdelete.php`, `prdocumentdelete.php`, `vrdocumentdelete.php`.

### HR / Employees
Files: `hr.php`, `hredit.php`, `hrdelete.php`, `hrview.php`, `hrdocuments.php`, `hrdocumentdelete.php`, plus asset folders `hrfiles/`, `employeephoto/`, `employeesignature/`.

- Guard: list `Admin, Admin1`; edit `Admin, Admin1`; delete `Admin` (link-gated).
- Table: `hr` (employeeid, firstname, surname, ltrafficphone, ltrafficemail, jobtitle, linemanager, location, date_signed, photoimage, …). Search by `firstname`, `surname`.
- Report/export: `https://ltraffic.co.uk/employeesarea/pdf/onboardingpdf.php?id=…` (onboarding PDF).
- File uploads: `hrfiles/` (via `ajaxupload2.php`) → rows in `upload_hr` (`name` = HR record id, `submittedby`, `arrival_datetime`, `doctype`, `docdesc`, `file_name`). Employee photos/signatures come from `employeephoto/` and `employeesignature/` written by the employee portal onboarding form.
- `hrview.php` and `hrdocuments.php` reference `../downloads/...` paths and per-employee doc lists.

### ER (Equipment Register)
Files: `er.php`, `eradd.php`, `eredit.php`, `erview.php`, `erdelete.php`, `erdocuments.php`, `erdocumentdelete.php`; asset folder `erfiles/`; ajax `ajaxupload4.php` → table `upload_er`.

- Guard: list `Admin, Admin1`; add/delete link-gated to Admin.
- Table: `er` (item, description, ident, allocatedto, date, cond, expiry). Ordered by `ident asc`. Search on `item`, `ident`.
- Purpose: track physical PPE / tools / calibrated equipment, who currently holds each item, and calibration/service expiry.
- Allocation workflow: `allocatedto` and `date` fields updated via `eredit.php`.

### PR (Plant Register)
Files: `pr.php`, `pradd.php`, `predit.php`, `prview.php`, `prdelete.php`, `prdocuments.php`, `prdocumentdelete.php`; asset folder `prfiles/`; ajax `ajaxupload5.php` → table `upload_pr`.

- Guard: list `Admin, Admin1`; add/delete link-gated to Admin.
- Table: `pr` (item, description, ident, allocatedto, date, cond, expiry). Ordered by `expiry asc` (upcoming service dates first).
- Purpose: plant/machinery register (breakers, compressors, generators). Identical schema/UX to ER.

### VR (Vehicle Register)
Files: `vr.php`, `vradd.php`, `vredit.php`, `vrview.php`, `vrdelete.php`, `vrcompleted.php`, `vrdocuments.php`, `vrdocumentdelete.php`; asset folder `vrfiles/`; ajax `ajaxupload3.php` → table `upload_vr`.

- Guard: `vr.php` list `Admin, Admin1, Essex Supervisor, Admin2`; view/edit link-gated to `Admin, Admin1`; maintenance link visible to all four; delete link-gated to Admin.
- Table: `vr` (id, reg, description, allocatedto, date, cond, mexpiry, texpiry, sexpiry). Filter `cond='Yes'` on `vr.php` (Active); `vrcompleted.php` shows the retired/completed vehicles.
- Report/export: `https://ltraffic.co.uk/employeesarea/pdf/vrpdf.php?id=…`.
- Cross-link: "Maintenance" button drops out of `admin/` to `../vinsp.php?id=…` — vehicle inspection lives in the sibling employee area.

### User Management / Levels
Two overlapping mechanisms:

1. **Jigowatt shell** (`index.php`, `users.php`, `levels.php`, `settings.php`, `useradd.php`; classes `add_user.class.php`, `edit_user.class.php`, `add_level.class.php`, `edit_level.class.php`, `profile.class.php`, `reports.class.php`, `send_email.class.php`, `settings.class.php`, `functions.php`).
   - Uses PDO via `generic.class.php` (parent class of `Check`) with prepared statements — the only correctly-parameterised code in the admin folder.
   - Manages `login_users`, `login_levels`, `login_timestamps`.
   - `page/` templates: `general-options.php`, `denied.php`, `emails-*.php`, `integration.php`, `level-control.php`, `level-create.php`, `reports.php`, `send-email.php`, `settings.php`, `update.php`, `user-add.php`, `user-control.php`, `user-profiles.php`, `admin.php`, `header.php`.
   - Ships gravatar helper, welcome-email sender (`send_email.class.php`), forced password update flow, and a reports/export tab (see `reports.class.php`).
   - Guard: `protect("Admin")` — Admin level only.
   - `useradd.php` is a **duplicate** LTraffic-styled bulk-insert form (mysqli, unescaped) that bypasses the Jigowatt add_user flow.

2. **LTraffic custom shell** (`adminindex.php`, `adminindexadd.php`, `adminindexedit.php`, `adminindexdelete.php`).
   - Direct `INSERT INTO login_users` / `UPDATE` / `DELETE`. Serialised `user_level` values hard-coded in the `<select>` (values `a:1:{i:0;s:1:"N";}`).
   - Guard: `Admin, Admin1`, but add/delete link-gated to `Admin`.
   - Writes to `login_users` with an unhashed `password` column in `useradd.php`; `adminindexadd.php` has a bug where it does `$password = md5($password);` before `$password` is assigned from `$_POST`, so the DB always gets the raw POSTed password (or `md5(null)` if the local isn't populated) — worth flagging for migration.

### Allocation & Output
- `allocation.php` — sub-dashboard for the three register modules. Guard `Admin, Admin1, Admin2, Essex Supervisor`. Tiles: Equipment Register (`er.php`, Admin/Admin1 only), Vehicle Register (`vr.php`, all four levels), Plant Register (`pr.php`, Admin/Admin1/Admin2).
- `output.php` — Guard `Admin`. Renders a huge HTML `<table>` dump of every row in `vehicle` (24 columns). Uses a fourth inline mysqli connection. This is a raw table exporter — no CSV/Excel, just a browser-renderable HTML page. Likely the historical precursor of the vehicle-check admin views.
- `output1.php`, `outputadd.html`, `outputadd.php`, `outputconfig.php`, `outputdelete.php`, `outputedit.php`, `outputindex.php` — the original (pre-`adminvehiclecheck`) full-CRUD interface on the same `vehicle` table. `outputconfig.php` re-declares the DB connection variables. Superseded but still executable.

### Search / Records / Settings
- `search.php` — Legacy `mysql_*` (deprecated in PHP 5.5, removed in PHP 7). Queries `vehicle` with `WHERE title LIKE ... OR text LIKE ...` — but `vehicle` has no `title` or `text` columns, so this returns nothing. Dead code.
- `records.php` — Only sets up a mysqli connection + defines `$results_per_page`; no rendering. Likely an include stub or dead.
- `settings.php` — Jigowatt admin settings tabbed page (General / Denied / Emails / Profiles / Integration / Update). Guard `Admin`. Persists via `classes/settings.class.php` (PDO-backed, safe).

### Uploads
| File | Target folder | Target table | Notes |
|---|---|---|---|
| `ajaxupload.php` | `hsupload/` | `upload_hs` | Health & Safety incident attachments. |
| `ajaxupload1.php` | `vehicleupload/` | `upload_vehicle` | Vehicle-check images. |
| `ajaxupload2.php` | `hrfiles/` | `upload_hr` | HR documents (adds `doctype`, `docdesc`). |
| `ajaxupload3.php` | `vrfiles/` | `upload_vr` | VR documents. |
| `ajaxupload4.php` | `erfiles/` | `upload_er` | ER documents. |
| `ajaxupload5.php` | `prfiles/` | `upload_pr` | PR documents. |

All six are near-identical clones:
- Allowed extensions: `jpeg jpg png gif bmp pdf doc ppt (docx)`. `ajaxupload1.php` omits `docx`.
- Randomised filename via `rand(1000,1000000).$originalName`, lowercased.
- `move_uploaded_file` into `$path`, then `INSERT INTO upload_* VALUES (...)` with un-parameterised `$_POST` values.
- **No auth guard, no CSRF token, no MIME sniffing, extension trust only.**

### Layout
- `header.php` / `footer.php` — Jigowatt admin shell (Bootstrap, tabs, gettext-style `_e()` / `_()` helpers, breadcrumb built from `$_SERVER['SCRIPT_NAME']`).
- `header1.php` / `footer1.php` — LTraffic branded shell used by every non-Jigowatt page. Emits a stray `error_log("HELLO ADMINISTRATION HEADER")` on every request.

### DB / classes
- `database.php` and `database1.php` are legacy hard-coded mysqli setups.
- `classes/functions.php` (Jigowatt) — pagination + user/level listing helpers, uses PDO.
- `classes/add_user.class.php`, `edit_user.class.php`, `add_level.class.php`, `edit_level.class.php`, `profile.class.php`, `settings.class.php`, `reports.class.php`, `send_email.class.php` — Jigowatt user-management library (PDO, prepared, gettext).
- `adminreportedincidentsdbcontroller.php` and `adminvehiclecheckdbcontroller.php` — duplicate `DBController` classes (mysqli, no prepared statements, no escaping).

---

## Admin-only vs shared-with-employee features

| Feature | Employee portal writes | Admin manages | Behaviour delta |
|---|---|---|---|
| Vehicle daily inspection | Employee submits row into `vehicle` | Admin filters "unsafe/poor/dangerous" queue, edits, closes, deletes | Admin can override any field; PDF still rendered by `employeesarea/pdf/vcpdf.php` |
| Health & Safety incident | Employee submits into `healthsafety` | Admin edits, sets `status` Open→Closed, deletes | Admin-only closure workflow |
| Timesheet | Employee submits into `timesheet` (`status='Submitted'`) | Admin approves/rejects (`status` = `Approved`/`Rejected`) | Approval is admin-only; no admin-side add page exists |
| Onboarding / HR | Employee onboarding form writes `hr` + photos | Admin edits `hr` row, uploads doctype-tagged HR docs | Admin can regenerate the onboarding PDF |
| Bulletins (read side) | Employee marks bulletin read (`bulletinread`) | Admin publishes into `bulletinnew`, sees who confirmed | Admin-only publisher |
| Bulletins (log) | Employee viewing writes row into `bulletin` | Admin lists and can delete individual read receipts | Admin-only delete |
| Equipment / Plant / Vehicle registers | (none — pure admin registers) | Admin CRUD + allocatedto/date/cond/expiry tracking | Admin-only |
| CoSHH / Method Statements / Policies / SOP | Employee has read-only view mirrors | Admin CRUD in `admin/coshh*` etc. | Admin publishes, employees read |
| User Management | (none) | Admin CRUD `login_users`/`login_levels` | Admin-only |
| Site / Vehicle inspections (`insp.php`, `vinsp.php`, `vic.php`) | Employees fill them out via `../insp.php` etc. | Admin dashboard tile links back into employee portal | No admin-owned code — pure link-out |
| Password change | Employee can change own password | `admin/passwordchange.php` is actually a mislabelled vehicle-check editor | Do not migrate the admin file |

---

## Cross-cutting findings

### Duplicated code
- `adminreportedincidentsdbcontroller.php` and `adminvehiclecheckdbcontroller.php` are literally the same `DBController` class copied twice. Every register/document/bulletin/coshh/etc. page `require_once`s one of them.
- Six `ajaxupload*.php` files differ only in target folder and target table name.
- Every listing page (`adminreportedincidents.php`, `adminvehiclecheck.php`, `admintimesheets*.php`, `hr.php`, `er.php`, `pr.php`, `vr.php`, `coshh.php`, `bulletinmanagement.php`, `bulletins.php`, `adminindex.php`) uses the same "$_POST['search'] switch/case → $queryCondition builder + shared `showperpage()`" pattern.
- Two full user-add UIs (`useradd.php` LTraffic-styled and `page/user-add.php` Jigowatt-styled) both write to `login_users`.
- Output register (7 files) covers the same domain as the newer `adminvehiclecheck*` register (9 files).
- `home.php`, `login.php`, `logout.php`, `adminconfig.php` are all 1-line redirects out of the admin folder.

### SQL injection hot-spots (severity: high, pervasive)
- `adminreportedincidentsdelete.php`: `"DELETE FROM healthsafety WHERE id=".$_GET["id"]` — no guard, no cast.
- `passwordchange.php`: `UPDATE vehicle SET id='$id',drivername='$drivername',...' WHERE id='$id'` interpolating 24 `$_POST` fields.
- All `xxxedit.php` files (`adminreportedincidentsedit.php`, `adminvehiclecheckedit.php`, `hredit.php`, `bulletinmanagementedit.php`, `outputedit.php`, etc.) build the UPDATE statement by direct string concatenation of `$_POST`.
- All `xxxadd.php` files (`bulletinadd.php`, `adminindexadd.php`, `useradd.php`, `eradd.php`, etc.) build INSERT via string concatenation.
- List-page search: `$queryCondition .= "field LIKE '" . $v . "%'"` — no escaping.
- `hrdocuments.php`, `erdocuments.php`, etc.: `WHERE name='" . $_GET["id"] . "'"` directly.
- `search.php` still calls `mysql_real_escape_string` (better than nothing), but the surrounding `mysql_*` functions are removed in PHP 7+.
- Ajax uploads INSERT `$_POST` fields directly.
- Every DBController-based file is vulnerable end-to-end; only the Jigowatt PDO paths (`users.php`, `levels.php`, `settings.php`, `classes/functions.php`) are safe.

### Authorisation gaps
- `admin/*delete.php` files (all of them) are unauthenticated end-points — they check nothing on entry and simply run `DELETE ... WHERE id=$_GET['id']`. Anyone who can reach the URL can delete. The delete *links* are gated by `protectThis` in the UI, but the underlying script isn't.
- All `ajaxupload*.php` accept POST with no session check, so any unauthenticated request can drop files into `hsupload/`, `hrfiles/`, `erfiles/`, `prfiles/`, `vrfiles/`, `vehicleupload/` and add DB rows.
- `search.php`, `records.php`, `output.php` (Admin only), `passwordchange.php` (Admin/Admin1) — inconsistent.

### File upload risks
- Extension-only whitelist; no MIME check, no content sniffing, no filename sanitisation beyond `strtolower`.
- Random 1000..1000000 prefix has plausible collisions but low security value.
- Files served straight back with `<img src=...>` echo — enables `<img>` injection if an attacker POSTs a crafted filename (embedded HTML).
- `.docx` allowed on 5/6 uploaders but not on `ajaxupload1.php` (inconsistency).
- Uploaded PHP files can't be executed because extension whitelist excludes them, but `.doc`/`.ppt` can carry macros; consider stripping on migration.

### Dead / obsolete files (candidates to NOT migrate)
- `login.php`, `logout.php`, `home.php`, `adminconfig.php` — all one-line redirects out of the admin folder. Replace with route-level redirects (or drop entirely) in the Node API.
- `search.php` — uses removed `mysql_*` functions, targets columns (`title`, `text`) that don't exist on `vehicle`.
- `records.php` — dead stub, no output.
- `output*.php` (7 files) + `outputadd.html` — legacy full-table vehicle CRUD, superseded by `adminvehiclecheck*`.
- `passwordchange.php` — misnamed vehicle-check editor; do not port.
- `test/` — one-off `change_password.php`; drop.
- `useradd.php` — duplicate of Jigowatt `page/user-add.php` with worse security; keep only the safe path.
- `documents1delete.php` vs `documentsdelete.php` — one is redundant.

### Files worth keeping (semantics only; rewrite implementation)
- Domain logic worth extracting: incident closure, timesheet approval, vehicle-check triage filter, bulletin publishing + read tracking, register (ER/PR/VR) allocation + expiry tracking, per-record document galleries.
- User/level model (with the peculiar serialised `user_level` column) — worth keeping the level names for compatibility, but move to a proper role table.

---

## Admin business rules worth preserving

1. **Timesheet approval workflow.** Employee submits with `status='Submitted'`. Admin (`Admin`, `Admin1`) sees them in `admintimesheets.php`. Admin flips status via `admintimesheetsedit.php` (missing file — logic must be re-implemented) to `Approved` (moves to `admintimesheetsclosed.php`) or `Rejected` (returns to the same list). "All" view (`admintimesheetsall.php`) ignores status.
2. **Incident closure.** Incidents submitted by employees land with `status='Open'` in `healthsafety`. Admin/Admin1 edit and set `status='Closed'` (only two allowed values are `Open`/`Closed`, though the UI mislabels it as "Assigned To"). Essex Supervisor can view but not edit.
3. **Vehicle check triage.** The default admin view is *not* every check — it's the "action required" queue filtered by `safe='Unsafe' OR vehiclecondition IN ('Average','Poor','Very Poor','Dangerous')`. Closed queue and "all" have different filters. Preserve the exact filter expression.
4. **Bulletin publish + read confirmations.** Publishing writes to `bulletinnew`; the employee portal writes `bulletinread(bulletin_id, user_id)` when a bulletin is acknowledged. The admin list joins those against `login_users` to show a per-bulletin read list. The `new` column (values `1`/`0`) toggles active state.
5. **Allocation model for registers (ER/PR/VR).** Each register row carries `allocatedto` (free-text user name), `date` (allocation date), `cond` (Yes/No for active), and expiry columns (calibration/service/MOT/tax). VR uses `cond='Yes'` for active fleet, moved to `vrcompleted.php` when retired.
6. **Onboarding flow.** HR row is created by the employee onboarding form. Photos live in `employeephoto/`, signatures in `employeesignature/`, extra docs are ajax-uploaded to `hrfiles/` with a `doctype` classification. Admin edits `hr` (`Admin, Admin1`) but can also regenerate the onboarding PDF at any time.
7. **Level-name-based authorisation.** `protect("Admin, Admin1")` etc. resolves level names (from a single POSTed comma-separated string) to numeric level IDs in `login_levels` at each call. Level names in play: `Admin` (1), `Driving Ops` (2), `Ops` (3), `Admin1` (4), `Civils TFL Driver` (5), `Civils Trailer Driver` (6), `Admin2` (7), `Essex Supervisor` (8), `Customer` (9). Users may hold multiple levels (`unserialize` yields an array), so the correct migration is many-to-many `user_id`→`role_id`.
8. **Dashboard-tile visibility.** `adminhome.php` uses `protectThis` on every tile independently — the enclosing `protect(...)` only lets four levels reach the page at all, and each tile then decides who sees it. Preserve this exact matrix; do not collapse into a single admin/non-admin flag.
9. **Two-DB reality.** The code paths reference both `lt_employee` and `ltraffic_employee` databases; based on the tables consumed, these are likely the same DB accessed under two credentials. Confirm by comparing schemas before migration and unify to a single connection.
10. **PDF-report externality.** All PDFs (`vcpdf.php`, `vrpdf.php`, `h&safetyformpdf.php`, `timesheetspdf.php`, `onboardingpdf.php`) are hard-coded to `https://ltraffic.co.uk/employeesarea/pdf/...`. Migration should reproduce or reroute these endpoints — the admin UI links directly to them.
