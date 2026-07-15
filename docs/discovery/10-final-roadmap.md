# 10 — Final Implementation Roadmap

**Purpose:** Phased implementation plan with module assignments, dependency ordering, infrastructure requirements, and cumulative coverage targets.  
**Constraint:** Each phase must be independently deployable and testable. No phase ships incomplete modules.

---

## Phase Summary

| Phase | Name | Modules | Endpoints | Infra Built | Cumulative | Est. Days |
|-------|------|---------|-----------|-------------|-----------|-----------|
| P1 | Auth + Devices | 2 | 11 | JWT, bcrypt sidecar, rate limiting, repository pattern | 6% | DONE |
| P2.1 | Mobile MVP Core | 5 | 40 | Pagination, upload service, PDF service, throttle middleware | 26% | 10-12 |
| P2.2 | Mobile MVP Extended | 5 | 26 | Status-transition validator, generic submit pattern | 39% | 7-9 |
| P2.3 | Mobile MVP Complete | 3 | 10 | — (reuses P2.1/P2.2 infra) | 44% | 3-4 |
| P3.1 | Job Containers | 4 | 32 | Job CRUD factory, document-attach pattern | 60% | 8-10 |
| P3.2 | Admin Registers | 4 | 31 | — (reuses document-attach pattern) | 76% | 8-10 |
| P4.1 | Multi-Section Forms (Jobs) | 4 | 28 | Multi-section controller, signature service | 90% | 14-18 |
| P4.2 | Multi-Section Forms (Vehicles) | 3 | 16 | — (reuses P4.1 pattern) | 98% | 8-10 |
| P5 | Cleanup + Unknowns | 3 | ~12 | Email service (if needed) | 100% | 4-6 |
| **Total** | | **34** | **~198** | | | **62-79** |

---

## P2.1 — Mobile MVP Core

**Goal:** Ship the minimum set of APIs for a usable mobile app. Every employee interacts with these daily.

### Modules

| Module | Endpoints | Why This Phase |
|--------|-----------|----------------|
| Bulletins | 8 | Blocks all app usage — must be first |
| Vehicle Check | 9 | Daily pre-shift requirement |
| Timesheets | 11 | Weekly requirement; high visibility |
| H&S Incidents | 7 | Safety-critical; legal requirement |
| Contacts | 5 | Frequently accessed; simple to build |

### Infrastructure to Build

| Component | Purpose | Reused By |
|-----------|---------|-----------|
| `PaginationHelper` | Standardized page/limit/total response | All list endpoints |
| `FileUploadService` | Multer + validation + rename + write to UPLOADS_ROOT | All upload modules |
| `PdfService` | TCPDF-equivalent rendering (or proxy to PHP PDF endpoint) | All PDF endpoints |
| `ThrottleMiddleware` | Per-user time-based submission throttle | Vehicle Check, future modules |
| `ListController` pattern | Reusable filtered/sorted/paginated list | All modules |

### Deliverables
- [ ] Bulletins: admin CRUD + employee pending/confirm
- [ ] Vehicle Check: employee submit (with throttle) + admin review/close + PDF
- [ ] Timesheets: employee submit/edit + admin approve/reject/delete + PDF
- [ ] H&S Incidents: employee report + admin investigate/close + PDF
- [ ] Contacts: read-only list + admin CRUD
- [ ] Swagger documentation for all 40 endpoints
- [ ] Integration tests (target: 40+ test cases)

### Exit Criteria
- Mobile app can: login → see/confirm bulletins → submit vehicle check → submit timesheet → report incident → view contacts
- All PDFs render correctly
- Upload files appear at correct paths readable by PHP portal

---

## P2.2 — Mobile MVP Extended

**Goal:** Complete the daily-use employee toolkit.

### Modules

| Module | Endpoints | Why This Phase |
|--------|-----------|----------------|
| Work Records | 6 | Daily job tracking with complex status machine |
| Equipment Check | 5 | Regular equipment inspections |
| MEWP | 5 | Activity-specific permit |
| WAH | 5 | Activity-specific permit |
| UG | 5 | Activity-specific permit |

### Infrastructure to Build

| Component | Purpose | Reused By |
|-----------|---------|-----------|
| `StatusTransitionValidator` | Enforce allowed state transitions with audit | Work Records, Jobs (P3) |
| `GenericSubmitController` | Pattern for submit-only modules (no admin workflow) | MEWP, WAH, UG, future submit-only |

### Deliverables
- [ ] Work Records: full 9-status lifecycle with transition validation
- [ ] Equipment Check: employee submit + admin view
- [ ] MEWP/WAH/UG: employee submit + admin view/delete (×3 using shared pattern)
- [ ] Swagger docs for 26 endpoints
- [ ] Integration tests (target: 25+ test cases)

### Exit Criteria
- Employee can track work records through full lifecycle
- All 3 permit types (MEWP/WAH/UG) submittable from mobile
- Status transitions are strictly enforced (no invalid jumps)

---

## P2.3 — Mobile MVP Complete

**Goal:** Round out the mobile app with low-frequency features.

### Modules

| Module | Endpoints | Why This Phase |
|--------|-----------|----------------|
| Documents Hub | 7 | Reference access to policies/method statements |
| Expenses | 5 | Infrequent but needed |
| Onboarding | 4 | New employee flow |
| Calendar | 1 | Simple TeamUp URL pass-through |

### Deliverables
- [ ] Document Control: admin CRUD + employee browse/download (4 categories)
- [ ] Expenses: employee submit + admin view
- [ ] Onboarding: employee form + PDF generation
- [ ] Calendar: return TeamUp URL
- [ ] Swagger docs for 10 endpoints
- [ ] Integration tests (target: 10+ test cases)

### Exit Criteria
- Mobile app feature-complete for all standalone modules
- All 76 endpoints from P2 working together
- Ready to demo to stakeholders

---

## P3.1 — Job Containers

**Goal:** Build the 4 job-type modules that are prerequisites for P4's complex forms.

### Modules

| Module | Endpoints | Why This Phase |
|--------|-----------|----------------|
| Civils Jobs | 8 | Prerequisite for RA + INSP |
| Wildanet Jobs | 8 | Prerequisite for WRA + WINSP |
| TFL Jobs | 8 | Complete job family |
| Maintenance Jobs | 8 | Complete job family |

### Infrastructure to Build

| Component | Purpose | Reused By |
|-----------|---------|-----------|
| `JobCrudFactory` | Parameterized controller factory (table, upload dir, upload table) | All 4 job types share 95% logic |
| `DocumentAttachService` | Sub-resource pattern for uploading docs to a parent record | Jobs, HR, Registers |

### Implementation Note
All 4 job modules are structurally identical. Build Civils first as the template, then parameterize:

```
createJobModule('civils', 'upload_data', 'admin/civilsuploads/')
createJobModule('wildanet', 'wupload_data', 'admin/wildanetuploads/')
createJobModule('tfl', 'tupload_data', 'admin/tfluploads/')
createJobModule('maintenance', 'mupload_data', 'admin/maintenanceuploads/')
```

### Deliverables
- [ ] Civils: full CRUD + document attach + status transitions
- [ ] Wildanet: clone of Civils (different table/upload)
- [ ] TFL: clone of Civils
- [ ] Maintenance: clone of Civils
- [ ] Job listing with filter by status/assigned-to
- [ ] Swagger docs for 32 endpoints
- [ ] Integration tests (target: 30+ test cases)

### Exit Criteria
- All 4 job types have full CRUD + document management
- Jobs are filterable by status and assignment
- Document uploads land in correct directories and are viewable from PHP portal
- P4 modules can reference job records

---

## P3.2 — Admin Registers

**Goal:** Build admin-only register modules (prerequisites for VIC/VIR/VRR).

### Modules

| Module | Endpoints | Why This Phase |
|--------|-----------|----------------|
| HR | 9 | Employee records + document management |
| Equipment Register | 7 | Equipment tracking |
| Plant Register | 7 | Plant tracking |
| Vehicle Register | 8 | Prerequisite for VIC/VIR/VRR |

### Deliverables
- [ ] HR: full CRUD + document types + signature upload
- [ ] Equipment Register: CRUD + documents
- [ ] Plant Register: CRUD + documents
- [ ] Vehicle Register: CRUD + documents + complete/decommission
- [ ] Swagger docs for 31 endpoints
- [ ] Integration tests (target: 25+ test cases)

### Exit Criteria
- All registers support CRUD + document attachment
- Vehicle Register entries exist for VIC/VIR/VRR to reference
- HR signature images stored at expected path for RA/INSP consumption

---

## P4.1 — Multi-Section Forms (Job-Linked)

**Goal:** Build the complex multi-section field forms linked to jobs.

### Modules

| Module | Sections | Fields | Depends On |
|--------|----------|--------|-----------|
| Risk Assessment (RA) | 5 | 74+ | Civils |
| Site Inspection (INSP) | 8 | 63+ | Civils |
| Wildanet RA (WRA) | 5 | 74+ | Wildanet |
| Wildanet INSP (WINSP) | 8 | 63+ | Wildanet |

### Infrastructure to Build

| Component | Purpose | Reused By |
|-----------|---------|-----------|
| `MultiSectionController` | Section routing, partial-save, status auto-advance on final section | RA, INSP, WRA, WINSP, VIC |
| `SignatureService` | Read employee signature from HR uploads, embed in response/PDF | RA Section 4, INSP |
| `SectionValidatorFactory` | Per-section validation schema generator | All multi-section modules |

### Implementation Strategy

1. Build RA first (5 sections, well-documented)
2. Extract the multi-section pattern into reusable infrastructure
3. Apply pattern to INSP (8 sections) — same shape, more sections
4. Clone for WRA and WINSP (identical to RA/INSP but different tables)

### Deliverables
- [ ] Multi-section controller pattern (section create/update/status)
- [ ] RA: 5 sections + pre-populate from civils + signature + per-section PDF
- [ ] INSP: 8 sections + pre-populate from civils + per-section images
- [ ] WRA: clone of RA (wildanet table linkage)
- [ ] WINSP: clone of INSP (wildanet table linkage)
- [ ] Swagger docs for 28 endpoints
- [ ] Integration tests (target: 40+ test cases — sections are independently testable)

### Exit Criteria
- Field employees can complete full RA (5 sections) and INSP (8 sections) from mobile
- Each section saves independently (no data loss on app crash mid-form)
- Status advances automatically on final section completion
- Digital signature appears in Section 4 (RA) from HR-uploaded image
- PDFs generate correctly for full form and per-section

---

## P4.2 — Multi-Section Forms (Vehicle-Linked)

**Goal:** Build vehicle inspection forms linked to Vehicle Register.

### Modules

| Module | Sections | Fields | Depends On |
|--------|----------|--------|-----------|
| VIC | 4 | 109+ | Vehicle Register |
| VIR | 1 (single form) | ~30 | Vehicle Register |
| VRR | 1 (single form) | ~20 | Vehicle Register |

### Deliverables
- [ ] VIC: 4 sections + pre-populate from VR + PDF
- [ ] VIR: single-form CRUD + link to VR + PDF
- [ ] VRR: single-form CRUD + link to VR + PDF
- [ ] Swagger docs for 16 endpoints
- [ ] Integration tests (target: 20+ test cases)

### Exit Criteria
- VIC 4-section flow works from mobile (109+ fields, section-at-a-time)
- VIR and VRR are submittable and linked to vehicle register entries
- Vehicle Register detail page can show linked VIC/VIR/VRR counts

---

## P5 — Cleanup & Unknowns

**Goal:** Address remaining modules, deferred tech debt, and PHP retirement preparation.

### Modules

| Module | Notes |
|--------|-------|
| Clegg Testing | Needs PHP investigation — may be unused |
| Pre-site | Needs PHP investigation |
| Gateway | Needs PHP investigation |

### Additional Work
- Email service (port PHP `mail.class.php` for forgot-password)
- Refresh-token maintenance sweep (purge expired rows)
- Bulk bcrypt backfill script
- Reset-key TTL enforcement
- Rate-limit Redis adapter (if scaling past single process)

### Exit Criteria
- 100% module coverage
- All tech debt items from `docs/audit/15-tech-debt.md` addressed
- PHP portal can be retired for mobile users (web users may still need PHP)

---

## Dependency-Safe Build Order (Visual)

```
P1 ─── Auth + Devices ────────────────────────────────────────── DONE
  │
  ├── P2.1 ── Bulletins, Vehicle Check, Timesheets, H&S, Contacts
  │     │
  │     ├── P2.2 ── Work Records, Equipment Check, MEWP, WAH, UG
  │     │     │
  │     │     └── P2.3 ── Documents, Expenses, Onboarding, Calendar
  │     │
  │     └── P3.1 ── Civils, Wildanet, TFL, Maintenance ──────┐
  │           │                                                │
  │           └── P4.1 ── RA, INSP, WRA, WINSP ──────────────│── (needs P3.1)
  │                                                            │
  └── P3.2 ── HR, Equipment Reg, Plant Reg, Vehicle Reg ─────┘
        │
        └── P4.2 ── VIC, VIR, VRR ──────────────────────────── (needs P3.2)

P5 ─── Clegg, Pre-site, Gateway, Email, Tech Debt ──────────── (independent)
```

### Parallel Tracks

P3.1 and P3.2 can be built **in parallel** — they have no dependencies on each other. This means:
- A team of 2 developers can split: Dev A does P3.1 (jobs) while Dev B does P3.2 (registers)
- P4.1 waits only for P3.1; P4.2 waits only for P3.2
- Total calendar time compressed from ~79 days sequential to ~50 days with 2 devs

---

## Sprint Mapping (2-week sprints, 1 developer)

| Sprint | Phase | Delivered |
|--------|-------|-----------|
| Sprint 1 | P2.1 | Bulletins, Vehicle Check, Timesheets, H&S, Contacts (40 endpoints) |
| Sprint 2 | P2.2 + P2.3 | Work Records, Equipment Check, MEWP/WAH/UG, Documents, Expenses, Onboarding, Calendar (36 endpoints) |
| Sprint 3 | P3.1 | Civils, Wildanet, TFL, Maintenance (32 endpoints) |
| Sprint 4 | P3.2 | HR, Equipment Reg, Plant Reg, Vehicle Reg (31 endpoints) |
| Sprint 5 | P4.1 (RA + WRA) | Risk Assessment, Wildanet RA (14 endpoints) |
| Sprint 6 | P4.1 (INSP + WINSP) | Site Inspection, Wildanet INSP (14 endpoints) |
| Sprint 7 | P4.2 | VIC, VIR, VRR (16 endpoints) |
| Sprint 8 | P5 | Remaining modules, tech debt, email |

**Total: 8 sprints = 16 weeks (4 months) for full implementation.**

---

## Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| PDF generation diverges from PHP | Users see different output | Option A: proxy to PHP PDF endpoint initially; Option B: port TCPDF templates exactly |
| Multi-section form data loss | Employees lose field work | Section-at-a-time save; no multi-section transaction; offline queue on mobile |
| Upload path mismatch | PHP portal can't see Node-uploaded files | Integration test: upload via Node, verify file exists at UPLOADS_ROOT path |
| Status transition bypass | Invalid data states | Server-side state machine; reject invalid transitions with 409 |
| 109-field VIC validation | High error rate | Client-side section validation + server-side; clear error messages per field |
| Unknown P5 modules | Scope creep | Timebox investigation to 2 days; if unused, drop from scope |

---

## Success Metrics

| Milestone | Metric | Target |
|-----------|--------|--------|
| P2 Complete | Mobile app usable for daily tasks | 100% of standalone modules working |
| P3 Complete | Job management via mobile | All 4 job types + registers operational |
| P4 Complete | Field forms on mobile | RA/INSP/VIC completable end-to-end |
| Full Complete | PHP retirement possible for mobile users | 198 endpoints, all tested, all documented |

---

## Open Questions (Require Client Input)

1. **PDF strategy:** Port TCPDF to Node (pdfkit/puppeteer) or proxy to PHP PDF endpoints?
2. **Clegg Testing / Pre-site / Gateway:** Are these modules actively used? Can they be dropped?
3. **Expenses:** Only 2 rows in DB — is this module live or abandoned?
4. **Calendar:** Is TeamUp still the calendar provider? Any plans to change?
5. **Admin mobile app:** Is there a plan for admin-on-mobile, or is admin web-only forever?
6. **Offline support:** Should the mobile app queue submissions when offline?
7. **Push notifications:** Which events should trigger FCM pushes? (Bulletin published? Timesheet rejected? Incident assigned?)
