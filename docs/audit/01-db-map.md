# 01 — DB Map: `lt_employee` (LTraffic Employee + Admin System)

Source dump: `C:\rizwan\LTraffic\mysql\lt_employee.sql` (31,159 lines, mysqldump)
Tables documented: **65**
Engine (all tables): `InnoDB`
Charset/Collation (all tables): `utf8mb3` / `utf8mb3_general_ci` (a handful `utf8mb3_unicode_ci` for `login_*`)

> No FOREIGN KEY constraints are declared anywhere in the dump. **All cross-table links are implicit-by-convention** (typed as `text` or `varchar` on both sides, joined by application code). Indexes are limited to `PRIMARY KEY (id)` and a few `KEY (fk_...)` on `account.role_id`; almost every other join column is unindexed.

## Legend

- **PK** = Primary Key. Nearly all tables use `id int(11) NOT NULL AUTO_INCREMENT`.
- **Implicit FK** = column that stores the identifier of another table's row but has no FK constraint.
- "Wide" = denormalised, repeating-column shape (`col1..colN`) reflecting a fixed-form web form.
- "Serialized" = column stores PHP `serialize()` output.

---

## 1. Auth & Users

### `login_users` (line 14131) — canonical employee/user record
- `user_id int(8) NOT NULL AUTO_INCREMENT` — **PK**
- `user_level longtext NOT NULL` — **PHP-serialized array** (e.g. `a:1:{i:0;s:1:"1";}`)
- `username varchar(255)`, `email varchar(100)`, `password varchar(128) NOT NULL` — **MD5** hex (see `login_settings`)
- `ltrafficid varchar(100)` — **business identifier** (e.g. `'00001'`); referenced everywhere else as `employeeid` / `ltrafficid` / `assignedto`
- `teamup varchar(255)`, `vehiclereg varchar(255)`, `team varchar(255)`, `name1 varchar(255)`, `onboarding text`
- Engine InnoDB / utf8mb3.

### `accounts` (line 56) — second auth table
- `id`, `email`, `password varchar(255)` — **bcrypt** (`$2y$10$…`)
- Used by newer admin login flow.

### `account` (line 30) — third auth table (singular)
- `id`, plus `role_id int` with `KEY fk_account_role (role_id)` — only real (non-PK) index in the schema.
- Implicit FK → `role.id`.

### `role` (line 15598)
- 2 rows: 1 = Admin, 2 = User. Lookup for `account.role_id`.

### `loginhistory` (line 2839), `login_confirm` (2902), `login_timestamps` (3074)
- Session/auth event tracking; keyed by `user_id` (implicit FK → `login_users.user_id`).

### `login_levels` (2944), `login_profiles` (2973), `login_profile_fields` (2986), `login_integration` (2929)
- Configuration tables for the Codeigniter/PHP auth pack.

### `login_settings` (3001) — key/value config
- Notable rows: `pw-encryption = 'MD5'`, `default-level = 'a:1:{i:0;s:1:"4";}'` (serialized).

**Auth quirks:**
- Two hash formats live side by side (MD5 in `login_users`, bcrypt in `accounts`); migration must double-check hash length.
- `user_level` is PHP-serialized; Node cannot use it directly.

---

## 2. HR & Contacts

### `hr` (line 2655) — employee HR record
- `id int(11)` PK, `employeeid text` — implicit FK → `login_users.ltrafficid`
- 31 columns: `name`, `dob`, `address`, `postcode`, `mobile`, `email`, `nok`, `nokrelationship`, `noktelephone`, `nationality`, `passportnumber`, `passportexpiry`, `visastatus`, `nationalinsurancenumber`, `starttime`, `enddate`, `startdate`, `photo`, `pdriveexpiry`, `pdrivenumber`, `nightshifts`, `disability`, `medical`, `salary`, `paymentmethod`, `hoursweek`, `notes`, etc. — all `text`.
- Every date stored as text — no `DATE` types.

### `address` (100)
- 13 rows sample; lookup for postal addresses.

---

## 3. Bulletins (Legacy Duplication)

Four overlapping tables:

- `bulletin` (133) — headline `title`, `content`, `date`, `submittedby`.
- `bulletinnew` (195) — extended shape with `expiry`, `type`, `link`.
- `bulletinconfirm` (168) — one row per user acknowledgement (`bulletinid`, `userid`, `date`).
- `bulletinread` (235) — read/receipt tracking (superseded by `bulletinconfirm`).

**Concern:** Four tables for one feature; consolidate into `bulletin` + `bulletin_ack` on migration. Implicit FKs: `bulletinconfirm.bulletinid → bulletin.id`, `bulletinconfirm.userid → login_users.user_id`.

---

## 4. Documents & File Uploads

Near-identical upload tables (`id`, `name`, `arrival_datetime text`, `file_name varchar(100)`, `submittedby text`, `doctype text`, `docdesc text`). `name` is a stringified parent-row `id`.

| Table | Line | Parent |
|---|---|---|
| `upload_data` | 16067 | civils / general |
| `upload_er` | 16791 | `er.id` |
| `upload_hr` | 16807 | `hr.id` |
| `upload_hs` | 16873 | `healthsafety.id` |
| `upload_maintenance` | 17013 | `maintenance.id` |
| `upload_pr` | 17039 | `pr.id` |
| `upload_presite` | 17055 | `presite.id` |
| `upload_tfl` | 17078 | `tfl.id` |
| `upload_vehicle` | 17540 | `vehicle.id` |
| `upload_vr` | 17588 | `vr.id` |
| `wupload_data` | 30287 | `wildanet.id` |

Also: `files` (1574) and `images` (2723) — small legacy tables (essentially unused).

**Concerns:** No FK constraints; no index on `name`; join by string comparison. Single `uploads` polymorphic table with `parent_type`/`parent_id int` would collapse 11 tables.

---

## 5. Timesheets

### `timesheet` (15725) — denormalized weekly grid
- PK `id`, `week text`, `ltrafficid text` (implicit FK → `login_users.ltrafficid`), `name text`
- Repeating columns for a 7-day week:
  - `date1..date7 text`, `hours1..hours7 text`, `location1..7 text`, `activity1..7 text`, `contract1..7 text`
- `comments text`, `status text` (e.g. `Submitted`, `Approved`).

**Concerns:** Should be normalised to `timesheet_entry` rows keyed on `(user_id, date)`. All numeric hours are `text`.

---

## 6. Vehicles / Vehicle Reports

### `vehicle` (17774) — daily driver walk-round
- PK `id`, `drivername text`, `vehiclereg text`, `mileage int(20)`, `arrival_datetime text`
- ~20 `varchar(10)` yes/no boolean-as-text columns (`routeplanned`, `roadconditions`, `tires`, `lights`, `mirrors`, `brakes`, …)
- `report text`, `notes varchar(1000) DEFAULT 'Notes'`.

### `vr` (28968) — vehicle register (fleet card)
- Cols: `reg`, `description`, `allocatedto`, `date`, `cond`, `mexpiry`, `texpiry`, `sexpiry`, `notes` — all `text`.

### `vir` (28930) — vehicle inspection & repair (VIR)
- `vir1..vir10 text`, `vrid text` (implicit FK → `vr.id`), `vehid text` (implicit FK → `vr.id`), `image text`, `type text`, `status text`.

### `vrr` (29024) — vehicle reported-repair
- `vrr1..vrr10 text`, `image`, `type`, `status`, `vrid text`, `vehid text`.

### `vic` (28792) — vehicle inspection checklist (wide)
- `vic1..vic43+ text`, `status`, `image`. Extremely denormalized.

**Concerns:** `vir.vrid` and `vir.vehid` both point at `vr.id` — same table, different semantics; needs domain review. All join columns are `text`.

---

## 7. Health & Safety / Incidents

### `healthsafety` (1610) — 23 cols
- `id`, `incidenttype`, `incidentdate text`, `location`, `postcode`, `reportedby`, `assignedto`, `description text`, `injurytype`, `nearmiss`, `witnesses`, `police`, `hse`, `firstaider`, `rootcause`, `preventativeaction`, `status`, `image`, `signature`, `submitteddate`, `civilsid text` (implicit FK → `civils.id`), etc.

### `insp` (2736) — inspection (very wide)
- Columns include `in1..in63 text`, `by1..by7`, `ti1..ti7`, `image1..image7`, `pt2r..pt7r`, `status`, `civilsid`.

### `winsp` (29441) — Wildanet inspection variant
- `in1..in29+ text`, `image`, `image1..image2`, `pt2r..pt3r`, `by1..by3`, `ti1..ti3`, `civilsid`, `status`.

### `equipmentcheck` (1449)
- Daily equipment PDI checks; boolean-as-text columns.

### `mewp` (14393) — Mobile Elevated Work Platform inspection
- `mewp1..mewp15 text`, plus PK, image, status.

### `wah` (29058) — Work-at-Height permit/checklist
- `wah1..wah14 text`, `pn`, `snt`, `sn`, `type text`, `status text`, `image text`.

### `ug` (15991) — Underground works
- `ug1..ug13 text`, `image`, `status`.

---

## 8. Civils / TFL / Site Work

All are job-tracking with nearly identical shape.

### `civils` (785)
- `id`, `jobstatus text`, `assignedto text` (name / team code, not FK), `customer text`, `location text`, `postcode text`, `startdate text`, `enddate text`, `notes text`, and many project-specific columns.

### `tfl` (15617) — Transport for London / traffic-management jobs
- Same shape as `civils`; parallel job flow.

### `maintenance` (14182)
- Same shape; property/site maintenance.

### `presite` (14573)
- Pre-site survey rows; job-precursor to `civils`.

### `pr` (14539) — project report
- Post-job progress report keyed by `civilsid`.

### `er` (1508) — equipment/event report
- Small equipment-log table.

### `wildanet` (29161) — Wildanet fibre roll-out project (job register)
- `jobstatus`, `assignedto`, `client`, `authority`, `community`, `solonumber`, `location`, `postcode`, `permitstatus`, `startdate`, `enddate`, `notes`, `image`.

### `workrecord` (29580) — per-visit work records
- `lt1..lt12 text` (driver, datetime, location, community, PN number, SN type, chamber references, activity, status, notes, metres), `image`, `status`.

**Implicit FK ladder:**
```
wildanet(id) ─┬─▶ workrecord (via lt columns / solonumber string match)
              ├─▶ wupload_data.name  (stringified id)
              └─▶ wra.civils         (stringified id — misleading name)
```

---

## 9. Equipment / Maintenance / Materials

- `equipmentcheck` (1449) — see H&S above.
- `maintenance` (14182) — job flow, see Civils above.
- `maintenancematerial` (14272) — line items for a `maintenance` row; implicit FK `maintenanceid`.
- `material` (14293) — material master lookup.
- `tflmaterial` (15711) — line items for a `tfl` row; implicit FK `tflid`.
- `expenses` (1550) — small expense log (`id`, `employeeid`, `amount`, `date`, `description`, `submittedby`).
- `cleggtesting` (1382) — Clegg impact tester readings (site compaction).
- `gateway` (1587) — legacy enum-like status list; nearly duplicates `files`.

---

## 10. Projects / Risk Assessments / SSOW

### `project` (14681)
- 2 sample rows; project master (`id`, `name`, `client`, `startdate`, `enddate`).

### `activity` (76)
- 3 rows; activity types lookup.

### `ra` (14706) — Risk Assessment (very wide)
- `id`, `civils text` (implicit FK → `civils.id`), `ra1..ra22 text`, `image`, `status`.

### `wra` (29804) — Wildanet Risk Assessment (extra wide)
- `civils text`, `ra1..ra74 text`, four `image/image1..image4 text` groups, `status text`, `client text`.

### `policies` (14469), `coshh` (1421), `methodstatements` (14348), `processes` (14629)
- Reference/lookup tables; each has generic numbered columns:
  - `policies.pol1/pol2/pol3`
  - `coshh.cos1/cos2/cos3`
  - `methodstatements.ms1/ms2/ms3`
  - `processes.pro1/pro2/pro3`
- `pol1` = title, `pol2` = body/URL, `pol3` = version/date (inferred from data).

---

## 11. Legacy / Unclear / Tiny

- `files` (1574) — near-empty legacy blob record.
- `images` (2723) — near-empty legacy image record.
- `gateway` (1587) — near-duplicate of `files`; enum-style status column.
- `login_integration` (2929) — vendor integration config, unused rows.
- `login_profile_fields` (2986) — custom-field metadata, rarely populated.

---

## FK Graph (text form, implicit)

```
login_users(user_id)
  ├─ ltrafficid (varchar) ◀─ hr.employeeid
  │                        ◀─ timesheet.ltrafficid
  │                        ◀─ expenses.employeeid
  │                        ◀─ login_users self via team/teamup
  └─ user_id ◀─ loginhistory.user_id
              ◀─ login_confirm.user_id
              ◀─ login_timestamps.user_id
              ◀─ bulletinconfirm.userid
              ◀─ bulletinread.userid

account(id) ─▶ role(id)                       [only real declared KEY]

role(id) ◀─ account.role_id

civils(id) ◀─ ra.civils
           ◀─ insp.civilsid
           ◀─ winsp.civilsid
           ◀─ pr.civilsid
           ◀─ healthsafety.civilsid
           ◀─ upload_data.name (stringified)
           ◀─ presite.civilsid (loose)

tfl(id) ◀─ tflmaterial.tflid
        ◀─ upload_tfl.name

maintenance(id) ◀─ maintenancematerial.maintenanceid
                ◀─ upload_maintenance.name

vr(id) ◀─ vir.vrid, vir.vehid
       ◀─ vrr.vrid, vrr.vehid
       ◀─ upload_vr.name

vehicle(id) ◀─ upload_vehicle.name

hr(id) ◀─ upload_hr.name
er(id) ◀─ upload_er.name
pr(id) ◀─ upload_pr.name
presite(id) ◀─ upload_presite.name
healthsafety(id) ◀─ upload_hs.name

wildanet(id) ◀─ wra.civils          (misnamed)
             ◀─ wupload_data.name
             ◀─ workrecord (via solonumber string)

bulletin(id) ◀─ bulletinconfirm.bulletinid
             ◀─ bulletinread.bulletinid

project(id) — orphan (no incoming refs in dump)
activity(id) — lookup only
```

---

## Index Gaps & Concerns

1. **Only one non-PK index exists**: `KEY fk_account_role (role_id)` on `account`.
2. Every implicit FK column is unindexed → full table scans for joins. Critical hotspots:
   - `login_users.ltrafficid` — hit by nearly every business join.
   - `civils.id`-referencing columns in `ra`, `insp`, `winsp`, `pr`, `healthsafety`, `upload_*`.
   - `bulletinconfirm.userid`, `bulletinconfirm.bulletinid`.
   - `timesheet.ltrafficid`, `timesheet.week`.
3. `varchar(100)` on identifier columns vs `int` on parent PKs → implicit CAST on every join.
4. No `created_at` / `updated_at` timestamp columns anywhere; datetime is a free-form `text` field (e.g. `'Wednesday 06 September 2023 (08:53:31)'`).
5. No UNIQUE on `login_users.username`, `login_users.email`, `login_users.ltrafficid` — duplicates possible.

## Data Quirks (migration-critical)

- **PHP-serialized in TEXT**: `login_users.user_level`, `login_settings.default-level`, likely `login_profile_fields.value`. Must be unserialized to JSON in migration ETL.
- **MD5 passwords**: `login_users.password` is MD5 hex (32 chars). Cannot be re-hashed retroactively; policy = lazy rehash to bcrypt on next successful login.
- **bcrypt passwords**: `accounts.password` uses `$2y$10$…` — usable directly by Node bcrypt libs.
- **Boolean-as-varchar**: hundreds of columns like `routeplanned varchar(10) NOT NULL` containing `'Yes'`/`'No'`/`''`. Convert to `boolean` (with N/A tri-state where relevant).
- **Dates-as-VARCHAR/TEXT**: `startdate`, `enddate`, `dob`, `arrival_datetime`, `date`, `mexpiry`, `texpiry`, `sexpiry` etc. Mixed formats — ISO (`'2024-01-13'`), UK long form (`'Wednesday 06 September 2023 (08:53:31)'`), sometimes empty. Parser must handle both.
- **Numeric-as-text**: mileage, hours, distances all `text`.
- **Stringified FKs**: e.g. `upload_data.name = '3'` refers to `civils.id = 3` — INT stored as VARCHAR. Cast during migration.
- **Wide/repeating columns**: `timesheet.date1..date7`, `ra.ra1..ra22`, `wra.ra1..ra74`, `insp.in1..in63`, `vic.vic1..vic43`. These map to child rows in normalised Node schema.
- **`user_level` maps to a hard-coded numeric role**: `'1'` = admin, `'4'` = default operative (per `login_settings`).

## Legacy / Dead Tables (candidates to drop or archive)

- `files`, `images`, `gateway` — near-empty; superseded by `upload_*`.
- `bulletinread` — superseded by `bulletinconfirm`.
- `login_integration`, `login_profile_fields` — auth pack scaffolding, unused.
- `cleggtesting` — small table; verify use with client.
- `project`, `activity` — 2–3 rows only; may be seeded lookups never adopted.
- `address` — 13 rows; likely superseded by `hr.address`.
- `role` — 2 rows; only used by `account`, not `login_users`.

---

## Table Count Confirmation

**Total tables documented: 65.**
