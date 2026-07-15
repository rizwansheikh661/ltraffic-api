'use strict';

const { z } = require('zod');

const yesNo = z.enum(['Yes', 'No']);

const ListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  searchDate: z.string().optional(),
  status: z.enum(['open', 'closed', 'all']).optional(),
});

const EmployeeListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const IncidentTypeEnum = z.enum([
  'Accident',
  'Customer Complaint',
  'Customer Engagement',
  'Environmental',
  'Incident',
  'Near Miss',
  'Service Strike',
]);

const CreateSchema = z.object({
  type: IncidentTypeEnum,
  location: z.string().min(1, 'Location is required'),
  report: z.string().min(1, 'Report is required'),
  involved: z.string().nullable().default(null),
  anyoneinjured: yesNo.default('No'),
  whowasinjured: z.string().nullable().default(null),
  injuryreport: z.string().nullable().default(null),
  reportit: yesNo.nullable().default(null),
  advise: yesNo.nullable().default(null),
  laterdate: yesNo.nullable().default(null),
  companydetails: z.string().nullable().default(null),
  witness: yesNo.default('No'),
  witnessname: z.string().nullable().default(null),
  witnessaddress: z.string().nullable().default(null),
  witnesscontact: z.string().nullable().default(null),
  otherwitness: z.string().nullable().default(null),
});

const AdminCreateSchema = z.object({
  operativesname: z.string().min(1, 'Operative name is required'),
  arrival_datetime: z.string().min(1, 'Date/time is required'),
  type: IncidentTypeEnum,
  location: z.string().min(1, 'Location is required'),
  reportedby: z.string().min(1, 'Reported by is required'),
  report: z.string().min(1, 'Report is required'),
  notes: z.string().default(''),
});

const AdminUpdateSchema = z.object({
  operativesname: z.string().min(1).optional(),
  arrival_datetime: z.string().min(1).optional(),
  type: IncidentTypeEnum.optional(),
  location: z.string().min(1).optional(),
  reportedby: z.string().min(1).optional(),
  report: z.string().optional(),
  involved: z.string().nullable().optional(),
  anyoneinjured: yesNo.optional(),
  whowasinjured: z.string().nullable().optional(),
  injuryreport: z.string().nullable().optional(),
  reportit: yesNo.nullable().optional(),
  advise: yesNo.nullable().optional(),
  laterdate: yesNo.nullable().optional(),
  companydetails: z.string().nullable().optional(),
  witness: yesNo.optional(),
  witnessname: z.string().nullable().optional(),
  witnessaddress: z.string().nullable().optional(),
  witnesscontact: z.string().nullable().optional(),
  otherwitness: z.string().nullable().optional(),
  notes: z.string().optional(),
  status: z.enum(['Open', 'Closed']).optional(),
});

const StatusUpdateSchema = z.object({
  status: z.enum(['Open', 'Closed']),
  notes: z.string().optional(),
});

const IdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const DocIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
  docId: z.coerce.number().int().positive(),
});

module.exports = {
  ListQuerySchema,
  EmployeeListQuerySchema,
  CreateSchema,
  AdminCreateSchema,
  AdminUpdateSchema,
  StatusUpdateSchema,
  IdParamSchema,
  DocIdParamSchema,
};
