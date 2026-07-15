# 06 — Business Workflows

**Purpose:** End-to-end business process documentation for every workflow in the LTraffic PHP system.
**Format:** For each workflow: Trigger → Steps → Data Flow → Status Transitions → Outcomes.

---

## 1. Authentication

### Login Flow
1. Employee/Admin navigates to `login.php`
2. Submits username/email + password
3. System verifies against `login_users.password` (MD5)
4. If 2FA enabled (`use_two_factor_auth`): sends SMS code, requires verification
5. On success: creates PHP session (`$_SESSION['jigowatt']`), inserts row into `login_timestamps`
6. Redirects based on `login_levels.redirect` value:
   - Admin levels (1,4,7) → `bulletin1.php` (Admin bulletin gate)
   - Operative levels (2,3,5,6,8) → `bulletin.php` (Employee bulletin gate)
   - Customer (9) → `home.php`

### Bulletin Gate (Post-Login)
1. After login redirect, `bulletin.php`/`bulletin1.php` queries: `SELECT * FROM bulletinnew WHERE new='1'`
2. If active bulletin exists AND employee hasn't confirmed it → forced to read + click "I Confirm"
3. Confirmation inserts into `bulletinread` (bulletin, user_id)
4. Only after confirmation → redirect to `home.php`

### Password Recovery
1. User submits email on `forgot.php`
2. System generates MD5 key, inserts into `login_confirm` (type='forgot_pw')
3. Email sent with reset link containing the key
4. User clicks link, submits new password
5. `login_users.password` updated with MD5 of new password
6. `login_confirm` row deleted; `tmp_auth_token`/`sms_time` cleared

---

## 2. Bulletins (Publish → Read → Confirm)

### Admin Publishing
1. Admin navigates to `bulletinadd.php`
2. Fills: image filename, title, reference, description, download link
3. Sets `new = '1'` to make active
4. INSERT into `bulletinnew`

### Employee Read-Confirmation
1. On login redirect, system checks for active bulletins (`new='1'`)
2. For each active bulletin, checks if `bulletinread` has entry for this user
3. If NOT confirmed: displays bulletin full-screen, "I Confirm" button only
4. Employee CANNOT access app until all active bulletins are confirmed
5. On confirm: INSERT into `bulletinread`, sets 8-hour cookie, redirects to home

### Admin Tracking
1. Admin views `bulletinmanagement.php`
2. For each bulletin: shows list of employees who confirmed (from `bulletinread`)
3. Can see which employees have NOT yet confirmed

### Deactivation
1. Admin edits bulletin, sets `new = '0'`
2. Bulletin no longer blocks employees on login

---

## 3. Vehicle Checks (Submit → Review → Close)

### Employee Submission
1. Employee opens `vehiclecheck1.php` (cookie check: only once per 8-hour shift)
2. Completes 16-item checklist (all Yes/No radio buttons)
3. Selects vehicle condition (Good/Average/Poor/Very Poor/Dangerous)
4. Selects safe status (Safe/Unsafe)
5. Adds defect notes if needed
6. Submits → INSERT into `vehicle` table
7. 8-hour cookie set to prevent duplicate submission

### Admin Review
1. Admin views `adminvehiclecheck.php` — shows checks where `vehiclecondition != 'Good'` OR `safe = 'Unsafe'` (Action Required)
2. `adminvehiclecheckall.php` — all checks
3. Admin can view details, add notes, change condition/safe to "Closed"

### Status Transitions
```
[No explicit status column]
vehiclecondition: Good → Average → Poor → Very Poor → Dangerous → Closed
safe: Safe → Unsafe → Closed
```
"Closed" in either field = resolved by admin.

### PDF
Admin/Employee can generate vehicle check PDF via `pdf/vcpdf.php?id=`

---

## 4. Timesheets (Fill → Submit → Approve/Reject → Close)

### Employee Submission
1. Employee opens `timesheetadd.php`
2. System auto-calculates current week (Monday–Sunday) dates
3. Per day (7 days): enters hours, location, activity, contract
4. Activity options: Civils Installation, Defects, Supervision, Validation, Holiday, Sick
5. Contract options: Essex - Gigaclear, London - TFL
6. Adds comments
7. Submits → INSERT into `timesheet` with status = "Submitted"

### Admin Review
1. Admin views `admintimesheets.php` — shows `status IN ('Submitted','Rejected')`
2. Admin can approve → status = "Approved" (moves to Completed list)
3. Admin can reject → status = "Rejected" (stays in open list for employee to re-submit)
4. Admin can delete (Admin role only)

### Status Transitions
```
Submitted → Approved (admin approves)
Submitted → Rejected (admin rejects)
Rejected → (employee resubmits as new record)
```

### PDF
`pdf/timesheetspdf.php?id=` generates the timesheet PDF

### Business Rules
- One timesheet per week per employee (not enforced by system — duplicate possible)
- `ltrafficid` field (not user_id) links timesheet to employee
- Monday–Friday activity is required; Saturday–Sunday optional

---

## 5. Health & Safety Incidents (Report → Investigate → Close)

### Employee Reporting
1. Employee opens `h&sform.php`
2. Fills comprehensive form:
   - Type: Accident/Customer Complaint/Environmental/Incident/Near Miss/Service Strike
   - Location, date/time, who reported
   - Full narrative (what happened)
   - Injury details (if applicable)
   - Witness information
   - Supporting images (up to 10, stored in `admin/hsupload/`)
3. Submits → INSERT into `healthsafety` with status = "Open"

### Admin Investigation
1. Admin views `adminreportedincidents.php` — shows `status = 'Open'` (or similar filter)
2. Opens incident, reviews details + uploaded images
3. Writes investigation notes in the `notes` field ("Investigation Report")
4. Changes status dropdown to "Closed"
5. Submits → UPDATE `healthsafety` SET status='Closed', notes=...

### Status Transitions
```
Open → Closed (admin closes after investigation)
```

### PDF
`pdf/h&sformpdf.php?id=` generates incident report PDF

---

## 6. Risk Assessments (Multi-Section → Complete)

### Initiation (Linked to Civils Job)
1. From a civils job detail page, employee clicks "Start RA"
2. System passes `civils.id` to `ra1.php`
3. Pre-populates: job number (solonumber), location, permit dates, client

### 5-Section Flow
**Section 1 — Site Details + Safety:**
- Services identified? Located on site? Pre-start images (required)
- INSERT into `ra` with status = "In Progress"

**Section 2 — Personnel in Attendance:**
- Supervisor, team, operatives 1-5, visitors
- UPDATE same record

**Section 3 — Hazards (17-item checklist):**
- Excavations, underground services, overhead services, plant, tools, manual handling, weather, noise, COVID-19, etc.
- All Yes/No/N/A radio buttons

**Section 4 — Permit to Dig:**
- 10 safety verification questions
- Digital signature (employee's stored signature image)
- Photos of marked services (required)

**Section 5 — End of Day Report:**
- Accidents occurred? Environmental incidents? Site active overnight?
- Traffic management/plant/material left overnight?
- Digital signature
- End-of-day photos
- Sets status = "RA Completed"

### Status Transitions
```
In Progress → RA Completed (Section 5 submitted)
```

### Wildanet RA (WRA)
Identical workflow but linked to `wildanet` table instead of `civils`. Data stored in `wra` table.

### PDF
`pdf/rapdf.php?id=` (full RA) or `pdf/ra1pdf.php?id=` through `ra5pdf.php` (per section)

---

## 7. Site Inspections (8-Section → Complete)

### Initiation (Linked to Civils/Wildanet Job)
1. Employee selects a job from the civils/wildanet listing
2. Opens inspection home (`insphome.php`)
3. Completes 8 sections sequentially

### 8 Sections
Each section covers a different safety aspect with numbered checkbox/radio fields. Total: 63+ form fields across all sections, plus supporting images per section.

### Status Transitions
```
In Progress → Completed (all 8 sections done)
```

### Wildanet Version (WINSP)
Same 8-section flow for Wildanet jobs. Data in `winsp` table.

---

## 8. Work Records (Submit → Approve → Invoice → Close)

### Employee Submission
1. Employee opens `workrecordadd.php`
2. Fills: road name, cabinet area, primary/secondary node, structure ID, ducting length, type of works, work status, notes
3. Attaches up to 10 images
4. Submits → INSERT into `workrecord` with status = "Pending"

### Multi-Status Lifecycle
Employee/Admin edits the record, changing status through the pipeline:

```
Pending → Issues to Rectify (problems found)
Pending → Submitted (formally submitted)
Submitted → Quotation Sent (quote issued to client)
Quotation Sent → Works Approved (client approved)
Works Approved → Completed (physically done)
Completed → Invoiced (invoice sent)
Invoiced → Closed (fully resolved)
Any → Fibre (fibre installation follow-up)
```

### Listing Pages (one per status)
- `workrecord.php` — Pending
- `workrecordsubmitted.php` — Submitted
- `workrecordquotation.php` — Quotation Sent
- `workrecordapproved.php` — Approved
- `workrecordcompleted.php` — Completed
- `workrecordinvoiced.php` — Invoiced
- `workrecordissues.php` — Issues to Rectify
- `workrecordfibre.php` — Fibre
- `workrecordclosed.php` — Closed

### PDF
`pdf/wrpdf.php?id=`

---

## 9. Civils/TFL/Wildanet/Maintenance Jobs (Job Lifecycle)

### Job Creation
1. Admin/authorized user creates job from `civilsadd.php` (or tfl/wildanet/maintenance equivalent)
2. Fields: authority, solo/reference number, location, assigned to, permit status, start/end dates
3. INSERT into respective table with `jobstatus` set

### Job Lifecycle
```
(Created) → Active → Works Completed → Closed
permitstatus: (varies) → Works Completed
```

### Document Attachment
- Upload documents via AJAX (stored in respective `upload_*` table)
- Documents viewed in `*documents.php` page

### Linked Sub-Records
Each civils job can have:
- Risk Assessments (`ra.civils = civils.id`)
- Site Inspections (`insp.civilsid = civils.id`)
- Uploaded documents (`upload_data.name = civils.id`)

Same pattern for Wildanet (linked to `wra`, `winsp`, `wupload_data`).

---

## 10. Document Control (Admin Publish → Employee Download)

### Admin Publishing
1. Admin creates entries in: `policies`, `methodstatements`, `processes`, `coshh`
2. Each entry has: reference code, document path/link, issue number
3. Actual PDF/document files stored in `../downloads/policies/`, `../downloads/methodstatement/`, etc.

### Employee Access
1. Employee navigates to `documents.php` (hub)
2. Views category: Policies, Method Statements, SOPs, CoSHH
3. Clicks to download the linked document file

### No Status/Workflow
Static document repository — no approval flow.

---

## 11. HR Lifecycle (Admin-Only CRUD)

### Record Management
1. Admin creates HR record via `hredit.php` (or PHP add form)
2. Fields: personal details, emergency contacts, job title, line manager, work location, start/end dates, photo, signature
3. Documents uploaded via `ajaxupload2.php` → stored in `upload_hr` with doctype/docdesc

### Onboarding
1. New employee fills onboarding form (`onboarding.php`)
2. Generates PDF via `pdf/onboardingpdf.php`
3. Admin reviews in HR module

---

## 12. Equipment/Vehicle/Plant Register (Admin CRUD + Documents)

### Pattern (same for ER, VR, PR)
1. Admin adds item: description, identification, allocation, condition, expiry dates
2. Attaches documents via respective AJAX upload handler
3. Can mark as completed/decommissioned (VR has `vrcompleted.php`)
4. No employee-facing workflow — admin-only management

### VR → VIC Link
Vehicle Register entries (`vr`) are linked to:
- Vehicle Inspection Checklists (`vic.vrid = vr.id`)
- Vehicle Inspection Reports (`vir.vrid = vr.id`)
- Vehicle Report Records (`vrr.vrid = vr.id`)

---

## 13. MEWP / WAH / UG Submissions (Submit-Only)

### Pattern (same for all three)
1. Employee fills form with activity details + safety checklist
2. Attaches images (up to 10)
3. Submits → INSERT with status = "Submitted"
4. No admin workflow beyond viewing/deleting

### Status
```
Submitted (no further transitions in the system)
```

---

## 14. Equipment Check (Submit → Admin Review)

### Employee Submission
1. Opens `equipmentcheck.php`
2. Fills inspection checklist (brakes, steering, lights, hydraulics, etc.)
3. Attaches images
4. Submits → INSERT into `equipmentcheck`

### Admin Review
Viewing only via admin listing. No formal close workflow observed.

---

## 15. Expenses (Submit → Pending)

### Employee Submission
1. Fills expense form
2. Submits → INSERT into `expenses` with status field

### Status
Minimal data (2 rows total). Likely underused or new feature. No admin approval workflow observed in code.

---

## 16. Contacts (Read-Only Directory)

Employee views company contact list from `address` table. No write operations from employee side.

---

## 17. Calendar (External Integration)

`calender.php` displays a TeamUp calendar via embedded iframe/URL. The URL is stored in `login_users.teamup`. No internal data — purely external service.

---

## Cross-Cutting Patterns

### File Upload Pattern
- Frontend: FilePond or standard `<input type="file" multiple>`
- Backend: Validates extension whitelist (jpeg, jpg, png, gif, bmp, pdf, doc, ppt, zip, xlsx, docx)
- Renames with random prefix (1000-1000000) to avoid collisions
- Stores in module-specific directory
- Multiple images stored as comma-separated paths in single DB column

### PDF Generation Pattern
- Library: TCPDF 6.x
- Flow: `pdf/[module]pdf.php?id=X` → query DB → render HTML-like layout → output PDF
- Called from listing pages via direct link

### Permission Pattern
- `protect("Admin, Admin1")` at top of page = hard access control
- `protectThis("Admin, Admin1")` inline = conditional UI element visibility
- Levels checked: Admin(1), Admin1(4), Admin2(7), Essex Supervisor(8), Driving Operatives(2), Operatives(3), Civils TFL Driver(5), Civils Trailer Driver(6), Customer(9)

### Cookie-Based Throttling
- Vehicle Check: 8-hour cookie prevents re-submission
- Bulletin Read: 8-hour cookie after confirmation
