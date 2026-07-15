'use strict';

const { z } = require('zod');

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
  reg: z.string().min(1),
  description: z.string().optional().default(''),
  allocatedto: z.string().min(1),
  date: z.string().optional().default(''),
  cond: z.enum(['Yes', 'No']),
  mexpiry: z.string().optional().default(''),
  texpiry: z.string().optional().default(''),
  sexpiry: z.string().optional().default(''),
  notes: z.string().optional().default(''),
});

const UpdateSchema = z.object({
  reg: z.string().min(1).optional(),
  description: z.string().optional(),
  allocatedto: z.string().min(1).optional(),
  date: z.string().optional(),
  cond: z.enum(['Yes', 'No']).optional(),
  mexpiry: z.string().optional(),
  texpiry: z.string().optional(),
  sexpiry: z.string().optional(),
  notes: z.string().optional(),
});

const DOC_TYPES = [
  'Condition Image',
  'Service / Calibration Expiry',
  'Other',
];

const UploadDocSchema = z.object({
  doctype: z.enum(DOC_TYPES),
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
  DOC_TYPES,
};
