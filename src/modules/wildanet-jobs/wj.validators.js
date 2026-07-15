'use strict';

const { z } = require('zod');

const JOB_STATUSES = [
  'Pending', 'Live', 'In Progress', 'Delayed', 'Completed',
  'Part Completed', 'Outstanding Defect(s)', 'Cancelled',
  'Awaiting Invoicing', 'Invoiced', 'Closed',
];

const PERMIT_STATUSES = [
  'In Progress', 'Granted', 'Private', 'Refused', 'Delayed',
  'Submitted', 'Awaiting Submission', 'Registration Required', 'Works Completed',
];

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
  jobstatus: z.enum(JOB_STATUSES),
  assignedto: z.string().min(1),
  client: z.string().min(1),
  authority: z.string().min(1),
  community: z.string().min(1),
  solonumber: z.string().min(1),
  location: z.string().min(1),
  postcode: z.string().min(1),
  permitstatus: z.enum(PERMIT_STATUSES),
  startdate: z.string().optional().default(''),
  enddate: z.string().optional().default(''),
  notes: z.string().optional().default(''),
});

const UpdateSchema = z.object({
  jobstatus: z.enum(JOB_STATUSES).optional(),
  assignedto: z.string().min(1).optional(),
  client: z.string().min(1).optional(),
  authority: z.string().min(1).optional(),
  community: z.string().min(1).optional(),
  solonumber: z.string().min(1).optional(),
  location: z.string().min(1).optional(),
  postcode: z.string().min(1).optional(),
  permitstatus: z.enum(PERMIT_STATUSES).optional(),
  startdate: z.string().optional(),
  enddate: z.string().optional(),
  notes: z.string().optional(),
  image: z.string().optional(),
});

const UploadDocSchema = z.object({
  doctype: z.string().min(1),
  docdesc: z.string().min(1, 'Document description is required'),
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
  JOB_STATUSES,
  PERMIT_STATUSES,
};
