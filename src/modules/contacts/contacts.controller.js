'use strict';

const asyncHandler = require('../../common/asyncHandler');
const { ok, created, noContent } = require('../../common/response');
const pagination = require('../../common/pagination');
const service = require('./contacts.service');

const list = asyncHandler(async (req, res) => {
  const { page, limit, offset } = pagination.parse(req.query);
  const { firstname, surname, search } = req.query;
  const { data, total } = await service.getAll({ firstname, surname, search, limit, offset });
  return ok(res, data, pagination.meta({ page, limit }, total));
});

const getById = asyncHandler(async (req, res) => {
  const data = await service.getById(req.params.id);
  return ok(res, data);
});

const create = asyncHandler(async (req, res) => {
  const data = await service.create(req.body);
  return created(res, data);
});

const update = asyncHandler(async (req, res) => {
  const data = await service.update(req.params.id, req.body);
  return ok(res, data);
});

const remove = asyncHandler(async (req, res) => {
  await service.remove(req.params.id);
  return noContent(res);
});

module.exports = {
  list,
  getById,
  create,
  update,
  remove,
};