# 04 — Employee Module Catalog (Deep Dive)

**Purpose:** Complete implementation specification for every employee-portal module. Each section has enough detail that a senior engineer can build the Node.js API without re-reading PHP source.
**Source files:** `C:\rizwan\LTraffic\employeesarea-php\`

---

## Table of Contents

1. [Vehicle Check (Daily Pre-trip)](#1-vehicle-check)
2. [Vehicle Inspection Checklist (VIC)](#2-vehicle-inspection-checklist-vic)
3. [Equipment Check (PUWER)](#3-equipment-check)
4. [Risk Assessment (RA)](#4-risk-assessment-ra)
5. [Site Inspection (INSP)](#5-site-inspection-insp)
6. [Wildanet Risk Assessment (WRA)](#6-wildanet-risk-assessment-wra)
7. [Wildanet Site Inspection (WINSP)](#7-wildanet-site-inspection-winsp)
8. [Civils Jobs](#8-civils-jobs)
9. [TFL Jobs](#9-tfl-jobs)
10. [Wildanet Jobs](#10-wildanet-jobs)
11. [Maintenance Jobs](#11-maintenance-jobs)
12. [Work Records](#12-work-records)
13. [Timesheets](#13-timesheets)
14. [H&S Incident Form](#14-hs-incident-form)
15. [MEWP](#15-mewp)
16. [WAH (Working at Height)](#16-wah)
17. [UG (Underground Works)](#17-ug-underground-works)
18. [Expenses](#18-expenses)
19. [Onboarding](#19-onboarding)
20. [Contacts](#20-contacts)
21. [Documents Hub](#21-documents-hub)
22. [Bulletins](#22-bulletins)
23. [Clegg Testing](#23-clegg-testing)
24. [Pre-site](#24-pre-site)
25. [Gateway](#25-gateway)
26. [Calendar](#26-calendar)
27. [Cross-Cutting Patterns](#27-cross-cutting-patterns)

---

## 1. Vehicle Check

### Overview
Daily pre-trip vehicle inspection. Employee completes a 16-item Yes/No safety checklist, rates condition/safety, reports defects. Cookie prevents re-submission within 8 hours.

### PHP Files

| File | Purpose |
|------|---------|
| `vehiclecheck.php` | Form for general drivers (no trailer) |
| `vehiclecheck1.php` | Form for Civils Trailer Drivers (includes trailer fields) |
| `vehiclecheck1a.php` | Form for all drivers with trailer (includes enctype) |
| `vehiclechecka.php` | Same as vehiclecheck.php without cookie guard |
| `insert.php` | INSERT handler |
| `completedvehiclechecks.php` | User's completed checks list |

### Permission Checks

| File | Levels |
|------|--------|
| vehiclecheck.php | Admin, Admin1, Admin2, Driving Operatives, Civils TFL Driver, Maintenance Operative, Essex Supervisor |
| vehiclecheck1.php | Admin, Civils Trailer Driver |
| vehiclecheck1a.php | Admin, Admin1, Driving Operatives, Civils Trailer Driver, Civils TFL Driver, Maintenance Operative, Essex Supervisor |
| completedvehiclechecks.php | Admin, Admin1, Driving Operatives, Civils Trailer Driver, Civils TFL Driver, Maintenance Operative, Essex Supervisor |

### Cookie Throttling

```php
// insert.php sets 8-hour cookie after successful submission
$cookie_name = 'ltraffic_limited_cookie';
setcookie($cookie_name, $cookie_value, time() + 28800, '/');

// Form pages check cookie — redirect to home.php if exists
if (isset($_COOKIE['ltraffic_limited_cookie'])) {
    header('Location: home.php');
    exit;
}
```
`vehiclechecka.php` does NOT check the cookie (allows re-submission).

### Database Table: `vehicle`

| Column | Type | Values |
|--------|------|--------|
| id | INT PK | |
| drivername | TEXT | From profile |
| vehiclereg | TEXT | From profile (uppercase) |
| mileage | TEXT | Number |
| arrival_datetime | TEXT | "l d F Y (H:i:s)" |
| routeplanned | TEXT | Yes/No |
| roadconditions | TEXT | Yes/No |
| dressedforweather | TEXT | Yes/No |
| emergencyequip | TEXT | Yes/No |
| tires | TEXT | Yes/No |
| lights | TEXT | Yes/No |
| windows | TEXT | Yes/No |
| loads | TEXT | Yes/No |
| washer | TEXT | Yes/No |
| oil | TEXT | Yes/No |
| fluid | TEXT | Yes/No |
| belts | TEXT | Yes/No |
| seatbelt | TEXT | Yes/No |
| horn | TEXT | Yes/No |
| mirrors | TEXT | Yes/No |
| brakes | TEXT | Yes/No |
| trailercoupling | TEXT | Yes/No/N/a |
| safetyconnection | TEXT | Yes/No/N/a |
| loadsecured | TEXT | Yes/No |
| loadweight | TEXT | Yes/No |
| vehiclecondition | TEXT | Good/Average/Poor/Very Poor/Dangerous |
| safe | TEXT | Safe/Unsafe |
| report | TEXT | Defect details |
| notes | TEXT | Admin notes (not set by employee) |

### SQL — INSERT (insert.php)
```sql
INSERT INTO vehicle (drivername, vehiclereg, mileage, arrival_datetime, routeplanned, roadconditions, dressedforweather, emergencyequip, tires, lights, windows, loads, washer, oil, fluid, belts, seatbelt, horn, mirrors, brakes, trailercoupling, safetyconnection, loadsecured, loadweight, vehiclecondition, safe, report)
VALUES ('{...}')
```

### SQL — List (completedvehiclechecks.php)
```sql
SELECT * FROM vehicle WHERE drivername='{profile_name}' ORDER BY id desc LIMIT {start},{perPage}
```

### Form Fields

| Field | Type | Default | Required | Notes |
|-------|------|---------|----------|-------|
| drivername | text | profile name | Yes | readonly |
| vehiclereg | text | profile vehiclereg | Yes | uppercase |
| mileage | number | | Yes | |
| arrival_datetime | text | DateTime string | Yes | readonly |
| routeplanned–brakes (16 items) | radio | Yes | | Yes/No, default Yes |
| trailercoupling | radio/hidden | Yes or "N/a" | | Hidden="N/a" on non-trailer forms |
| safetyconnection | radio/hidden | Yes or "N/a" | | Same as above |
| loadsecured | radio | Yes | | |
| loadweight | radio | Yes | | |
| vehiclecondition | radio | Good | | 5 options |
| safe | radio | Safe | | Safe/Unsafe |
| report | textarea | | | Defect details |

### PDF
`pdf/vcpdf.php?id={id}`

---

## 2. Vehicle Inspection Checklist (VIC)

### Overview
4-part vehicle inspection linked to a Vehicle Register (`vr`) record. 109+ numbered checklist fields with Pass/Fail/N/a radio buttons. FilePond image uploads per section.

### PHP Files

| File | Purpose |
|------|---------|
| `vehicleinspectionchecklist.php` | Part 1 — Interior, Exterior, Glass, Trailer Plug |
| `vehicleinspectionchecklistpg2.php` | Part 2 — Suspension, Steering, Wheels, Engine Bay, Tyres |
| `vehicleinspectionchecklistpg3.php` | Part 3 — Lights, Exhaust |
| `vehicleinspectionchecklistpg4.php` | Part 4 — Summary, Sign-off |
| `vic1upload.php` | INSERT handler (Part 1) |
| `vic3upload.php` | UPDATE handler (Part 2) |
| `vic5upload.php` | UPDATE handler (Part 3) |
| `vic7upload.php` | UPDATE handler (Part 4) |
| `vic.php` | Listing of all VICs |
| `vicdelete.php` | Delete |

### Permission Checks

| File | Levels |
|------|--------|
| Part 1 | Admin, Admin1, Civils Trailer Driver, Essex Supervisor, Admin2 |
| Parts 2–4 | Admin, Admin1, Civils Trailer Driver, Essex Supervisor |
| vic.php (list) | Admin, Admin1, Essex Supervisor |
| PDF | Admin, Admin1, Civils Trailer Driver, Essex Supervisor, Customer, Admin2 |

### Database Table: `vic`

Columns: `id`, `vic1`–`vic109`, `status`, `vrid`, `vehid`, `type`, `image`, `image1`, `image2`, `image3`

**Column mapping by section:**

| Section | Columns | Content |
|---------|---------|---------|
| Part 1 | vic1–vic36, status, vrid, vehid, type, image | Interior (vic5–vic21), Exterior (vic22–vic26), Glass/Mirrors (vic27–vic32), Trailer (vic33–vic34), Logs (vic35–vic36) |
| Part 2 | vic37–vic77, image1 | Suspension (vic39–vic47), Steering (vic48–vic50), Wheels (vic51–vic54), Engine (vic55–vic62), Tyre Depth (vic63–vic75), Logs (vic76–vic77) |
| Part 3 | vic87–vic100, image2 | Lights (vic89–vic95), Exhaust (vic96–vic98), Logs (vic99–vic100) |
| Part 4 | vic101–vic109, status, image3 | Summary/sign-off |

### Multi-Section Flow
```
Part 1 → vic1upload.php [INSERT, status="In Progress"] → Part 2?id=<new_id>
Part 2 → vic3upload.php [UPDATE] → Part 3?id=<id>
Part 3 → vic5upload.php [UPDATE] → Part 4?id=<id>
Part 4 → vic7upload.php [UPDATE, status="Completed"] → vic.php
```

### Key Form Fields (Part 1)
- `vic1` — Inspection By (readonly, profile name)
- `vic2` — Vehicle Registration (readonly, from `vr` table)
- `vic3` — Mileage (number, required)
- `vic4` — Date (readonly, auto)
- `vic5`–`vic34` — 30 radio groups (Pass/Fail or Pass/Fail/N/a)
- `vic35` — Advisory Log (textarea)
- `vic36` — Defect Log (textarea)
- `status` — hidden "In Progress"
- `vrid` — hidden (vr record ID)
- `image[]` — FilePond multiple, max 4, **required** on Part 1

### Key Form Fields (Part 4 — Sign-off)
- `vic103` — Vehicle Safe to Drive? (Yes/No, required)
- `vic104` — Advisory Works Required? (Yes/No, required)
- `vic106` — Defect Works Required? (Yes/No, required)
- `vic109` — hidden digital signature path (`admin/employeesignature/<name1>.jpg`)
- `status` — hidden "Completed"

### Upload Handling
- Part 1: `vic1/`, Part 2: `vic2/`, Part 3: `vic3/`, Part 4: `vic4/`
- FilePond with `max-files="4"`, `storeAsFile: true`
- Multiple images stored as comma-separated paths in `image`, `image1`, `image2`, `image3` columns

### PDF
`pdf/vicpdf.php?id={id}`

---

## 3. Equipment Check

### Overview
PUWER (Provision and Use of Work Equipment Regulations) check for plant/equipment. 15-item Pass/Fail checklist with condition/safety rating and image upload.

### PHP Files
- `equipmentchecklist.php` — New check form
- `insertcheck.php` — INSERT handler
- `equipmentchecks.php` — List view
- `equipmentcheck.php` — Edit form
- `equipmentchecksdetails.php` — View + document upload
- `equipmentcheckdelete.php` — Delete

### Permission: Admin, Admin1, Civils Trailer Driver, Essex Supervisor

### Database Table: `equipmentcheck`

| Column | Values |
|--------|--------|
| id | PK |
| operativesname | profile name |
| description | Equipment description |
| ident | Serial number |
| arrival_datetime | Date string |
| brakes–fuel (15 items) | Pass/Fail |
| cond | Good/Average/Poor/Very Poor/Dangerous |
| safe | Safe/Unsafe |
| report | Defect details |
| image | Comma-separated paths |

### SQL — INSERT
```sql
INSERT INTO equipmentcheck (operativesname,description,ident,arrival_datetime,brakes,steering,seatbelt,mirrors,tyres,wheelsecurity,rotatingbeacon,horn,warninglights,coolant,seat,access,fuel,cond,safe,report,image)
VALUES ('{...}')
```

### Form Fields
| Field | Type | Required |
|-------|------|----------|
| operativesname | text (readonly) | Yes |
| description | text | Yes |
| ident | text | Yes |
| arrival_datetime | text (readonly) | Yes |
| brakes–fuel (15 items) | radio Pass/Fail | |
| cond | radio (5 options) | |
| safe | radio Safe/Unsafe | |
| report | textarea | |
| image[] | FilePond, max 4, image/* | Yes |

### Upload: `equipmentcheck/` directory, FilePond, comma-separated in `image` column

### PDF: `pdf/echeckpdf.php?id={id}`

---

## 4. Risk Assessment (RA)

### Overview
5-section risk assessment linked to a Civils job. Covers site details, personnel, hazards (17 items), permit to dig (10 questions), and end-of-day report. Includes digital signatures and mandatory image uploads.

### PHP Files
| File | Purpose |
|------|---------|
| `ra1.php`–`ra5.php` | Form sections 1–5 |
| `ra1upload.php` | INSERT (Section 1) |
| `ra3upload.php` | UPDATE (Section 2) |
| `ra5upload.php` | UPDATE (Section 3) |
| `ra8upload.php` | UPDATE (Section 4) |
| `ra9upload.php` | UPDATE (Section 5) |
| `ra.php` | List (In Progress) |
| `racom.php` | List (Completed) |
| `rahome.php` | Section navigation hub |

### Permission: Admin, Admin1, Civils Trailer Driver, Essex Supervisor

### Parent Link: `ra.civils` = `civils.id`

### Database Table: `ra` (74+ columns)

| Range | Section | Content |
|-------|---------|---------|
| civils | FK | Parent civils job ID |
| ra1 | S1 | Project Name (select) |
| ra2 | S1 | Date/Time |
| ra3 | S1 | Job Number (from civils.solonumber) |
| ra4 | S1 | Location (from civils.location) |
| ra5 | S1 | Completed By (profile name) |
| ra6–ra7 | S1 | Permit Start/End (from civils) |
| ra8 | S1 | Scope of Works (select) |
| ra9–ra11 | S1 | Safety Yes/No questions |
| ra12 | S1 | Services details (textarea) |
| ra13 | S2 | Date/Time |
| ra14 | S2 | Site Supervisor (select) |
| ra15 | S2 | Site Lead/Team (select) |
| ra16–ra20 | S2 | Operatives 1–5 |
| ra21–ra28 | S2 | Visitors + employers |
| ra29 | S2 | Other Personnel (textarea) |
| ra30 | S3 | Date/Time |
| ra31–ra48 | S3 | 18 Hazard Yes/No/N/a questions |
| ra49 | S3 | Comments (textarea) |
| ra50 | S4 | Completed By |
| ra51 | S4 | Date/Time |
| ra52–ra61 | S4 | 10 Permit-to-Dig questions |
| ra62 | S4 | Comments (textarea) |
| ra63 | S4 | Digital signature path |
| ra64 | S5 | Completed By |
| ra65 | S5 | Date/Time |
| ra66–ra72 | S5 | 7 End-of-day questions |
| ra73 | S5 | Comments (textarea) |
| ra74 | S5 | Digital signature path |
| status | — | "In Progress" / "RA Completed" |
| client | S1 | Client name (from civils) |
| image | S1 | Pre-start images (comma-sep) |
| image1 | S2 | Personnel images |
| image2 | S3 | Hazards images |
| image3 | S4 | Permit images (required) |
| image4 | S5 | End-of-day images (required) |

### Multi-Section Flow
```
ra1.php [INSERT, status="In Progress"] → ra2.php?id=<new_id>
ra2.php [UPDATE] → ra3.php?id=<id>
ra3.php [UPDATE] → ra4.php?id=<id>
ra4.php [UPDATE] → rahome.php?id=<id>
ra5.php [UPDATE, status="RA Completed"] → civils.php
```

### Pre-populated from Parent (`civils`)
- `civils.solonumber` → ra3 (Job Number)
- `civils.location` → ra4 (Location)
- `civils.startdate` → ra6 (Permit Start)
- `civils.enddate` → ra7 (Permit End)
- `civils.client` → client

### Digital Signatures
- Section 4: `ra63` = `admin/employeesignature/<name1>.jpg`
- Section 5: `ra74` = `admin/employeesignature/<name1>.jpg`

### Upload Directories
S1: `ra/`, S2: `ra1/`, S3: `ra2/`, S4: `ra3/`, S5: `ra4/`

### Scope of Works Options
Civils Installation, Rod & Rope Installation, Pole Installation, Aerial Installation, Underground Installation, Fibre Splicing

### PDF: `pdf/rapdf.php?id={id}` (full) or `pdf/ra1pdf.php`–`ra5pdf.php` (per section)

---

## 5. Site Inspection (INSP)

### Overview
8-section site inspection linked to a Civils job. Covers site info, vehicles, documentation, facilities, working at height, PPE, environment, and summary. Each section has a Pass/Fail/Follow Up result.

### PHP Files
`insp1.php`–`insp8.php` (forms), `insp1upload.php`–`insp8upload.php` (handlers), `insp.php` (list), `insphome.php` (hub)

### Permission: Admin, Admin1, Civils Trailer Driver, Essex Supervisor

### Parent Link: `insp.civilsid` = `civils.id`

### Database Table: `insp` (63+ columns)

| Range | Section | Content |
|-------|---------|---------|
| civilsid | FK | Parent civils job ID |
| in1 | P1 | Site Reference (from civils.solonumber) |
| in2 | P1 | Location (from civils.location) |
| in3 | P1 | Completed By |
| in4 | P1 | Date/Time |
| in5 | P1 | Client (from civils.client) |
| in6 | P1 | Site Ganger (from civils.assignedto) |
| in7 | P1 | Operatives on Site (textarea) |
| in8 | P1 | Site Activities (textarea) |
| by1, ti1 | P2 | Completed By, Date |
| in9–in22 | P2 | 14 Vehicle questions |
| in23 | P2 | Comments |
| pt2r | P2 | Result (Pass/Fail/Follow Up/N/a) |
| by2–by6, ti2–ti6 | P3–P7 | Completed By, Date per part |
| in24–in61 | P3–P7 | Section questions |
| pt3r–pt7r | P3–P7 | Results |
| by7, ti7 | P8 | Completed By, Date |
| in62 | P8 | Overall Result (Pass/Follow Up/Fail) |
| in63 | P8 | Summary Comments |
| status | — | "In Progress" / "Inspection Awaiting Review" / "Completed" |
| image–image7 | P1–P8 | Section images (comma-sep) |

### Status Transitions
```
INSERT: status = "In Progress"
Section 8: status = "Inspection Awaiting Review"
Admin review: status = "Completed"
```

### PDF: `pdf/insppdf.php?id={id}`

---

## 6. Wildanet Risk Assessment (WRA)

Structurally identical to RA (Section 4) but:
- **Table:** `wra` instead of `ra`
- **Parent link:** `wra.civils` = `wildanet.id`
- **Project name:** "Wildanet Project"
- **Upload dirs:** `wra/`, `wra1/`, `wra2/`, `wra3/`, `wra4/`
- **Completion redirects to:** `wildanetra.php`

All column names (ra1–ra74), field types, and flow are identical.

---

## 7. Wildanet Site Inspection (WINSP)

Structurally identical to INSP (Section 5) but:
- **Table:** `winsp` instead of `insp`
- **Parent link:** `winsp.civilsid` = `wildanet.id`
- **Upload dirs:** `winsp1/`–`winsp8/`
- **Completion redirects to:** `wildanetsiteinsp.php`

All column names (in1–in63, pt2r–pt7r), field types, and 8-section flow are identical.

---

## 8. Civils Jobs

### Overview
Core job management for Essex civils work. Full CRUD with document uploads, status tracking, and links to sub-records (RA, Inspections, Pre-site).

### PHP Files
- `civils.php` — Active jobs (excludes closed statuses)
- `civilsadmin.php` — All jobs
- `civilsadd.php` — Add job
- `civilsedit.php` — Edit job
- `civilsdetails.php` — View + upload docs
- `civilsdocuments.php` — Documents listing
- `civilsdelete.php` — Delete

### Permission Checks
| File | Levels |
|------|--------|
| civils.php | Admin, Admin1, Admin2, Civils Trailer Driver, Customer, Essex Supervisor |
| civilsadmin.php | Admin, Admin1, Admin2, Essex Supervisor |
| civilsadd.php | Admin, Admin1, Admin2 |
| civilsedit.php | Admin, Admin1, Admin2 |
| civilsdetails.php | Admin, Admin1, Admin2, Civils Trailer Driver, Customer, Essex Supervisor |

### Database Table: `civils`

| Column | Type | Notes |
|--------|------|-------|
| id | INT PK | |
| jobstatus | TEXT | Status enum |
| assignedto | TEXT | Team/person assignment |
| client | TEXT | Comteq Utilities / MAP Group |
| authority | TEXT | Essex / Suffolk |
| community | TEXT | Area/town |
| solonumber | TEXT | Job reference (uppercase) |
| location | TEXT | Address (uppercase) |
| postcode | TEXT | (uppercase) |
| permitstatus | TEXT | Permit workflow status |
| startdate | TEXT | YYYY-MM-DD |
| enddate | TEXT | YYYY-MM-DD |
| notes | TEXT | |
| upload | TEXT | Legacy single image |
| image | TEXT | (unused?) |

### SQL — Active Listing
```sql
SELECT * FROM civils WHERE jobstatus NOT IN ('Completed','Cancelled','Closed','Invoiced','Awaiting Invoicing')
ORDER BY startdate desc LIMIT {start},10
```

### SQL — INSERT
```sql
INSERT INTO civils(jobstatus, assignedto, client, authority, community, solonumber, location, postcode, permitstatus, startdate, enddate, notes) VALUES('{...}')
```

### SQL — UPDATE
```sql
UPDATE civils SET jobstatus='{...}', assignedto='{...}', client='{...}', authority='{...}', community='{...}', solonumber='{...}', location='{...}', postcode='{...}', permitstatus='{...}', startdate='{...}', enddate='{...}', notes='{...}' WHERE id='{id}'
```

### Form Fields
| Field | Type | Options |
|-------|------|---------|
| jobstatus | select | Pending, Live, In Progress, Delayed, Completed, Part Completed, Cancelled, Awaiting Invoicing, Invoiced, Closed |
| assignedto | select | CT1-CT4 crews, RE1, individual names, Planning, Invoicing, Closed |
| client | select | Comteq Utilities, MAP Group (UK) |
| authority | select | Essex, Suffolk |
| community | select | ~20 Essex area options |
| solonumber | text | uppercase |
| location | text | uppercase |
| postcode | text | uppercase |
| permitstatus | select | In Progress, Granted, Private, Refused, Delayed, Submitted, Awaiting Submission, Registration Required, Works Completed |
| startdate | date | |
| enddate | date | |
| notes | textarea | |

### Upload (civilsdetails.php → ajaxupload.php)
- **Table:** `upload_data`
- **Document types:** A537, A55 As-Laid Drawing, Briefing Register, EWN, Fitness to Work, HAVS Assessment, Job Pack, Notice Registration, Permit to Dig, Risk Assessment, Site Image, Trial Hole Register, Other
- **Directory:** standard upload path

### Sub-record Links
- Daily RA: `dailyra.php?id={civils_id}`
- Site Inspection: `siteinsp.php?id={civils_id}`
- Pre-site: `presiteform.php?id={civils_id}`
- Documents: `civilsdocuments.php?id={civils_id}`

### Filtering
- `assignedto` (prefix), `jobstatus` (prefix), `permitstatus` (prefix), `solonumber` (prefix)
- 10 per page, ORDER BY startdate DESC

---

## 9. TFL Jobs

### Overview
Same structure as Civils but for Transport for London contract work. Uses `tfl` table with different client/area/assignment options. Includes material tracking sub-module.

### Database Table: `tfl`
Same columns as civils plus: `customer`, `jobnumber`, `sitereference`, `area`, `workstream`

### SQL — Active Listing
```sql
SELECT * FROM tfl WHERE jobstatus NOT IN ('Pending','Delayed','Completed','Cancelled','Awaiting Invoicing','Invoiced','Closed')
ORDER BY startdate desc LIMIT {start},10
```

### SQL — INSERT
```sql
INSERT INTO tfl (jobstatus, assignedto, customer, jobnumber, sitereference, location, postcode, area, workstream, permitstatus, startdate, enddate, notes) VALUES('{...}')
```

### Form Fields (differences from Civils)
| Field | Options |
|-------|---------|
| customer | Telent, Siemens, Cubic, Colas |
| area | London boroughs (01-Westminster through 29-Harrow) |
| workstream | Civils & Installation, Civils, Installation, Maintenance, Other |
| assignedto | Civils Team 1-4, individuals, Planning, Invoicing, Closed |

### Permission: Admin, Admin1, Civils TFL Driver

### Material Sub-module (Table: `tflmaterial`)
| Column | Type |
|--------|------|
| id | PK |
| item | TEXT |
| unitsremaining | TEXT |
| location | TEXT |
| status | TEXT: In Stock/Low Stock/Out of Stock/On Order |

### Upload (tfldetails.php → ajaxupload1.php)
- **Table:** `upload_tfl`
- **Document types:** 18 options including Controller Spec, TSRAMS, Site Electrical Design, etc.

---

## 10. Wildanet Jobs

### Overview
Same pattern as Civils but for Wildanet client. Uses `wildanet` table. Job creation includes FilePond file upload for job packs.

### Database Table: `wildanet`
Same as civils with additional: `image` (comma-separated job pack paths)

### SQL — Active Listing
```sql
SELECT * FROM wildanet WHERE jobstatus NOT IN ('Completed','Cancelled','Closed','Invoiced','Awaiting Invoicing')
ORDER BY startdate desc LIMIT {start},10
```

### SQL — INSERT (with file upload)
```sql
INSERT INTO wildanet (jobstatus,assignedto,client,authority,community,solonumber,location,postcode,permitstatus,startdate,enddate,notes,image) VALUES ('{...}','{comma-separated paths}')
```

### Form Fields (differences)
| Field | Options |
|-------|---------|
| client | Wildanet, Nokia |
| authority | Cornwall, Devon |
| community | Germoe, Helston, Leedstown, Marazion, Penzance, St Buryan, St Ives |
| jobstatus | Adds "Outstanding Defect(s)" option |
| image[] | FilePond multi-file (PDF only), uploaded to `jobpacks/` |

### Permission: Admin, Admin1, Admin2, Civils Trailer Driver, Essex Supervisor (view); Admin only (add)

### Upload — Document attachment
- **Table:** `wupload_data`
- Handler similar to civils

### Sub-record Links
- Daily RA: `wildanetdailyra.php?id={id}` → `wra` table
- Site Inspection: `wildanetsiteinsp.php?id={id}` → `winsp` table

---

## 11. Maintenance Jobs

### Overview
Same pattern as TFL but for maintenance contract work. Uses `maintenance` table.

### SQL — Listing (shows ALL, no status filter)
```sql
SELECT * FROM maintenance ORDER BY startdate desc LIMIT {start},10
```

### Form Fields (differences from TFL)
| Field | Options |
|-------|---------|
| assignedto | Recut Team, individuals, Planning, Invoicing, Closed |
| workstream | Magnetometer Recut, Maintenance, Other |

### Permission: Admin, Admin1 only

### Material Sub-module (Table: `maintenancematerial`)
Same structure as `tflmaterial`.

### Upload (maintenancedetails.php → ajaxupload3.php)
- **Table:** `upload_maintenance`

---

## 12. Work Records

### Overview
Multi-status workflow tracking work items for Wildanet fibre installations. 9 separate listing pages (one per status). FilePond image upload (max 10).

### PHP Files
- `workrecord.php` — Pending
- `workrecordsubmitted.php` — Submitted
- `workrecordquotation.php` — Quotation Sent
- `workrecordapproved.php` — Works Approved
- `workrecordcompleted.php` — Completed
- `workrecordinvoiced.php` — Invoiced
- `workrecordclosed.php` — Closed
- `workrecordissues.php` — Issues to Rectify
- `workrecordfibre.php` — Fibre
- `workrecordadd.php` — Add (→ `insertwr.php`)
- `workrecordedit.php` — Edit (→ `editwr.php`)
- `workrecordimages.php` — View images

### Permission: Admin, Admin1, Admin2, Civils Trailer Driver, Essex Supervisor

### Database Table: `workrecord`

| Column | Type | Notes |
|--------|------|-------|
| id | INT PK | |
| lt1 | TEXT | Recorded By (profile name) |
| lt2 | TEXT | Date/Time (auto) |
| lt3 | TEXT | Road Name (uppercase) |
| lt4 | TEXT | Cabinet Area (select) |
| lt5 | TEXT | Primary Node (number) |
| lt6 | TEXT | SN Type (select) |
| lt7 | TEXT | Secondary Node (number) |
| lt8 | TEXT | Structure ID (uppercase) |
| lt9 | TEXT | Type of Works (select) |
| lt10 | TEXT | Works Status (select) |
| lt11 | TEXT | Notes |
| lt12 | TEXT | Ducting Length (number) |
| status | TEXT | Workflow status |
| image | TEXT | Comma-separated image paths |

### Status Values (workflow)
```
Pending → Issues to Rectify → Submitted → Quotation Sent → Works Approved → Completed → Invoiced → Fibre → Closed
```

### SQL per listing
```sql
SELECT * FROM workrecord WHERE status IN ('{status}') ORDER BY id asc LIMIT {start},{perPage}
```
Pagination: 50 per page (Pending), 30 per page (Fibre)

### Form Fields (Add)
| Field | Type | Options |
|-------|------|---------|
| lt1 | text (readonly) | profile name |
| lt2 | text (readonly) | DateTime |
| lt3 | text | Road Name (uppercase) |
| lt4 | select | Germoe, Penzance |
| lt5 | number | Primary Node |
| lt6 | select | UGSN, FJP, PMSN, PMCE, Agg.Node, MSN, Track Joint |
| lt7 | number | Secondary Node |
| lt8 | text | Structure ID (uppercase) |
| lt12 | number | Ducting Length |
| lt9 | select | ~15 work type options (A55 types, installations, etc.) |
| lt10 | select | A55 to be raised, I/N/R to be raised, Work Completed |
| lt11 | textarea | Notes |
| status | hidden | "Pending" |
| image[] | FilePond, max 10, image/* | Required |

### Form Fields (Edit — additional)
- `status` — select with all 9 status options

### Upload: FilePond → `insertwr.php`, images stored comma-separated in `workrecord.image`

### PDF: `pdf/wrpdf.php?id={id}`

---

## 13. Timesheets

### Overview
Weekly timesheet with 7 days × 4 fields (hours, location, activity, contract). Employee-filtered view (can only see own). Status set to "Submitted" on creation.

### PHP Files
- `timesheetadd.php` — Add form
- `timesheetupload.php` — INSERT handler
- `timesheets.php` — Open/Rejected (own)
- `timesheetsall.php` — All (own)
- `timesheetsclosed.php` — Approved (own)

### Permission: Admin, Admin1, Driving Operatives, Civils Trailer Driver, Civils TFL Driver, Maintenance Operative, Essex Supervisor

### Database Table: `timesheet`

| Column | Notes |
|--------|-------|
| id | PK |
| week | Week commencing (Monday date, auto-calculated) |
| ltrafficid | Employee ID (from profile) |
| name | Employee name (from profile) |
| date1–date7 | Day dates (Mon–Sun) |
| hours1–hours7 | Hours per day |
| location1–location7 | Location per day |
| activity1–activity7 | Activity per day |
| contract1–contract7 | Contract per day |
| comments | Free text |
| status | Submitted/Rejected/Approved |

### SQL — INSERT
```sql
INSERT INTO timesheet (week,ltrafficid,name,date1,hours1,location1,activity1,contract1,...,date7,hours7,location7,activity7,contract7,comments,status)
VALUES ('{...}')
```

### SQL — Listing (own records only)
```sql
SELECT * FROM timesheet WHERE name='{profile_name}' AND (status='Submitted' OR status='Rejected')
ORDER BY id desc LIMIT {start},{perPage}
```

### Form Fields (per day × 7)
| Field | Type | Options |
|-------|------|---------|
| date[N] | auto | Day date string |
| hours[N] | number | |
| location[N] | text | |
| activity[N] | select | Civils Installation, Defects, Supervision, Validation, Holiday, Sick |
| contract[N] | select | Essex - Gigaclear, London - Transport for London |

Additional:
- `comments` — textarea
- `status` — hidden "Submitted"
- `week` — hidden (auto-calculated Monday of this week)
- `ltrafficid` — hidden (from profile)
- `name` — hidden (from profile)

### Business Rules
- Week auto-calculated from current date (Monday of this week)
- Employee sees only their own timesheets (filtered by `name`)
- No duplicate prevention (can submit multiple for same week)
- `ltrafficid` (not user_id) links to employee

### PDF: `pdf/timesheetspdf.php?id={id}`

---

## 14. H&S Incident Form

### Overview
Employee reports accidents/incidents. Comprehensive narrative form with type classification, witness details, and up to 10 image uploads via FilePond.

### PHP Files
- `h&sform.php` — Form
- `insert1.php` — INSERT handler

### Permission: Admin, Admin1, Operatives, Driving Operatives, Civils TFL Driver, Civils Trailer Driver, Customer, Essex Supervisor

### SQL — INSERT
```sql
INSERT INTO healthsafety (operativesname,arrival_datetime,type,location,reportedby,report,involved,anyoneinjured,whowasinjured,injuryreport,reportit,advise,laterdate,companydetails,witness,witnessname,witnessaddress,witnesscontact,otherwitness,notes,status,image)
VALUES ('{...}')
```

### Form Fields
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| operativesname | text (readonly) | Yes | profile name |
| arrival_datetime | datetime-local | | |
| type | radio | | Accident/Customer Complaint/Customer Engagement/Environmental/Incident/Near Miss/Service Strike |
| location | text | Yes | |
| reportedby | text | Yes | |
| report | textarea | Yes | "What happened?" |
| involved | textarea | | Parties involved |
| anyoneinjured | radio Yes/No | Yes | |
| whowasinjured | text | | |
| injuryreport | textarea | | |
| reportit | radio Yes/No | Yes | Reported to manager? |
| advise | radio Yes/No | Yes | Advised company? |
| laterdate | radio Yes/No | Yes | Notified later? |
| companydetails | textarea | | |
| witness | radio Yes/No | Yes | |
| witnessname | text | | |
| witnessaddress | text | | |
| witnesscontact | number | | |
| otherwitness | textarea | | |
| notes | hidden (empty) | | Admin fills later |
| status | hidden "Open" | | |
| image[] | FilePond, max 10, image/* | | |

### Upload
- Directory: `admin/hsupload/`
- Max 10 files, image/* only
- Comma-separated in `healthsafety.image`

### PDF: `pdf/h&sformpdf.php?id={id}`

---

## 15. MEWP

### Overview
Mobile Elevating Work Platform safety submission. Node/location fields plus 10-item safety checklist. Submit-only workflow (no admin review beyond viewing/deleting).

### PHP Files
- `mewpadd.php` — Form
- `insertmewp.php` — INSERT handler
- `ugoh2.php` — Listing
- `mewpdelete.php` — Delete

### Permission: Admin, Admin1, Civils Trailer Driver, Essex Supervisor

### Database Table: `mewp`
Columns: `id`, `mewp1`–`mewp15`, `pn`, `snt`, `sn`, `type`, `status`, `image`

### SQL — INSERT
```sql
INSERT INTO mewp (mewp1,mewp2,mewp3,mewp4,pn,snt,sn,mewp5,mewp6,mewp7,mewp8,mewp9,mewp10,mewp11,mewp12,mewp13,mewp14,mewp15,type,status,image) VALUES ('{...}')
```

### Form Fields
| Field | Type | Notes |
|-------|------|-------|
| mewp1 | text (readonly) | Operative name |
| mewp2 | text (required) | Job Location |
| mewp3 | text (readonly) | Date/Time |
| mewp4 | select | Cabinet Area (7 options) |
| pn | number (required) | Primary Node |
| snt | select | SN Type (7 options) |
| sn | number (required) | Secondary Node |
| mewp5 | select Yes/No | LOLER Inspection in Date? |
| mewp6 | select | MEWP Registration (2 vehicle options) |
| mewp7–mewp9 | select Yes/No | Condition checks |
| mewp10 | select Safe/Unsafe | Pole Condition |
| mewp11–mewp13 | select Yes/No | Safety checks |
| mewp14 | textarea | Notes/Defects |
| type | hidden "MEWP Works" | |
| status | hidden "Submitted" | |
| image[] | FilePond, max 10, image/* | |

### Upload: `mewp/` directory

---

## 16. WAH

### Overview
Working at Height safety submission. Nearly identical to MEWP but for ladder-based work.

### Database Table: `wah`
Columns: `id`, `wah1`–`wah14`, `pn`, `snt`, `sn`, `type`, `status`, `image`

### Form Fields (differences from MEWP)
| Field | Notes |
|-------|-------|
| wah5 | Ladder Inspection in Date? |
| wah6 | Ladder ID (select: 2 ladder options) |
| wah7 | Ladders in Good Condition? |
| wah12 | Ladders securely tied? |
| type | hidden "Overhead Works" |

### Upload: `wah/` directory

### Permission: Same as MEWP

---

## 17. UG (Underground Works)

### Overview
Underground works safety submission. Similar to MEWP/WAH but with underground-specific checks (barriers, gas monitor, sandbags).

### Database Table: `ug`
Columns: `id`, `ug1`–`ug13`, `pn`, `snt`, `sn`, `type`, `status`, `image`

### Form Fields
| Field | Notes |
|-------|-------|
| ug5 | Barriers/Gate Guards? |
| ug6 | Sandbags Available? |
| ug7 | Gas Monitor Available? |
| ug8 | PPE Good? |
| ug9 | Weather Suitable? |
| ug10 | Safe Working Area (Red Book)? |
| ug11 | Correct Equipment/Tooling? |
| ug12 | Safe Site Set-up? (Safe/Unsafe) |
| ug13 | Notes/Defects |
| type | hidden "Underground Works" |

### Upload: `ug/` directory

### Permission: Same as MEWP

---

## 18. Expenses

### Overview
Minimal expense claim form. Uses deprecated `mysql_*` functions. No file uploads, no admin workflow.

### PHP Files
- `expenses.php` — Form
- `insert4.php` — INSERT handler

### Permission: Admin, Admin1, Admin2, Driving Operatives, Civils Trailer Driver, Civils TFL Driver, Maintenance Operative, Operatives

### Database Table: `expenses`
Columns: `id`, `operativesname`, `arrival_datetime`, `amount`, `reason`, `agreed`, `status`

### SQL — INSERT
```sql
INSERT INTO expenses (operativesname, arrival_datetime, amount, reason, agreed) VALUES ('{...}')
```

### Form Fields
| Field | Type | Options |
|-------|------|---------|
| operativesname | text (readonly) | profile name |
| arrival_datetime | text (readonly) | auto timestamp |
| amount | text (required) | Total value claimed |
| reason | select | Equipment, Hotel, Hire, Material, Tools, Other |
| agreed | select | Anthony Louch, Ben Louch, LTraffic Office |
| status | text | "Submitted" (visible) |

### Business Rules
- Purchases must be agreed with management prior to claim
- No admin approval/rejection workflow in code
- Redirect after insert: `home.php`
- Uses deprecated `mysql_*` API

---

## 19. Onboarding

### Overview
New employee self-registration form. INSERTs into `hr` table (same table admin HR module manages). Captures personal details, emergency contacts, and auto-signs with stored signature image.

### PHP Files
- `onboarding.php` — Form
- `insert3.php` — INSERT handler

### Permission: Admin, Admin1, Admin2, Driving Operatives, Civils Trailer Driver, Civils TFL Driver, Maintenance Operative, Operatives, Essex Supervisor

### SQL — INSERT
```sql
INSERT INTO hr (firstname,middlename,surname,dob,address,telephone,email,nationality,contactname1,contacttelephone1,relation1,contactname2,contacttelephone2,relation2,employeeid,startdate,cis,ninumber,photoimage,confirm,signature,arrival_datetime,date_signed) VALUES ('{...}')
```

### Form Fields
| Field | Type | Required |
|-------|------|----------|
| firstname | text | Yes |
| middlename | text | |
| surname | text | Yes |
| dob | date | Yes |
| address | textarea | Yes |
| telephone | text | Yes |
| email | text | Yes |
| nationality | text | Yes |
| contactname1 | text | Yes |
| contacttelephone1 | text | Yes |
| relation1 | text | Yes |
| contactname2 | text | Yes |
| contacttelephone2 | text | Yes |
| relation2 | text | Yes |
| cis | text | Yes (CIS Number) |
| ninumber | text | Yes (NI Number) |
| startdate | date | Yes |
| employeeid | hidden | From profile.ltrafficid |
| confirm | hidden | "I [name] Confirm..." |
| signature | hidden | `employeesignature/<name1>.jpg` |
| photoimage | hidden | `employeephoto/<name1>.jpg` |
| arrival_datetime | hidden | Auto datetime |
| date_signed | hidden | Auto datetime |

### Business Rules
- Inserts into same `hr` table that admin manages
- Signature displayed from `admin/employeesignature/<name1>.jpg`
- Employee confirms reading all LTraffic documents (links to `documents.php`)

### PDF: `pdf/onboardingpdf.php`

---

## 20. Contacts

### Overview
Read-only employee directory. Queries `hr` table for contact information. No write operations.

### PHP Files: `contacts.php`

### Permission: All authenticated users

### SQL
```sql
SELECT * FROM hr ORDER BY employeeid asc LIMIT {start},{perPage}
```

### Displayed Columns
employeeid, firstname, surname, ltrafficphone, ltrafficemail, jobtitle, linemanager, location, photoimage

### Filtering
- firstname (prefix), surname (prefix)
- 10 per page

---

## 21. Documents Hub

### Overview
Navigation page linking to document categories. No database queries — static links.

### PHP Files: `documents.php`

### Permission: All authenticated users

### Links to:
- `policies.php` — Policies
- `methodstatements.php` — Method Statements
- `sop.php` — SOPs/Processes
- `coshh.php` — CoSHH
- `bulletinmanagement.php` — Bulletins

---

## 22. Bulletins

### Overview
Post-login gate. If an active bulletin exists (`new='1'`) and employee hasn't confirmed it, they're blocked from accessing the app until they click "I Confirm". Sets 8-hour cookie after confirmation.

### PHP Files
- `bulletin.php` — Gate for Driving Operatives/TFL/Maintenance/Supervisor roles
- `bulletin1.php` — Gate for Operatives role
- `bulletin2.php` — Gate for Civils Trailer Driver role
- `bulletinreadinsert.php` — INSERT confirmation

### SQL — Check for active bulletin
```sql
SELECT * FROM bulletinnew WHERE new='1'
```

### SQL — Check if already read
```sql
SELECT * FROM bulletinread WHERE bulletin={bulletin_id} AND user_id='{user_id}'
```

### SQL — INSERT confirmation
```sql
INSERT INTO bulletinread (bulletin, user_id) VALUES ('{bulletin_id}','{user_id}')
```

### Cookie Logic
After confirmation:
```php
setcookie('ltraffic_limited_cookie', $value, time() + 28800, '/'); // 8 hours
```
On page load, if cookie exists → skip bulletin, redirect to next page.

### Flow
1. Login redirects to `bulletin.php` / `bulletin1.php` / `bulletin2.php` (by role)
2. Check `bulletinnew WHERE new='1'` — if no active bulletin → redirect to vehicle check or home
3. Check `bulletinread` for this user — if already confirmed → redirect to home
4. Display bulletin (title, description, image, download link)
5. Employee clicks "I Confirm" → INSERT into `bulletinread` → set cookie → redirect

### Bulletin Display Fields
- `title`, `description`, `image` (from `bulletin/<filename>`), `download` link

---

## 23. Clegg Testing

### Overview
Soil compaction testing (Clegg Impact Soil Tester). Records test results with pass/fail thresholds. Linked to Wildanet jobs.

### PHP Files
- `cleggtestingadd.php` — Form
- `insertct.php` — INSERT handler
- `cleggtesting.php` — Listing
- `cleggtestingdetails.php` — View
- `editct.php` — Edit
- `cleggtestingdelete.php` — Delete

### Permission: Admin, Admin1, Admin2, Civils Trailer Driver, Essex Supervisor

### Database Table: `cleggtesting`
Columns: `id`, `ct1`–`ct13`, `image`

### SQL — INSERT
```sql
INSERT INTO cleggtesting (ct1,ct2,ct3,ct4,ct5,ct6,ct7,ct8,ct9,ct10,ct11,ct12,ct13,image) VALUES ('{...}')
```

### Form Fields
| Field | Type | Notes |
|-------|------|-------|
| ct1 | text (uppercase) | Job Number |
| ct2 | text (required, uppercase) | Location of Test |
| ct3 | text (readonly) | Date of Test |
| ct4 | text (readonly) | Conducted By (profile name) |
| ct5 | select | Cabinet Area (7 options) |
| ct6 | select | Surface: Footway / Carriageway |
| ct7 | select | Test Unit (fixed option) |
| ct8 | text (required) | Calibration Expiry Date |
| ct9 | text (required) | Clegg Test Reading |
| ct10 | select | Result: Pass / Fail |
| ct11 | text | Re-Test Reading (optional) |
| ct12 | select | Re-Test Result: N/a / Pass / Fail |
| ct13 | textarea | Notes |
| image[] | FilePond, max 6, image/* | |

### Business Rules
- Minimum acceptable reading: 22 (Footway), 30 (Carriageway)
- Pre-loads `wildanet` record for job context when accessed with `?id=`

### Upload: `clegg/` directory

### PDF: `pdf/ctpdf.php?id={id}`

---

## 24. Pre-site

### Overview
Pre-start site assessment form linked to a Civils job. Checks job pack availability, services identification, site safety before work begins.

### PHP Files
- `presiteform.php` — Form (loaded with civils job context)
- `psupload.php` — INSERT handler
- `presited.php` — Listing
- `presitedetails.php` — View
- `presiteedit.php` — Edit
- `presiteddelete.php` — Delete

### Permission: Admin, Admin1, Admin2, Civils Trailer Driver, Customer, Essex Supervisor

### Database Table: `presite`
Columns: `id`, `operativesname`, `arrival_datetime`, `solonumber`, `location`, `otheroperatives`, `workstype`, `jobpack`, `services`, `servicessite`, `servicesreport`, `safetostart`, `advise`, `safetycomments`, `same`, `otherdetails`, `image`

### SQL — INSERT
```sql
INSERT presite (operativesname,arrival_datetime,solonumber,location,otheroperatives,workstype,jobpack,services,servicessite,servicesreport,safetostart,advise,safetycomments,same,otherdetails,image) VALUES ('{...}')
```

### Form Fields
| Field | Type | Notes |
|-------|------|-------|
| operativesname | text (readonly) | profile name |
| arrival_datetime | text (readonly) | auto |
| solonumber | text (required) | Job Number |
| location | text (required, uppercase) | |
| otheroperatives | text (required, uppercase) | |
| workstype | radio | Noticed (Permit) / Private |
| jobpack | radio Yes/No | Site Job Pack Available? |
| services | radio Yes/No | Services Identified on Job Pack? |
| servicessite | radio Yes/No | Services Located on Site? |
| servicesreport | textarea | |
| safetostart | radio Yes/No | Site safe to start? |
| advise | radio Yes/No | Residents/Land Owners advised? |
| safetycomments | textarea | |
| same | radio Yes/No | Work matches estimate? |
| otherdetails | textarea | |
| image | file (single) | Standard PHP upload (not FilePond) |

### Upload: `presite/` directory, single file, standard `move_uploaded_file()`

---

## 25. Gateway

### Overview
Simple image gallery upload. Multiple images uploaded and displayed in a grid. Minimal — no status, no workflow.

### PHP Files
- `gatewaycheck.php` — Upload form + gallery display
- `gatewayupload.php` — Upload handler

### Permission: Admin, Admin1, Admin2, Civils Trailer Driver, Customer

### Database Table: `gateway`
Columns: `id`, `file_name`, `uploaded_on`

### SQL — Gallery
```sql
SELECT * FROM gateway ORDER BY id DESC
```

### SQL — INSERT (multiple rows)
```sql
INSERT INTO gateway (file_name, uploaded_on) VALUES ('{file1}', NOW()), ('{file2}', NOW()), ...
```

### Upload Handling
- Directory: `gatewaycheck/`
- Allowed types: jpg, png, jpeg, gif
- Filename: original preserved (NO random prefix)
- Standard `move_uploaded_file()` (NOT FilePond)
- Multiple files via `files[]` input

---

## 26. Calendar

### Overview
Pure PHP-generated HTML calendar. No database events — just a month grid with navigation. Also displays civils job listing on the same page.

### PHP Files: `calender.php`

### Permission: Admin, Admin1, Civils Trailer Driver

### Features
- `?ym=YYYY-MM` GET parameter for month navigation
- Highlights today
- No event storage — cosmetic only
- Also queries `civils` table for job listing below calendar

---

## 27. Cross-Cutting Patterns

### Database Connection (all modules)
- Host: `localhost`
- User: `users1`
- Password: `LTraffic2021!#`
- Database: `lt_employee`
- Driver: mysqli (most modules) / deprecated mysql_* (expenses)

### Authentication & Authorization
- `classes/check.class.php` provides `protect()` and `protectThis()`
- `classes/profile.class.php` provides `$profile->getField('name|name1|ltrafficid|vehiclereg|user_id')`
- Session: `$_SESSION['jigowatt']['user_level']` — PHP array of level IDs

### Upload Pattern — FilePond (modern modules)
```javascript
FilePond.registerPlugin(
  FilePondPluginImagePreview,
  FilePondPluginImageExifOrientation,
  FilePondPluginFileValidateSize,
  FilePondPluginImageEdit,
  FilePondPluginFileValidateType
);
FilePond.create(document.querySelector('#uploadImage'), { storeAsFile: true });
```
- Input: `<input type="file" name="image[]" multiple data-max-files="4|6|10">`
- Backend: validates extension, generates `rand(1000,1000000) + lowercase(filename)`
- Storage: comma-separated paths in single TEXT column

### Upload Pattern — Standard (legacy modules)
- `<input type="file" name="image">`
- Same random-prefix naming, `move_uploaded_file()`
- Single path in DB column

### Allowed Extensions (all handlers)
`jpeg, jpg, png, gif, bmp, pdf, doc, ppt, zip, xlsx, docx`

### Upload Directories Summary

| Module | Directory |
|--------|-----------|
| Vehicle Check | (none — no uploads) |
| VIC | `vic1/`, `vic2/`, `vic3/`, `vic4/` |
| Equipment Check | `equipmentcheck/` |
| RA | `ra/`, `ra1/`, `ra2/`, `ra3/`, `ra4/` |
| INSP | `insp1/`–`insp8/` |
| WRA | `wra/`, `wra1/`, `wra2/`, `wra3/`, `wra4/` |
| WINSP | `winsp1/`–`winsp8/` |
| Civils docs | via ajaxupload.php |
| TFL docs | via ajaxupload1.php |
| Wildanet job packs | `jobpacks/` |
| Maintenance docs | via ajaxupload3.php |
| Work Records | via insertwr.php |
| H&S | `admin/hsupload/` |
| MEWP | `mewp/` |
| WAH | `wah/` |
| UG | `ug/` |
| Pre-site | `presite/` |
| Clegg Testing | `clegg/` |
| Gateway | `gatewaycheck/` |

### Digital Signature Pattern
- Stored as image at `admin/employeesignature/<name1>.jpg`
- `name1` = full name with no spaces (from `login_users.name1`)
- Used in: RA (sections 4 & 5), WRA (sections 4 & 5), VIC (part 4), Onboarding
- Hidden form field contains the path — displayed as `<img>` in confirmation sections

### Pagination Defaults

| Module | Per Page | Order |
|--------|----------|-------|
| Most modules | 10 | id DESC |
| Work Records (Pending) | 50 | id ASC |
| Work Records (Fibre) | 30 | id ASC |
| Civils/TFL/Wildanet/Maintenance | 10 | startdate DESC |

### Per-Client Table Duplication
These sets of tables are structurally near-identical:

| Pattern | Civils | Wildanet | TFL | Maintenance |
|---------|--------|----------|-----|-------------|
| Jobs | `civils` | `wildanet` | `tfl` | `maintenance` |
| RA | `ra` | `wra` | — | — |
| Inspection | `insp` | `winsp` | — | — |
| Documents | `upload_data` | `wupload_data` | `upload_tfl` | `upload_maintenance` |
| Material | — | — | `tflmaterial` | `maintenancematerial` |

### Security Issues (for Node.js to fix)
1. ALL SQL uses direct string concatenation (SQL injection everywhere)
2. No CSRF tokens on any form
3. No server-side validation (HTML `required` only)
4. Cookie-based throttle easily bypassed (clear cookie)
5. No file size limits enforced
6. No MIME type checking on uploads
7. Some delete endpoints lack `protect()` calls
8. GET-based deletes with no confirmation server-side
9. Deprecated `mysql_*` API in expenses module
