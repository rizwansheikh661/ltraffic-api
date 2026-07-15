# 07 — Module Dependencies

**Purpose:** Dependency graph showing which modules depend on which — shared DB tables, cross-module references, upload folder sharing, role dependencies, and feature gates.  
**Use:** Determines safe build order. A module cannot be built until all its hard dependencies are implemented.

---

## 1. Dependency Types

| Symbol | Meaning |
|--------|---------|
| **→** | Hard dependency (requires the target to exist) |
| **⇢** | Soft dependency (enhanced by target but works without it) |
| **⊕** | Shared table (both modules read/write) |
| **↗** | Cross-reference (FK-like column linking records) |

---

## 2. Core Infrastructure (Required by All Modules)

Every module depends on these foundational components:

| Component | What It Provides | DB Tables |
|-----------|-----------------|-----------|
| **Auth** | Session/JWT, user identity, role resolution | `login_users`, `lt_user_credentials`, `lt_refresh_tokens`, `lt_device_tokens` |
| **User Levels** | Permission checks (`protect()`, `protectThis()`) | `login_levels` (via `login_users.user_level`) |
| **File Upload** | Image/document upload, extension validation, rename | (per-module directories) |
| **PDF Generation** | TCPDF rendering from DB records | (per-module pdf files) |

---

## 3. Module Dependency Graph

### 3.1 Jobs Cluster (Civils → RA → INSP)

```
┌─────────────┐
│   Civils    │ ← Job container
└──────┬──────┘
       │ ↗ ra.civils = civils.id
       ├──────────────────────────┐
       │                          │
┌──────▼──────┐          ┌───────▼───────┐
│ Risk Assess │          │ Site Inspect  │
│    (RA)     │          │   (INSP)     │
└─────────────┘          └───────────────┘
       │                          │
       │ ↗ upload_data.name       │ ↗ upload_data.name
       │   = civils.id            │   = civils.id
       ▼                          ▼
┌─────────────────────────────────────────┐
│         Documents (upload_data)          │
└─────────────────────────────────────────┘
```

**Hard dependencies:**
- RA → Civils: `ra.civils` stores `civils.id`; RA form pre-populates from the civils record (solonumber, location, permit dates, client)
- INSP → Civils: `insp.civilsid` stores `civils.id`; inspection is initiated from a civils job page
- Civils Documents → Civils: `upload_data.name` stores `civils.id`

### 3.2 Wildanet Jobs Cluster (Mirror of Civils)

```
┌─────────────┐
│  Wildanet   │ ← Job container
└──────┬──────┘
       │ ↗ wra.wildanet = wildanet.id
       ├──────────────────────────┐
       │                          │
┌──────▼──────┐          ┌───────▼───────┐
│ Wildanet RA │          │ Wildanet INSP │
│    (WRA)    │          │   (WINSP)     │
└─────────────┘          └───────────────┘
       │                          │
       ▼                          ▼
┌─────────────────────────────────────────┐
│       Documents (wupload_data)          │
└─────────────────────────────────────────┘
```

**Hard dependencies:**
- WRA → Wildanet: `wra.wildanet` stores `wildanet.id`
- WINSP → Wildanet: `winsp.wildanetid` stores `wildanet.id`
- Wildanet Documents → Wildanet: `wupload_data.name` stores `wildanet.id`

### 3.3 TFL Jobs (Standalone)

```
┌─────────────┐
│     TFL     │ ← No sub-records (no RA/INSP linked)
└─────────────┘
       │
       ▼
┌─────────────────────────────────────────┐
│       Documents (tupload_data)          │
└─────────────────────────────────────────┘
```

TFL documents use `tupload_data.name = tfl.id`.

### 3.4 Maintenance Jobs (Standalone)

```
┌──────────────┐
│ Maintenance  │ ← No sub-records
└──────────────┘
       │
       ▼
┌─────────────────────────────────────────┐
│       Documents (mupload_data)          │
└─────────────────────────────────────────┘
```

Maintenance documents use `mupload_data.name = maintenance.id`.

### 3.5 Vehicle Register → Inspections Cluster

```
┌───────────────────┐
│ Vehicle Register  │ ← Container
│      (vr)         │
└────────┬──────────┘
         │ ↗ vic.vrid = vr.id
         ├──────────────────────────────┐
         │              │               │
┌────────▼────┐  ┌─────▼─────┐  ┌──────▼──────┐
│    VIC      │  │    VIR    │  │    VRR      │
│ (109-field) │  │ (report)  │  │ (record)    │
└─────────────┘  └───────────┘  └─────────────┘
```

**Hard dependencies:**
- VIC → Vehicle Register: `vic.vrid` stores `vr.id`; VIC form pre-populates vehicle details from VR
- VIR → Vehicle Register: `vir.vrid` stores `vr.id`
- VRR → Vehicle Register: `vrr.vrid` stores `vr.id`

### 3.6 HR → Documents Cluster

```
┌─────────────┐
│     HR      │
└──────┬──────┘
       │ ↗ upload_hr.name = hr.id
       ▼
┌─────────────────┐
│   upload_hr     │
└─────────────────┘
```

### 3.7 Standalone Modules (No Cross-Module Dependencies)

These modules have NO hard dependencies on other business modules — they only depend on Auth:

| Module | DB Table | Notes |
|--------|----------|-------|
| Vehicle Check | `vehicle` | Links to user via `ltrafficid`, not to VR |
| Timesheets | `timesheet` | Links to user via `ltrafficid` |
| H&S Form | `healthsafety` | Standalone incident reporting |
| Work Records | `workrecord` | Self-contained lifecycle |
| Equipment Check | `equipmentcheck` | Standalone |
| MEWP | `mewp` | Submit-only |
| WAH | `wah` | Submit-only |
| UG | `ug` | Submit-only |
| Expenses | `expenses` | Standalone |
| Bulletins | `bulletinnew` + `bulletinread` | Standalone (read-gate on login) |
| Contacts | `address` | Read-only directory |
| Onboarding | (generates PDF only) | Standalone form |
| Equipment Register | `er` + `upload_er` | Standalone |
| Plant Register | `pr` + `upload_pr` | Standalone |
| Document Control | `policies`, `methodstatements`, `processes`, `coshh` | Standalone |
| Clegg Testing | (unknown table) | Standalone |
| Pre-site | (unknown table) | Standalone |
| Gateway | (gateway) | Standalone |

---

## 4. Shared Database Tables

### 4.1 Tables Written by Multiple Modules

| Table | Writers | Purpose |
|-------|---------|---------|
| `login_users` | Auth, User Admin, Password Recovery, 2FA | User accounts |
| `login_timestamps` | Auth (on every login) | Audit log |
| `login_confirm` | Password Recovery, 2FA setup | Temp tokens |
| `upload_data` | Civils Documents (AJAX upload) | File metadata for civils jobs |
| `wupload_data` | Wildanet Documents (AJAX upload) | File metadata for wildanet jobs |
| `tupload_data` | TFL Documents (AJAX upload) | File metadata for TFL jobs |
| `mupload_data` | Maintenance Documents (AJAX upload) | File metadata for maintenance jobs |
| `upload_hr` | HR Documents (AJAX upload) | File metadata for HR records |
| `upload_er` | Equipment Register Documents | File metadata for ER |
| `upload_pr` | Plant Register Documents | File metadata for PR |
| `upload_vr` | Vehicle Register Documents | File metadata for VR |
| `bulletinread` | Bulletin Gate (employee confirms) | Confirmation tracking |

### 4.2 Tables Read by Multiple Modules

| Table | Readers | What They Read |
|-------|---------|---------------|
| `login_users` | Every module (session user data), User Admin, HR | Name, email, level, ltrafficid |
| `civils` | Civils listing, RA (pre-populate), INSP (pre-populate), Documents | Job details |
| `wildanet` | Wildanet listing, WRA, WINSP, Wildanet Documents | Job details |
| `vr` | Vehicle Register, VIC, VIR, VRR | Vehicle details |
| `hr` | HR module, Onboarding (cross-ref) | Employee personal data |

### 4.3 Cross-Database Reference

| Source DB | Table | Target DB | Table | Link |
|-----------|-------|-----------|-------|------|
| `lt_employee` | `timesheet` | `ltraffic_timesheet` | (separate DB) | `ltrafficid` field |

The timesheet module historically lived in a separate database (`ltraffic_timesheet`). Current PHP code queries `lt_employee.timesheet` directly — the separate DB may be legacy.

---

## 5. Upload Directory Sharing

### 5.1 Upload Directories by Module

| Directory | Modules That Write | Modules That Read |
|-----------|-------------------|-------------------|
| `admin/hsupload/` | H&S Form (employee submit) | H&S Admin (review) |
| `admin/vehiclecheck/` | Vehicle Check (employee submit) | Vehicle Check Admin (review) |
| `admin/equipmentcheck/` | Equipment Check (employee submit) | Admin (viewing) |
| `admin/mewp/` | MEWP (employee submit) | Admin (viewing) |
| `admin/wah/` | WAH (employee submit) | Admin (viewing) |
| `admin/ug/` | UG (employee submit) | Admin (viewing) |
| `admin/workrecordupload/` | Work Records (employee submit) | Work Records Admin |
| `admin/civilsuploads/` | Civils Documents (AJAX) | Civils Admin |
| `admin/wildanetuploads/` | Wildanet Documents (AJAX) | Wildanet Admin |
| `admin/tfluploads/` | TFL Documents (AJAX) | TFL Admin |
| `admin/maintenanceuploads/` | Maintenance Documents (AJAX) | Maintenance Admin |
| `admin/hruploads/` | HR Documents (AJAX) | HR Admin |
| `admin/eruploads/` | Equipment Register Docs | ER Admin |
| `admin/pruploads/` | Plant Register Docs | PR Admin |
| `admin/vruploads/` | Vehicle Register Docs | VR Admin |
| `admin/vicuploads/` | VIC (employee submit) | VIC Admin |
| `admin/viruploads/` | VIR (employee submit) | VIR Admin |
| `admin/vrruploads/` | VRR (employee submit) | VRR Admin |
| `admin/onboarding/` | Onboarding form | Admin (viewing) |
| `admin/rauploads/` | RA (employee submit) | RA Admin |
| `admin/wrauploads/` | WRA (employee submit) | WRA Admin |
| `admin/inspuploads/` | INSP (employee submit) | INSP Admin |
| `admin/winspuploads/` | WINSP (employee submit) | WINSP Admin |
| `admin/employeesignature/` | HR/Onboarding (signature upload) | RA, INSP (signature display in PDF) |
| `../downloads/policies/` | Document Control (admin publish) | Documents Hub (employee download) |
| `../downloads/methodstatement/` | Document Control (admin publish) | Documents Hub (employee download) |

### 5.2 Cross-Module Upload Sharing

The `admin/employeesignature/` directory is notable: signatures are uploaded via HR/Onboarding but **consumed** by RA Section 4, INSP, and potentially any PDF that shows the user's signature. This creates a soft dependency:

- RA Section 4 ⇢ HR (for digital signature image)
- INSP ⇢ HR (for digital signature image)

If no signature exists, the form likely shows a blank space or placeholder — not a hard failure.

---

## 6. Role Dependencies

### 6.1 Role-Gated Module Access

| Role Level | Modules Accessible |
|-----------|-------------------|
| **Admin (1)** | ALL modules (admin + employee portals) |
| **Admin1 (4)** | ALL admin modules, most employee modules |
| **Admin2 (7)** | Most admin modules (may exclude User Admin) |
| **Essex Supervisor (8)** | Employee modules + limited admin views |
| **Driving Operatives (2)** | Employee modules only |
| **Operatives (3)** | Employee modules only |
| **Civils TFL Driver (5)** | Employee modules only |
| **Civils Trailer Driver (6)** | Employee modules only |
| **Customer (9)** | `home.php` only — no module access |

### 6.2 Module-Specific Role Gates

| Module | Required Roles | Gate Function |
|--------|---------------|--------------|
| User Admin | Admin, Admin1 | `protect("Admin, Admin1")` |
| HR | Admin, Admin1, Admin2 | `protect("Admin, Admin1, Admin2")` |
| Reported Incidents | Admin, Admin1, Admin2 | `protect("Admin, Admin1, Admin2")` |
| Vehicle Check Admin | Admin, Admin1, Admin2 | `protect("Admin, Admin1, Admin2")` |
| Timesheets Admin | Admin, Admin1 | `protect("Admin, Admin1")` |
| Bulletin Admin | Admin, Admin1 | `protect("Admin, Admin1")` |
| Document Control | Admin, Admin1 | `protect("Admin, Admin1")` |
| Equipment/Vehicle/Plant Register | Admin, Admin1, Admin2 | `protect("Admin, Admin1, Admin2")` |
| All employee modules | Any authenticated user (levels 1-8) | Session check only |

### 6.3 Role Implications for API Design

The API needs a middleware that:
1. Resolves `userType` from JWT (`admin` or `employee`)
2. For admin routes: checks specific role level against allowed levels per endpoint
3. For employee routes: any authenticated non-customer user (levels 1-8) has access
4. Some admin endpoints (e.g., timesheet delete) require Level 1 (Admin) specifically

---

## 7. Feature Gates

### 7.1 Cookie-Based Gates

| Gate | Modules Affected | Behaviour |
|------|-----------------|-----------|
| `ltraffic_limited_cookie` (8h) | Vehicle Check | Prevents re-submission within 8 hours |
| Bulletin cookie (8h) | Bulletin Gate | After confirmation, skips re-display |

### 7.2 Status-Based Gates

| Gate | Effect |
|------|--------|
| Bulletin `new = '1'` | Blocks all app access until confirmed |
| RA `status = 'In Progress'` | Sections 2-5 are UPDATE (not INSERT); Section 1 must exist first |
| INSP `status = 'In Progress'` | Sections 2-8 require Section 1 record |
| VIC Section 1 | Subsequent sections require the VIC record to exist |

### 7.3 Data-Based Gates

| Gate | Source | Effect |
|------|--------|--------|
| Employee signature exists | `admin/employeesignature/{name}.jpg` | RA Section 4 can display signature |
| Civils job exists | `civils` table | RA/INSP can be initiated |
| Wildanet job exists | `wildanet` table | WRA/WINSP can be initiated |
| Vehicle Register entry exists | `vr` table | VIC/VIR/VRR can be created |
| 2FA enabled | `login_users.use_two_factor_auth` | Login requires SMS verification |

---

## 8. Build-Order Implications

### 8.1 Independent Modules (Can Build in Any Order)

These modules have zero cross-module dependencies and can be built immediately after Auth:

1. Vehicle Check (employee + admin)
2. Timesheets (employee + admin)
3. H&S Form / Reported Incidents (employee + admin)
4. Work Records (employee + admin)
5. Bulletins (publish + gate + admin tracking)
6. Equipment Check
7. MEWP / WAH / UG (all three are identical pattern)
8. Expenses
9. Contacts
10. Onboarding
11. Document Control / Documents Hub
12. Equipment Register
13. Plant Register
14. Calendar (iframe only)

### 8.2 Dependency Chains (Must Build in Order)

**Chain A — Civils:**
```
Civils Jobs → RA (depends on civils.id)
Civils Jobs → INSP (depends on civils.id)
Civils Jobs → Civils Documents (depends on civils.id)
```

**Chain B — Wildanet:**
```
Wildanet Jobs → WRA (depends on wildanet.id)
Wildanet Jobs → WINSP (depends on wildanet.id)
Wildanet Jobs → Wildanet Documents (depends on wildanet.id)
```

**Chain C — Vehicle Register:**
```
Vehicle Register → VIC (depends on vr.id)
Vehicle Register → VIR (depends on vr.id)
Vehicle Register → VRR (depends on vr.id)
```

**Chain D — TFL:**
```
TFL Jobs → TFL Documents (depends on tfl.id)
```

**Chain E — Maintenance:**
```
Maintenance Jobs → Maintenance Documents (depends on maintenance.id)
```

**Chain F — HR:**
```
HR → HR Documents (depends on hr.id)
HR → Signature Upload (soft dep for RA/INSP)
```

### 8.3 Optimal Build Sequence (Dependencies Respected)

```
Phase 1: Auth (DONE — P1)
Phase 2: All standalone modules (14 modules, parallelizable)
Phase 3: Job containers (Civils, Wildanet, TFL, Maintenance, Vehicle Register, HR)
Phase 4: Dependent sub-modules (RA, INSP, WRA, WINSP, VIC, VIR, VRR, all Documents)
```

---

## 9. Cross-Module Data Flow Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                        login_users                                │
│  (user_id, ltrafficid, user_level, email, username)             │
└──────────────────────────┬───────────────────────────────────────┘
                           │ user_id / ltrafficid
        ┌──────────────────┼──────────────────────┐
        │                  │                      │
        ▼                  ▼                      ▼
   ┌─────────┐      ┌───────────┐         ┌───────────┐
   │timesheet│      │  vehicle  │         │healthsafety│
   │(ltrafficid)│   │(ltrafficid)│        │(createdby) │
   └─────────┘      └───────────┘         └───────────┘

        ┌──────────────────┼──────────────────────┐
        │                  │                      │
        ▼                  ▼                      ▼
   ┌─────────┐      ┌───────────┐         ┌───────────┐
   │  civils │      │ wildanet  │         │    tfl    │
   │(assignedto)│   │(assignedto)│        │(assignedto)│
   └────┬────┘      └─────┬─────┘         └───────────┘
        │                  │
   ┌────┼────┐        ┌───┼────┐
   │    │    │        │   │    │
   ▼    ▼    ▼        ▼   ▼    ▼
  ra  insp upload   wra winsp wupload
        _data                  _data
```

---

## 10. Summary Table

| Module | Hard Deps | Soft Deps | Shared Tables | Build Phase |
|--------|-----------|-----------|---------------|-------------|
| Auth | — | — | login_users, login_levels | P1 (done) |
| Vehicle Check | Auth | — | vehicle | P2 (standalone) |
| Timesheets | Auth | — | timesheet | P2 (standalone) |
| H&S Form | Auth | — | healthsafety | P2 (standalone) |
| Work Records | Auth | — | workrecord | P2 (standalone) |
| Bulletins | Auth | — | bulletinnew, bulletinread | P2 (standalone) |
| Equipment Check | Auth | — | equipmentcheck | P2 (standalone) |
| MEWP | Auth | — | mewp | P2 (standalone) |
| WAH | Auth | — | wah | P2 (standalone) |
| UG | Auth | — | ug | P2 (standalone) |
| Expenses | Auth | — | expenses | P2 (standalone) |
| Contacts | Auth | — | address | P2 (standalone) |
| Onboarding | Auth | — | (PDF only) | P2 (standalone) |
| Document Control | Auth | — | policies, methodstatements, processes, coshh | P2 (standalone) |
| Equipment Register | Auth | — | er, upload_er | P2 (standalone) |
| Plant Register | Auth | — | pr, upload_pr | P2 (standalone) |
| HR | Auth | — | hr, upload_hr | P2 (standalone) |
| Calendar | Auth | — | login_users.teamup | P2 (standalone) |
| Civils | Auth | — | civils, upload_data | P3 (container) |
| Wildanet | Auth | — | wildanet, wupload_data | P3 (container) |
| TFL | Auth | — | tfl, tupload_data | P3 (container) |
| Maintenance | Auth | — | maintenance, mupload_data | P3 (container) |
| Vehicle Register | Auth | — | vr, upload_vr | P3 (container) |
| RA | Auth, Civils | HR (signature) | ra | P4 (dependent) |
| INSP | Auth, Civils | HR (signature) | insp | P4 (dependent) |
| WRA | Auth, Wildanet | HR (signature) | wra | P4 (dependent) |
| WINSP | Auth, Wildanet | HR (signature) | winsp | P4 (dependent) |
| VIC | Auth, Veh. Register | — | vic | P4 (dependent) |
| VIR | Auth, Veh. Register | — | vir | P4 (dependent) |
| VRR | Auth, Veh. Register | — | vrr | P4 (dependent) |
| Civils Docs | Auth, Civils | — | upload_data | P4 (dependent) |
| Wildanet Docs | Auth, Wildanet | — | wupload_data | P4 (dependent) |
| TFL Docs | Auth, TFL | — | tupload_data | P4 (dependent) |
| Maintenance Docs | Auth, Maintenance | — | mupload_data | P4 (dependent) |
| HR Docs | Auth, HR | — | upload_hr | P4 (dependent) |
