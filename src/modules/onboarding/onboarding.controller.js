'use strict';

const service = require('./onboarding.service');
const ERROR_CODES = require('../../constants/errorCodes');

async function getStatus(req, res) {
  const status = await service.getStatus(req.user.id);
  if (!status) {
    return res.status(404).json({
      success: false,
      error: { code: ERROR_CODES.NOT_FOUND, message: 'User not found', requestId: req.requestId },
    });
  }
  res.json({ success: true, data: status });
}

async function submit(req, res) {
  const result = await service.submitOnboarding(req.user.id, req.body);
  if (!result) {
    return res.status(404).json({
      success: false,
      error: { code: ERROR_CODES.NOT_FOUND, message: 'User not found', requestId: req.requestId },
    });
  }
  res.status(201).json({ success: true, data: result });
}

async function getOwnRecord(req, res) {
  const record = await service.getOwnRecord(req.user.id);
  if (!record) {
    return res.status(404).json({
      success: false,
      error: { code: ERROR_CODES.NOT_FOUND, message: 'No onboarding record found', requestId: req.requestId },
    });
  }
  res.json({ success: true, data: record });
}

module.exports = { getStatus, submit, getOwnRecord };
