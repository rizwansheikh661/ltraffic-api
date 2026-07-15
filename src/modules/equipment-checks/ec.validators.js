'use strict';

const { z } = require('zod');

const PASS_FAIL = ['Pass', 'Fail'];
const CONDITION_VALUES = ['Good', 'Average', 'Poor', 'Very Poor', 'Dangerous'];
const SAFE_VALUES = ['Safe', 'Unsafe'];

const ListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
});

const IdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const DocIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
  docId: z.coerce.number().int().positive(),
});

const DocListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
});

const CreateSchema = z.object({
  description: z.string().min(1),
  ident: z.string().min(1),
  brakes: z.enum(PASS_FAIL).default('Pass'),
  steering: z.enum(PASS_FAIL).default('Pass'),
  seatbelt: z.enum(PASS_FAIL).default('Pass'),
  mirrors: z.enum(PASS_FAIL).default('Pass'),
  tyres: z.enum(PASS_FAIL).default('Pass'),
  wheelsecurity: z.enum(PASS_FAIL).default('Pass'),
  rotatingbeacon: z.enum(PASS_FAIL).default('Pass'),
  horn: z.enum(PASS_FAIL).default('Pass'),
  warninglights: z.enum(PASS_FAIL).default('Pass'),
  coolant: z.enum(PASS_FAIL).default('Pass'),
  seat: z.enum(PASS_FAIL).default('Pass'),
  access: z.enum(PASS_FAIL).default('Pass'),
  fuel: z.enum(PASS_FAIL).default('Pass'),
  cond: z.enum(CONDITION_VALUES).default('Good'),
  safe: z.enum(SAFE_VALUES).default('Safe'),
  report: z.string().optional().default(''),
});

const UpdateSchema = z.object({
  operativesname: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  ident: z.string().min(1).optional(),
  brakes: z.enum(PASS_FAIL).optional(),
  steering: z.enum(PASS_FAIL).optional(),
  seatbelt: z.enum(PASS_FAIL).optional(),
  mirrors: z.enum(PASS_FAIL).optional(),
  tyres: z.enum(PASS_FAIL).optional(),
  wheelsecurity: z.enum(PASS_FAIL).optional(),
  rotatingbeacon: z.enum(PASS_FAIL).optional(),
  horn: z.enum(PASS_FAIL).optional(),
  warninglights: z.enum(PASS_FAIL).optional(),
  coolant: z.enum(PASS_FAIL).optional(),
  seat: z.enum(PASS_FAIL).optional(),
  access: z.enum(PASS_FAIL).optional(),
  fuel: z.enum(PASS_FAIL).optional(),
  cond: z.enum(CONDITION_VALUES).optional(),
  safe: z.enum(SAFE_VALUES).optional(),
  report: z.string().optional(),
  image: z.string().optional(),
});

const UploadDocSchema = z.object({
  docdesc: z.string().min(1, 'Document description is required'),
});

module.exports = {
  ListQuerySchema,
  IdParamSchema,
  DocIdParamSchema,
  DocListQuerySchema,
  CreateSchema,
  UpdateSchema,
  UploadDocSchema,
  PASS_FAIL,
  CONDITION_VALUES,
  SAFE_VALUES,
};
