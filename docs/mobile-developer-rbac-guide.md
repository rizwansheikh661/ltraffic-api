# LTraffic Mobile App — API Role Permissions Guide

**Date:** 2026-07-15
**API Base URL:** `http://<server>:3000/api/v1`
**Auth:** POST `/auth/login` with `{ identifier, password }` → returns JWT access + refresh tokens

---

## Test Users (All passwords: `Test@1234`)

| Level | Role Name | Username | Email | Login Identifier |
|-------|-----------|----------|-------|-----------------|
| 1 | Admin | `admin` | al@ltraffic.co.uk | `admin` |
| 2 | Driving Operative | `dlouch` | dl@ltraffic.co.uk | `dlouch` |
| 3 | Operative | `stoth` | st@ltraffic.co.uk | `stoth` |
| 4 | Admin1 | `blouch` | bl@ltraffic.co.uk | `blouch` |
| 5 | Civils TFL Driver | `vmorar` | vm@ltraffic.co.uk | `vmorar` |
| 6 | Civils Trailer Driver | `testdriver6` | test6@ltraffic.co.uk | `testdriver6` |
| 7 | Admin2 | `testadmin2` | test7@ltraffic.co.uk | `testadmin2` |
| 8 | Essex Supervisor | `lpearse` | lp@ltraffic.co.uk | `lpearse` |
| 9 | Customer | `kmoleda` | km@ltraffic.co.uk | `kmoleda` |

### Login Example

```json
POST /api/v1/auth/login
{
  "identifier": "admin",
  "password": "Test@1234"
}
```

Response contains `accessToken`, `refreshToken`, and user info with `level` field.

---

## How to Use Level for UI

After login, check `response.data.user.level`:
- Show/hide screens based on the permission matrix below
- If user tries to access a restricted endpoint, API returns `403 Forbidden`

---

## Permission Matrix

### Legend

- ✅ = Allowed (200 response)
- ❌ = Blocked (403 Forbidden)

---

## 1. OPEN ACCESS (All Authenticated Users)

These endpoints work for ALL 9 levels — no restriction:

| Module | Endpoints |
|--------|-----------|
| Bulletins | `GET /employee/bulletins/pending`, `GET /employee/bulletins`, `GET /employee/bulletins/:id`, `POST /employee/bulletins/:id/acknowledge` |
| Contacts | `GET /employee/contacts`, `GET /employee/contacts/:id` |
| Documents | `GET /employee/documents/:type`, `GET /employee/documents/:type/:id` |
| Onboarding | `GET /employee/onboarding/status`, `POST /employee/onboarding`, `GET /employee/onboarding` |
| Auth | `GET /auth/me`, `POST /auth/change-password` |
| Devices | `POST /devices/register`, `POST /devices/unregister`, `GET /devices` |

---

## 2. VEHICLE CHECKS (Employee)

| Action | Endpoint | 1 ADM | 2 DO | 3 OP | 4 AD1 | 5 TFL | 6 CTD | 7 AD2 | 8 ESS | 9 CUS |
|--------|----------|:-----:|:----:|:----:|:-----:|:-----:|:-----:|:-----:|:-----:|:-----:|
| Submit | `POST /employee/vehicle-checks` | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| List own | `GET /employee/vehicle-checks` | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| View detail | `GET /employee/vehicle-checks/:id` | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |

---

## 3. TIMESHEETS (Employee)

| Action | Endpoint | 1 ADM | 2 DO | 3 OP | 4 AD1 | 5 TFL | 6 CTD | 7 AD2 | 8 ESS | 9 CUS |
|--------|----------|:-----:|:----:|:----:|:-----:|:-----:|:-----:|:-----:|:-----:|:-----:|
| Submit | `POST /employee/timesheets/submit` | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| Save draft | `POST /employee/timesheets/draft` | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| List own | `GET /employee/timesheets` | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| View detail | `GET /employee/timesheets/:id` | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |

---

## 4. INCIDENTS (Employee)

| Action | Endpoint | 1 ADM | 2 DO | 3 OP | 4 AD1 | 5 TFL | 6 CTD | 7 AD2 | 8 ESS | 9 CUS |
|--------|----------|:-----:|:----:|:----:|:-----:|:-----:|:-----:|:-----:|:-----:|:-----:|
| Report | `POST /employee/incidents` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ |
| List own | `GET /employee/incidents` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ |
| View detail | `GET /employee/incidents/:id` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ |

---

## 5. EQUIPMENT CHECKS (Employee)

| Action | Endpoint | 1 ADM | 2 DO | 3 OP | 4 AD1 | 5 TFL | 6 CTD | 7 AD2 | 8 ESS | 9 CUS |
|--------|----------|:-----:|:----:|:----:|:-----:|:-----:|:-----:|:-----:|:-----:|:-----:|
| Submit | `POST /employee/equipment-checks` | ✅ | ❌ | ❌ | ✅ | ❌ | ✅ | ❌ | ✅ | ❌ |
| List own | `GET /employee/equipment-checks` | ✅ | ❌ | ❌ | ✅ | ❌ | ✅ | ❌ | ✅ | ❌ |
| View detail | `GET /employee/equipment-checks/:id` | ✅ | ❌ | ❌ | ✅ | ❌ | ✅ | ✅ | ✅ | ❌ |

---

## 6. SITE INSPECTIONS (Employee)

| Action | Endpoint | 1 ADM | 2 DO | 3 OP | 4 AD1 | 5 TFL | 6 CTD | 7 AD2 | 8 ESS | 9 CUS |
|--------|----------|:-----:|:----:|:----:|:-----:|:-----:|:-----:|:-----:|:-----:|:-----:|
| Create Part 1 | `POST /employee/site-inspections?source=civils` | ✅ | ❌ | ❌ | ✅ | ❌ | ✅ | ❌ | ✅ | ❌ |
| Parts 2-8 | `PUT /employee/site-inspections/:id/part/:n?source=civils` | ✅ | ❌ | ❌ | ✅ | ❌ | ✅ | ❌ | ✅ | ❌ |
| List own | `GET /employee/site-inspections?source=civils` | ✅ | ❌ | ❌ | ✅ | ❌ | ✅ | ❌ | ✅ | ❌ |
| View detail | `GET /employee/site-inspections/:id?source=civils` | ✅ | ❌ | ❌ | ✅ | ❌ | ✅ | ❌ | ✅ | ❌ |

> `source` param: `civils` or `wildanet`

---

## 7. VEHICLE INSPECTIONS (Employee)

| Action | Endpoint | 1 ADM | 2 DO | 3 OP | 4 AD1 | 5 TFL | 6 CTD | 7 AD2 | 8 ESS | 9 CUS |
|--------|----------|:-----:|:----:|:----:|:-----:|:-----:|:-----:|:-----:|:-----:|:-----:|
| Create Part 1 | `POST /employee/vehicle-inspections` | ✅ | ❌ | ❌ | ✅ | ❌ | ✅ | ✅ | ✅ | ❌ |
| Parts 2-4 | `PUT /employee/vehicle-inspections/:id/part/:n` | ✅ | ❌ | ❌ | ✅ | ❌ | ✅ | ❌ | ✅ | ❌ |
| List own | `GET /employee/vehicle-inspections` | ✅ | ❌ | ❌ | ✅ | ❌ | ✅ | ❌ | ✅ | ❌ |
| View detail | `GET /employee/vehicle-inspections/:id` | ✅ | ❌ | ❌ | ✅ | ❌ | ✅ | ✅ | ✅ | ❌ |
| Add repair | `POST /employee/vehicle-inspections/:id/repairs` | ✅ | ❌ | ❌ | ✅ | ❌ | ✅ | ❌ | ✅ | ❌ |

---

## 8. WORK RECORDS (Employee)

| Action | Endpoint | 1 ADM | 2 DO | 3 OP | 4 AD1 | 5 TFL | 6 CTD | 7 AD2 | 8 ESS | 9 CUS |
|--------|----------|:-----:|:----:|:----:|:-----:|:-----:|:-----:|:-----:|:-----:|:-----:|
| Submit | `POST /employee/work-records` | ✅ | ❌ | ❌ | ✅ | ❌ | ✅ | ✅ | ✅ | ❌ |
| List own | `GET /employee/work-records` | ✅ | ❌ | ❌ | ✅ | ❌ | ✅ | ✅ | ✅ | ❌ |
| View detail | `GET /employee/work-records/:id` | ✅ | ❌ | ❌ | ✅ | ❌ | ✅ | ✅ | ✅ | ❌ |

---

## 9. CLEGG TESTING (Employee)

| Action | Endpoint | 1 ADM | 2 DO | 3 OP | 4 AD1 | 5 TFL | 6 CTD | 7 AD2 | 8 ESS | 9 CUS |
|--------|----------|:-----:|:----:|:----:|:-----:|:-----:|:-----:|:-----:|:-----:|:-----:|
| Submit | `POST /employee/clegg-testing` | ✅ | ❌ | ❌ | ✅ | ❌ | ✅ | ❌ | ✅ | ❌ |
| List | `GET /employee/clegg-testing` | ✅ | ❌ | ❌ | ✅ | ❌ | ✅ | ✅ | ✅ | ❌ |
| View detail | `GET /employee/clegg-testing/:id` | ✅ | ❌ | ❌ | ✅ | ❌ | ✅ | ✅ | ✅ | ❌ |

---

## 10. WILDANET RISK ASSESSMENTS (Employee)

| Action | Endpoint | 1 ADM | 2 DO | 3 OP | 4 AD1 | 5 TFL | 6 CTD | 7 AD2 | 8 ESS | 9 CUS |
|--------|----------|:-----:|:----:|:----:|:-----:|:-----:|:-----:|:-----:|:-----:|:-----:|
| Create Part 1 | `POST /employee/wildanet-risk-assessments` | ✅ | ❌ | ❌ | ✅ | ❌ | ✅ | ❌ | ✅ | ❌ |
| Parts 2-5 | `PUT /employee/wildanet-risk-assessments/:id/part/:n` | ✅ | ❌ | ❌ | ✅ | ❌ | ✅ | ❌ | ✅ | ❌ |
| List own | `GET /employee/wildanet-risk-assessments` | ✅ | ❌ | ❌ | ✅ | ❌ | ✅ | ❌ | ✅ | ❌ |
| View detail | `GET /employee/wildanet-risk-assessments/:id` | ✅ | ❌ | ❌ | ✅ | ❌ | ✅ | ❌ | ✅ | ❌ |

---

## 11. PIA & FIBRE RISK (Employee)

| Action | Endpoint | 1 ADM | 2 DO | 3 OP | 4 AD1 | 5 TFL | 6 CTD | 7 AD2 | 8 ESS | 9 CUS |
|--------|----------|:-----:|:----:|:----:|:-----:|:-----:|:-----:|:-----:|:-----:|:-----:|
| Submit WAH | `POST /employee/pia-fibre-risk/wah` | ✅ | ❌ | ❌ | ✅ | ❌ | ✅ | ❌ | ✅ | ❌ |
| Submit UG | `POST /employee/pia-fibre-risk/ug` | ✅ | ❌ | ❌ | ✅ | ❌ | ✅ | ❌ | ✅ | ❌ |
| Submit MEWP | `POST /employee/pia-fibre-risk/mewp` | ✅ | ❌ | ❌ | ✅ | ❌ | ✅ | ❌ | ✅ | ❌ |
| List WAH | `GET /employee/pia-fibre-risk/wah` | ✅ | ❌ | ❌ | ✅ | ❌ | ✅ | ✅ | ✅ | ❌ |
| List UG | `GET /employee/pia-fibre-risk/ug` | ✅ | ❌ | ❌ | ✅ | ❌ | ✅ | ✅ | ✅ | ❌ |
| List MEWP | `GET /employee/pia-fibre-risk/mewp` | ✅ | ❌ | ❌ | ✅ | ❌ | ✅ | ✅ | ✅ | ❌ |

---

## 12. WILDANET JOBS (Employee)

| Action | Endpoint | 1 ADM | 2 DO | 3 OP | 4 AD1 | 5 TFL | 6 CTD | 7 AD2 | 8 ESS | 9 CUS |
|--------|----------|:-----:|:----:|:----:|:-----:|:-----:|:-----:|:-----:|:-----:|:-----:|
| List own | `GET /employee/wildanet-jobs` | ✅ | ❌ | ❌ | ✅ | ❌ | ✅ | ✅ | ✅ | ❌ |
| View detail | `GET /employee/wildanet-jobs/:id` | ✅ | ❌ | ❌ | ✅ | ❌ | ✅ | ✅ | ✅ | ❌ |
| View docs | `GET /employee/wildanet-jobs/:id/documents` | ✅ | ❌ | ❌ | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ |

---

## Quick Summary — Role ke Hisaab se Screens

### Level 1: Admin
Sab kuch accessible hai — har screen, har endpoint.

### Level 2: Driving Operative (dlouch)
- ✅ Bulletins, Contacts, Documents, Onboarding
- ✅ Vehicle Checks (submit + view)
- ✅ Timesheets (submit + view)
- ✅ Incidents (report + view)
- ❌ Equipment Checks, Site Inspections, Vehicle Inspections, Work Records, Clegg Testing, WRA, PIA, Wildanet Jobs

### Level 3: Operative (stoth)
- ✅ Bulletins, Contacts, Documents, Onboarding
- ✅ Incidents (report + view)
- ❌ Vehicle Checks, Timesheets, Equipment Checks, Site Inspections, Vehicle Inspections, Work Records, Clegg Testing, WRA, PIA, Wildanet Jobs

### Level 4: Admin1 (blouch)
Sab kuch accessible hai — Admin jaisa.

### Level 5: Civils TFL Driver (vmorar)
- ✅ Bulletins, Contacts, Documents, Onboarding
- ✅ Vehicle Checks (submit + view)
- ✅ Timesheets (submit + view)
- ✅ Incidents (report + view)
- ❌ Equipment Checks, Site Inspections, Vehicle Inspections, Work Records, Clegg Testing, WRA, PIA, Wildanet Jobs

### Level 6: Civils Trailer Driver (testdriver6)
Sab kuch accessible hai — full access to all employee modules.

### Level 7: Admin2 (testadmin2)
- ✅ Bulletins, Contacts, Documents, Onboarding
- ✅ Vehicle Checks (view only — cannot submit)
- ✅ Vehicle Inspections (create Part 1 + view — cannot do Parts 2-4)
- ✅ Work Records, Clegg Testing (view), PIA (view), Wildanet Jobs (view + docs)
- ❌ Timesheets, Incidents, Equipment Checks, Site Inspections, WRA, Clegg Testing (submit), PIA (submit)

### Level 8: Essex Supervisor (lpearse)
Sab kuch accessible hai — Admin jaisa.

### Level 9: Customer (kmoleda)
- ✅ Bulletins, Contacts, Documents, Onboarding
- ✅ Incidents (report + view)
- ✅ Wildanet Jobs (view documents only)
- ❌ Vehicle Checks, Timesheets, Equipment Checks, Site Inspections, Vehicle Inspections, Work Records, Clegg Testing, WRA, PIA

---

## Error Handling

```json
// 401 — Token expired ya missing
{ "success": false, "error": { "code": "UNAUTHORIZED", "message": "..." } }

// 403 — Role permission nahi hai
{ "success": false, "error": { "code": "FORBIDDEN", "message": "Insufficient role" } }
```

Mobile app me:
- `401` → Refresh token try karo, fail to login screen
- `403` → Screen hide karo / "You don't have access" show karo

---

## Notes for Mobile Developer

1. **Login ke baad** `GET /auth/me` se user ka `level` mil jaega — isi basis pe UI control karo
2. **Bulletins check mandatory hai** — app open hone pe `GET /employee/bulletins/pending` call karo, agar array non-empty hai to user ko acknowledge karne tak block karo
3. **File uploads** multipart/form-data use karte hain — `image` field name se bhejo
4. **Pagination** — sab list endpoints `page` + `limit` query params support karte hain
5. **Ownership** — employee endpoints sirf user ke apne records return karte hain (server-side filter by JWT user name)
