'use strict';

const asyncHandler = require('../../common/asyncHandler');
const { ok, noContent, created } = require('../../common/response');
const pagination = require('../../common/pagination');
const service = require('./users.service');

const list = asyncHandler(async (req, res) => {
  const { page, limit, offset } = pagination.parse(req.query);
  const { search } = req.query;
  const { data, total } = await service.getAll({ search, limit, offset });
  return ok(res, data, pagination.meta({ page, limit }, total));
});

const getById = asyncHandler(async (req, res) => {
  const data = await service.getById(req.params.id);
  return ok(res, data);
});

const create = asyncHandler(async (req, res) => {
  const data = await service.createUser(req.body);
  return created(res, data);
});

const update = asyncHandler(async (req, res) => {
  const data = await service.updateUser(req.params.id, req.body);
  return ok(res, data);
});

const remove = asyncHandler(async (req, res) => {
  await service.removeUser(req.params.id);
  return noContent(res);
});

module.exports = {
  list,
  getById,
  create,
  update,
  remove,
};
