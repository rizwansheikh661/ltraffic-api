'use strict';

/**
 * Canonical level table for the unified API.
 * Sourced from PHP audit + login_settings. login_users.user_level is a
 * PHP-serialised array of these numeric ids; the first element wins.
 */

const LEVELS = Object.freeze({
  ADMIN: 1,
  DRIVING_OPERATIVE: 2,
  OPERATIVE: 3,
  ADMIN1: 4,
  CIVILS_TFL_DRIVER: 5,
  CIVILS_TRAILER_DRIVER: 6,
  ADMIN2: 7,
  ESSEX_SUPERVISOR: 8,
  CUSTOMER: 9,
});

const LEVEL_NAMES = Object.freeze({
  [LEVELS.ADMIN]: 'Admin',
  [LEVELS.DRIVING_OPERATIVE]: 'Driving Operative',
  [LEVELS.OPERATIVE]: 'Operative',
  [LEVELS.ADMIN1]: 'Admin1',
  [LEVELS.CIVILS_TFL_DRIVER]: 'Civils TFL Driver',
  [LEVELS.CIVILS_TRAILER_DRIVER]: 'Civils Trailer Driver',
  [LEVELS.ADMIN2]: 'Admin2',
  [LEVELS.ESSEX_SUPERVISOR]: 'Essex Supervisor',
  [LEVELS.CUSTOMER]: 'Customer',
});

const ADMIN_LEVELS = Object.freeze([LEVELS.ADMIN, LEVELS.ADMIN1, LEVELS.ADMIN2, LEVELS.ESSEX_SUPERVISOR]);
const EMPLOYEE_LEVELS = Object.freeze([
  LEVELS.DRIVING_OPERATIVE,
  LEVELS.OPERATIVE,
  LEVELS.CIVILS_TFL_DRIVER,
  LEVELS.CIVILS_TRAILER_DRIVER,
  LEVELS.CUSTOMER,
]);

const ROLE_GROUPS = Object.freeze({
  admin: [LEVELS.ADMIN, LEVELS.ADMIN1],
  admin1: [LEVELS.ADMIN, LEVELS.ADMIN1],
  admin2: [LEVELS.ADMIN2],
  essexSupervisor: [LEVELS.ESSEX_SUPERVISOR],
  anyAdmin: ADMIN_LEVELS.slice(),
  driver: [LEVELS.DRIVING_OPERATIVE, LEVELS.CIVILS_TFL_DRIVER, LEVELS.CIVILS_TRAILER_DRIVER],
  operative: [LEVELS.OPERATIVE],
  customer: [LEVELS.CUSTOMER],
  anyEmployee: EMPLOYEE_LEVELS.slice(),
});

function isAdmin(level) {
  return ADMIN_LEVELS.includes(Number(level));
}

function isEmployee(level) {
  return EMPLOYEE_LEVELS.includes(Number(level));
}

function userTypeFor(level) {
  if (isAdmin(level)) return 'admin';
  if (isEmployee(level)) return 'employee';
  return null;
}

function levelName(level) {
  return LEVEL_NAMES[Number(level)] || 'Unknown';
}

module.exports = {
  LEVELS,
  LEVEL_NAMES,
  ADMIN_LEVELS,
  EMPLOYEE_LEVELS,
  ROLE_GROUPS,
  isAdmin,
  isEmployee,
  userTypeFor,
  levelName,
};
