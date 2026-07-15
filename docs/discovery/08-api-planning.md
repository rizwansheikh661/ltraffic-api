# 08 — API Planning

**Purpose:** Complete REST endpoint specification for every module. Detailed enough that an engineer can implement each endpoint without reading PHP.  
**Convention:** All endpoints prefixed with `/api/v1`. Auth via Bearer JWT. Responses follow `{ success: true, data: ... }` or `{ success: false, error: { code, message } }` envelope.

---

## 1. Auth Module (P1 — DONE)

Already implemented. Documented here for reference and cross-module consistency.

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/auth/login` | None | Login (MD5 verify → bcrypt lazy-rehash) |
| POST | `/auth/refresh` | Refresh token | Rotate access + refresh tokens |
| POST | `/auth/logout` | Bearer | Revoke refresh token |
| POST | `/auth/forgot-password` | None | Issue reset key |
| POST | `/auth/reset-password` | None (key in body) | Consume reset key, set new password |
| POST | `/auth/change-password` | Bearer | Authenticated password change |
| GET | `/auth/me` | Bearer | Current user profile |
| POST | `/devices/register` | Bearer | Register FCM token |
| DELETE | `/devices/:tokenId` | Bearer | Unregister FCM token |

---

## 2. Bulletins Module

**Swagger Tag:** `Bulletins`  
**DB Tables:** `bulletinnew`, `bulletinread`  
**Upload Dir:** None (image filename stored, served from PHP web root)  
**Roles:** Admin endpoints require Admin/Admin1; Employee endpoints require any authenticated user.

### Admin Endpoints

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/admin/bulletins` | Admin, Admin1 | List all bulletins (paginated) |
| GET | `/admin/bulletins/:id` | Admin, Admin1 | Get bulletin details + confirmation list |
| POST | `/admin/bulletins` | Admin, Admin1 | Create bulletin |
| PUT | `/admin/bulletins/:id` | Admin, Admin1 | Update bulletin (including activate/deactivate) |
| DELETE | `/admin/bulletins/:id` | Admin, Admin1 | Delete bulletin |
| GET | `/admin/bulletins/:id/confirmations` | Admin, Admin1 | List who confirmed/who hasn't |

### Employee Endpoints

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/employee/bulletins/pending` | Any auth | Get unconfirmed active bulletins for current user |
| POST | `/employee/bulletins/:id/confirm` | Any auth | Confirm reading a bulletin |

### Request/Response Shapes

**POST /admin/bulletins**
```json
{
  "title": "string (required, max 255)",
  "reference": "string (optional, max 100)",
  "description": "string (required, text)",
  "image": "string (optional, filename)",
  "download": "string (optional, URL/path)",
  "active": "boolean (default true)"
}
```

**GET /employee/bulletins/pending → Response**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "Safety Update March",
      "reference": "BUL-2026-03",
      "description": "Full text...",
      "image": "safety-march.jpg",
      "imageUrl": "https://domain/bulletinimages/safety-march.jpg",
      "download": "https://...",
      "createdAt": "2026-03-01T09:00:00Z"
    }
  ]
}
```

### Business Rules
- Mobile app must check `/employee/bulletins/pending` on every app launch
- If pending bulletins exist, block navigation until all confirmed
- No cookie throttling needed for mobile — server tracks via `bulletinread`
- `active` field replaces PHP's `new` column (maps: active=true → new='1')

---

## 3. Vehicle Check Module

**Swagger Tag:** `VehicleChecks`  
**DB Tables:** `vehicle`  
**Upload Dir:** `admin/vehiclecheck/`  
**Roles:** Employee submit; Admin review/close.

### Admin Endpoints

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/admin/vehicle-checks` | Admin, Admin1, Admin2 | List all checks (filterable by status) |
| GET | `/admin/vehicle-checks/action-required` | Admin, Admin1, Admin2 | Checks needing action (not Good + not Closed) |
| GET | `/admin/vehicle-checks/:id` | Admin, Admin1, Admin2 | Single check detail |
| PUT | `/admin/vehicle-checks/:id` | Admin, Admin1, Admin2 | Update (add notes, close) |
| GET | `/admin/vehicle-checks/:id/pdf` | Admin, Admin1, Admin2 | Generate PDF |

### Employee Endpoints

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/employee/vehicle-checks/can-submit` | Any auth | Check if 8h throttle allows submission |
| POST | `/employee/vehicle-checks` | Any auth | Submit vehicle check |
| GET | `/employee/vehicle-checks` | Any auth | List own past checks |
| GET | `/employee/vehicle-checks/:id` | Any auth | View own check detail |
| GET | `/employee/vehicle-checks/:id/pdf` | Any auth | Generate PDF |

### Request Shape — POST /employee/vehicle-checks

```json
{
  "registration": "string (required)",
  "mileage": "string (required)",
  "checks": {
    "mirrorsglass": "Yes|No",
    "lights": "Yes|No",
    "tyrewheels": "Yes|No",
    "bodywork": "Yes|No",
    "brakes": "Yes|No",
    "exhaust": "Yes|No",
    "steering": "Yes|No",
    "horn": "Yes|No",
    "fuel": "Yes|No",
    "oilwater": "Yes|No",
    "seatbelt": "Yes|No",
    "loadanchorage": "Yes|No",
    "dashwarning": "Yes|No",
    "markers": "Yes|No",
    "speedometer": "Yes|No",
    "windscreen": "Yes|No"
  },
  "vehiclecondition": "Good|Average|Poor|Very Poor|Dangerous",
  "safe": "Safe|Unsafe",
  "defectnotes": "string (optional)",
  "images": "multipart file[] (max 10, jpeg|jpg|png|gif|bmp)"
}
```

### Query Parameters — GET /admin/vehicle-checks

| Param | Type | Description |
|-------|------|-------------|
| page | int | Page number (default 1) |
| limit | int | Per page (default 20, max 100) |
| condition | string | Filter by vehiclecondition |
| safe | string | Filter by safe status |
| dateFrom | date | Filter checks from date |
| dateTo | date | Filter checks to date |
| search | string | Search registration or employee name |

### Throttle Logic
- Server checks last submission time for this `ltrafficid`
- If < 8 hours ago → reject with 429 + `retryAfter` seconds
- `/can-submit` endpoint lets mobile show/hide the button proactively

---

## 4. Timesheets Module

**Swagger Tag:** `Timesheets`  
**DB Tables:** `timesheet`  
**Upload Dir:** None  
**Roles:** Employee submit; Admin approve/reject/delete.

### Admin Endpoints

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/admin/timesheets` | Admin, Admin1 | List timesheets (filterable by status) |
| GET | `/admin/timesheets/:id` | Admin, Admin1 | Single timesheet detail |
| PUT | `/admin/timesheets/:id/approve` | Admin, Admin1 | Approve |
| PUT | `/admin/timesheets/:id/reject` | Admin, Admin1 | Reject (with reason) |
| DELETE | `/admin/timesheets/:id` | Admin | Delete (Admin level 1 only) |
| GET | `/admin/timesheets/:id/pdf` | Admin, Admin1 | Generate PDF |

### Employee Endpoints

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/employee/timesheets` | Any auth | Submit timesheet |
| GET | `/employee/timesheets` | Any auth | List own timesheets |
| GET | `/employee/timesheets/:id` | Any auth | View own timesheet |
| PUT | `/employee/timesheets/:id` | Any auth | Edit (only if status=Rejected) |
| GET | `/employee/timesheets/:id/pdf` | Any auth | Generate PDF |

### Request Shape — POST /employee/timesheets

```json
{
  "weekStarting": "date (Monday, required)",
  "days": [
    {
      "day": "Monday|Tuesday|...|Sunday",
      "hours": "number (0-24)",
      "location": "string",
      "activity": "Civils Installation|Defects|Supervision|Validation|Holiday|Sick",
      "contract": "Essex - Gigaclear|London - TFL"
    }
  ],
  "comments": "string (optional)"
}
```

### Business Rules
- `weekStarting` must be a Monday
- Mon-Fri: activity required if hours > 0
- Sat-Sun: optional
- System does NOT enforce one-per-week (warn on mobile, allow submit)
- Reject reason stored in response body, not a DB column (or add notes field)

---

## 5. H&S Incidents Module

**Swagger Tag:** `HealthSafety`  
**DB Tables:** `healthsafety`  
**Upload Dir:** `admin/hsupload/`  
**Roles:** Employee report; Admin investigate/close.

### Admin Endpoints

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/admin/incidents` | Admin, Admin1, Admin2 | List incidents (filterable) |
| GET | `/admin/incidents/:id` | Admin, Admin1, Admin2 | Incident detail |
| PUT | `/admin/incidents/:id` | Admin, Admin1, Admin2 | Update (add investigation notes, close) |
| GET | `/admin/incidents/:id/pdf` | Admin, Admin1, Admin2 | Generate PDF |

### Employee Endpoints

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/employee/incidents` | Any auth | Report incident |
| GET | `/employee/incidents` | Any auth | List own reported incidents |
| GET | `/employee/incidents/:id` | Any auth | View own incident |

### Request Shape — POST /employee/incidents

```json
{
  "type": "Accident|Customer Complaint|Environmental|Incident|Near Miss|Service Strike",
  "location": "string (required)",
  "dateTime": "datetime (required)",
  "reportedBy": "string (required)",
  "narrative": "string (required, text — what happened)",
  "injuryDetails": "string (optional)",
  "witnessName": "string (optional)",
  "witnessContact": "string (optional)",
  "images": "multipart file[] (max 10)"
}
```

### Status Transitions
```
Open → Closed (admin closes after investigation)
```

---

## 6. Work Records Module

**Swagger Tag:** `WorkRecords`  
**DB Tables:** `workrecord`  
**Upload Dir:** `admin/workrecordupload/`  
**Roles:** Employee submit; Admin/Employee manage status transitions.

### Endpoints

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/work-records` | Any auth | List (filterable by status) |
| GET | `/work-records/:id` | Any auth | Detail |
| POST | `/work-records` | Any auth | Create |
| PUT | `/work-records/:id` | Any auth | Update (fields + status change) |
| DELETE | `/work-records/:id` | Admin, Admin1 | Delete |
| GET | `/work-records/:id/pdf` | Any auth | Generate PDF |

### Query Parameters

| Param | Type | Description |
|-------|------|-------------|
| status | string | Pending\|Submitted\|Quotation Sent\|Works Approved\|Completed\|Invoiced\|Closed\|Issues to Rectify\|Fibre |
| page | int | Pagination |
| limit | int | Per page |
| search | string | Search road name, cabinet, nodes |

### Request Shape — POST /work-records

```json
{
  "roadName": "string (required)",
  "cabinetArea": "string",
  "primaryNode": "string",
  "secondaryNode": "string",
  "structureId": "string",
  "ductingLength": "string",
  "typeOfWorks": "string",
  "status": "Pending",
  "notes": "string (optional)",
  "images": "multipart file[] (max 10)"
}
```

### Status Transitions (enforced by API)
```
Pending → Issues to Rectify | Submitted
Submitted → Quotation Sent
Quotation Sent → Works Approved
Works Approved → Completed
Completed → Invoiced
Invoiced → Closed
Any → Fibre (special bypass)
```

---

## 7. Equipment Check Module

**Swagger Tag:** `EquipmentChecks`  
**DB Tables:** `equipmentcheck`  
**Upload Dir:** `admin/equipmentcheck/`  
**Roles:** Employee submit; Admin view.

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/employee/equipment-checks` | Any auth | Submit check |
| GET | `/employee/equipment-checks` | Any auth | List own checks |
| GET | `/employee/equipment-checks/:id` | Any auth | View detail |
| GET | `/admin/equipment-checks` | Admin, Admin1, Admin2 | List all |
| GET | `/admin/equipment-checks/:id` | Admin, Admin1, Admin2 | View detail |

### Request Shape

```json
{
  "equipmentType": "string (required)",
  "checks": {
    "brakes": "Good|Defective|N/A",
    "steering": "Good|Defective|N/A",
    "lights": "Good|Defective|N/A",
    "hydraulics": "Good|Defective|N/A",
    "tyres": "Good|Defective|N/A",
    "guards": "Good|Defective|N/A",
    "controls": "Good|Defective|N/A",
    "mirrors": "Good|Defective|N/A"
  },
  "condition": "Good|Average|Poor|Dangerous",
  "defectNotes": "string (optional)",
  "images": "multipart file[] (max 10)"
}
```

---

## 8. MEWP / WAH / UG Modules (Identical Pattern)

**Swagger Tags:** `MEWP`, `WAH`, `UG`  
**DB Tables:** `mewp`, `wah`, `ug`  
**Upload Dirs:** `admin/mewp/`, `admin/wah/`, `admin/ug/`  

All three follow the same submit-only pattern:

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/employee/{module}` | Any auth | Submit |
| GET | `/employee/{module}` | Any auth | List own |
| GET | `/employee/{module}/:id` | Any auth | View detail |
| GET | `/admin/{module}` | Admin, Admin1, Admin2 | List all |
| GET | `/admin/{module}/:id` | Admin, Admin1, Admin2 | View detail |
| DELETE | `/admin/{module}/:id` | Admin, Admin1 | Delete |

Where `{module}` = `mewp` | `wah` | `ug`

### Request Shape (common pattern)

```json
{
  "location": "string (required)",
  "date": "date (required)",
  "activity": "string (required)",
  "safetyChecks": { "...": "Yes|No|N/A" },
  "notes": "string (optional)",
  "images": "multipart file[] (max 10)"
}
```

---

## 9. Contacts Module

**Swagger Tag:** `Contacts`  
**DB Tables:** `address`  
**Roles:** Read-only for all authenticated users; Admin can CRUD.

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/contacts` | Any auth | List contacts (paginated, searchable) |
| GET | `/contacts/:id` | Any auth | Single contact |
| POST | `/admin/contacts` | Admin, Admin1 | Create contact |
| PUT | `/admin/contacts/:id` | Admin, Admin1 | Update contact |
| DELETE | `/admin/contacts/:id` | Admin, Admin1 | Delete contact |

---

## 10. Document Control Module

**Swagger Tag:** `Documents`  
**DB Tables:** `policies`, `methodstatements`, `processes`, `coshh`  
**Download Dirs:** `../downloads/policies/`, `../downloads/methodstatement/`, etc.

### Admin Endpoints

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/admin/documents/:category` | Admin, Admin1 | List docs in category |
| POST | `/admin/documents/:category` | Admin, Admin1 | Add document entry |
| PUT | `/admin/documents/:category/:id` | Admin, Admin1 | Update entry |
| DELETE | `/admin/documents/:category/:id` | Admin, Admin1 | Delete entry |

Where `category` = `policies` | `method-statements` | `processes` | `coshh`

### Employee Endpoints

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/employee/documents` | Any auth | List all categories |
| GET | `/employee/documents/:category` | Any auth | List docs in category |
| GET | `/employee/documents/:category/:id/download` | Any auth | Download file |

---

## 11. Expenses Module

**Swagger Tag:** `Expenses`  
**DB Tables:** `expenses`  
**Roles:** Employee submit; Admin view.

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/employee/expenses` | Any auth | Submit expense |
| GET | `/employee/expenses` | Any auth | List own |
| GET | `/employee/expenses/:id` | Any auth | View detail |
| GET | `/admin/expenses` | Admin, Admin1 | List all |
| GET | `/admin/expenses/:id` | Admin, Admin1 | View detail |

---

## 12. Onboarding Module

**Swagger Tag:** `Onboarding`  
**DB Tables:** None (PDF generation only)  
**Upload Dir:** `admin/onboarding/`

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/employee/onboarding` | Any auth | Submit onboarding form |
| GET | `/employee/onboarding/pdf` | Any auth | Generate PDF of own onboarding |
| GET | `/admin/onboarding` | Admin, Admin1 | List submissions |
| GET | `/admin/onboarding/:id/pdf` | Admin, Admin1 | Generate PDF |

---

## 13. HR Module

**Swagger Tag:** `HR`  
**DB Tables:** `hr`, `upload_hr`  
**Upload Dir:** `admin/hruploads/`  
**Roles:** Admin-only CRUD.

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/admin/hr` | Admin, Admin1, Admin2 | List HR records |
| GET | `/admin/hr/:id` | Admin, Admin1, Admin2 | Single HR record |
| POST | `/admin/hr` | Admin, Admin1 | Create HR record |
| PUT | `/admin/hr/:id` | Admin, Admin1 | Update HR record |
| DELETE | `/admin/hr/:id` | Admin | Delete (level 1 only) |
| POST | `/admin/hr/:id/documents` | Admin, Admin1, Admin2 | Upload document |
| GET | `/admin/hr/:id/documents` | Admin, Admin1, Admin2 | List documents |
| DELETE | `/admin/hr/:id/documents/:docId` | Admin, Admin1 | Delete document |
| POST | `/admin/hr/:id/signature` | Admin, Admin1 | Upload signature image |

---

## 14. Equipment Register Module

**Swagger Tag:** `EquipmentRegister`  
**DB Tables:** `er`, `upload_er`  
**Upload Dir:** `admin/eruploads/`

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/admin/equipment-register` | Admin, Admin1, Admin2 | List |
| GET | `/admin/equipment-register/:id` | Admin, Admin1, Admin2 | Detail |
| POST | `/admin/equipment-register` | Admin, Admin1 | Create |
| PUT | `/admin/equipment-register/:id` | Admin, Admin1 | Update |
| DELETE | `/admin/equipment-register/:id` | Admin, Admin1 | Delete |
| POST | `/admin/equipment-register/:id/documents` | Admin, Admin1, Admin2 | Upload doc |
| GET | `/admin/equipment-register/:id/documents` | Admin, Admin1, Admin2 | List docs |

---

## 15. Plant Register Module

**Swagger Tag:** `PlantRegister`  
**DB Tables:** `pr`, `upload_pr`  
**Upload Dir:** `admin/pruploads/`

Same pattern as Equipment Register:

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/admin/plant-register` | Admin, Admin1, Admin2 | List |
| GET | `/admin/plant-register/:id` | Admin, Admin1, Admin2 | Detail |
| POST | `/admin/plant-register` | Admin, Admin1 | Create |
| PUT | `/admin/plant-register/:id` | Admin, Admin1 | Update |
| DELETE | `/admin/plant-register/:id` | Admin, Admin1 | Delete |
| POST | `/admin/plant-register/:id/documents` | Admin, Admin1, Admin2 | Upload doc |
| GET | `/admin/plant-register/:id/documents` | Admin, Admin1, Admin2 | List docs |

---

## 16. Vehicle Register Module

**Swagger Tag:** `VehicleRegister`  
**DB Tables:** `vr`, `upload_vr`  
**Upload Dir:** `admin/vruploads/`

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/admin/vehicle-register` | Admin, Admin1, Admin2 | List |
| GET | `/admin/vehicle-register/:id` | Admin, Admin1, Admin2 | Detail (includes linked VIC/VIR/VRR counts) |
| POST | `/admin/vehicle-register` | Admin, Admin1 | Create |
| PUT | `/admin/vehicle-register/:id` | Admin, Admin1 | Update |
| DELETE | `/admin/vehicle-register/:id` | Admin, Admin1 | Delete |
| POST | `/admin/vehicle-register/:id/documents` | Admin, Admin1, Admin2 | Upload doc |
| GET | `/admin/vehicle-register/:id/documents` | Admin, Admin1, Admin2 | List docs |
| PUT | `/admin/vehicle-register/:id/complete` | Admin, Admin1 | Mark complete/decommission |

---

## 17. Civils Jobs Module

**Swagger Tag:** `Civils`  
**DB Tables:** `civils`, `upload_data`  
**Upload Dir:** `admin/civilsuploads/`

### Endpoints

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/civils` | Any auth | List jobs (filterable by jobstatus, assignedto) |
| GET | `/civils/:id` | Any auth | Job detail (includes linked RA/INSP/doc counts) |
| POST | `/civils` | Admin, Admin1 | Create job |
| PUT | `/civils/:id` | Admin, Admin1 | Update job |
| DELETE | `/civils/:id` | Admin | Delete |
| POST | `/civils/:id/documents` | Any auth | Upload document |
| GET | `/civils/:id/documents` | Any auth | List documents |
| DELETE | `/civils/:id/documents/:docId` | Admin, Admin1 | Delete document |

### Request Shape — POST /civils

```json
{
  "authority": "string",
  "solonumber": "string (required, unique ref)",
  "location": "string (required)",
  "assignedto": "string (employee name/ltrafficid)",
  "permitstatus": "string",
  "jobstatus": "Active|Works Completed|Closed",
  "startdate": "date",
  "enddate": "date",
  "notes": "string (optional)"
}
```

### Query Params

| Param | Type | Description |
|-------|------|-------------|
| jobstatus | string | Filter: Active, Works Completed, Closed |
| assignedto | string | Filter by assigned employee |
| search | string | Search solonumber, location |
| page, limit | int | Pagination |

---

## 18. Wildanet Jobs Module

**Swagger Tag:** `Wildanet`  
**DB Tables:** `wildanet`, `wupload_data`  
**Upload Dir:** `admin/wildanetuploads/`

Identical endpoint pattern to Civils (replace `/civils` with `/wildanet`). Same request shapes.

---

## 19. TFL Jobs Module

**Swagger Tag:** `TFL`  
**DB Tables:** `tfl`, `tupload_data`  
**Upload Dir:** `admin/tfluploads/`

Identical pattern to Civils (replace `/civils` with `/tfl`).

---

## 20. Maintenance Jobs Module

**Swagger Tag:** `Maintenance`  
**DB Tables:** `maintenance`, `mupload_data`  
**Upload Dir:** `admin/maintenanceuploads/`

Identical pattern to Civils (replace `/civils` with `/maintenance`).

---

## 21. Risk Assessment (RA) Module

**Swagger Tag:** `RiskAssessments`  
**DB Tables:** `ra`  
**Upload Dir:** `admin/rauploads/`  
**Depends on:** Civils (ra.civils = civils.id)

### Endpoints

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/civils/:civilsId/risk-assessments` | Any auth | List RAs for a job |
| POST | `/civils/:civilsId/risk-assessments` | Any auth | Create RA (Section 1) |
| GET | `/risk-assessments/:id` | Any auth | Full RA detail |
| PUT | `/risk-assessments/:id/section/:num` | Any auth | Update section (2-5) |
| GET | `/risk-assessments/:id/pdf` | Any auth | Full PDF |
| GET | `/risk-assessments/:id/pdf/:section` | Any auth | Per-section PDF |
| GET | `/admin/risk-assessments` | Admin, Admin1, Admin2 | List all RAs |

### Multi-Section Flow

**Section 1 (POST — creates the record):**
```json
{
  "servicesIdentified": "Yes|No",
  "servicesLocated": "Yes|No",
  "preStartImages": "multipart file[] (required, max 6)",
  "notes": "string (optional)"
}
```

**Section 2 (PUT section/2):**
```json
{
  "supervisor": "string (required)",
  "team": "string",
  "operative1": "string",
  "operative2": "string",
  "operative3": "string",
  "operative4": "string",
  "operative5": "string",
  "visitors": "string"
}
```

**Section 3 (PUT section/3):**
```json
{
  "hazards": {
    "excavations": "Yes|No|N/A",
    "undergroundServices": "Yes|No|N/A",
    "overheadServices": "Yes|No|N/A",
    "plant": "Yes|No|N/A",
    "tools": "Yes|No|N/A",
    "manualHandling": "Yes|No|N/A",
    "weather": "Yes|No|N/A",
    "noise": "Yes|No|N/A",
    "covid19": "Yes|No|N/A",
    "...": "(17 total)"
  }
}
```

**Section 4 (PUT section/4):**
```json
{
  "permitToDig": {
    "q1": "Yes|No",
    "q2": "Yes|No",
    "...": "(10 questions)"
  },
  "signatureConfirmed": "boolean (true = use stored signature)",
  "markedServicesImages": "multipart file[] (required)"
}
```

**Section 5 (PUT section/5):**
```json
{
  "accidentsOccurred": "Yes|No",
  "environmentalIncidents": "Yes|No",
  "siteActiveOvernight": "Yes|No",
  "trafficManagementLeft": "Yes|No",
  "plantLeft": "Yes|No",
  "materialLeft": "Yes|No",
  "signatureConfirmed": "boolean",
  "endOfDayImages": "multipart file[] (required)"
}
```

### Status Transitions
```
In Progress (Section 1 created) → RA Completed (Section 5 submitted)
```

---

## 22. Wildanet Risk Assessment (WRA) Module

**Swagger Tag:** `WildanetRiskAssessments`  
**DB Tables:** `wra`  
**Upload Dir:** `admin/wrauploads/`  
**Depends on:** Wildanet (wra.wildanet = wildanet.id)

Identical pattern to RA. Endpoints: `/wildanet/:wildanetId/risk-assessments`, `/wra/:id/section/:num`, etc.

---

## 23. Site Inspection (INSP) Module

**Swagger Tag:** `SiteInspections`  
**DB Tables:** `insp`  
**Upload Dir:** `admin/inspuploads/`  
**Depends on:** Civils (insp.civilsid = civils.id)

### Endpoints

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/civils/:civilsId/inspections` | Any auth | List inspections for a job |
| POST | `/civils/:civilsId/inspections` | Any auth | Create (Section 1) |
| GET | `/inspections/:id` | Any auth | Full detail |
| PUT | `/inspections/:id/section/:num` | Any auth | Update section (2-8) |
| GET | `/inspections/:id/pdf` | Any auth | Generate PDF |
| GET | `/admin/inspections` | Admin, Admin1, Admin2 | List all inspections |
| PUT | `/admin/inspections/:id/status` | Admin, Admin1, Admin2 | Change status (complete/review) |

### 8 Sections
Each section is a numbered set of checklist items (63+ fields total). Sections 1-8 each have a specific safety domain. Submitted as PUT to the corresponding section number.

### Status Transitions
```
In Progress → Inspection Awaiting Review → Completed
```

---

## 24. Wildanet Site Inspection (WINSP) Module

**Swagger Tag:** `WildanetInspections`  
**DB Tables:** `winsp`  
**Upload Dir:** `admin/winspuploads/`  
**Depends on:** Wildanet (winsp.wildanetid = wildanet.id)

Same pattern as INSP.

---

## 25. Vehicle Inspection Checklist (VIC) Module

**Swagger Tag:** `VIC`  
**DB Tables:** `vic`  
**Upload Dir:** `admin/vicuploads/`  
**Depends on:** Vehicle Register (vic.vrid = vr.id)

### Endpoints

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/vehicle-register/:vrId/vic` | Any auth | List VICs for a vehicle |
| POST | `/vehicle-register/:vrId/vic` | Any auth | Create (Section 1) |
| GET | `/vic/:id` | Any auth | Full detail |
| PUT | `/vic/:id/section/:num` | Any auth | Update section (2-4) |
| GET | `/vic/:id/pdf` | Any auth | PDF |
| GET | `/admin/vic` | Admin, Admin1, Admin2 | List all VICs |

### 4-Section Flow
109+ fields across 4 sections. Each section covers different vehicle inspection areas.

---

## 26. VIR / VRR Modules

**Swagger Tags:** `VIR`, `VRR`  
**DB Tables:** `vir`, `vrr`  
**Upload Dirs:** `admin/viruploads/`, `admin/vrruploads/`  
**Depends on:** Vehicle Register

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/vehicle-register/:vrId/vir` | Any auth | List VIRs |
| POST | `/vehicle-register/:vrId/vir` | Any auth | Create |
| GET | `/vir/:id` | Any auth | Detail |
| PUT | `/vir/:id` | Any auth | Update |
| GET | `/vir/:id/pdf` | Any auth | PDF |

Same for VRR (replace `vir` with `vrr`).

---

## 27. Calendar Module

**Swagger Tag:** `Calendar`  
**DB Tables:** `login_users.teamup`

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/employee/calendar` | Any auth | Get TeamUp calendar URL for current user |

Response: `{ "url": "https://teamup.com/..." }`

---

## Cross-Cutting API Concerns

### Pagination (all list endpoints)
```
Query: ?page=1&limit=20
Response header: X-Total-Count: 142
Response body: { success: true, data: [...], pagination: { page: 1, limit: 20, total: 142, pages: 8 } }
```

### File Uploads
- Use `multipart/form-data`
- Validate: jpeg, jpg, png, gif, bmp, pdf, doc, ppt, zip, xlsx, docx
- Max size: 10MB per file (configurable)
- Storage: write to PHP web root directory (UPLOADS_ROOT env var)
- Response includes `fileUrl` for each uploaded file

### PDF Generation
- All PDF endpoints return `Content-Type: application/pdf`
- Accept `Accept: application/json` header to get metadata instead of binary
- Use TCPDF or PDFKit on Node side (decision deferred)

### Error Codes
| HTTP | Code | Meaning |
|------|------|---------|
| 400 | VALIDATION_ERROR | Request body/params invalid |
| 401 | UNAUTHORIZED | Missing/invalid/expired token |
| 403 | FORBIDDEN | Valid token but insufficient role |
| 404 | NOT_FOUND | Resource doesn't exist |
| 409 | CONFLICT | Duplicate/status conflict |
| 429 | RATE_LIMITED | Throttle hit (vehicle check 8h, login attempts) |
| 500 | INTERNAL_ERROR | Unexpected server error |

### Transaction Boundaries
Multi-section forms (RA, INSP, VIC) are section-at-a-time — no multi-table transaction needed. Work Record status changes are single-row UPDATE — no transaction. The only multi-table writes are:
- Login: INSERT `login_timestamps` + potential INSERT `lt_user_credentials` (already handled in P1)
- Bulletin confirm: INSERT `bulletinread` (single table)
- Document upload: INSERT `upload_*` + write file (need rollback if file write fails)

### Estimated Endpoint Count

| Module | Endpoints |
|--------|-----------|
| Auth (P1 done) | 9 |
| Bulletins | 8 |
| Vehicle Check | 9 |
| Timesheets | 11 |
| H&S Incidents | 7 |
| Work Records | 6 |
| Equipment Check | 5 |
| MEWP/WAH/UG (×3) | 15 |
| Contacts | 5 |
| Document Control | 7 |
| Expenses | 5 |
| Onboarding | 4 |
| HR | 9 |
| Equipment Register | 7 |
| Plant Register | 7 |
| Vehicle Register | 8 |
| Civils | 8 |
| Wildanet | 8 |
| TFL | 8 |
| Maintenance | 8 |
| RA | 7 |
| WRA | 7 |
| INSP | 7 |
| WINSP | 7 |
| VIC | 6 |
| VIR | 5 |
| VRR | 5 |
| Calendar | 1 |
| **Total** | **~198** |
