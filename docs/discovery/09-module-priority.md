# 09 — Module Priority & Classification

**Purpose:** Classify every module by portal, mobile necessity, complexity, estimated API count, dependencies, and priority tier.  
**Use:** Input to the final roadmap (doc 10). Priority is determined by: mobile-app need → dependency order → complexity → user impact.

---

## 1. Classification Matrix

| # | Module | Portal | Mobile Req | Complexity | Est. Endpoints | Hard Deps | Priority Tier |
|---|--------|--------|-----------|------------|---------------|-----------|---------------|
| 1 | Auth | Both | Yes | L | 9 | — | **P1 (DONE)** |
| 2 | Devices (FCM) | Both | Yes | S | 2 | Auth | **P1 (DONE)** |
| 3 | Bulletins | Both | Yes | S | 8 | Auth | **P2-A** |
| 4 | Vehicle Check | Both | Yes | M | 9 | Auth | **P2-A** |
| 5 | Timesheets | Both | Yes | M | 11 | Auth | **P2-A** |
| 6 | H&S Incidents | Both | Yes | M | 7 | Auth | **P2-A** |
| 7 | Contacts | Both | Yes | S | 5 | Auth | **P2-A** |
| 8 | Work Records | Both | Yes | M | 6 | Auth | **P2-B** |
| 9 | Equipment Check | Both | Yes | M | 5 | Auth | **P2-B** |
| 10 | MEWP | Both | Yes | S | 5 | Auth | **P2-B** |
| 11 | WAH | Both | Yes | S | 5 | Auth | **P2-B** |
| 12 | UG | Both | Yes | S | 5 | Auth | **P2-B** |
| 13 | Documents Hub | Employee | Yes | S | 7 | Auth | **P2-B** |
| 14 | Expenses | Both | Maybe | S | 5 | Auth | **P2-C** |
| 15 | Onboarding | Employee | Maybe | S | 4 | Auth | **P2-C** |
| 16 | Calendar | Employee | Yes | XS | 1 | Auth | **P2-C** |
| 17 | Civils Jobs | Both | Yes | M | 8 | Auth | **P3-A** |
| 18 | TFL Jobs | Both | Yes | M | 8 | Auth | **P3-A** |
| 19 | Wildanet Jobs | Both | Yes | M | 8 | Auth | **P3-A** |
| 20 | Maintenance Jobs | Both | Yes | M | 8 | Auth | **P3-A** |
| 21 | HR | Admin | No | L | 9 | Auth | **P3-B** |
| 22 | Equipment Register | Admin | No | M | 7 | Auth | **P3-B** |
| 23 | Plant Register | Admin | No | M | 7 | Auth | **P3-B** |
| 24 | Vehicle Register | Admin | No | M | 8 | Auth | **P3-B** |
| 25 | Risk Assessment (RA) | Both | Yes | XL | 7 | Civils | **P4-A** |
| 26 | Site Inspection (INSP) | Both | Yes | XL | 7 | Civils | **P4-A** |
| 27 | Wildanet RA (WRA) | Both | Yes | XL | 7 | Wildanet | **P4-A** |
| 28 | Wildanet INSP (WINSP) | Both | Yes | XL | 7 | Wildanet | **P4-A** |
| 29 | VIC | Both | Yes | XL | 6 | Veh. Register | **P4-B** |
| 30 | VIR | Both | Yes | M | 5 | Veh. Register | **P4-B** |
| 31 | VRR | Both | Yes | M | 5 | Veh. Register | **P4-B** |
| 32 | Clegg Testing | Employee | Maybe | S | ~4 | Auth | **P5** |
| 33 | Pre-site | Employee | Maybe | S | ~4 | Auth | **P5** |
| 34 | Gateway | Employee | Maybe | S | ~4 | Auth | **P5** |

---

## 2. Complexity Definitions

| Rating | Meaning | Characteristics |
|--------|---------|-----------------|
| **XS** | Trivial | 1-2 endpoints, no uploads, no status machine, single table |
| **S** | Small | 3-5 endpoints, simple CRUD, single table, optional uploads |
| **M** | Medium | 5-10 endpoints, status transitions, uploads, 1-2 tables, pagination/filtering |
| **L** | Large | 8-12 endpoints, complex validation, multi-table, documents, role-gated operations |
| **XL** | Extra Large | Multi-section form (5-8 sections), 60-110+ fields, image uploads per section, digital signatures, PDF per section, linked to parent record |

---

## 3. Priority Tier Definitions

| Tier | Rationale | Target Delivery |
|------|-----------|-----------------|
| **P1** | Auth + FCM — gate for everything else | DONE |
| **P2-A** | High-frequency daily-use modules. Every employee uses these on every shift. Mobile app MVP. | First sprint |
| **P2-B** | Medium-frequency modules. Used regularly but not every shift. Completes mobile MVP. | Second sprint |
| **P2-C** | Low-frequency or underused modules. Nice-to-have for app launch. | Third sprint |
| **P3-A** | Job containers. Required before P4 dependent modules can work. Mobile-needed. | Fourth sprint |
| **P3-B** | Admin-only registers. Not mobile-required. Needed before VIC/VIR/VRR. | Fifth sprint |
| **P4-A** | Complex multi-section forms dependent on jobs. Core field-work tools. | Sixth sprint |
| **P4-B** | Complex multi-section forms dependent on Vehicle Register. | Seventh sprint |
| **P5** | Unknown/underused modules needing PHP clarification. | Backlog |

---

## 4. Mobile App MVP Requirements

The mobile app (Android + iOS) needs these modules for a usable launch:

### Must-Have (Day 1)
1. Auth (login, token management) ✅ P1 DONE
2. Bulletins (gate + confirm) — blocks app usage if unconfirmed
3. Vehicle Check — daily pre-shift requirement
4. Contacts — frequently accessed directory

### Should-Have (Week 1)
5. Timesheets — weekly submission
6. H&S Incidents — safety-critical reporting
7. Work Records — daily job tracking
8. Equipment Check — frequent equipment use

### Nice-to-Have (Month 1)
9. MEWP/WAH/UG — activity-specific submissions
10. Documents Hub — reference access
11. Civils/Wildanet/TFL/Maintenance — job viewing
12. RA/INSP — field form completion
13. Calendar — schedule viewing

---

## 5. Effort Estimates

| Tier | Modules | Total Endpoints | Est. Dev Days (1 dev) | Cumulative Coverage |
|------|---------|----------------|----------------------|---------------------|
| P1 (done) | 2 | 11 | — | 6% |
| P2-A | 5 | 40 | 10-12 | 26% |
| P2-B | 5 | 26 | 7-9 | 39% |
| P2-C | 3 | 10 | 3-4 | 44% |
| P3-A | 4 | 32 | 8-10 | 60% |
| P3-B | 4 | 31 | 8-10 | 76% |
| P4-A | 4 | 28 | 14-18 | 90% |
| P4-B | 3 | 16 | 8-10 | 98% |
| P5 | 3 | ~12 | 4-6 | 100% |
| **Total** | **34** | **~198** | **~62-79 days** | |

---

## 6. Risk Assessment by Tier

| Tier | Key Risks | Mitigation |
|------|-----------|------------|
| P2-A | Bulletin gate must work perfectly (blocks app) | Extensive testing; fallback to skip if server error |
| P2-B | Work Record status machine is complex (9 states) | Strict state-transition validation; audit log |
| P3-A | 4 near-identical job modules → code duplication | Abstract shared job service; parameterize by table/upload dir |
| P3-B | HR has sensitive PII | Extra access controls; audit logging; no mobile exposure |
| P4-A | RA/INSP are 60-110+ fields each; validation is enormous | Generate validation schemas from DB column analysis; section-at-a-time saves |
| P4-B | VIC is 109 fields across 4 sections | Same as P4-A; share the multi-section pattern |
| P5 | Modules are undocumented; may be unused | Verify with client before building |

---

## 7. Shared Infrastructure Needed Per Tier

| Tier | Infrastructure to Build First |
|------|-------------------------------|
| P2-A | Pagination helper, file upload service, PDF generation service, list/detail controller pattern, throttle middleware |
| P2-B | Status-transition validator (reusable for Work Records) |
| P3-A | Generic job CRUD factory (parameterized by table name + upload dir), document-attach sub-resource pattern |
| P3-B | Document-attach pattern (already built in P3-A) |
| P4-A | Multi-section form pattern (section router, partial-save, status auto-advance), signature service |
| P4-B | Reuse P4-A multi-section pattern |

---

## 8. Admin-Only vs Mobile-Required Classification

### Admin-Only (Web PHP continues to handle; API only needed if admin mobile app planned)
- User Admin
- HR
- Equipment Register
- Plant Register
- Vehicle Register
- Document Control (admin CRUD side)
- Legacy Vehicle Output

### Mobile-Required (API must exist for mobile app)
- Everything in P2 (Bulletins, Vehicle Check, Timesheets, H&S, Contacts, Work Records, Equipment Check, MEWP, WAH, UG, Documents Hub)
- Job viewing (Civils, Wildanet, TFL, Maintenance)
- Field forms (RA, INSP, WRA, WINSP, VIC, VIR, VRR)
- Calendar

### Decision Point
Admin modules (P3-B) are included because:
1. Future admin mobile app is possible
2. API-first architecture benefits web rebuild too
3. Vehicle Register is prerequisite for VIC/VIR/VRR which ARE mobile-required

If pressed for time, P3-B can be deferred until after P4-A (build RA/INSP first using direct DB queries to `vr` table for VIC pre-population, without full VR CRUD API).
