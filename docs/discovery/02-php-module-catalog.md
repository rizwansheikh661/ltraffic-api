# 02 - PHP Module Catalog

> Master catalog of ALL modules in the LTraffic PHP system (unified view across Employee and Admin portals).

## Module Table

| # | Module Name | Description | Portal | PHP Files (key) | Entry Pages | Upload Handlers | PDF Generators | DB Tables | Roles/Permissions | Dependencies | Complexity | Mobile Required |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Authentication | Login, logout, 2FA, password recovery, session management | Both | login.class.php, check.class.php, forgot.class.php, signup.class.php | login.php, logout.php, forgot.php, activate.php | None | None | login_users, login_levels, login_timestamps, login_confirm, login_settings | All roles | None | S | Yes (P1 done) |
| 2 | User Profile | View/edit own profile, avatar, password change | Employee | profile.class.php | profile.php | Avatar upload | None | login_users | All roles | Auth | S | Yes |
| 3 | User Admin | CRUD users, assign levels, mass email | Admin | add_user.class.php, edit_user.class.php, send_email.class.php | adminindex.php, adminindexadd.php, adminindexedit.php | None | None | login_users, login_levels | Admin, Admin1 | Auth | M | No (web only) |
| 4 | Bulletins | Publish announcements, force-read gate, track confirmations | Both | None (inline) | bulletinadd.php (admin), bulletin.php/bulletin1.php (employee), bulletinmanagement.php | None | None | bulletinnew, bulletinread, bulletinconfirm | Admin publishes; All employees read | Auth | M | Yes |
| 5 | Vehicle Check | Daily pre-trip inspection form (16-item checklist) | Both | vehiclecheckdbcontroller.php | vehiclecheck1.php (emp), adminvehiclecheck.php (admin) | None | vcpdf.php | vehicle, upload_vehicle | Employee: Civils Trailer Driver; Admin: Admin, Admin1, Admin2 | Auth | M | Yes |
| 6 | Vehicle Inspection Checklist (VIC) | Multi-page detailed vehicle inspection (109+ fields) | Employee | None (inline) | vehicleinspectionchecklist.php (pg1-4), vic.php, vichome.php | vic1-7upload.php | vicpdf.php | vic, vir, vrr | Admin, Admin1, Civils Trailer Driver | Auth, VR | XL | Yes |
| 7 | Site Inspection | 8-section site safety inspection for civils jobs | Employee | None | insphome.php, insp1-8.php, insp1-8edit.php, inspcom.php | insp1-8upload.php (16 files) | insppdf.php | insp | Admin, Admin1, Civils Trailer Driver, Essex Supervisor | Auth, Civils | XL | Yes |
| 8 | Risk Assessment (RA) | 5-section daily RA linked to civils jobs | Employee | radbcontroller.php | ra1-5.php, ra1-5edit.php, racom.php, rahome.php | ra1-9upload.php (18 files) | rapdf.php, ra1-5pdf.php | ra | Admin, Admin1, Civils Trailer Driver, Essex Supervisor | Auth, Civils | XL | Yes |
| 9 | Wildanet Risk Assessment (WRA) | 5-section RA for Wildanet jobs (identical structure to RA) | Employee | None | wra1-5.php, wra1-5edit.php, wracom.php | wra1-9upload.php (14 files) | wrapdf.php, wra1-5pdf.php | wra | Admin, Admin1, Civils Trailer Driver, Essex Supervisor | Auth, Wildanet | XL | Yes |
| 10 | Wildanet Site Inspection (WINSP) | 8-section inspection for Wildanet jobs | Employee | None | winsphome.php, winsp1-8.php, winsp1-8edit.php, winspcom1.php | winsp1-8upload.php (16 files) | winsppdf.php | winsp | Admin, Admin1, Civils Trailer Driver, Essex Supervisor | Auth, Wildanet | XL | Yes |
| 11 | Civils Jobs | Essex Fibre project job management | Both | civilsdbcontroller.php | civils.php, civilsadd.php, civilsedit.php, civilsdetails.php, civilsadmin.php, civilsdocuments.php | ajaxupload.php (emp) | None | civils, upload_data | Admin, Admin1, Civils Trailer Driver, Essex Supervisor | Auth | L | Yes |
| 12 | TFL Jobs | Transport for London job management | Both | tfldbcontroller.php | tfl.php, tfladd.php, tfledit.php, tfldetails.php, tfladmin.php, tfldocuments.php, tflmaterial.php | ajaxupload.php | None | tfl, upload_tfl, tflmaterial | Admin, Admin1, Civils TFL Driver | Auth | L | Yes |
| 13 | Wildanet Jobs | Wildanet project management | Both | None | wildanet.php, wildanetadd.php, wildanetedit.php, wildanetdetails.php, wildanetadmin.php, wildanetdocuments.php | wajaxupload.php | None | wildanet, wupload_data | Admin, Admin1, Civils Trailer Driver, Essex Supervisor | Auth | L | Yes |
| 14 | Maintenance Jobs | Maintenance project management | Both | None | maintenance.php, maintenanceadd.php, maintenanceedit.php, maintenancedetails.php, maintenancedocuments.php, maintenancematerial.php | ajaxupload.php | None | maintenance, upload_maintenance, maintenancematerial | Admin, Admin1, Maintenance Operative | Auth | L | Yes |
| 15 | Timesheets | Weekly 7-day timesheet submission + admin approval | Both | None | timesheetadd.php (emp), admintimesheets.php (admin) | None | timesheetspdf.php | timesheet | Employee: most roles; Admin: Admin, Admin1 | Auth | L | Yes |
| 16 | Health & Safety (Incidents) | Incident/accident reporting + admin investigation | Both | adminreportedincidentsdbcontroller.php | h&sform.php (emp), adminreportedincidents*.php (admin) | insert1.php, ajaxupload.php (admin) | h&sformpdf.php | healthsafety, upload_hs | Employee: most roles; Admin: Admin, Admin1, Essex Supervisor | Auth | L | Yes |
| 17 | Work Records | Wildanet field work records with multi-status lifecycle | Employee | None | workrecordadd.php, workrecordedit.php, workrecord*.php (8 listing pages by status) | insertwr.php, editwr.php | wrpdf.php | workrecord | Admin, Admin1, Admin2, Civils Trailer Driver, Essex Supervisor | Auth | L | Yes |
| 18 | Equipment Check | Plant/equipment daily inspection form | Employee | None | equipmentcheck.php, equipmentchecklist.php, equipmentchecksdetails.php | insertcheck.php | echeckpdf.php | equipmentcheck | Admin, Admin1, Driving Operatives, Civils Trailer Driver | Auth | M | Yes |
| 19 | Clegg Testing | Soil compaction testing records | Employee | None | cleggtestingadd.php, cleggtestingedit.php, cleggtestingdetails.php | insertct.php, editct.php | ctpdf.php | cleggtesting | Admin, Admin1, Civils Trailer Driver | Auth | M | Yes |
| 20 | Pre-site Inspection | Pre-site safety documents | Employee | None | presiteform.php, presiteedit.php, presitedetails.php, presitedocuments.php | psupload.php | None | presite, upload_presite | Admin, Admin1, Civils Trailer Driver | Auth | M | Yes |
| 21 | MEWP | Mobile Elevated Work Platform activity record | Employee | None | mewpadd.php | insertmewp.php | mewppdf.php | mewp | Admin, Admin1, Civils Trailer Driver | Auth | S | Yes |
| 22 | WAH (Working at Height) | Working at height record | Employee | None | wahadd.php | insertwah.php | wahpdf.php | wah | Admin, Admin1, Civils Trailer Driver | Auth | S | Yes |
| 23 | UG/OH (Underground/Overhead) | PIA & Fibre risk assessment | Employee | None | ugoh.php, ugadd.php | insertug.php | ugpdf.php | ug | Admin, Admin1, Civils Trailer Driver | Auth | S | Yes |
| 24 | HR Manager | Employee HR records + documents | Admin | None | hr.php, hredit.php, hrview.php, hrdocuments.php | ajaxupload2.php | onboardingpdf.php | hr, upload_hr | Admin, Admin1 | Auth | M | No (admin web) |
| 25 | Equipment Register (ER) | Company equipment inventory | Admin | None | er.php, eradd.php, eredit.php, erview.php, erdocuments.php | ajaxupload4.php | None | er, upload_er | Admin, Admin1 | Auth | M | No (admin web) |
| 26 | Vehicle Register (VR) | Company vehicle fleet | Admin | None | vr.php, vradd.php, vredit.php, vrview.php, vrdocuments.php | ajaxupload3.php | None | vr, upload_vr | Admin, Admin1, Admin2, Essex Supervisor | Auth | M | No (admin web) |
| 27 | Plant Register (PR) | PPE/plant inventory | Admin | None | pr.php, pradd.php, predit.php, prview.php, prdocuments.php | ajaxupload5.php | None | pr, upload_pr | Admin, Admin1, Admin2 | Auth | M | No (admin web) |
| 28 | Document Control | Company policies, method statements, SOPs, CoSHH | Both | None | documentcontrol.php (admin), documents.php/policies.php/methodstatements.php/sop.php/coshh.php (emp) | None | None | policies, methodstatements, processes, coshh | Admin manages; All read | Auth | M | Yes (read-only mobile) |
| 29 | Materials | Materials inventory management | Employee | materialdbcontroller.php | material.php, materialadd.php, materialedit.php | None | None | material | Admin, Admin1, Admin2 | Auth | S | No |
| 30 | Onboarding | New employee onboarding form | Employee | None | onboarding.php | None | onboardingpdf.php | hr (via PDF) | All employees | Auth | S | No |
| 31 | Contacts | Company contact directory | Employee | contactdbcontroller.php | contacts.php | None | None | address | All roles | Auth | S | Yes |
| 32 | Gateway Check | Gateway/checkpoint verification | Employee | None | gatewaycheck.php | gatewayupload.php | None | gateway | Various | Auth | S | No |
| 33 | Calendar | TeamUp calendar integration | Employee | None | calender.php | None | None | None (iframe/URL) | All roles | Auth | S | Yes (webview) |
| 34 | Timesheet Sub-App | Separate timesheet system with own DB | Both | None (timesheet/ subfolder) | timesheet/admin.php, timesheet/Dashboard/*, timesheet/User/* | None | None | Separate DB: ltraffic_timesheet | Admin, Employees | Separate auth | L | No (legacy) |

## Summary Statistics

| Metric | Count |
|---|---|
| Total modules | 34 |
| Employee-only | ~18 |
| Admin-only | ~5 |
| Both portals | ~11 |
| Mobile required | ~22 |
| PDF generators | 20+ |
| Upload handlers | 90+ files |
| Complexity: S (Small) | 8 |
| Complexity: M (Medium) | 11 |
| Complexity: L (Large) | 9 |
| Complexity: XL (Extra Large) | 6 |
