'use strict';

const { z } = require('zod');

const JOB_STATUSES = [
  'Pending', 'Live', 'In Progress', 'Delayed', 'Completed',
  'Part Completed', 'Cancelled', 'Awaiting Invoicing', 'Invoiced', 'Closed',
];

const PERMIT_STATUSES = [
  'In Progress', 'Granted', 'Refused', 'Delayed',
  'Submitted', 'Awaiting Submission', 'Works Completed',
  'Private', 'Registration Required',
];

const MATERIAL_STATUSES = [
  'In Stock', 'Low Stock', 'Out of Stock', 'On Order',
];

// ── Job Query Schemas ────────────────────────────────────────

const ListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  assignedto: z.string().optional(),
  jobstatus: z.string().optional(),
  permitstatus: z.string().optional(),
});

const EmployeeListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  assignedto: z.string().optional(),
});

// ── Param Schemas ────────────────────────────────────────────

const IdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const DocIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
  docId: z.coerce.number().int().positive(),
});

// ── Document Query Schema ────────────────────────────────────

const DocListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
});

// ── Job Body Schemas ─────────────────────────────────────────

const CreateSchema = z.object({
  jobstatus: z.enum(JOB_STATUSES),
  assignedto: z.string().min(1),
  customer: z.string().min(1),
  jobnumber: z.string().min(1),
  sitereference: z.string().min(1),
  location: z.string().min(1),
  postcode: z.string().min(1),
  area: z.string().min(1),
  workstream: z.string().min(1),
  permitstatus: z.string().min(1),
  startdate: z.string().optional().default(''),
  enddate: z.string().optional().default(''),
  notes: z.string().optional().default(''),
});

const UpdateSchema = z.object({
  jobstatus: z.enum(JOB_STATUSES).optional(),
  assignedto: z.string().min(1).optional(),
  customer: z.string().min(1).optional(),
  jobnumber: z.string().min(1).optional(),
  sitereference: z.string().min(1).optional(),
  location: z.string().min(1).optional(),
  postcode: z.string().min(1).optional(),
  area: z.string().min(1).optional(),
  workstream: z.string().min(1).optional(),
  permitstatus: z.string().min(1).optional(),
  startdate: z.string().optional(),
  enddate: z.string().optional(),
  notes: z.string().optional(),
});

// ── Document Body Schema ─────────────────────────────────────

const UploadDocSchema = z.object({
  doctype: z.string().min(1),
  docdesc: z.string().min(1, 'Document description is required'),
});

// ── Material Schemas ─────────────────────────────────────────

const MaterialListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.string().optional(),
});

const MaterialIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const MaterialCreateSchema = z.object({
  item: z.string().min(1),
  unitsremaining: z.string().min(1),
  location: z.string().min(1),
  status: z.enum(MATERIAL_STATUSES),
});

const MaterialUpdateSchema = z.object({
  item: z.string().min(1).optional(),
  unitsremaining: z.string().min(1).optional(),
  location: z.string().min(1).optional(),
  status: z.enum(MATERIAL_STATUSES).optional(),
});

module.exports = {
  ListQuerySchema,
  EmployeeListQuerySchema,
  IdParamSchema,
  DocIdParamSchema,
  DocListQuerySchema,
  CreateSchema,
  UpdateSchema,
  UploadDocSchema,
  MaterialListQuerySchema,
  MaterialIdParamSchema,
  MaterialCreateSchema,
  MaterialUpdateSchema,
  JOB_STATUSES,
  PERMIT_STATUSES,
  MATERIAL_STATUSES,
};
