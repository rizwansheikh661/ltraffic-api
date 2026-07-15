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
  item: z.string().min(1),
  description: z.string().optional().default(''),
  ident: z.string().min(1),
  allocatedto: z.string().min(1),
  date: z.string().min(1),
  cond: z.string().min(1),
  expiry: z.string().optional().default(''),
  notes: z.string().optional().default(''),
});

const UpdateSchema = z.object({
  item: z.string().min(1).optional(),
  description: z.string().optional(),
  ident: z.string().min(1).optional(),
  allocatedto: z.string().min(1).optional(),
  date: z.string().min(1).optional(),
  cond: z.string().min(1).optional(),
  expiry: z.string().optional(),
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
