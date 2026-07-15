# 03 — Admin Module Catalog (Deep Dive)

**Purpose:** Complete implementation specification for every admin-portal module. Each section has enough detail that a senior engineer can build the Node.js API without re-reading PHP source.
**Source files:** `C:\rizwan\LTraffic\admin\`

---

## Table of Contents

1. [User Administration](#1-user-administration)
2. [Reported Incidents (H&S)](#2-reported-incidents-health--safety)
3. [Vehicle Checks](#3-vehicle-checks)
4. [Timesheets](#4-timesheets)
5. [Bulletins](#5-bulletins)
6. [HR Manager](#6-hr-manager)
7. [Equipment Register](#7-equipment-register)
8. [Vehicle Register](#8-vehicle-register)
9. [Plant Register](#9-plant-register)
10. [Document Control](#10-document-control)
11. [Admin Dashboard](#11-admin-dashboard)
12. [Cross-Cutting Patterns](#12-cross-cutting-patterns)

---

## 1. User Administration

### Overview
Two parallel implementations exist: a Jigowatt OOP system (classes using PDO with prepared statements) and a raw-SQL system (adminindex*.php files with direct string concatenation). The Node.js API should implement a single unified approach.

### PHP Files

| File | Purpose |
|------|---------|
| `adminindex.php` | User listing (raw SQL, paginated) |
| `adminindexadd.php` | Add employee (raw SQL) |
| `adminindexedit.php` | Edit employee (raw SQL) |
| `adminindexdelete.php` | Delete employee (raw SQL, NO permission check) |
| `useradd.php` | Add user (alternate raw form) |
| `users.php` | Edit user (Jigowatt OOP) |
| `classes/edit_user.class.php` | Edit user backend (PDO) |
| `classes/add_user.class.php` | Add user backend (PDO) |
| `classes/functions.php` | User list + pagination helpers |
| `page/user-control.php` | User list (Jigowatt UI) |
| `page/user-add.php` | Add user form (Jigowatt UI) |

### Database Tables

| Table | Purpose |
|-------|---------|
| `login_users` | Core user records |
| `login_levels` | Role/permission level definitions |
| `login_profiles` | Extended profile field values |
| `login_profile_fields` | Profile field definitions (dynamic schema) |
| `login_timestamps` | Login/access timestamps |
| `login_confirm` | Password reset & email change keys |
| `login_integration` | Social login links |
| `login_settings` | Application settings (key-value) |

### `login_users` Columns

| Column | Type | Notes |
|--------|------|-------|
| `user_id` | INT PK AUTO_INCREMENT | |
| `user_level` | TEXT | PHP serialized array, e.g. `a:1:{i:0;s:1:"2";}` |
| `restricted` | INT | 0=active, 1=restricted |
| `username` | VARCHAR UNIQUE | |
| `name` | VARCHAR | Full name |
| `email` | VARCHAR UNIQUE | |
| `password` | VARCHAR | MD5/BCRYPT/SHA256 hash |
| `timestamp` | TIMESTAMP | Registration time (DEFAULT CURRENT_TIMESTAMP) |
| `teamup` | VARCHAR | TeamUp calendar URL |
| `vehiclereg` | VARCHAR | Vehicle registration |
| `ltrafficid` | VARCHAR | Employee ID (cross-ref key) |
| `team` | VARCHAR | Team assignment |
| `name1` | VARCHAR | Full name without spaces |
| `onboarding` | VARCHAR | Onboarding status |
| `phone` | VARCHAR(12) | Phone for 2FA |
| `use_two_factor_auth` | VARCHAR(2) | 0/1 |
| `tmp_auth_token` | INT(8) | Temporary SMS code |
| `sms_time` | INT(11) | Timestamp of SMS send |

### `login_levels` Known Values

| ID | Name | Redirect |
|----|------|----------|
| 1 | Administrator | bulletin1.php |
| 2 | Driving Operative | bulletin.php |
| 3 | Operative | bulletin.php |
| 4 | Office Staff (Admin1) | bulletin1.php |
| 5 | Civils TFL Driving Operative | bulletin.php |
| 6 | Civils Trailer Driving Operative | bulletin.php |
| 7 | Maintenance Operative (Admin2) | bulletin1.php |
| 8 | Essex Supervisor | bulletin.php |
| 9 | Customer Access | home.php |

### Known Teams
- Director
- Traffic Signals Installation
- Traffic Signals Civils
- Traffic Signal Maintenance
- Utilities Civils
- Office Staff
- Customer

### SQL Queries

**List users (paginated):**
```sql
SELECT * FROM login_users
WHERE name LIKE '{name}%' AND onboarding LIKE '{onboarding}%'
ORDER BY ltrafficid asc
LIMIT {start},{perPage}
```

**Add user (raw):**
```sql
INSERT INTO login_users (user_level, restricted, username, name, email, password, teamup, vehiclereg, ltrafficid, team, name1, onboarding)
VALUES('{user_level}','{restricted}','{username}','{name}','{email}', MD5('{password}'),'{teamup}','{vehiclereg}','{ltrafficid}','{team}','{name1}','{onboarding}')
```

**Edit user (raw):**
```sql
UPDATE login_users SET user_id='{user_id}', user_level='{user_level}', restricted='{restricted}', username='{username}', name='{name}', email='{email}', password=MD5('{password}'), timestamp='{timestamp}', teamup='{teamup}', vehiclereg='{vehiclereg}', ltrafficid='{ltrafficid}', team='{team}', name1='{name1}', onboarding='{onboarding}'
WHERE user_id='{user_id}'
```

**Delete user (raw):**
```sql
DELETE FROM login_users WHERE user_id={id}
```

**Add user (Jigowatt — with duplicate checking):**
```sql
SELECT * FROM login_users WHERE email = :email
SELECT * FROM login_users WHERE username = :username
INSERT INTO login_users (user_level, name, email, teamup, username, password) VALUES (:user_level, :name, :email, :teamup, :username, :password)
```

**Edit user (Jigowatt — with conditional password update):**
```sql
-- Without password change:
UPDATE login_users SET restricted = :restrict, name = :name, email = :email, teamup = :teamup, user_level = :level WHERE user_id = :id
-- With password change:
UPDATE login_users SET restricted = :restrict, name = :name, email = :email, teamup = :teamup, user_level = :level, password = :password WHERE user_id = :id
```

**Delete user (Jigowatt — cascading):**
```sql
DELETE FROM login_users WHERE user_id = :id
DELETE FROM login_integration WHERE user_id = :id
DELETE FROM login_profiles WHERE user_id = :id
DELETE FROM login_timestamps WHERE user_id = :id
```

**Search users (autocomplete):**
```sql
SELECT DISTINCT username as suggest, user_id FROM login_users
WHERE username LIKE :q OR name LIKE :q OR user_id LIKE :q
ORDER BY username LIMIT 0, 5
```

**Last login per user:**
```sql
SELECT timestamp FROM login_timestamps WHERE user_id = :user_id ORDER BY timestamp DESC LIMIT 0,1
```

**Users by level:**
```sql
SELECT * FROM login_users WHERE user_level LIKE '%:"<level_id>";%' ORDER BY timestamp DESC LIMIT {start},{limit}
```

### Form Fields

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| user_level | select (serialized PHP array values) | Yes | Must map to valid login_levels.id |
| restricted | text | Yes | "1=Yes, 0=No" |
| username | text | Yes | Unique, max 15 chars (Jigowatt) |
| name | text | Yes (Jigowatt) | Not empty |
| email | email | Yes (Jigowatt) | filter_var FILTER_VALIDATE_EMAIL, unique |
| password | password | No (edit), Yes (add) | Min 5 chars (Jigowatt), min 8 (useradd.php HTML only) |
| teamup | text | No | TeamUp URL |
| vehiclereg | text | No | Forced uppercase on client |
| ltrafficid | text | No | Employee ID |
| team | select | No | Fixed team list |
| name1 | text | No | Full name no spaces |
| onboarding | text | No | "1=Yes" |

### Permission Map

| Action | Required Levels |
|--------|----------------|
| View user list | Admin, Admin1 |
| Add user | Admin, Admin1 |
| Edit user | Admin |
| Delete user | Admin (Jigowatt); **NONE** in raw — security gap |
| Search/autocomplete | Admin |

### Business Rules
- Password hash on add: `md5($password)` in raw system; configurable (BCRYPT default, cost=12) in Jigowatt
- `user_level` stored as PHP serialized array: `serialize([level_id, ...])`
- Jigowatt add auto-generates 6-char random password and emails it to user
- Jigowatt delete cascades to: login_users, login_integration, login_profiles, login_timestamps
- Raw delete only removes from login_users (orphans other tables)
- Admin level (id=1) cannot be disabled
- Cannot delete a level that still has users assigned

### Validation (Jigowatt — authoritative)
1. Name: not empty
2. Email: valid format, unique
3. Username: not empty, unique (add only)
4. Password (if changing): must match confirmation, ≥5 chars
5. Level: must be set (falls back to system default)

---

## 2. Reported Incidents (Health & Safety)

### Overview
Full CRUD for H&S incident reports submitted by employees. Admin can view, investigate (add notes), close, attach documents, and generate PDFs.

### PHP Files

| File | Purpose |
|------|---------|
| `adminreportedincidents.php` | List Open incidents |
| `adminreportedincidentsall.php` | List All incidents |
| `adminreportedincidentsclosed.php` | List Closed incidents |
| `adminreportedincidentsadd.php` | Add new incident |
| `adminreportedincidentsedit.php` | Edit/close incident |
| `adminreportedincidentsview.php` | View incident + upload documents |
| `adminreportedincidentsdelete.php` | Delete incident (NO permission check) |
| `adminreportedincidentsdbcontroller.php` | DB connection |
| `adminreportedincidentsperpage.php` | Pagination helper |
| `incidentsdocuments.php` | Documents listing for an incident |
| `ajaxupload.php` | File upload → `hsupload/` |
| `documentsdelete.php` | Delete from upload_hs (NO permission check) |

### Database Tables

**`healthsafety`:**

| Column | Type | Notes |
|--------|------|-------|
| `id` | INT PK AUTO_INCREMENT | |
| `operativesname` | TEXT | Reporter's name |
| `arrival_datetime` | TEXT | Submission timestamp (Y-m-d H:i:s) |
| `type` | TEXT | Accident/Customer Complaint/Environmental/Incident/Near Miss/Service Strike |
| `location` | TEXT | |
| `reportedby` | TEXT | |
| `report` | LONGTEXT | Full narrative |
| `involved` | TEXT | Parties involved |
| `anyoneinjured` | TEXT | Free text (not boolean) |
| `whowasinjured` | TEXT | |
| `injuryreport` | TEXT | Injury details |
| `reportit` | TEXT | "Reported to Manager?" |
| `advise` | TEXT | "Advised company?" |
| `laterdate` | TEXT | "Company notified later?" |
| `companydetails` | TEXT | Company details |
| `witness` | TEXT | "Was there a witness?" |
| `witnessname` | TEXT | |
| `witnessaddress` | TEXT | |
| `witnesscontact` | TEXT | |
| `otherwitness` | TEXT | Other witness details |
| `notes` | TEXT | Investigation report (admin fills) |
| `status` | TEXT | Open / Closed / NULL |
| `image` | TEXT | Comma-separated image paths (set by employee portal) |

**`upload_hs`:**

| Column | Type | Notes |
|--------|------|-------|
| `id` | INT PK AUTO_INCREMENT | |
| `name` | VARCHAR(100) | References `healthsafety.id` |
| `arrival_datetime` | TIMESTAMP | Upload time |
| `file_name` | VARCHAR(100) | Relative path in `hsupload/` |
| `submittedby` | TEXT | Operative's name |

### SQL Queries

**List Open:**
```sql
SELECT * FROM healthsafety WHERE status=('Open') ORDER BY id desc LIMIT {start},{perPage}
```

**List Closed:**
```sql
SELECT * FROM healthsafety WHERE status=('Closed') ORDER BY id desc LIMIT {start},{perPage}
```

**List All:**
```sql
SELECT * FROM healthsafety ORDER BY id desc LIMIT {start},{perPage}
```

**Get one:**
```sql
SELECT * FROM healthsafety WHERE id='{id}'
```

**Insert:**
```sql
INSERT INTO healthsafety(operativesname, arrival_datetime, type, location, reportedby, report, involved, anyoneinjured, whowasinjured, injuryreport, reportit, advise, laterdate, companydetails, witness, witnessname, witnessaddress, witnesscontact, otherwitness, notes)
VALUES('{...}')
```
Note: `status` and `image` are NOT set on INSERT (default NULL).

**Update:**
```sql
UPDATE healthsafety SET status='{status}', operativesname='{operativesname}', arrival_datetime='{arrival_datetime}', type='{type}', location='{location}', reportedby='{reportedby}', report='{report}', involved='{involved}', anyoneinjured='{anyoneinjured}', whowasinjured='{whowasinjured}', injuryreport='{injuryreport}', reportit='{reportit}', advise='{advise}', laterdate='{laterdate}', companydetails='{companydetails}', witness='{witness}', witnessname='{witnessname}', witnessaddress='{witnessaddress}', witnesscontact='{witnesscontact}', otherwitness='{otherwitness}', notes='{notes}'
WHERE id='{id}'
```

**Delete:**
```sql
DELETE FROM healthsafety WHERE id={id}
```

**Upload document:**
```sql
INSERT upload_hs (name, arrival_datetime, submittedby, file_name) VALUES ('{incident_id}','{timestamp}','{operativesname}','{filepath}')
```

**List documents for incident:**
```sql
SELECT * FROM upload_hs WHERE name='{incident_id}' ORDER BY id desc LIMIT {start},{perPage}
```

**Delete document:**
```sql
DELETE FROM upload_hs WHERE id={doc_id}
```

### Permission Map

| Action | Required Levels |
|--------|----------------|
| View listings (Open/All/Closed) | Admin, Admin1, Essex Supervisor |
| View single incident | Admin, Admin1, Essex Supervisor |
| Add incident | Admin, Admin1 |
| Edit incident | Admin, Admin1 |
| Delete incident | **NONE** (security gap — UI hides for non-Admin) |
| Upload document | Admin, Admin1, Essex Supervisor (inherits view) |
| Delete document | **NONE** (security gap — UI hides for non-Admin) |
| Generate PDF | Admin, Admin1, Essex Supervisor |

### Form Fields

**Add/Edit:**

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| operativesname | text | Yes | Reporter name |
| arrival_datetime | text | Auto (readonly) | Y-m-d H:i:s |
| type | text | No | Incident type |
| location | text | No | |
| reportedby | text | No | |
| report | textarea | No | "What Happened?" |
| involved | textarea | No | Parties involved |
| anyoneinjured | text | No | Free text |
| whowasinjured | text | No | |
| injuryreport | textarea | No | |
| reportit | text | No | Reported to manager? |
| advise | text | No | Advised company? |
| laterdate | text | No | Later notification? |
| companydetails | textarea | No | |
| witness | text | No | Was there a witness? |
| witnessname | text | No | |
| witnessaddress | text | No | |
| witnesscontact | number | No | |
| otherwitness | textarea | No | Other witness details |
| notes | textarea | No | Investigation report |
| status | select (edit only) | Yes (edit) | Options: Open, Closed |

### Status Transitions
```
NULL → Open (on first edit or employee submission)
Open → Closed (admin closes after investigation)
Closed → Open (admin can reopen)
```

### Filtering
- **Open listing:** filter by `id` (prefix), `type` (prefix)
- **All listing:** filter by `operativesname` (prefix), `arrival_datetime` (prefix)
- **Closed listing:** filter by `operativesname` (prefix), `arrival_datetime` (prefix)
- **Documents:** filter by `submittedby` (prefix), `arrival_datetime` (prefix)
- All listings: 10 per page, ORDER BY id DESC

### Upload Handling
- **Directory:** `admin/hsupload/`
- **Allowed extensions:** jpeg, jpg, png, gif, bmp, pdf, doc, ppt, docx
- **Filename:** `rand(1000,1000000) + original_filename` (lowercased)
- **No file size limit enforced**
- **No authentication on upload endpoint**

### PDF
- URL: `pdf/h&sformpdf.php?id={id}`
- Library: TCPDF
- Renders all healthsafety fields + inline images from `image` column

### Business Rules
- New incidents have NULL status (not automatically "Open") — **BUG**: they won't appear in Open listing
- Two image sources on view: `healthsafety.image` (employee-uploaded, comma-separated) AND `upload_hs` (admin-uploaded)
- No CSRF protection on forms

---

## 3. Vehicle Checks

### Overview
Admin reviews vehicle safety checks submitted by employees. Can view all, filter by "Action Required" (unsafe/poor condition), edit status to "Closed", and attach documents.

### PHP Files

| File | Purpose |
|------|---------|
| `adminvehiclecheck.php` | Action Required listing |
| `adminvehiclecheckall.php` | All checks listing |
| `adminvehiclecheckclosed.php` | Closed checks listing |
| `adminvehiclecheckadd.php` | Add check (admin-side) |
| `adminvehiclecheckedit.php` | Edit check (change status) |
| `adminvehiclecheckview.php` | View check + upload docs |
| `adminvehiclecheckdelete.php` | Delete check (NO permission check) |
| `adminvehiclecheckdbcontroller.php` | DB connection |
| `adminvehiclecheckperpage.php` | Pagination |

### Database Tables

**`vehicle`:**

| Column | Type | Notes |
|--------|------|-------|
| `id` | INT PK AUTO_INCREMENT | |
| `drivername` | TEXT | |
| `vehiclereg` | TEXT | Registration plate |
| `mileage` | TEXT | |
| `arrival_datetime` | TEXT | Inspection date (Y-m-d H:i:s) |
| `routeplanned` | TEXT | Yes/No |
| `roadconditions` | TEXT | Yes/No |
| `dressedforweather` | TEXT | Yes/No |
| `emergencyequip` | TEXT | Yes/No |
| `tires` | TEXT | Yes/No |
| `lights` | TEXT | Yes/No |
| `windows` | TEXT | Yes/No |
| `loads` | TEXT | Yes/No |
| `washer` | TEXT | Yes/No |
| `oil` | TEXT | Yes/No |
| `fluid` | TEXT | Yes/No |
| `belts` | TEXT | Yes/No |
| `seatbelt` | TEXT | Yes/No |
| `horn` | TEXT | Yes/No |
| `mirrors` | TEXT | Yes/No |
| `brakes` | TEXT | Yes/No |
| `trailercoupling` | TEXT | Yes/No |
| `safetyconnection` | TEXT | Yes/No |
| `loadsecured` | TEXT | Yes/No |
| `loadweight` | TEXT | Yes/No |
| `vehiclecondition` | TEXT | Good/Average/Poor/Very Poor/Dangerous/Closed |
| `safe` | TEXT | Safe/Unsafe/Closed |
| `report` | TEXT | Defect/damage details |
| `notes` | TEXT | Admin notes |

**`upload_vehicle`:**

| Column | Type | Notes |
|--------|------|-------|
| `id` | INT PK | |
| `name` | VARCHAR | References `vehicle.id` |
| `arrival_datetime` | TIMESTAMP | |
| `file_name` | VARCHAR | Path in upload dir |
| `submittedby` | TEXT | Driver name |

### SQL Queries

**Action Required (open/unsafe):**
```sql
SELECT * FROM vehicle WHERE safe=('Unsafe') OR vehiclecondition=('Average') OR vehiclecondition=('Poor') OR vehiclecondition=('Very Poor') OR vehiclecondition=('Dangerous')
ORDER BY id desc LIMIT {start},{perPage}
```

**All:**
```sql
SELECT * FROM vehicle ORDER BY id desc LIMIT {start},{perPage}
```

**Closed:**
```sql
SELECT * FROM vehicle WHERE safe=('Closed') OR vehiclecondition=('Closed')
ORDER BY id desc LIMIT {start},{perPage}
```

**Insert:**
```sql
INSERT INTO vehicle(drivername, vehiclereg, mileage, arrival_datetime, routeplanned, roadconditions, dressedforweather, emergencyequip, tires, lights, windows, loads, washer, oil, fluid, belts, seatbelt, horn, mirrors, brakes, trailercoupling, safetyconnection, loadsecured, loadweight, vehiclecondition, safe, report, notes)
VALUES('{...}')
```

**Update:**
```sql
UPDATE vehicle SET drivername='{...}', vehiclereg='{...}', ..., vehiclecondition='{...}', safe='{...}', report='{...}', notes='{...}'
WHERE id='{id}'
```

**Delete:**
```sql
DELETE FROM vehicle WHERE id={id}
```

### Permission Map

| Action | Required Levels |
|--------|----------------|
| View listings | Admin, Admin1, Admin2 |
| Add check | Admin, Admin1 |
| Edit check | Admin, Admin1 |
| View detail | Admin, Admin1, Admin2 |
| Delete | **NONE** (security gap) |
| Nav tabs | Admin, Admin1, Admin2, Essex Supervisor |

### Form Fields (Add)

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| drivername | text | Yes | |
| vehiclereg | text | Yes | Forced uppercase |
| mileage | number | Yes | |
| arrival_datetime | text | Auto (readonly) | |
| routeplanned | text | No | Yes/No |
| roadconditions | text | No | Yes/No |
| dressedforweather | text | No | Yes/No |
| emergencyequip | text | No | Yes/No |
| tires–brakes (16 items) | text | No | Yes/No checklist |
| trailercoupling | text | No | Yes/No |
| safetyconnection | text | No | Yes/No |
| loadsecured | text | No | Yes/No |
| loadweight | text | No | Yes/No |
| vehiclecondition | text (add) / select (edit) | No | |
| safe | text (add) / select (edit) | No | |
| report | textarea | No | Defects/Damages |
| notes | textarea | No | Admin notes |

### Form Fields (Edit — differs from Add)
- `id` — readonly
- `drivername` — readonly
- `arrival_datetime` — readonly
- `vehiclecondition` — **SELECT** dropdown: Good, Average, Poor, Very Poor, Dangerous, **Closed**
- `safe` — **SELECT** dropdown: Safe, Unsafe, **Closed**
- All checklist fields remain editable text

### Status Transitions
```
vehiclecondition: Good | Average | Poor | Very Poor | Dangerous → Closed
safe: Safe | Unsafe → Closed
```
"Closed" in either field = resolved by admin.

**Action Required filter:** `safe='Unsafe'` OR `vehiclecondition IN ('Average','Poor','Very Poor','Dangerous')`

### Filtering
- All listings: filter by `drivername` (prefix), `arrival_datetime` (prefix)
- 10 per page, ORDER BY id DESC

### Upload
- **Handler:** `ajaxupload1.php`
- **Directory:** `admin/` (vehicle check uploads)
- **Table:** `upload_vehicle`
- **Fields:** name (vehicle.id), arrival_datetime, submittedby, file_name

### PDF
- URL: `pdf/vcpdf.php?id={id}`

---

## 4. Timesheets

### Overview
Admin reviews weekly timesheets submitted by employees. Can approve, reject, or delete. No direct edit of timesheet content from admin side.

### PHP Files

| File | Purpose |
|------|---------|
| `admintimesheets.php` | Submitted/Rejected listing |
| `admintimesheetsall.php` | All timesheets listing |
| `admintimesheetsclosed.php` | Approved timesheets listing |
| `admintimesheetsdelete.php` | Delete timesheet (NO permission check) |
| Employee area: `admintimesheetssview.php` | View timesheet detail |

Note: `admintimesheetsedit.php` referenced in UI but not found on disk — status changes likely happen elsewhere.

### Database Table: `timesheet`

| Column | Type | Notes |
|--------|------|-------|
| `id` | INT PK AUTO_INCREMENT | |
| `name` | TEXT | Employee name |
| `ltrafficid` | TEXT | Employee ID |
| `week` | TEXT | Week commencing date |
| `status` | TEXT | Submitted/Rejected/Approved |
| `date1`–`date7` | TEXT | Day dates (Mon–Sun) |
| `hours1`–`hours7` | TEXT | Hours worked per day |
| `location1`–`location7` | TEXT | Location per day |
| `activity1`–`activity7` | TEXT | Activity per day |
| `contract1`–`contract7` | TEXT | Contract per day |
| `comments` | TEXT | |

### SQL Queries

**Submitted/Rejected (open):**
```sql
SELECT * FROM timesheet WHERE (status=('Submitted') OR status=('Rejected'))
ORDER BY id desc LIMIT {start},{perPage}
```

**Approved (completed):**
```sql
SELECT * FROM timesheet WHERE status=('Approved')
ORDER BY id desc LIMIT {start},{perPage}
```

**All:**
```sql
SELECT * FROM timesheet ORDER BY id desc LIMIT {start},{perPage}
```

**Delete:**
```sql
DELETE FROM timesheet WHERE id={id}
```

**View:**
```sql
SELECT * FROM timesheet WHERE id='{id}'
```

### Permission Map

| Action | Required Levels |
|--------|----------------|
| View listings | Admin, Admin1 |
| View detail | Admin, Admin1 |
| Delete | **NONE** (security gap) |
| Add (link to employee form) | Admin |

### Status Transitions
```
Submitted → Approved (admin approves)
Submitted → Rejected (admin rejects)
Rejected → (employee resubmits as new record)
```

### View Detail Fields (all readonly)
- Week Commencing, Employee ID, Employee Name, Status
- Per day (7 days): Date, Hours, Location, Activity, Contract
- Comments (textarea, readonly)

### Filtering
- Search by `week` field (prefix match)
- 10 per page, ORDER BY id DESC

### PDF
- URL: `pdf/timesheetspdf.php?id={id}`

### Business Rules
- No admin-side add form exists in admin directory — the "Add" link goes to `../admintimesheetadd.php` (employee area)
- Status transitions happen via an edit page that was not found on disk — may be handled by the employee-area view
- `ltrafficid` (not user_id) links timesheet to employee

---

## 5. Bulletins

### Overview
Admin publishes bulletins that employees must read and confirm before accessing the app. Manages bulletin content and tracks read confirmations.

### PHP Files

| File | Purpose |
|------|---------|
| `bulletinadd.php` | Add new bulletin |
| `bulletinmanagement.php` | Bulletin management listing |
| `bulletinmanagementedit.php` | Edit bulletin |
| `bulletinmanagementdelete.php` | Delete bulletin (NO permission check) |
| `bulletins.php` | Read-confirmations listing |
| `bulletinsdelete.php` | Delete confirmation record (NO permission check) |

### Database Tables

**`bulletinnew`** — Bulletin definitions:

| Column | Type | Notes |
|--------|------|-------|
| `id` | INT PK AUTO_INCREMENT | |
| `image` | TEXT | Image filename |
| `title` | TEXT | Bulletin title |
| `ref` | TEXT | Reference code |
| `description` | TEXT | Content |
| `arrival_datetime` | TEXT | Created timestamp |
| `download` | TEXT | Document download link |
| `new` | TEXT | Active flag: '1'=active, '0'=inactive |
| `readby` | TEXT | (unused) |

**`bulletinread`** — Read confirmations:

| Column | Type | Notes |
|--------|------|-------|
| `id` | INT PK AUTO_INCREMENT | |
| `bulletin` | INT | References bulletinnew.id |
| `user_id` | INT | References login_users.user_id |

**`bulletin`** — Legacy/alternate confirmations table:

| Column | Type | Notes |
|--------|------|-------|
| `id` | INT PK AUTO_INCREMENT | |
| `submittedby` | TEXT | Employee name |
| `arrival_datetime` | TEXT | Confirmation timestamp |
| `title` | TEXT | Bulletin title |
| `ref` | TEXT | Bulletin reference |
| `confirm` | TEXT | Confirmation text |

### SQL Queries

**Add bulletin:**
```sql
INSERT INTO bulletinnew (image, title, ref, description, arrival_datetime, download, new, readby)
VALUES('{image}','{title}','{ref}','{description}','{arrival_datetime}','{download}','{new}','{readby}')
```

**List bulletins:**
```sql
SELECT * FROM bulletinnew ORDER BY id desc LIMIT {start},{perPage}
```

**Edit bulletin:**
```sql
UPDATE bulletinnew SET image='{image}', title='{title}', ref='{ref}', description='{description}', arrival_datetime='{arrival_datetime}', download='{download}', new='{new}'
WHERE id='{id}'
```

**Delete bulletin:**
```sql
DELETE FROM bulletinnew WHERE id={id}
```

**Get read confirmations per bulletin:**
```sql
SELECT DISTINCT user_id FROM bulletinread WHERE bulletin={bulletin_id}
SELECT name, user_id FROM login_users WHERE user_id={user_id}
```

**List bulletin confirmations (legacy table):**
```sql
SELECT * FROM bulletin ORDER BY id desc LIMIT {start},25
```

**Delete confirmation:**
```sql
DELETE FROM bulletin WHERE id={id}
```

### Permission Map

| Action | Required Levels |
|--------|----------------|
| Add bulletin | Admin, Admin1 |
| Edit bulletin | Admin, Admin1 |
| View management | Admin, Admin1 |
| View confirmations | Admin, Admin1 |
| Delete bulletin | **NONE** (security gap) |
| Delete confirmation | **NONE** (security gap) |

### Form Fields

**Add Bulletin:**

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| image | text | Yes | Image filename |
| title | text | Yes | |
| ref | text | Yes | Reference code |
| description | textarea | No | |
| arrival_datetime | text | Auto (readonly) | |
| download | text | No | Document link |
| new | text | No | "1=Active, 0=Inactive" |

**Edit Bulletin:**

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| id | text | Readonly | |
| image | text | Yes | |
| title | text | Yes | |
| ref | text | Yes | |
| description | textarea | No | |
| arrival_datetime | text | Readonly | |
| download | text | Yes | |
| new | number | Yes | 1=Active, 0=Inactive |

### Business Rules
- `new = '1'` makes bulletin active and blocks employees on login
- Read tracking uses `bulletinread` table (user_id + bulletin id)
- Management page shows which employees have/haven't confirmed each active bulletin
- Bulletin images served from `bulletin/{filename}` directory
- Document downloads: `http://www.ltraffic.co.uk/employeesarea/{download_value}`
- Confirmations listing shows 25 per page (unlike 10 for other modules)
- No PDF generation for bulletins

---

## 6. HR Manager

### Overview
Admin-only CRUD for employee HR records. No add form in admin — records are created via employee onboarding. Admin can edit details, upload documents (driving licence, passport, PPE, etc.), and view HR profiles.

### PHP Files

| File | Purpose |
|------|---------|
| `hr.php` | HR records listing |
| `hredit.php` | Edit HR record |
| `hrview.php` | View HR record + upload documents |
| `hrdelete.php` | Delete HR record (NO permission check) |
| `hrdocuments.php` | Documents listing for HR record |
| `hrdocumentdelete.php` | Delete HR document (NO permission check) |
| `ajaxupload2.php` | Upload → `hrfiles/` |

### Database Tables

**`hr`:**

| Column | Type | Notes |
|--------|------|-------|
| `id` | INT PK AUTO_INCREMENT | |
| `firstname` | TEXT | |
| `middlename` | TEXT | |
| `surname` | TEXT | |
| `dob` | TEXT | Date of birth |
| `address` | TEXT | |
| `telephone` | TEXT | |
| `email` | TEXT | |
| `nationality` | TEXT | |
| `contactname1` | TEXT | Emergency contact 1 name |
| `contacttelephone1` | TEXT | Emergency contact 1 phone |
| `relation1` | TEXT | Relation to employee |
| `contactname2` | TEXT | Emergency contact 2 name |
| `contacttelephone2` | TEXT | Emergency contact 2 phone |
| `relation2` | TEXT | Relation to employee |
| `employeeid` | TEXT | LTraffic employee ID |
| `jobtitle` | TEXT | |
| `location` | TEXT | Location of works |
| `linemanager` | TEXT | |
| `startdate` | TEXT/DATE | |
| `enddate` | TEXT/DATE | |
| `cis` | TEXT | Construction Industry Scheme number |
| `ninumber` | TEXT | National Insurance number |
| `salary` | TEXT | Day rate or monthly PAYE |
| `ltrafficemail` | TEXT | Company email |
| `ltrafficphone` | TEXT | Company phone |
| `photoimage` | TEXT | URL/path to photo |
| `confirm` | TEXT | Confirmation of reading docs |
| `signature` | TEXT | Digital signature path |
| `arrival_datetime` | TEXT | Date/time of confirmation |
| `notes` | TEXT | |
| `date_signed` | TEXT | |

**`upload_hr`:**

| Column | Type | Notes |
|--------|------|-------|
| `id` | INT PK AUTO_INCREMENT | |
| `name` | VARCHAR | References hr.id |
| `arrival_datetime` | TIMESTAMP | Upload time |
| `submittedby` | TEXT | Always "Administrator" |
| `doctype` | TEXT | Document type category |
| `docdesc` | TEXT | Document description |
| `file_name` | VARCHAR | Path in `hrfiles/` |

### SQL Queries

**List HR records:**
```sql
SELECT * FROM hr ORDER BY employeeid asc LIMIT {start},{perPage}
```

**Search:**
```sql
SELECT * FROM hr WHERE firstname LIKE '{v}%'
SELECT * FROM hr WHERE surname LIKE '{v}%'
```

**Get one:**
```sql
SELECT * FROM hr WHERE id='{id}'
```

**Update:**
```sql
UPDATE hr SET firstname='{...}', middlename='{...}', surname='{...}', dob='{...}', address='{...}', telephone='{...}', email='{...}', nationality='{...}', contactname1='{...}', contacttelephone1='{...}', relation1='{...}', contactname2='{...}', contacttelephone2='{...}', relation2='{...}', employeeid='{...}', jobtitle='{...}', location='{...}', linemanager='{...}', startdate='{...}', enddate='{...}', cis='{...}', ninumber='{...}', salary='{...}', ltrafficemail='{...}', ltrafficphone='{...}', photoimage='{...}', confirm='{...}', signature='{...}', arrival_datetime='{...}', notes='{...}'
WHERE id='{id}'
```

**Delete:**
```sql
DELETE FROM hr WHERE id={id}
```

**Upload document:**
```sql
INSERT upload_hr (name, arrival_datetime, submittedby, doctype, docdesc, file_name)
VALUES ('{hr_id}','{timestamp}','Administrator','{doctype}','{docdesc}','{filepath}')
```

**List documents:**
```sql
SELECT * FROM upload_hr WHERE name='{hr_id}' ORDER BY id desc LIMIT {start},{perPage}
```

**Delete document:**
```sql
DELETE FROM upload_hr WHERE id={doc_id}
```

### Permission Map

| Action | Required Levels |
|--------|----------------|
| View HR listing | Admin, Admin1 |
| Edit HR record | Admin, Admin1 |
| View HR detail | Admin, Admin1 |
| Delete HR record | **NONE** (security gap — UI hides for non-Admin) |
| Upload documents | Admin, Admin1 |
| Delete documents | **NONE** (security gap) |
| View documents listing | Admin, Admin1 |

### Form Fields (hredit.php)

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| firstname | text | Yes | |
| middlename | text | No | |
| surname | text | Yes | |
| dob | text | Yes | Date of birth |
| address | textarea | No | |
| telephone | text | Yes | |
| email | text | Yes | |
| nationality | text | Yes | |
| contactname1 | text | Yes | Primary emergency contact |
| contacttelephone1 | text | Yes | |
| relation1 | text | Yes | |
| contactname2 | text | No | Secondary emergency contact |
| contacttelephone2 | text | No | |
| relation2 | text | No | |
| employeeid | text | Yes | LTraffic ID |
| jobtitle | text | Yes | |
| location | text | Yes | |
| linemanager | text | Yes | |
| startdate | date | Yes | |
| enddate | date | No | |
| cis | text | Yes | CIS number |
| ninumber | text | Yes | NI number |
| salary | text | Yes | |
| ltrafficemail | text | Yes | |
| ltrafficphone | text | No | |
| photoimage | text | Yes | Photo URL/path |
| confirm | text | Yes | |
| signature | text | Yes | |
| arrival_datetime | timestamp | Yes | |
| notes | textarea | No | |

### Upload Document Types (select options)
- Driver Eyesight Check
- Driving Licence
- Driving Licence Check
- Ladder Inspection
- Medical Check
- Passport
- PPE Issue
- Service Contract
- Toolbox Talk
- Other

### Upload Handling
- **Directory:** `admin/hrfiles/`
- **Handler:** `ajaxupload2.php`
- **Allowed extensions:** jpeg, jpg, png, gif, bmp, pdf, doc, ppt, docx
- **Filename:** `rand(1000,1000000) + original_filename`
- **JS script:** `js/script2.js`

### Business Rules
- No ADD form in admin — HR records created by employee onboarding process
- Only UPDATE from admin side
- List ordered by `employeeid ASC`, 10 per page
- Photo displayed as `<img>`, signature displayed as `<img>` in view
- Onboarding PDF: `pdf/onboardingpdf.php`
- Search by firstname or surname (prefix match)

---

## 7. Equipment Register

### Overview
Admin CRUD for equipment asset register. Tracks items by identification number, allocation, condition, and service/calibration expiry.

### PHP Files

| File | Purpose |
|------|---------|
| `er.php` | Equipment listing |
| `eradd.php` | Add equipment |
| `eredit.php` | Edit equipment |
| `erview.php` | View equipment + upload docs |
| `erdelete.php` | Delete (NO permission check) |
| `erdocuments.php` | Documents listing |
| `erdocumentdelete.php` | Delete document (NO permission check) |
| `ajaxupload4.php` | Upload → `erfiles/` |

### Database Tables

**`er`:**

| Column | Type | Notes |
|--------|------|-------|
| `id` | INT PK AUTO_INCREMENT | |
| `item` | TEXT | Item name/description |
| `description` | TEXT | Full description |
| `ident` | TEXT | Identification number (forced uppercase) |
| `allocatedto` | TEXT | Assigned to whom |
| `date` | TEXT | Allocation date |
| `cond` | TEXT | Condition |
| `expiry` | TEXT | Service/Calibration expiry date |
| `notes` | TEXT | |

**`upload_er`:**

| Column | Type | Notes |
|--------|------|-------|
| `id` | INT PK AUTO_INCREMENT | |
| `name` | VARCHAR | References er.id |
| `arrival_datetime` | TIMESTAMP | |
| `submittedby` | TEXT | "Administrator" |
| `doctype` | TEXT | Condition Image / Service-Calibration Expiry / Other |
| `docdesc` | TEXT | Description |
| `file_name` | VARCHAR | Path in `erfiles/` |

### SQL Queries

**List:**
```sql
SELECT * FROM er ORDER BY ident asc LIMIT {start},{perPage}
```

**Search:**
```sql
SELECT * FROM er WHERE item LIKE '{v}%'
SELECT * FROM er WHERE ident LIKE '{v}%'
```

**Insert:**
```sql
INSERT INTO er (item, description, ident, allocatedto, date, cond, expiry, notes)
VALUES('{...}')
```

**Update:**
```sql
UPDATE er SET item='{...}', description='{...}', ident='{...}', allocatedto='{...}', date='{...}', cond='{...}', expiry='{...}', notes='{...}'
WHERE id='{id}'
```

**Delete:**
```sql
DELETE FROM er WHERE id={id}
```

### Permission Map

| Action | Required Levels |
|--------|----------------|
| View listing | Admin, Admin1 |
| Add | Admin, Admin1 (UI button: Admin only) |
| Edit | Admin, Admin1 |
| View detail | Admin, Admin1 |
| Delete | **NONE** (security gap) |

### Form Fields

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| item | text | Yes | Item name |
| description | text | Yes (add), No (edit) | |
| ident | text | Yes | Forced uppercase |
| allocatedto | text | Yes | |
| date | date | No (add), Yes (edit) | Allocation date |
| cond | text | No (add), Yes (edit) | Condition |
| expiry | date | No | Service/Calibration expiry |
| notes | textarea | No | |

### Upload Document Types
- Condition Image
- Service / Calibration Expiry
- Other

### Business Rules
- Ordered by `ident ASC`, 10 per page
- Ident forced uppercase on input
- Back links to `allocation.php` (asset allocation hub)
- No status workflow — simple CRUD register

---

## 8. Vehicle Register

### Overview
Admin CRUD for vehicle fleet register. Active/Archived split by `cond` field. Tracks MOT, tax, and service expiry dates. Links to vehicle inspections.

### PHP Files

| File | Purpose |
|------|---------|
| `vr.php` | Active vehicles listing |
| `vradd.php` | Add vehicle |
| `vredit.php` | Edit vehicle |
| `vrview.php` | View vehicle + upload docs |
| `vrcompleted.php` | Archived vehicles listing |
| `vrdelete.php` | Delete (NO permission check) |
| `vrdocuments.php` | Documents listing |
| `vrdocumentdelete.php` | Delete document (NO permission check) |
| `ajaxupload3.php` | Upload → `vrfiles/` |

### Database Tables

**`vr`:**

| Column | Type | Notes |
|--------|------|-------|
| `id` | INT PK AUTO_INCREMENT | |
| `reg` | TEXT | Registration plate (forced uppercase) |
| `description` | TEXT | Vehicle description |
| `allocatedto` | TEXT | Assigned driver/team |
| `date` | TEXT | Allocation date |
| `cond` | TEXT | Active status: 'Yes'=active, 'No'=archived |
| `mexpiry` | TEXT | MOT expiry date |
| `texpiry` | TEXT | Tax expiry date |
| `sexpiry` | TEXT | Service expiry date |
| `notes` | TEXT | |

**`upload_vr`:**

| Column | Type | Notes |
|--------|------|-------|
| `id` | INT PK AUTO_INCREMENT | |
| `name` | VARCHAR | References vr.id |
| `arrival_datetime` | TIMESTAMP | |
| `submittedby` | TEXT | "Administrator" |
| `doctype` | TEXT | Condition Image / Service-Calibration Expiry / Other |
| `docdesc` | TEXT | Description |
| `file_name` | VARCHAR | Path in `vrfiles/` |

### SQL Queries

**Active vehicles:**
```sql
SELECT * FROM vr WHERE cond='Yes' ORDER BY reg asc LIMIT {start},{perPage}
```

**Archived vehicles:**
```sql
SELECT * FROM vr WHERE cond='No' ORDER BY reg asc LIMIT {start},{perPage}
```

**Insert:**
```sql
INSERT INTO vr (reg, description, allocatedto, date, cond, mexpiry, texpiry, sexpiry, notes)
VALUES('{...}')
```

**Update:**
```sql
UPDATE vr SET reg='{...}', description='{...}', allocatedto='{...}', date='{...}', cond='{...}', mexpiry='{...}', texpiry='{...}', sexpiry='{...}', notes='{...}'
WHERE id='{id}'
```

**Delete:**
```sql
DELETE FROM vr WHERE id={id}
```

### Permission Map

| Action | Required Levels |
|--------|----------------|
| View active vehicles | Admin, Admin1, Essex Supervisor, Admin2 |
| View archived | Admin, Admin1, Admin2 |
| Add vehicle | Admin, Admin1, Admin2 |
| Edit vehicle | Admin, Admin1 |
| View detail | Admin, Admin1, Admin2 |
| Delete | **NONE** (security gap) |
| Maintenance link | Admin, Admin1, Essex Supervisor, Admin2 |

### Form Fields

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| reg | text | Yes | Forced uppercase |
| description | text | Yes (add), No (edit) | |
| allocatedto | text | Yes | |
| date | date | No (add), Yes (edit) | Allocation date |
| cond | select | Yes | Options: Yes (active), No (archived) |
| mexpiry | date | No | MOT expiry |
| texpiry | date | No | Tax expiry |
| sexpiry | date | No | Service expiry |
| notes | textarea | No | |

### Business Rules
- Active/Archived split: `cond='Yes'` = active, `cond='No'` = archived
- Registration forced uppercase
- Ordered by `reg ASC`, 10 per page
- Search by `reg` (prefix) and `allocatedto` (prefix)
- "Maintenance" link → `../vinsp.php?id={vr_id}` (vehicle inspection sub-module)
- PDF: `pdf/vrpdf.php?id={id}`
- Back links to `allocation.php`
- **Linked sub-modules:** VIC (`vic.vrid`), VIR (`vir.vrid`), VRR (`vrr.vrid`)

---

## 9. Plant Register

### Overview
Identical structure to Equipment Register but for plant/machinery. Ordered by expiry date (soonest-to-expire first).

### PHP Files

| File | Purpose |
|------|---------|
| `pr.php` | Plant listing |
| `pradd.php` | Add plant |
| `predit.php` | Edit plant |
| `prview.php` | View plant + upload docs |
| `prdelete.php` | Delete (NO permission check) |
| `prdocuments.php` | Documents listing |
| `prdocumentdelete.php` | Delete document (NO permission check) |
| `ajaxupload5.php` | Upload → `prfiles/` |

### Database Tables

**`pr`:**

| Column | Type | Notes |
|--------|------|-------|
| `id` | INT PK AUTO_INCREMENT | |
| `item` | TEXT | Item name |
| `description` | TEXT | |
| `ident` | TEXT | Identification number (forced uppercase) |
| `allocatedto` | TEXT | |
| `date` | TEXT | Allocation date |
| `cond` | TEXT | Condition |
| `expiry` | TEXT | Service/Calibration expiry |
| `notes` | TEXT | |

**`upload_pr`:**

| Column | Type | Notes |
|--------|------|-------|
| `id` | INT PK AUTO_INCREMENT | |
| `name` | VARCHAR | References pr.id |
| `arrival_datetime` | TIMESTAMP | |
| `submittedby` | TEXT | "Administrator" |
| `doctype` | TEXT | Condition Image / Service-Calibration Expiry / Other |
| `docdesc` | TEXT | Description |
| `file_name` | VARCHAR | Path in `prfiles/` |

### SQL Queries
Same pattern as Equipment Register with table name `pr` instead of `er`.

**Key difference — List ordering:**
```sql
SELECT * FROM pr ORDER BY expiry asc LIMIT {start},{perPage}
```
(Shows soonest-to-expire first)

### Permission Map

| Action | Required Levels |
|--------|----------------|
| View listing | Admin, Admin1 |
| Add | Admin, Admin1 (UI button: Admin only) |
| Edit | Admin, Admin1 |
| View detail | Admin, Admin1 |
| Delete | **NONE** (security gap) |

### Form Fields
Identical to Equipment Register (item, description, ident, allocatedto, date, cond, expiry, notes).

### Business Rules
- Ordered by `expiry ASC` (soonest-to-expire first) — unlike ER which orders by `ident`
- Otherwise structurally identical to Equipment Register
- Back links to `allocation.php`

---

## 10. Document Control

### Overview
Static document repository — admin manages document references (policies, method statements, CoSHH) that employees can download. No approval workflow.

### PHP Files

| File | Purpose |
|------|---------|
| `documentcontrol.php` | Hub page (links to sub-sections) |
| `policies.php` | Policies listing |
| `policiesadd.php` | Add policy |
| `policiesedit.php` | Edit policy |
| `policiesdelete.php` | Delete policy (NO permission check) |
| `methodstatements.php` | Method statements listing |
| `methodstatementsadd.php` | Add method statement |
| `methodstatementsedit.php` | Edit method statement |
| `methodstatementsdelete.php` | Delete (NO permission check) |
| `coshh.php` | CoSHH listing |
| `coshhadd.php` | Add CoSHH |
| `coshhedit.php` | Edit CoSHH |
| `coshhdelete.php` | Delete (NO permission check) |

### Database Tables

**`policies`:**

| Column | Type | Notes |
|--------|------|-------|
| `id` | INT PK AUTO_INCREMENT | |
| `pol1` | TEXT | Document reference (filename base) |
| `pol2` | TEXT | Document title/link text |
| `pol3` | TEXT | Issue number (forced uppercase) |

**`methodstatements`:**

| Column | Type | Notes |
|--------|------|-------|
| `id` | INT PK AUTO_INCREMENT | |
| `ms1` | TEXT | Document reference |
| `ms2` | TEXT | Document title |
| `ms3` | TEXT | Issue number (forced uppercase) |

**`coshh`:**

| Column | Type | Notes |
|--------|------|-------|
| `id` | INT PK AUTO_INCREMENT | |
| `cos1` | TEXT | Document reference |
| `cos2` | TEXT | Document title |
| `cos3` | TEXT | Issue number (forced uppercase) |

### SQL Queries (all three follow same pattern)

**Policies:**
```sql
SELECT * FROM policies ORDER BY id asc LIMIT {start},{perPage}
-- Search:
SELECT * FROM policies WHERE pol1 LIKE '{v}%'
SELECT * FROM policies WHERE pol2 LIKE '{v}%'
-- Insert:
INSERT INTO policies (pol1,pol2,pol3) VALUES('{...}')
-- Update:
UPDATE policies SET pol1='{...}',pol2='{...}',pol3='{...}' WHERE id='{id}'
-- Delete:
DELETE FROM policies WHERE id={id}
```

**Method Statements:** Same with `methodstatements` table, `ms1/ms2/ms3` columns.

**CoSHH:** Same with `coshh` table, `cos1/cos2/cos3` columns.

### Permission Map (same for all three)

| Action | Required Levels |
|--------|----------------|
| View listing | Admin, Admin1 |
| Add | Admin, Admin1 (UI button: Admin only) |
| Edit | Admin, Admin1 (UI button: Admin only) |
| Delete | **NONE** (security gap) |

### Form Fields (same pattern for all three)

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| [x]1 | text | Yes | Document reference (filename base) |
| [x]2 | text | Yes | Document title/link |
| [x]3 | text | Yes | Issue number, forced uppercase |

### Document Storage Paths
- Policies: `../downloads/policies/{pol1}.pdf`
- Method Statements: `../downloads/methodstatement/{ms1}.pdf`
- CoSHH: `../downloads/coshh/{cos1}.pdf`

### Business Rules
- All three sub-modules are structurally identical (3-column reference tables)
- Documents are physical PDF files stored in `downloads/` directory
- The admin only manages metadata — actual file upload is manual/FTP
- 40 per page (unlike other modules which use 10)
- Ordered by `id ASC`
- Search by reference (col1, prefix) and title (col2, prefix)
- No status workflow — pure CRUD register

---

## 11. Admin Dashboard

### File: `adminhome.php`

**Permission:** `protect("Admin, Admin1, Admin2, Essex Supervisor")`

### Dashboard Links by Role

| Module | Required Levels (protectThis) |
|--------|-------------------------------|
| Reported Incidents | Admin, Admin1, Essex Supervisor |
| Vehicle Checks | Admin, Admin1, Admin2 |
| Timesheets | Admin, Admin1 |
| Bulletin Manager | Admin, Admin1 |
| HR Manager | Admin, Admin1 |
| Equipment Allocation | Admin, Admin1, Essex Supervisor, Admin2 |
| Document Control | Admin, Admin1 |
| Site Inspections | Admin, Admin1, Essex Supervisor |
| User Admin | Admin, Admin1 |

### File: `allocation.php`
Hub page linking to: Equipment Register (`er.php`), Vehicle Register (`vr.php`), Plant Register (`pr.php`).

---

## 12. Cross-Cutting Patterns

### Database Connection
- **Host:** localhost
- **User:** users1
- **Password:** LTraffic2021!#
- **Database:** lt_employee
- **Driver:** mysqli (no prepared statements in CRUD files)
- **DBController class:** `runQuery()` → array of assoc arrays; `numRows()` → int; `executeQuery()` → bool

### Permission System
- `protect($levels)` — page-level block (redirect if unauthorized)
- `protectThis($levels)` — inline boolean (show/hide UI elements)
- Levels: comma-separated names or IDs
- Session: `$_SESSION['jigowatt']['user_level']` — PHP array of level IDs
- Match: `array_intersect()` between user levels and allowed levels

### Pagination Pattern
- Default: 10 per page (except: bulletins confirmations=25, document control=40)
- POST-based page number
- `numRows()` used for total count
- Submit buttons for page numbers with sliding window

### Upload Pattern (all ajaxupload*.php)
1. Validate extension against whitelist: `jpeg, jpg, png, gif, bmp, pdf, doc, ppt, docx`
2. Generate random prefix: `rand(1000, 1000000)`
3. Lowercase filename: `strtolower($filename)`
4. Move to module-specific directory
5. INSERT into module-specific upload table with: parent record ID (`name`), timestamp, submitter, filepath
6. **No file size validation**
7. **No MIME type checking**
8. **No authentication on upload endpoints**

### Upload Directories

| Handler | Directory | Table |
|---------|-----------|-------|
| `ajaxupload.php` | `hsupload/` | `upload_hs` |
| `ajaxupload1.php` | (vehicle) | `upload_vehicle` |
| `ajaxupload2.php` | `hrfiles/` | `upload_hr` |
| `ajaxupload3.php` | `vrfiles/` | `upload_vr` |
| `ajaxupload4.php` | `erfiles/` | `upload_er` |
| `ajaxupload5.php` | `prfiles/` | `upload_pr` |

### Security Gaps (to fix in Node.js API)
1. **SQL Injection:** All CRUD files use direct string concatenation
2. **Missing auth on delete endpoints:** All `*delete.php` files lack `protect()` calls
3. **Missing auth on upload endpoints:** `ajaxupload*.php` files include only DB connection, not auth check
4. **No CSRF tokens:** Forms have no CSRF protection
5. **GET-based deletes:** DELETE operations use GET with `$_GET["id"]` — should be POST/DELETE with auth
6. **Password re-hashing bug:** `adminindexedit.php` applies `md5()` to the existing hash when no new password is entered
7. **No file size limits:** Upload handlers don't enforce max size
8. **Direct object references:** All IDs passed via URL without ownership verification

### Search Pattern
- All search fields use `LIKE '{value}%'` (prefix match only)
- Search is POST-based (form submission)
- Multiple search fields combined with AND
- No full-text search, no contains search

### Listing Display Pattern
Every listing page shows: table with key columns + action links (View, Edit, Delete, PDF). Action link visibility controlled by `protectThis()` per role.
