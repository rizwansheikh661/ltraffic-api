# 01 — Project Overview

**Purpose:** High-level system description for any engineer joining the LTraffic API project. Answers: what is this, who uses it, what exists today, and what we're building.

---

## 1. What Is LTraffic?

LTraffic is an internal operations management system for a UK-based telecoms/civils infrastructure company. It handles:

- **Field operations** — vehicle checks, equipment inspections, risk assessments, site inspections, MEWP/WAH/UG permits
- **Job management** — civils, TFL, Wildanet, and maintenance job tracking with document attachments
- **Safety & compliance** — health & safety incident reporting, bulletin acknowledgment, document control (policies, method statements, CoSHH)
- **HR & admin** — employee records, onboarding, timesheets, expenses, vehicle/equipment/plant registers
- **Work tracking** — work records with a 9-status lifecycle from pending to invoiced/closed

---

## 2. Who Uses It?

### User Roles (9 levels)

| Level | Role | Portal | Description |
|-------|------|--------|-------------|
| 1 | Admin | Admin + Employee | Full system access |
| 4 | Admin1 | Admin + Employee | Senior admin (most admin functions) |
| 7 | Admin2 | Admin + Employee | Junior admin (limited admin functions) |
| 8 | Essex Supervisor | Employee + limited Admin | Field supervisor |
| 2 | Driving Operatives | Employee | Field worker (drives) |
| 3 | Operatives | Employee | Field worker |
| 5 | Civils TFL Driver | Employee | TFL-specific field worker |
| 6 | Civils Trailer Driver | Employee | Trailer-specific field worker |
| 9 | Customer | Minimal | External client (home.php only) |

### Typical daily usage
- **Field employees (levels 2,3,5,6,8):** Login → confirm bulletins → vehicle check → view assigned jobs → complete RA/INSP → submit MEWP/WAH/UG → submit timesheet (weekly)
- **Admins (levels 1,4,7):** Review vehicle checks → approve timesheets → investigate H&S incidents → manage jobs → HR/registers → publish bulletins/documents

---

## 3. Current System Architecture

### Two PHP Web Portals (Legacy — Remain Operational)

| Portal | Location | Purpose | Files |
|--------|----------|---------|-------|
| Employee Area | `C:\rizwan\LTraffic\employeesarea-php\` | All employee-facing modules | ~426 PHP files |
| Admin Area | `C:\rizwan\LTraffic\admin\` | All admin-facing modules | ~136 PHP files |

**Tech stack:** PHP 7.x, MariaDB 10.4.32, Jigowatt Login Framework (PDO), raw mysqli queries, TCPDF for PDF, FilePond for uploads, Bootstrap 4 UI, jQuery.

### Database

| Property | Value |
|----------|-------|
| Engine | MariaDB 10.4.32 (InnoDB) |
| Host | 127.0.0.1:3307 |
| Database | `lt_employee` |
| Tables | 68 |
| Foreign keys | 0 (all relationships are application-level) |
| Auth | User: `users1` / Password: `LTraffic2021!#` |

### Key Database Characteristics
- Zero enforced FK constraints — all joins rely on convention
- Extreme denormalization: form-dump tables with numbered columns (e.g., `vic` has 109+ columns like `q1a`, `q1b`, `q2a`...)
- Per-client table duplication: `civils`/`wildanet`/`tfl`/`maintenance` are structurally identical
- Most dates stored as TEXT, not DATE/DATETIME
- Comma-separated file paths in single columns for multi-image storage
- PHP serialized arrays in `login_users.user_level`
- `ltrafficid` (not `user_id`) is the cross-reference key between `login_users`, `timesheet`, `hr`

### Node.js API (New — This Project)

| Property | Value |
|----------|-------|
| Location | `C:\rizwan\LTraffic\ltraffic-api\` |
| Runtime | Node.js + Express |
| DB access | `mysql2/promise` with Repository pattern (no ORM) |
| Auth | JWT (access + refresh tokens), bcrypt, MD5 lazy-rehash from PHP passwords |
| Status | P1 (Auth + Devices) complete and production-ready |

---

## 4. What We're Building

A unified REST API that serves a mobile app (Android + iOS). The API:

1. **Reads/writes the same MySQL database** as the PHP portals (no migration, no new schema beyond P1 additions)
2. **Coexists with PHP** — both systems run in parallel; PHP keeps its session auth, Node uses JWT
3. **Serves mobile only** — the PHP web portals remain the desktop interface
4. **Matches PHP behaviour exactly** — no new business logic, no workflow changes, no schema redesign

### Architectural Decisions (Locked)

| Decision | Rationale |
|----------|-----------|
| Same `login_users` table for auth | Single source of truth; no account sync needed |
| MD5 → bcrypt lazy rehash | Gradual migration; no forced password resets |
| JWT with `userType: "admin"\|"employee"` | Simple role branching in middleware |
| Raw `mysql2/promise` + Repository layer | Matches existing Node codebases; no ORM overhead |
| File uploads to PHP web root (`UPLOADS_ROOT`) | Shared with PHP; no file migration needed |
| No new tables (P2+) | Read/write existing schema; only P1 added `lt_*` tables |

---

## 5. Project Phases

| Phase | Scope | Status |
|-------|-------|--------|
| P0 | Audit + Architecture (docs/audit/) | ✅ Complete |
| P1 | Auth + Devices (login, tokens, FCM) | ✅ Complete (70/70 tests, production-ready) |
| **P2** | **Business modules (standalone)** | **← Current phase (discovery complete)** |
| P3 | Job containers + registers | Planned |
| P4 | Multi-section dependent modules (RA, INSP, VIC) | Planned |
| P5 | Email, PHP retirement, unknowns | Future |

---

## 6. Discovery Phase Deliverables (This Folder)

| Doc | Purpose |
|-----|---------|
| 01 (this file) | Project overview |
| 02 | Master module catalog (34 modules, classification) |
| 03 | Admin module deep-dive (12 modules, every field/query/rule) |
| 04 | Employee module deep-dive (27 modules, every field/query/rule) |
| 05 | Database analysis (68 tables, columns, relationships, gaps) |
| 06 | Business workflows (17 end-to-end processes) |
| 07 | Module dependencies (build-order constraints) |
| 08 | API planning (~198 endpoints, request/response shapes) |
| 09 | Module priority (classification matrix, effort estimates) |
| 10 | Final roadmap (phased implementation plan) |

---

## 7. Key Numbers

| Metric | Count |
|--------|-------|
| Database tables | 68 |
| Business modules | 34 |
| PHP files (total) | ~562 |
| Planned API endpoints | ~198 |
| Upload directories | 25+ |
| PDF generators | 20+ |
| User roles | 9 |
| Status machines | 5 (Work Records, Timesheets, H&S, Jobs, RA/INSP) |
| Multi-section forms | 4 (RA: 5 sections, INSP: 8 sections, VIC: 4 sections, WRA: 5 sections) |
| Estimated dev effort | 62-79 days (1 developer) |

---

## 8. How to Use This Discovery Package

**If you're implementing a module:**
1. Find it in `02-php-module-catalog.md` for the overview
2. Read the deep-dive in `03` (admin) or `04` (employee) for exact fields, queries, and rules
3. Check `07` for dependencies (what must exist before your module)
4. Read `08` for the endpoint spec (request/response shapes)
5. Check `06` for the end-to-end business workflow

**If you're planning a sprint:**
1. Read `09` for priority tiers and effort estimates
2. Read `10` for the phased roadmap
3. Check `07` for dependency constraints (can't build X before Y)

**If you're debugging or investigating:**
1. Read `05` for table structure and column purposes
2. Read `03`/`04` for the exact PHP queries that read/write the table
3. Cross-reference with `docs/audit/` for auth-specific details
