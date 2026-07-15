# 05 - Database Analysis

> **Database:** `lt_employee`
> **Host:** 127.0.0.1:3307 (MariaDB)
> **Tables:** 68 (all InnoDB, mostly utf8)
> **Foreign Keys:** None enforced (all relationships are application-level)

---

## Table of Contents

1. [Domain Overview](#domain-overview)
2. [Tables by Domain](#tables-by-domain)
3. [Entity Relationships](#entity-relationships)
4. [Key Observations](#key-observations)
5. [Recommended Missing Indexes](#recommended-missing-indexes)
6. [Shared Tables (Admin + Employee)](#shared-tables-admin--employee)

---

## Domain Overview

| Domain | Tables | Total Rows (approx) | Notes |
|--------|--------|---------------------|-------|
| A. Authentication & User Management (Legacy) | 9 | ~11,170 | PHP-era login system |
| B. Authentication (New Node.js API) | 6 | ~9 | `lt_` prefixed, properly typed |
| C. Alternative Account System | 3 | ~6 | Abandoned new API attempt |
| D. Timesheets | 1 | 208 | Weekly timesheets |
| E. Health & Safety | 6 | ~2,213 | Incidents, risk assessments, COSHH |
| F. Inspections | 2 | ~30 | Site inspections |
| G. Work at Height / MEWP / Underground | 3 | ~147 | Numbered-field forms |
| H. Human Resources | 2 | ~23 | Employee records, expenses |
| I. Vehicle Management | 5 | ~10,993 | Daily checks, register, inspections |
| J. Jobs/Projects | 6 | ~945 | Per-client job tables |
| K. Materials | 5 | ~64 | Materials, equipment, plant registers |
| L. Work Records | 1 | 193 | Field work records |
| M. Bulletins | 4 | ~571 | Bulletins, read/confirm tracking |
| N. Document Uploads | 11 | ~1,549 | Per-entity upload tables |
| O. File/Image Management | 3 | ~3 | Generic (mostly unused) |
| P. Policies | 2 | ~84 | Policies and processes |
| Q. Contacts | 1 | 13 | Address book |
| R. Testing | 1 | 9 | Soil compaction testing |

---

## Tables by Domain

### A. Authentication & User Management (Legacy)

| Table | Rows | PK | Key Columns | Indexes |
|-------|------|----|-------------|---------|
| `login_users` | 22 | `user_id` | `user_level` (PHP serialized), `username` (UNIQUE), `name`, `email`, `password` (MD5), `ltrafficid`, `team`, `name1`, `onboarding`, `timestamp`, `teamup`, `vehiclereg`, `tmp_auth_token`, `sms_time`, `phone`, `use_two_factor_auth`, `restricted` | `ix_email(email)` |
| `login_levels` | 9 | `id` | `level_name`, `level_disabled`, `redirect` | -- |
| `login_timestamps` | 11,033 | `id` | `user_id`, `ip`, `timestamp` | `ix_user_ts(user_id, timestamp)` |
| `login_confirm` | 5 | `id` | `data`, `username`, `email`, `key`, `type` | `ix_key_type(key, type)` |
| `login_integration` | 0 | -- | Social login fields | -- |
| `login_profiles` | 0 | -- | Profile field values | -- |
| `login_profile_fields` | 0 | -- | Profile field definitions | -- |
| `login_settings` | 55 | -- | `option_name` (UNIQUE), `option_value` (longtext) | -- |
| `loginhistory` | 45 | -- | `username`, `timestamp` | -- |

**Notes:**
- `login_users.user_level` stores a PHP serialized array (e.g., `a:3:{i:0;s:1:"1";...}`)
- `login_users.password` is MD5-hashed (legacy; Node.js API lazy-rehashes to bcrypt)
- `login_users.ltrafficid` is the cross-reference key used in timesheets and HR

---

### B. Authentication (New Node.js API - `lt_` prefix)

| Table | Rows | PK | Key Columns | Indexes |
|-------|------|----|-------------|---------|
| `lt_user_credentials` | 2 | `user_id` | `bcrypt_hash`, `md5_snapshot`, `updated_at` | -- |
| `lt_refresh_tokens` | 7 | `id` | `user_id`, `token_hash` (UNIQUE), `device_id`, `user_agent`, `ip`, `expires_at`, `revoked_at`, `created_at` | `ix_user_active`, `ix_expires` |
| `lt_audit_logs` | 0 | `id` | `user_id`, `action`, `entity`, `entity_id`, `before_json` (JSON), `after_json` (JSON), `ip`, `created_at` | `ix_created`, `ix_entity`, `ix_user_action` |
| `lt_device_tokens` | 0 | `id` | `user_id`, `token`(191, UNIQUE), `platform` ENUM(ios,android), `app_version`, `last_seen_at`, `revoked_at`, `created_at` | `ix_user_active` |
| `lt_notifications` | 0 | `id` | `user_id`, `type`, `title`, `body`, `data_json` (JSON), `sent_at`, `read_at` | `ix_type`, `ix_user_read` |
| `lt_notification_logs` | 0 | `id` | `notification_id`, `user_id`, `device_token_id`, `status` ENUM(queued,sent,failed,skipped), `error_message`, `created_at` | `ix_notification`, `ix_user_status` |

**Notes:**
- These tables are properly typed with JSON columns, ENUMs, and appropriate indexes
- `lt_user_credentials` caches bcrypt hashes alongside the original MD5 snapshot for lazy rehash
- `lt_refresh_tokens` supports multi-device JWT sessions with revocation

---

### C. Alternative Account System (Abandoned)

| Table | Rows | PK | Key Columns | Indexes |
|-------|------|----|-------------|---------|
| `account` | 3 | `id` | `name`, `username`, `password`, `email`, `role_id`, `status`, `created_at`, `updated_at` | `fk_account_role` |
| `accounts` | 1 | `id` | `username`, `password`, `email` | -- |
| `role` | 2 | `id` | `name` (Employee, Supervisor) | -- |

**Notes:**
- Appears to be from an abandoned earlier API attempt
- Not used by current application logic

---

### D. Timesheets

| Table | Rows | PK | Key Columns | Indexes |
|-------|------|----|-------------|---------|
| `timesheet` | 208 | `id` | `week`, `ltrafficid`, `name`, `date1`-`date7` (text), `hours1`-`hours7` (text), `location1`-`location7`, `activity1`-`activity7`, `contract1`-`contract7`, `comments`, `status` (text: Submitted/Approved/Rejected), `arrival_datetime` (text) | -- |

**Notes:**
- Links to `login_users` via `ltrafficid` (NOT `user_id`)
- All date/hour columns are TEXT type (not DATE/TIME)
- Weekly structure: 7 sets of columns for each day (date, hours, location, activity, contract)
- Status values: `Submitted`, `Approved`, `Rejected`

---

### E. Health & Safety

| Table | Rows | PK | Key Columns | Indexes |
|-------|------|----|-------------|---------|
| `healthsafety` | 999 | `id` | `operativesname`, `arrival_datetime`(text), `type`, `location`, `reportedby`, `report`, `involved`, `anyoneinjured`, `whowasinjured`, `injuryreport`, `reportit`, `advise`, `laterdate`, `companydetails`, `witness`, `witnessname`, `witnessaddress`, `witnesscontact`, `otherwitness`, `notes`, `status`(text: Open/Closed), `image`(text) | -- |
| `ra` | 775 | `id` | `ra1`-`ra74` (all text), `civils` (links to civils.id), `status` (In Progress/RA Completed), `client`, `image`, `image1`-`image4` | -- |
| `wra` | 380 | `id` | Same structure as `ra`; `civils` column links to `wildanet.id` | -- |
| `presite` | 24 | `id` | Many numbered fields, `image`(longtext), `arrival_datetime`(text) | -- |
| `coshh` | 9 | `id` | `cos1`, `cos2`, `cos3` | -- |
| `methodstatements` | 26 | `id` | `ms1`, `ms2`, `ms3` | -- |

**Notes:**
- `ra` has 74 numbered columns (extreme denormalization)
- `ra.civils` references `civils.id`; `wra.civils` references `wildanet.id` (confusing naming)
- Status values: `Open`/`Closed` (healthsafety), `In Progress`/`RA Completed` (ra/wra)

---

### F. Inspections

| Table | Rows | PK | Key Columns | Indexes |
|-------|------|----|-------------|---------|
| `insp` | 0 | `id` | `in1`-`in63`+ (numbered fields), `civilsid` (links to civils.id), `image`-`image7`, `status` | -- |
| `winsp` | 30 | `id` | Same structure; `civilsid` links to `wildanet.id` | -- |

**Notes:**
- 63+ numbered columns per row
- Per-client duplication pattern (insp for civils, winsp for Wildanet)

---

### G. Work at Height / MEWP / Underground

| Table | Rows | PK | Key Columns | Indexes |
|-------|------|----|-------------|---------|
| `wah` | 67 | `id` | Numbered fields, `status`(text: Submitted), `image`(text) | -- |
| `mewp` | 39 | `id` | Same pattern | -- |
| `ug` | 41 | `id` | Same pattern | -- |

**Notes:**
- All three follow the same numbered-field form pattern
- Status: `Submitted`

---

### H. Human Resources

| Table | Rows | PK | Key Columns | Indexes |
|-------|------|----|-------------|---------|
| `hr` | 21 | `id` | `name`, `address1`-`3`, `postcode`, `contact`, `dob`(text), `email`, `emergencycontact1`-`3`, `jobtitle`, `linemanager`, `worklocation`, `startdate`(text), `enddate`(text), `notes`, `signature`(text path), `photoimage`(text path), `arrival_datetime`(text) | -- |
| `expenses` | 2 | `id` | Text fields, `status`, `arrival_datetime`(timestamp) | -- |

**Notes:**
- `hr.signature` and `hr.photoimage` store file paths as text
- Dates (dob, startdate, enddate) stored as TEXT

---

### I. Vehicle Management

| Table | Rows | PK | Key Columns | Indexes |
|-------|------|----|-------------|---------|
| `vehicle` | 10,920 | `id` | `drivername`, `vehiclereg`, `mileage`, `arrival_datetime`(text), `routeplanned`-`loadweight` (Yes/No text fields), `vehiclecondition`, `safe`, `report`, `notes` | -- |
| `vr` | 30 | `id` | `reg`, `desc`, `allocated`, `date`(text), `mexpiry`(text), `texpiry`(text), `sexpiry`(text), `notes`, `status` | -- |
| `vic` | 14 | `id` | `vic1`-`vic109`+ (numbered cols), `vrid`, `vehid`, `image`-`image3`, `status` | -- |
| `vir` | 7 | `id` | `vrid`, numbered fields, `image`, `status` | -- |
| `vrr` | 3 | `id` | `vrid`, numbered fields, `status` | -- |
| `equipmentcheck` | 22 | `id` | Multiple fields, `image`(text), `status` | -- |

**Notes:**
- `vehicle` is the highest-volume table (10,920 rows) -- daily vehicle checks
- `vic` has 109+ numbered columns (most denormalized table in the DB)
- `vic.vrid`, `vir.vrid`, `vrr.vrid` all reference `vr.id`
- Yes/No boolean values stored as text strings

---

### J. Jobs/Projects

| Table | Rows | PK | Key Columns | Indexes |
|-------|------|----|-------------|---------|
| `civils` | 567 | `id` | `jobstatus`, `assignedto`, `authority`, `solonumber`, `location`, `permitstatus`, `startdate`(text), `enddate`(text), `notes`, `arrival_datetime`(text) | -- |
| `wildanet` | 250 | `id` | Same structure as civils | -- |
| `tfl` | 65 | `id` | Same structure as civils | -- |
| `maintenance` | 61 | `id` | Same structure as civils | -- |
| `project` | 2 | `id` | `code`, `name`, `location`, `manager_id`, `start_date`(date), `end_date`(date) | -- |
| `activity` | 3 | `id` | `project_id`, `name`, `start_date`, `end_date` | -- |

**Notes:**
- Four parallel job tables with identical structure (per-client duplication)
- `project` and `activity` appear to be newer/experimental (proper date types)
- Status flow varies by job type

---

### K. Materials

| Table | Rows | PK | Key Columns | Indexes |
|-------|------|----|-------------|---------|
| `material` | 35 | `id` | `item`, `units`, `location`, `status`, `arrival_datetime`(text) | -- |
| `tflmaterial` | 0 | `id` | Same columns as material | -- |
| `maintenancematerial` | 1 | `id` | Same columns as material | -- |
| `er` | 18 | `id` | `item`, `desc`, `ident`, `allocated`, `condition`, `date`(text), `expiry`(text), `notes` | -- |
| `pr` | 10 | `id` | `item`, `desc`, `ident`, `allocated`, `condition`, `date`(text), `expiry`(text), `notes` | -- |

**Notes:**
- Per-client material tables (same pattern as jobs)
- `er` = Equipment Register, `pr` = Plant/PPE Register (identical structure)

---

### L. Work Records

| Table | Rows | PK | Key Columns | Indexes |
|-------|------|----|-------------|---------|
| `workrecord` | 193 | `id` | `lt1`-`lt12` (named numbered fields), `status`, `image`(text, comma-separated paths) | -- |

**Notes:**
- Status values: `Pending`, `Submitted`, `Quotation Sent`, `Works Approved`, `Completed`, `Invoiced`, `Fibre`, `Issues to Rectify`, `Closed`
- `image` column stores multiple file paths as comma-separated text

---

### M. Bulletins

| Table | Rows | PK | Key Columns | Indexes |
|-------|------|----|-------------|---------|
| `bulletin` | 14 | `id` | Legacy bulletin tracking | -- |
| `bulletinnew` | 16 | `id` | `image`, `title`, `ref`, `description`, `arrival_datetime`(timestamp), `download`, `new`(text 0/1), `readby`(text) | -- |
| `bulletinread` | 533 | `id` | `bulletin`(text, refs bulletinnew.id), `user_id`(text), `arrival_datetime`(timestamp) | -- |
| `bulletinconfirm` | 8 | `id` | `bulletin`(text), `user_id`(text), `arrival_datetime`(timestamp) | -- |

**Notes:**
- `bulletinread.bulletin` and `bulletinread.user_id` are TEXT columns referencing integer IDs
- No foreign key constraints; joins must cast types

---

### N. Document Uploads

| Table | Rows | PK | Key Columns | Indexes |
|-------|------|----|-------------|---------|
| `upload_data` | 700 | `id` | `name`(varchar, stores civils job ID), `submittedby`, `file_name`, `arrival_datetime`(text), `doctype`, `docdesc` | -- |
| `wupload_data` | 49 | `id` | Same as upload_data (for Wildanet) | -- |
| `upload_tfl` | 439 | `id` | `name`, `submittedby`, `file_name`, `arrival_datetime`(text) | -- |
| `upload_vr` | 164 | `id` | `name`, `submittedby`, `file_name`, `arrival_datetime`(timestamp) | -- |
| `upload_hs` | 120 | `id` | `name`, `submittedby`, `file_name`, `arrival_datetime`(timestamp) | -- |
| `upload_hr` | 44 | `id` | `name`, `submittedby`, `file_name`, `arrival_datetime`(timestamp), `doctype`, `docdesc` | -- |
| `upload_vehicle` | 28 | `id` | Same pattern | -- |
| `upload_maintenance` | 4 | `id` | Same pattern | -- |
| `upload_presite` | 1 | `id` | Same pattern | -- |
| `upload_er` | 0 | `id` | Same pattern | -- |
| `upload_pr` | 0 | `id` | Same pattern | -- |

**Notes:**
- 11 separate upload tables, one per entity type
- `name` column stores the parent record's ID (e.g., civils job ID)
- Inconsistent datetime typing: some use TEXT, some use TIMESTAMP
- Files are stored on disk (PHP web root); these tables only track metadata

---

### O. File/Image Management

| Table | Rows | PK | Key Columns | Indexes |
|-------|------|----|-------------|---------|
| `files` | 0 | `id` | Generic file tracking, `status` ENUM | -- |
| `images` | 0 | `id` | Generic image tracking, `status` ENUM | -- |
| `gateway` | 3 | `id` | `file_name`, `uploaded_on`, `status` ENUM, `test` | -- |

**Notes:**
- `files` and `images` are unused (0 rows)
- `gateway` appears to be experimental

---

### P. Policies

| Table | Rows | PK | Key Columns | Indexes |
|-------|------|----|-------------|---------|
| `policies` | 51 | `id` | `pol1`(reference), `pol2`(link/path), `pol3`(issue number) | -- |
| `processes` | 33 | `id` | `pro1`, `pro2`, `pro3` | -- |

---

### Q. Contacts

| Table | Rows | PK | Key Columns | Indexes |
|-------|------|----|-------------|---------|
| `address` | 13 | `id` | `name`, `phone`, `email`, `company` | -- |

---

### R. Testing

| Table | Rows | PK | Key Columns | Indexes |
|-------|------|----|-------------|---------|
| `cleggtesting` | 9 | `id` | Many numbered fields, `image`(text) | -- |

---

## Entity Relationships

All relationships below are enforced at the application level only. There are zero database-level foreign key constraints.

### Authentication Domain

```
login_users (PK: user_id)
    |
    +--< login_timestamps (user_id -> login_users.user_id)
    |
    +--< login_confirm (username -> login_users.username)
    |
    +--< lt_user_credentials (user_id -> login_users.user_id)
    |
    +--< lt_refresh_tokens (user_id -> login_users.user_id)
    |
    +--< lt_device_tokens (user_id -> login_users.user_id)
    |
    +--< lt_notifications (user_id -> login_users.user_id)
    |
    +--< lt_notification_logs (user_id -> login_users.user_id)
```

### Bulletins Domain

```
bulletinnew (PK: id)
    |
    +--< bulletinread (bulletin -> bulletinnew.id, user_id -> login_users.user_id)
    |
    +--< bulletinconfirm (bulletin -> bulletinnew.id, user_id -> login_users.user_id)
```

### Jobs Domain - Civils

```
civils (PK: id)
    |
    +--< ra (civils -> civils.id)
    |
    +--< insp (civilsid -> civils.id)
    |
    +--< upload_data (name -> civils.id)
```

### Jobs Domain - Wildanet

```
wildanet (PK: id)
    |
    +--< wra (civils -> wildanet.id)    [NOTE: column named "civils" but refs wildanet]
    |
    +--< winsp (civilsid -> wildanet.id)
    |
    +--< wupload_data (name -> wildanet.id)
```

### Jobs Domain - TFL

```
tfl (PK: id)
    |
    +--< upload_tfl (name -> tfl.id)
```

### Jobs Domain - Maintenance

```
maintenance (PK: id)
    |
    +--< upload_maintenance (name -> maintenance.id)
```

### Vehicle Domain

```
vr (PK: id)
    |
    +--< vic (vrid -> vr.id)
    |
    +--< vir (vrid -> vr.id)
    |
    +--< vrr (vrid -> vr.id)
    |
    +--< upload_vr (name -> vr.id)
```

### HR Domain

```
hr (PK: id)
    |
    +--< upload_hr (name -> hr.id)
```

### Timesheet Domain

```
login_users.ltrafficid ---< timesheet.ltrafficid
```

> **Important:** Timesheets join to `login_users` via `ltrafficid`, NOT via `user_id`. This is a domain-specific employee identifier separate from the authentication PK.

---

## Key Observations

### 1. No Enforced Foreign Keys

All 68 tables have zero `FOREIGN KEY` constraints. Every relationship is maintained by application code only. This means:
- Orphaned records can exist
- Cascade deletes must be handled manually
- Data integrity relies entirely on PHP/Node.js application logic

### 2. Extreme Denormalization

Several tables store form data as numbered columns rather than normalized rows:

| Table | Numbered Columns | Example |
|-------|-----------------|---------|
| `vic` | 109+ | `vic1`, `vic2`, ... `vic109` |
| `ra` / `wra` | 74 | `ra1`, `ra2`, ... `ra74` |
| `insp` / `winsp` | 63+ | `in1`, `in2`, ... `in63` |
| `timesheet` | 35 | `date1`-`date7`, `hours1`-`hours7`, etc. |

### 3. Per-Client Table Duplication

Instead of a single jobs table with a `client` column, there are separate tables per client:

| Client | Job Table | RA Table | Inspection Table | Upload Table | Material Table |
|--------|-----------|----------|------------------|--------------|----------------|
| Civils | `civils` | `ra` | `insp` | `upload_data` | `material` |
| Wildanet | `wildanet` | `wra` | `winsp` | `wupload_data` | -- |
| TFL | `tfl` | -- | -- | `upload_tfl` | `tflmaterial` |
| Maintenance | `maintenance` | -- | -- | `upload_maintenance` | `maintenancematerial` |

### 4. Dates Stored as TEXT

The vast majority of date/datetime columns use TEXT type rather than DATE/DATETIME/TIMESTAMP. This prevents:
- Date arithmetic at the DB level
- Proper sorting without casting
- Index optimization for range queries

Exceptions (proper types): `lt_*` tables, `expenses.arrival_datetime`, `bulletinnew.arrival_datetime`, `upload_vr/hs/hr.arrival_datetime`

### 5. `ltrafficid` as Cross-Reference Key

The `login_users.ltrafficid` field (not `user_id`) is the employee identifier used across:
- `timesheet.ltrafficid`
- `hr` records (matched by name, not ID)
- Various form submissions

### 6. PHP Serialized Data

`login_users.user_level` stores role assignments as PHP serialized arrays:
```
a:3:{i:0;s:1:"1";i:1;s:1:"2";i:2;s:1:"5";}
```
This references `login_levels.id` values. The Node.js API must deserialize these for authorization checks.

### 7. Image/File Path Storage

- Single image: stored as text path (e.g., `uploads/hs/image123.jpg`)
- Multiple images: stored as comma-separated paths in a single TEXT column
- Files physically reside in the PHP web root (`UPLOADS_ROOT`), not in Node.js

### 8. The `lt_` Prefix Convention

Tables prefixed with `lt_` are Node.js API additions. They follow modern practices:
- Proper data types (JSON columns, ENUMs, TIMESTAMP)
- Meaningful indexes
- Clear column naming (snake_case)

### 9. Inconsistent Datetime Typing in Upload Tables

| Table | `arrival_datetime` Type |
|-------|------------------------|
| `upload_data` | TEXT |
| `wupload_data` | TEXT |
| `upload_tfl` | TEXT |
| `upload_vr` | TIMESTAMP |
| `upload_hs` | TIMESTAMP |
| `upload_hr` | TIMESTAMP |
| `upload_vehicle` | TIMESTAMP |

### 10. Status Columns are TEXT

Status values are stored as free-text strings rather than ENUMs. Common values:

| Context | Possible Values |
|---------|----------------|
| Timesheet | Submitted, Approved, Rejected |
| Health & Safety | Open, Closed |
| Risk Assessment | In Progress, RA Completed |
| Work Record | Pending, Submitted, Quotation Sent, Works Approved, Completed, Invoiced, Fibre, Issues to Rectify, Closed |
| Forms (wah/mewp/ug) | Submitted |

---

## Recommended Missing Indexes

The following indexes would significantly improve query performance for common access patterns:

| Table | Recommended Index | Reason |
|-------|-------------------|--------|
| `healthsafety` | `status` | Filtering open/closed incidents |
| `vehicle` | `drivername` | Lookup by driver |
| `vehicle` | `vehiclereg` | Lookup by registration |
| `vehicle` | `arrival_datetime` | Date range queries |
| `ra` | `civils` | JOIN to civils table |
| `ra` | `status` | Filter by RA status |
| `wra` | `civils` | JOIN to wildanet table |
| `wra` | `status` | Filter by RA status |
| `timesheet` | `ltrafficid` | Lookup timesheets by employee |
| `timesheet` | `status` | Filter by approval status |
| `workrecord` | `status` | Filter by workflow stage |
| `civils` | `jobstatus` | Filter by job status |
| `civils` | `assignedto` | Lookup by assigned user |
| `wildanet` | `jobstatus` | Filter by job status |
| `wildanet` | `assignedto` | Lookup by assigned user |
| `tfl` | `jobstatus` | Filter by job status |
| `tfl` | `assignedto` | Lookup by assigned user |
| `maintenance` | `jobstatus` | Filter by job status |
| `maintenance` | `assignedto` | Lookup by assigned user |
| `bulletinread` | `bulletin` | JOIN to bulletinnew |
| `bulletinread` | `user_id` | Lookup reads by user |
| `upload_data` | `name` | Lookup docs by parent job ID |
| `wupload_data` | `name` | Lookup docs by parent job ID |
| `upload_tfl` | `name` | Lookup docs by parent job ID |
| `upload_vr` | `name` | Lookup docs by parent vehicle ID |
| `upload_hs` | `name` | Lookup docs by parent incident ID |
| `upload_hr` | `name` | Lookup docs by parent HR record ID |
| `upload_vehicle` | `name` | Lookup docs by parent vehicle ID |
| `upload_maintenance` | `name` | Lookup docs by parent job ID |

---

## Shared Tables (Admin + Employee)

The following tables are accessed by both the admin panel and the employee-facing application:

| Table | Admin Use | Employee Use |
|-------|-----------|--------------|
| `login_users` | User management | Authentication, profile |
| `timesheet` | Approve/reject | Submit timesheets |
| `healthsafety` | Review/close incidents | Submit incident reports |
| `vehicle` | View fleet reports | Submit daily checks |
| `bulletinnew` / `bulletinread` | Create bulletins | Read/confirm bulletins |
| `civils` / `wildanet` / `tfl` / `maintenance` | Manage jobs | View assigned jobs |
| `ra` / `wra` | Review risk assessments | Submit risk assessments |
| `workrecord` | Manage workflow | Submit work records |
| `wah` / `mewp` / `ug` | Review submissions | Submit forms |
| `hr` | Manage employee records | View own record |
| `vr` / `er` / `pr` | Manage registers | View registers |

---

## Summary Statistics

| Metric | Value |
|--------|-------|
| Total tables | 68 |
| Storage engine | All InnoDB |
| Character set | Mostly utf8 |
| Foreign keys enforced | 0 |
| Tables with >1000 rows | 2 (`login_timestamps`: 11,033; `vehicle`: 10,920) |
| Tables with 0 rows | ~14 (unused/placeholder) |
| Largest table by columns | `vic` (109+ columns) |
| Per-client duplicated table sets | 4 (civils, wildanet, tfl, maintenance) |
| Upload tables | 11 |
| `lt_` prefixed (Node.js) tables | 6 |
| Legacy auth tables | 9 |
