'use strict';

/**
 * Central table-name registry.
 * Legacy tables use the exact names from `mysql/lt_employee.sql` — DO NOT rename.
 * New phase-1 tables are prefixed with `lt_` to make them distinguishable
 * from legacy PHP tables at a glance.
 */

const LEGACY = Object.freeze({
  LOGIN_USERS: 'login_users',
  LOGIN_LEVELS: 'login_levels',
  LOGIN_SETTINGS: 'login_settings',
  LOGIN_CONFIRM: 'login_confirm',
  LOGIN_TIMESTAMPS: 'login_timestamps',
  HR: 'hr',
  BULLETIN: 'bulletin',
  BULLETIN_NEW: 'bulletinnew',
  BULLETIN_CONFIRM: 'bulletinconfirm',
  BULLETIN_READ: 'bulletinread',
  TIMESHEET: 'timesheet',
  VEHICLE: 'vehicle',
  VR: 'vr',
  VIR: 'vir',
  VRR: 'vrr',
  VIC: 'vic',
  HEALTHSAFETY: 'healthsafety',
  MEWP: 'mewp',
  WAH: 'wah',
  UG: 'ug',
  EQUIPMENT_CHECK: 'equipmentcheck',
  INSP: 'insp',
  WINSP: 'winsp',
  CIVILS: 'civils',
  TFL: 'tfl',
  MAINTENANCE: 'maintenance',
  MAINTENANCE_MATERIAL: 'maintenancematerial',
  TFL_MATERIAL: 'tflmaterial',
  MATERIAL: 'material',
  PRESITE: 'presite',
  PR: 'pr',
  ER: 'er',
  WILDANET: 'wildanet',
  WORKRECORD: 'workrecord',
  CLEGGTESTING: 'cleggtesting',
  EXPENSES: 'expenses',
  POLICIES: 'policies',
  COSHH: 'coshh',
  METHOD_STATEMENTS: 'methodstatements',
  PROCESSES: 'processes',
  RA: 'ra',
  WRA: 'wra',
  PROJECT: 'project',
  ACTIVITY: 'activity',
  ADDRESS: 'address',
  UPLOAD_DATA: 'upload_data',
  UPLOAD_HR: 'upload_hr',
  UPLOAD_HS: 'upload_hs',
  UPLOAD_VR: 'upload_vr',
  UPLOAD_VEHICLE: 'upload_vehicle',
  UPLOAD_ER: 'upload_er',
  UPLOAD_PR: 'upload_pr',
  UPLOAD_TFL: 'upload_tfl',
  UPLOAD_PRESITE: 'upload_presite',
  UPLOAD_MAINTENANCE: 'upload_maintenance',
  W_UPLOAD_DATA: 'wupload_data',
});

const NEW = Object.freeze({
  USER_CREDENTIALS: 'lt_user_credentials',
  REFRESH_TOKENS: 'lt_refresh_tokens',
  DEVICE_TOKENS: 'lt_device_tokens',
  NOTIFICATIONS: 'lt_notifications',
  NOTIFICATION_LOGS: 'lt_notification_logs',
  AUDIT_LOGS: 'lt_audit_logs',
});

module.exports = { LEGACY, NEW };
