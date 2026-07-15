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
  searchDate: z.string().optional(),
});

const UpdateSchema = z.object({
  firstname: z.string().min(1).optional(),
  middlename: z.string().optional(),
  surname: z.string().min(1).optional(),
  dob: z.string().optional(),
  address: z.string().optional(),
  telephone: z.string().optional(),
  email: z.string().optional(),
  nationality: z.string().optional(),
  contactname1: z.string().optional(),
  contacttelephone1: z.string().optional(),
  relation1: z.string().optional(),
  contactname2: z.string().optional(),
  contacttelephone2: z.string().optional(),
  relation2: z.string().optional(),
  employeeid: z.string().optional(),
  jobtitle: z.string().optional(),
  location: z.string().optional(),
  linemanager: z.string().optional(),
  startdate: z.string().optional(),
  enddate: z.string().optional(),
  cis: z.string().optional(),
  ninumber: z.string().optional(),
  salary: z.string().optional(),
  ltrafficemail: z.string().optional(),
  ltrafficphone: z.string().optional(),
  photoimage: z.string().optional(),
  confirm: z.string().optional(),
  signature: z.string().optional(),
  arrival_datetime: z.string().optional(),
  notes: z.string().optional(),
});

const DOC_TYPES = [
  'Driver Eyesight Check',
  'Driving Licence',
  'Driving Licence Check',
  'Ladder Inspection',
  'Medical Check',
  'Passport',
  'PPE Issue',
  'Service Contract',
  'Toolbox Talk',
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
  UpdateSchema,
  UploadDocSchema,
  DOC_TYPES,
};
