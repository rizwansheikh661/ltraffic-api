'use strict';

const asyncHandler = require('../../common/asyncHandler');
const { ok } = require('../../common/response');
const service = require('./devices.service');

const register = asyncHandler(async (req, res) => {
  const result = await service.register({
    userId: req.user.id,
    token: req.body.token,
    platform: req.body.platform,
    appVersion: req.body.appVersion,
  });
  return ok(res, result);
});

const unregister = asyncHandler(async (req, res) => {
  const result = await service.unregister({
    userId: req.user.id,
    token: req.body.token,
  });
  return ok(res, result);
});

const list = asyncHandler(async (req, res) => {
  const result = await service.list(req.user.id);
  return ok(res, result);
});

module.exports = { register, unregister, list };
