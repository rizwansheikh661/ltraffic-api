'use strict';

const asyncHandler = require('../../common/asyncHandler');
const { ok } = require('../../common/response');
const service = require('./auth.service');

function clientIp(req) {
  return (
    (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    req.ip ||
    req.socket?.remoteAddress ||
    null
  );
}

const login = asyncHandler(async (req, res) => {
  const result = await service.login({
    identifier: req.body.identifier,
    password: req.body.password,
    deviceId: req.body.deviceId,
    ip: clientIp(req),
    userAgent: req.headers['user-agent'] || null,
  });
  return ok(res, result);
});

const refresh = asyncHandler(async (req, res) => {
  const result = await service.refresh({
    refreshToken: req.body.refreshToken,
    ip: clientIp(req),
    userAgent: req.headers['user-agent'] || null,
  });
  return ok(res, result);
});

const logout = asyncHandler(async (req, res) => {
  const result = await service.logout({ refreshToken: req.body.refreshToken });
  return ok(res, result);
});

const me = asyncHandler(async (req, res) => {
  const result = await service.me(req.user.id);
  return ok(res, result);
});

const changePassword = asyncHandler(async (req, res) => {
  const result = await service.changePassword({
    userId: req.user.id,
    currentPassword: req.body.currentPassword,
    newPassword: req.body.newPassword,
  });
  return ok(res, result);
});

const forgotPassword = asyncHandler(async (req, res) => {
  await service.forgotPassword({ email: req.body.email });
  // Uniform 202 whether the email existed or not, to avoid enumeration.
  return res.status(202).json({ success: true, data: { requested: true } });
});

const resetPassword = asyncHandler(async (req, res) => {
  const result = await service.resetPassword({
    key: req.body.key,
    newPassword: req.body.newPassword,
  });
  return ok(res, result);
});

module.exports = { login, refresh, logout, me, changePassword, forgotPassword, resetPassword };
