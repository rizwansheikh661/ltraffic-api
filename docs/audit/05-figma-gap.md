# 05 — Figma vs PHP Gap Audit

**Purpose:** Map every Figma mobile-app screen to the corresponding legacy PHP screen(s) and MySQL table(s), then compute what PHP delivers that Figma does not (missing coverage the Node.js API must still support) and what Figma introduces that PHP does not (new features requiring greenfield endpoints).

**Sources of truth (in this order):**
1. `docs/audit/02-employee-php-audit.md` (13 employee modules, ~260 PHP scripts)
2. `docs/audit/03-admin-php-audit.md` (16 admin modules, ~120 PHP scripts)
3. `docs/audit/01-db-map.md` (65 MySQL tables in `lt_employee`)
4. Figma PNG inventory:
   - `C:\rizwan\LTraffic\admin-figma-design\01-33.png` (33 frames)
   - `C:\rizwan\LTraffic\employees-figma-design\01-36.png` (36 frames)

**Convention:** API endpoints named below are **proposed** for the unified `ltraffic-api/` Node service. Where an equivalent already exists in the repo, that route is preferred; otherwise these are targets, not commitments. All routes are gated by `JWT + userType` (`admin` | `employee`).

---

## Executive Summary

- **Total Figma frames reviewed:** 69 (33 admin + 36 employee), of which ~48 are unique functional screens (rest are splash/onboarding/success states shared across flows).
- **PHP modules covered by Figma:** Auth (login only), Bulletins (acknowledgement gate + list), Vehicle Check (daily walk-round), Timesheet (weekly grid), Report Incident (H&S), and Documents (Policies/MS/Processes/CoSHH/Bulletins). Admin adds shells for HR, Users, Equipment Allocation, Document Control, Site Inspections, Vehicle Inspections.
- **PHP modules NOT in Figma (major gaps):**
  - **Civils / TFL / Wildanet / Presite / Maintenance job registers** (13 CRUD flows each — the operational core of the business).
  - **Risk Assessments** (`ra` / `wra` — 22-to-74 wide-column wizards).
  - **Site Inspections** (`insp` / `winsp` — 63-column checklists).
  - **Vehicle Register / VIR / VRR / VIC** (fleet management CRUD).
  - **Health & Safety expenses, ER, MEWP, WAH, UG permits**.
  - **Materials management** (`material`, `tflmaterial`, `maintenancematerial`).
  - **11 polymorphic upload_* tables** — no dedicated upload gallery/CRUD in Figma.
  - **Admin dashboards & reports** — `bulletinconfirm` reader receipts, `hr` full CRUD, `login_users` role assignment UI, TeamUp calendar admin.
  - **HR sub-features** — `holidayrequest`, `sicknessreport`, `payslip`, `nightshifts`.
- **Figma-only screens (new features):**
  - Employee dashboard **stats cards** (Pending / Overdue / Active Projects) and **Pending Tasks feed** with priority tags — no PHP equivalent.
  - Admin dashboard **10-tile launcher grid** (PHP uses free-form left-nav).
  - **7-step Vehicle Check wizard** with success/summary and safety toggle Safe/Un-Safe (PHP is one long form).
  - **8-step Report Incident wizard** with "Add Another Witness" (PHP is one page).
  - **7-day Timesheet wizard** with per-day slide (PHP is one 7-column grid).
  - **Onboarding carousel** (3 slides) + **Safety Protocol** ack gate before dashboard — new mobile-native UX.
  - **PDF Report** button on list rows — implies server-side PDF endpoints per record.
  - **Team Up Calendar** and **PIA & Fibre Risk** tiles (new — extend `login_users.teamup` and Wildanet respectively).
- **Recommendation:** Do not scope the Node API to the Figma surface alone. Build API for the full PHP surface (audit 02 & 03), then ship P0 = Figma-covered flows first, P1 = the remaining PHP CRUD that ops depend on daily (Civils/TFL/Wildanet/RA/INSP), P2 = admin analytics + Figma-only greenfield features.

---

## 1. Admin Figma Inventory

| Frame | Screen name (Figma) | Purpose |
|---|---|---|
| 01–02 | Splash | LTraffic logo, brand load |
| 03–05 | Onboarding carousel (3 slides + Get Started) | Marketing/orientation |
| 06 | Login (Welcome Back) | Email + password |
| 07 | Safety Protocol | Bulletin acknowledgement checkbox gate |
| 08 | Admin Dashboard | 10 tiles: Report Incident, Vehicle Check, Timesheets, Bulletin Manager, HR Manager, Equipment Allocation, Document Control, Site Inspections, Vehicle Inspections, User Management |
| 09 | Add Reported Incident 1/8 | Operative & Location Details |
| 10 | Add Reported Incident 2/8 | Description |
| 11 | Add Reported Incident 3/8 | Parties Involved |
| 12 | Add Reported Incident 4/8 | Injuries |
| 13 | Add Reported Incident 5/8 | Reporting of Incident |
| 14 | Add Reported Incident 6/8 | Witness Details |
| 15 | Add Reported Incident 7/8 | Witness Details (add another) |
| 16 | Add Reported Incident 8/8 | Supporting Images upload |
| 17 | Reported Incidents list | Row menu: PDF Report / Edit / Delete |
| 18 | Add Vehicle 1/7 | Driver & Vehicle Details |
| 19 | Add Vehicle 2/7 | Planning Your Trip |
| 20 | Add Vehicle 3/7 | Circle Check |
| 21 | Add Vehicle 4/7 | Under the Hood |
| 22 | Add Vehicle 5/7 | Behind the Wheel |
| 23 | Add Vehicle 6/7 | Vehicle Load, Weight & Trailer |
| 24 | Add Vehicle 7/7 | Condition Confirmation (Safe / Un-Safe + Defects) |
| 25 | Completed Vehicle Checks list | View Details / PDF Report |
| 26 | Employee Timesheet admin list | Open / Closed toggle, per-week row |
| 27 | View Timesheet Details (bottom-sheet) | Per-day location/activity/contract |
| 28 | Add Timesheet 1/7 | Monday slide |
| 29 | Add Timesheet 2/7 | Tuesday slide |
| 30 | Add Timesheet 3/7 | Wednesday slide |
| 31 | Add Timesheet 4/7 | (further day slides implied) |
| 32 | LTraffic Bulletins list | Admin-side bulletin manager |
| 33 | LTraffic HR Area list | HR record list |

## 2. Employee Figma Inventory

| Frame | Screen name (Figma) | Purpose |
|---|---|---|
| 01–02 | Splash | LTraffic logo |
| 03–05 | Onboarding carousel + Get Started | Same as admin |
| 06 | Login | Email + password |
| 07 | Safety Protocol | Bulletin ack checkbox gate |
| 08 | Employee Dashboard | Stats (Pending 25 / Overdue 10 / Active Projects 200) + tiles (Report Incident, Team Up Calendar, Vehicle Check Log, Timesheets, LTraffic Documents, Contact Directory, Wildanet Project, PIA & Fibre Risk, Admin Area) + Pending Tasks feed |
| 09–16 | Report An Incident 1/8 – 6/8 | Same wizard as admin, first 6 steps |
| 17 | Completed Vehicle Checks list | View Details / PDF Report |
| 18 | View Full Details (bottom-sheet) | Driver / reg / condition / mileage / date / safe / defects |
| 19 | Add Vehicle 1/7 | Driver & Vehicle |
| 20 | Add Vehicle 2/7 | Planning Your Trip |
| 21 | Add Vehicle 3/7 | Circle Check |
| 22 | Add Vehicle 4/7 | Under the Hood |
| 23 | Add Vehicle 5/7 | Behind the Wheel |
| 24 | Add Vehicle 6/7 | Load, Weight & Trailer |
| 25 | Add Vehicle 7/7 | Condition Confirmation |
| 26 | Vehicle Check Success | Full-screen success + Continue |
| 27 | Employee Timesheet list | Open / Closed toggle |
| 28 | View Employee Timesheet Details (bottom-sheet) | Per-day breakdown |
| 29 | Add Timesheet 1/7 | Monday |
| 30 | Add Timesheet 2/7 | Tuesday |
| 31 | Add Timesheet 3/7 | Wednesday |
| 32 | LTraffic Documents Area | Tiles: Policies, Method Statements, Processes, CoSHH, Bulletins |
| 33 | Policy Documents list | HighwayCode / Policy Link / Latest Update / View PDF |
| 34 | Method Statement Documents list | Same shape |
| 35 | Process Documents list | Same shape |
| 36 | CoSHH Documents list | Same shape |

---

## 3. Employee Figma → PHP → Proposed API

| Figma frame(s) | PHP screen (employeesarea-php) | DB table(s) | Proposed API route (userType=employee) |
|---|---|---|---|
| 01–05 Splash / Onboarding | *(none — new)* | — | Static mobile assets; no API |
| 06 Login | `index.php` (Jigowatt Login v4.1.3 dispatcher) | `login_users`, `login_settings`, `loginhistory`, `login_confirm`, `login_timestamps` | `POST /auth/login` (MD5→bcrypt lazy rehash), `POST /auth/logout`, `GET /auth/me` |
| 07 Safety Protocol ack | `bulletin.php`, `bulletinconfirm.php` (implicit gate on landing) | `bulletin`, `bulletinnew`, `bulletinconfirm`, `bulletinread` | `GET /bulletins/pending-ack`, `POST /bulletins/:id/ack` |
| 08 Dashboard tiles | `dashboard.php` / `home.php` module launcher | `login_users` (for team/vehiclereg/teamup) | `GET /dashboard/summary` (tiles + stats — see §5 stats caveat) |
| 08 Team Up Calendar tile | `teamup.php` → external URL from `login_users.teamup` | `login_users.teamup` | `GET /me/teamup` (returns URL) |
| 08 Contact Directory tile | `contactdir.php` / `hr.php` list | `hr`, `login_users` | `GET /contacts` |
| 08 Wildanet Project tile | `wildanet.php`, `workrecord.php` | `wildanet`, `workrecord`, `wupload_data` | `GET /wildanet`, `GET /wildanet/:id`, `GET /wildanet/:id/work-records` |
| 08 PIA & Fibre Risk tile | `wra.php` (Wildanet Risk Assessment) | `wra` (ra1..ra74) | `GET /wildanet-ra`, `POST /wildanet-ra` |
| 08 Admin Area tile | *(cross-link; auth-gated by user_level)* | `login_users.user_level` | `GET /me/permissions` |
| 09–16 Report Incident wizard | `h&safetyform.php`, `healthsafety.php` | `healthsafety`, `upload_hs` | `POST /incidents` (multipart, includes witnesses[] array + images[]), `GET /incidents`, `GET /incidents/:id`, `PUT /incidents/:id`, `DELETE /incidents/:id`, `GET /incidents/:id/pdf` |
| 17 Vehicle Checks list | `vehiclecheck.php` (list view) | `vehicle`, `upload_vehicle` | `GET /vehicle-checks?driver=&status=`, `GET /vehicle-checks/:id/pdf` |
| 18 Vehicle Check details | `vehicledetails.php` (row detail) | `vehicle` | `GET /vehicle-checks/:id` |
| 19–26 Add Vehicle wizard | `vehiclecheck1a.php`…`vehiclecheck6a.php` (multi-page) | `vehicle` (~20 yes/no columns), `upload_vehicle` | `POST /vehicle-checks` (single payload with all steps), sets **8-hour daily-check cookie/session flag** |
| 27 Timesheet list | `timesheet.php` list | `timesheet` | `GET /timesheets?status=Open|Closed` |
| 28 Timesheet details | `timesheetdetails.php` | `timesheet` (denormalised date1..date7/hours1..7/…) | `GET /timesheets/:id` (return normalised entries[]) |
| 29–31 Add Timesheet wizard | `timesheetadd.php` (one form, 7 days) | `timesheet` | `POST /timesheets` (payload = week + 7 entries), `PUT /timesheets/:id`, `POST /timesheets/:id/submit` |
| 32 Documents Area tiles | `documents.php` launcher | — | `GET /documents/index` (returns categories) |
| 33 Policy Documents | `policies.php` | `policies` (pol1/pol2/pol3) | `GET /policies` |
| 34 Method Statement Documents | `methodstatements.php` | `methodstatements` (ms1/ms2/ms3) | `GET /method-statements` |
| 35 Process Documents | `processes.php` | `processes` (pro1/pro2/pro3) | `GET /processes` |
| 36 CoSHH Documents | `coshh.php` | `coshh` (cos1/cos2/cos3) | `GET /coshh` |
| 32 (Bulletins tile) | `bulletin.php` | `bulletin`, `bulletinnew`, `bulletinconfirm` | `GET /bulletins`, `GET /bulletins/:id`, `POST /bulletins/:id/ack` |

## 4. Admin Figma → PHP → Proposed API

| Figma frame(s) | PHP screen (admin/) | DB table(s) | Proposed API route (userType=admin) |
|---|---|---|---|
| 01–05 Splash / Onboarding | *(none)* | — | Static |
| 06 Login | `index.php` | `login_users` OR `accounts` (bcrypt) OR `account`+`role` | `POST /auth/login` (dispatch by hash format) |
| 07 Safety Protocol | Same as employee | `bulletin*` | `POST /bulletins/:id/ack` |
| 08 Admin Dashboard | `dashboard.php` (link grid) | many | `GET /admin/dashboard/summary` |
| 09–16 Add Reported Incident | `h&safetyadd.php` / `healthsafetyadd.php` | `healthsafety`, `upload_hs` | `POST /admin/incidents` (create-on-behalf-of) |
| 17 Reported Incidents list | `h&safetylist.php` | `healthsafety` | `GET /admin/incidents`, `PUT /admin/incidents/:id`, `DELETE /admin/incidents/:id`, `GET /admin/incidents/:id/pdf` |
| 18–24 Add Vehicle wizard | `vehiclecheckadd.php` | `vehicle` | `POST /admin/vehicle-checks` |
| 25 Vehicle Checks list | `vehiclelist.php` | `vehicle` | `GET /admin/vehicle-checks` |
| 26 Employee Timesheet list (Open/Closed) | `timesheetadmin.php` | `timesheet` | `GET /admin/timesheets?status=Open|Closed`, `POST /admin/timesheets/:id/approve`, `POST /admin/timesheets/:id/close` |
| 27 View Timesheet Details | `timesheetadminview.php` | `timesheet` | `GET /admin/timesheets/:id` |
| 28–31 Add Timesheet wizard | `timesheetadminadd.php` | `timesheet` | `POST /admin/timesheets` (create on behalf) |
| 32 LTraffic Bulletins list | `bulletinadmin.php`, `bulletinadd.php`, `bulletinedit.php` | `bulletin`, `bulletinnew`, `bulletinconfirm`, `bulletinread` | `GET/POST/PUT/DELETE /admin/bulletins`, `GET /admin/bulletins/:id/confirmations` |
| 33 LTraffic HR Area list | `hradmin.php` list | `hr`, `login_users`, `upload_hr` | `GET /admin/hr`, `GET /admin/hr/:id`, `PUT /admin/hr/:id`, `GET /admin/hr/:id/documents` |
| 08 tile: Equipment Allocation | `equipmentcheck.php` + custom allocation | `equipmentcheck` + (implied allocation table) | `GET /admin/equipment/allocations` |
| 08 tile: Document Control | `documentcontrol.php` (upload manager) | `upload_data`, `upload_hr`, `upload_hs`, … (11 tables) | `POST /admin/uploads/:parent_type/:parent_id`, `GET /admin/uploads/:parent_type/:parent_id`, `DELETE /admin/uploads/:id` |
| 08 tile: Site Inspections | `inspadmin.php` (list only in Figma) | `insp`, `winsp` | `GET /admin/site-inspections` |
| 08 tile: Vehicle Inspections | `viradmin.php` / `vrradmin.php` | `vir`, `vrr`, `vic`, `vr` | `GET /admin/vehicle-inspections` |
| 08 tile: User Management | `useradmin.php` | `login_users`, `role`, `account` | `GET /admin/users`, `POST /admin/users`, `PUT /admin/users/:id`, `POST /admin/users/:id/reset-password` |

---

## 5. Gap Table A — PHP Screens with NO Figma Coverage

These are legacy PHP flows that Figma does not depict but that the API must still support (either because the mobile app will eventually add them, or because admin-web / PDF exports still consume them).

### 5.1 Employee side — missing from Figma

| PHP module / screen | Table(s) | Business criticality | Notes |
|---|---|---|---|
| Civils job register (`civils.php`, `civilsadd.php`, `civilsedit.php`, `civilslist.php`) | `civils` | **P1 — core ops** | Employees create/edit civils job rows daily; no Figma at all. |
| TFL job register (`tfl.php`, `tflmaterial.php`) | `tfl`, `tflmaterial` | **P1** | Parallel to civils for TfL contracts. |
| Presite survey (`presite.php`) | `presite` | **P1** | Precursor to civils job. |
| Maintenance jobs (`maintenance.php`, `maintenancematerial.php`) | `maintenance`, `maintenancematerial`, `material` | **P1** | Site/property maintenance. |
| Project Report `pr.php` | `pr`, `upload_pr` | P2 | Post-job report keyed to `civilsid`. |
| Equipment Report `er.php` | `er`, `upload_er` | P2 | Equipment event log. |
| Risk Assessment (Civils) `raadd.php`/`raedit.php`/`ralist.php` | `ra` (ra1..ra22), `upload_ra` (if any) | **P1** | Multi-step wide form; safety-critical. |
| Wildanet Risk Assessment `wraadd.php`/`wraedit.php` | `wra` (ra1..ra74) | **P1** | Figma frame 08 has "PIA & Fibre Risk" tile but no CRUD screens. |
| Site Inspection (Civils) `inspadd.php`/`inspedit.php`/`insplist.php` | `insp` (in1..in63, image1..7) | **P1** | 63-column wizard entirely missing. |
| Site Inspection (Wildanet) `winspadd.php`/`winspedit.php` | `winsp` | **P1** | Same. |
| MEWP inspection `mewpadd.php` | `mewp` (mewp1..mewp15) | P1 (safety) | Missing. |
| Work at Height `wahadd.php` | `wah` (wah1..wah14) | P1 (safety) | Missing. |
| Underground works `ugadd.php` | `ug` (ug1..ug13) | P1 (safety) | Missing. |
| Equipment daily check `equipmentcheckadd.php` | `equipmentcheck` | P1 | Only "Equipment Allocation" tile is on admin dashboard; employee daily check not in Figma. |
| Vehicle Register CRUD `vradd.php`/`vredit.php`/`vrlist.php` | `vr`, `upload_vr` | P1 | Only "Vehicle Check" (daily) is in Figma; fleet register missing. |
| VIR (Inspection/Repair) `viradd.php` | `vir` (vir1..vir10) | P1 | Missing. |
| VRR (Reported Repair) `vrradd.php` | `vrr` (vrr1..vrr10) | P1 | Missing. |
| VIC (43-col checklist) `vicadd.php` | `vic` (vic1..vic43+) | P1 | Missing. |
| Wildanet work record `workrecordadd.php` | `workrecord` (lt1..lt12) | P1 | Only tile exists. |
| Wildanet upload gallery | `wupload_data` | P2 | Missing. |
| Clegg testing `cleggtestingadd.php` | `cleggtesting` | P2 | Missing. |
| Expenses `expenses.php` list + add | `expenses` | P2 | Missing entirely. |
| Onboarding form `onboarding.php` | `login_users.onboarding` | P2 | Missing — Figma's onboarding is marketing carousel, not the HR onboarding form. |
| Team management (teamup / vehiclereg self-service) | `login_users.teamup`, `.vehiclereg`, `.team` | P2 | Figma shows "Team Up Calendar" tile but no edit screen. |
| Bulletins list (employee non-ack view) | `bulletin`, `bulletinnew` | P2 | Figma only shows Safety Protocol ack modal and the Documents-tile Bulletins entry; standalone bulletin history missing. |
| Upload viewer per parent record | `upload_data`, `upload_hr`, `upload_hs`, `upload_maintenance`, `upload_pr`, `upload_presite`, `upload_tfl`, `upload_vehicle`, `upload_vr`, `upload_er` | P1 | No file gallery screen in Figma — but Figma incident wizard step 8 does implement upload. Extend that component. |
| HR self-service (view own record, submit changes) | `hr` | P2 | Missing. |
| Holiday request / sickness (if implemented) | `hr` / undocumented | P2 | Not seen in Figma or dump; verify with client. |

### 5.2 Admin side — missing from Figma

| PHP module / screen | Table(s) | Business criticality | Notes |
|---|---|---|---|
| Civils / TFL / Wildanet / Presite / Maintenance admin list + edit | as above | **P1** | Absent from admin dashboard tiles too. |
| RA / WRA admin approval | `ra`, `wra` | **P1** | Missing. |
| INSP / WINSP admin review | `insp`, `winsp` | **P1** | Tile exists (list only), no create/edit/view/approve. |
| VIR / VRR / VIC admin review | `vir`, `vrr`, `vic`, `vr` | **P1** | Tile exists (list only). |
| MEWP / WAH / UG admin review | `mewp`, `wah`, `ug` | P1 (safety) | Missing. |
| Materials master `materialadmin.php` | `material` | P2 | Missing. |
| Bulletin read/confirm receipts | `bulletinconfirm`, `bulletinread` | P1 | Admin needs to see who acknowledged which bulletin — no Figma screen. |
| User Management CRUD | `login_users`, `role`, `account` | **P1** | Tile exists; no add/edit/reset-password screens. |
| Role / permission editor | `login_users.user_level` (PHP-serialized), `role` | P1 | Missing. |
| HR full record edit (documents, salary, next-of-kin, visa) | `hr` (~31 cols), `upload_hr` | **P1** | Only HR list exists in Figma. |
| Contract / Activity master | `activity`, `project` | P2 | Timesheet uses these dropdowns — no admin CRUD in Figma. |
| Reports / analytics / PDF exports beyond per-row PDF | many | P2 | Figma shows per-row "PDF Report" but no bulk/date-range reports. |
| Login history / audit | `loginhistory`, `login_timestamps`, `login_confirm` | P2 | Missing. |
| Legacy data (address, files, images, gateway) | `address`, `files`, `images`, `gateway` | P3 | Migration-only; unlikely to need UI. |

---

## 6. Gap Table B — Figma Screens with NO Direct PHP Equivalent (New Features)

| Figma frame | New concept | Proposed backing DB / logic |
|---|---|---|
| Employee 08 — Stats cards (Pending 25, Overdue 10, Active Projects 200) | Personal KPI dashboard | Aggregated computed view; add `GET /me/stats` combining `timesheet.status`, `healthsafety.status`, `civils.jobstatus` etc. |
| Employee 08 — Pending Tasks feed with priority tags (High / Overdue) | Task inbox with due-date + priority | New — no PHP table has priority/due fields. Requires either new `task` table or derivation rules (e.g. timesheet not submitted by Friday = Overdue). Confirm rules with client. |
| Admin/Employee 03–05 — Onboarding carousel | Marketing/first-run only | Static; no API. |
| Admin/Employee 07 — Safety Protocol ack gate | Force ack of latest bulletin before dashboard | Exists in PHP as implicit gate; formalise as `GET /bulletins/pending-ack` returning `[bulletin]` or `[]`. |
| Admin 08 — 10-tile grid launcher | Fixed IA vs PHP's free-form left nav | Purely UI; API is same. |
| Vehicle Check wizard step "Safe / Un-Safe" toggle + Defects notes (frame 24/25) | Explicit safe-to-drive gate | PHP stores `notes`; formalise `vehicleSafeToDrive: boolean` and `defects: text` on `POST /vehicle-checks`. |
| Vehicle Check success screen (employee 26) | Mobile-native full-screen confirmation | Client-side only. |
| Report Incident wizard "Add Another Witness" (frame 15) | Repeatable witness sub-form | PHP `healthsafety.witnesses` is a single text column — new API should accept `witnesses[]` array and serialize. |
| Timesheet 7-day wizard (frames 28–31 / 29–31) | Per-day slide | PHP has one wide form; API accepts full week payload, UI paginates. |
| "Team Up Calendar" tile (employee 08) | Named calendar concept | Extend `login_users.teamup` → return URL + embed; consider dedicated `team_calendar` table if calendar becomes native. |
| "PIA & Fibre Risk" tile (employee 08) | Rebrand of `wra` | Alias `wra` under `/pia-fibre-risk` endpoints. |
| PDF Report button on every list row | Per-record PDF export | Add `GET /:resource/:id/pdf` for `incidents`, `vehicle-checks`, `timesheets`. PHP has ad-hoc `*pdf.php`; consolidate. |
| Employee 08 — Contact Directory tile | Team contact list | Backed by `hr` + `login_users`; add `GET /contacts` returning filtered fields (name, mobile, email, team). |
| Login "Welcome Back" copy + Continue-with-checkbox on Safety Protocol | UX polish | No API impact. |

---

## 7. Coverage Matrix (Modules × Figma)

| PHP module (from audit 02/03) | Employee Figma? | Admin Figma? | Coverage |
|---|---|---|---|
| Auth / Login | Yes (06) | Yes (06) | **Full** |
| Bulletins | Ack only (07, 32) | List only (32) | **Partial** — admin CRUD & receipts missing |
| HR | Contact tile only (08) | List only (33) | **Partial** — no CRUD, no docs |
| Timesheets | Full wizard + list + view | Full wizard + list + view + Open/Closed | **Full** |
| Vehicle Check (daily) | Full | Full | **Full** |
| Vehicle Register / VIR / VRR / VIC | — | — | **None** |
| Health & Safety (incident) | Full | Full | **Full** |
| Site Inspection (`insp`) | — | Tile only | **None** |
| Site Inspection (`winsp`) | — | — | **None** |
| Risk Assessment (`ra`) | — | — | **None** |
| Wildanet Risk Assessment (`wra`) | Tile only | — | **Placeholder** |
| MEWP / WAH / UG permits | — | — | **None** |
| Civils / TFL / Presite / Maintenance | — | — | **None** |
| Wildanet job register | Tile only | — | **Placeholder** |
| Workrecord | — | — | **None** |
| Materials (`material`, `tflmaterial`, `maintenancematerial`) | — | — | **None** |
| Uploads (11 tables) | Only within incident wizard | Tile only (Document Control) | **Partial** |
| Documents (Policies/MS/Processes/CoSHH) | Full | — (admin uses Document Control) | **Full** (employee) |
| Equipment Check | — | Tile only | **Placeholder** |
| Expenses | — | — | **None** |
| Onboarding form | — | — | **None** |
| Login history / audit | — | — | **None** |
| User Management / Roles | Cross-link tile | Tile only | **Placeholder** |
| Reports / analytics | Stats cards (new) | — | **Figma-only stubs** |

Legend: **Full** = end-to-end flow present; **Partial** = list-only or CRUD-only; **Placeholder** = tile exists, no sub-screens; **None** = absent; **Figma-only** = new to app, no PHP backing.

---

## 8. Recommendations & Build Prioritisation

### P0 — Ship first (Figma-covered, mobile-critical)

1. **Auth** — `POST /auth/login` (MD5→bcrypt lazy rehash + bcrypt native), `GET /auth/me`, `POST /auth/logout`, `GET /me/permissions`.
2. **Bulletin ack gate** — `GET /bulletins/pending-ack`, `POST /bulletins/:id/ack`. Middleware to enforce ack before other reads (or client-driven).
3. **Dashboard summary** — `GET /dashboard/summary` (per userType). Include stats/tasks (see P2 caveat).
4. **Vehicle Check** — `POST /vehicle-checks` (7-step payload), `GET /vehicle-checks?driver=…`, `GET /vehicle-checks/:id`, `GET /vehicle-checks/:id/pdf`. Set 8-hour "daily check done" flag in session/cache.
5. **Timesheet** — `GET /timesheets?status=Open|Closed`, `GET /timesheets/:id`, `POST /timesheets` (7-day payload → normalised entries), `PUT /timesheets/:id`, `POST /timesheets/:id/submit`. Admin: `POST /admin/timesheets/:id/approve`, `POST /admin/timesheets/:id/close`.
6. **Report Incident** — `POST /incidents` (multipart with witnesses[] + images[]), CRUD, `GET /incidents/:id/pdf`.
7. **Documents (read-only)** — `GET /policies`, `GET /method-statements`, `GET /processes`, `GET /coshh`, `GET /bulletins`.
8. **HR list (admin)** — `GET /admin/hr`, `GET /admin/hr/:id` (read-only; CRUD is P1).

### P1 — Ship next (PHP-critical, ops-blocking, but no Figma yet)

1. **Civils / TFL / Presite / Maintenance / Wildanet job registers** — full CRUD each. Coordinate with design to add screens; API can ship ahead.
2. **Risk Assessments** — `ra` (Civils) + `wra` (Wildanet / PIA-Fibre). Wide-column → normalised child rows in API responses.
3. **Site Inspections** — `insp` + `winsp`. Same normalisation.
4. **Vehicle Register + VIR + VRR + VIC** — fleet CRUD.
5. **Safety permits** — MEWP / WAH / UG.
6. **Uploads** — Polymorphic `POST /uploads/:parent_type/:parent_id`. Backed by existing `upload_*` tables per parent (or migrate to unified `uploads` table).
7. **User management (admin)** — CRUD + role editor + password reset. Include serialised `user_level` → JSON translation.
8. **Bulletin admin CRUD + receipts** — `GET /admin/bulletins/:id/confirmations`.
9. **HR CRUD (admin)** — full 31-field update, document attachments, next-of-kin, visa, salary.
10. **Materials master + line items** — `material`, `tflmaterial`, `maintenancematerial`.
11. **Equipment daily check + allocation** — expand tile to full flow.
12. **Wildanet workrecord** — `POST /workrecords` (lt1..lt12 → named payload).
13. **Expenses** — `POST /expenses`, `GET /expenses`.
14. **Onboarding form** — persist to `login_users.onboarding` (verify column).

### P2 — Nice-to-have / Figma-only greenfield

1. **Stats cards (Pending / Overdue / Active Projects)** — confirm derivation rules with client, then `GET /me/stats`.
2. **Pending Tasks feed with priority** — schema decision needed (derive vs. new `task` table).
3. **Team Up Calendar** — return URL from `login_users.teamup`, defer native calendar.
4. **PIA & Fibre Risk** — alias of `wra`; ship under both routes.
5. **Contact Directory** — `GET /contacts` returning filtered `hr` + `login_users`.
6. **Onboarding carousel + Splash** — static, no API.
7. **Reports & analytics** — bulk PDF, date-range, weekly ops summary.
8. **Login history / audit** — admin-only report screens.

### Cross-cutting

- **PDF exports** — every list in Figma has a "PDF Report" affordance. Standardise `GET /:resource/:id/pdf` and a shared PDF renderer (Puppeteer / pdfkit). Consolidate the ~30 PHP `*pdf.php` scripts.
- **Wizards** — Figma paginates but API should accept the full record in one POST (draft support via `PUT` on a saved draft row is a client concern).
- **Yes/No boolean-as-text** — Node API should present `boolean`, translate on write to `'Yes' | 'No' | ''` for legacy DB parity until schema migration.
- **Date strings** — accept ISO on write; store both ISO + legacy long-form until PHP retired.
- **`user_level` PHP serialisation** — translate to `{ levels: number[] }` on read; write back serialised for PHP-side compatibility during transition.
- **PDF Report on every row + Delete/Edit menu on `17` (admin)** — implies row-level permissions per `user_level`. Enforce in API guard.
- **Safety Protocol gate** — API must expose "unacknowledged bulletin exists" so the mobile app can redirect to frame 07.

### Do NOT scope the API to only what Figma shows

The Figma pack covers roughly **6 of 16 admin modules** and **~7 of 13 employee modules**. The unbuilt Figma screens (Civils / TFL / RA / INSP / Wildanet CRUD, materials, permits, fleet register) are the daily operational core. Ship the API for the full PHP surface; ship the mobile app in the Figma-covered subset first; add screens later without re-architecting the API.

---

## 9. Open questions for client / designer

1. Stats card values (Pending / Overdue / Active Projects) — what are the exact derivation rules? Per-user or per-team?
2. "Pending Tasks" feed — is this hand-curated, derived from workflow states, or a new task-management module?
3. "Team Up Calendar" — is this only the existing `login_users.teamup` external URL, or a first-class calendar we need to model?
4. "PIA & Fibre Risk" — confirm this is the Wildanet `wra` (`ra1..ra74`) form and not a new artefact.
5. Contact Directory scope — all employees, contract only, or role-scoped?
6. Vehicle Check "Un-Safe" outcome — does it immediately raise a VIR row / notify a supervisor?
7. Timesheet: what closes an "Open" week? Cut-off date, admin action, or approval of all rows?
8. Do the Documents tables (`policies`, `methodstatements`, `processes`, `coshh`) admit admin CRUD (not in Figma)?
9. Should `bulletinread` be retired in favour of `bulletinconfirm`?
10. Which upload tables can be collapsed into a single polymorphic `uploads` table in the Node schema, and which must be preserved verbatim for legacy PHP interoperability during the migration window?
