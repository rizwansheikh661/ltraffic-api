'use strict';

const ApiError = require('../common/apiError');
const { ADMIN_LEVELS, EMPLOYEE_LEVELS, ROLE_GROUPS } = require('../constants/roles');

function authorize(...levels) {
  const allowed = new Set(levels.flat().map(Number));
  return (req, _res, next) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (!allowed.has(Number(req.user.level))) return next(ApiError.forbidden('Insufficient role'));
    return next();
  };
}

const requireAdmin = authorize(...ADMIN_LEVELS);
const requireEmployee = authorize(...EMPLOYEE_LEVELS);

const roles = Object.freeze(
  Object.fromEntries(Object.entries(ROLE_GROUPS).map(([name, levels]) => [name, authorize(...levels)])),
);

module.exports = { authorize, requireAdmin, requireEmployee, roles };
