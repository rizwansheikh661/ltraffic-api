'use strict';

const asyncHandler = require('../../common/asyncHandler');
const { ok, created, noContent } = require('../../common/response');
const pagination = require('../../common/pagination');
const service = require('./timesheets.service');

// ── Employee ──────────────────────────────────────────────────

const employeeSubmit = asyncHandler(async (req, res) => {
  const data = await service.submitTimesheet(req.user, req.body);
  return created(res, data);
});

const employeeDraft = asyncHandler(async (req, res) => {
  const data = await service.saveDraft(req.user, req.body);
  return created(res, data);
});

const employeeList = asyncHandler(async (req, res) => {
  const { page, limit, offset } = pagination.parse(req.query);
  const { status } = req.query;
  const { data, total } = await service.getMyTimesheets(req.user.ltrafficid, { limit, offset, status });
  return ok(res, data, pagination.meta({ page, limit }, total));
});

const employeeGetById = asyncHandler(async (req, res) => {
  const data = await service.getMyTimesheetById(req.user.ltrafficid, req.params.id);
  return ok(res, data);
});

// ── Admin ─────────────────────────────────────────────────────

const adminList = asyncHandler(async (req, res) => {
  const { page, limit, offset } = pagination.parse(req.query);
  const { search, status } = req.query;
  const { data, total } = await service.getAll({ search, status, limit, offset });
  return ok(res, data, pagination.meta({ page, limit }, total));
});

const adminGetById = asyncHandler(async (req, res) => {
  const data = await service.getById(req.params.id);
  return ok(res, data);
});

const adminCreate = asyncHandler(async (req, res) => {
  const data = await service.adminCreate(req.body);
  return created(res, data);
});

const adminApprove = asyncHandler(async (req, res) => {
  const data = await service.approve(req.params.id);
  return ok(res, data);
});

const adminReject = asyncHandler(async (req, res) => {
  const data = await service.reject(req.params.id);
  return ok(res, data);
});

const adminDelete = asyncHandler(async (req, res) => {
  await service.remove(req.params.id);
  return noContent(res);
});

module.exports = {
  employeeSubmit,
  employeeDraft,
  employeeList,
  employeeGetById,
  adminList,
  adminGetById,
  adminCreate,
  adminApprove,
  adminReject,
  adminDelete,
};
