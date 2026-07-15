'use strict';

const { z } = require('zod');

const WORK_RECORD_STATUSES = [
  'Pending', 'Issues to Rectify', 'Submitted', 'Quotation Sent',
  'Works Approved', 'Completed', 'Invoiced', 'Fibre', 'Closed',
];

const SECONDARY_NODE_CATEGORIES = [
  'UGSN', 'FJP', 'PMSN', 'PMCE', 'Agg.Node', 'MSN', 'Track Joint',
];

const WORK_STATUSES = [
  'A55 to be raised', 'I/N/R to be raised', 'Work Completed',
];

const TYPE_OF_WORKS = [
  'A55 - Blockage',
  'A55 - Pole Bends',
  'A55 - Chamber Congestion',
  'A55 - Duct Congestion / Overlay',
  'A55 - Frozen / Locked Lids',
  'A55 - Gifted Chamber',
  'I/N/R - Gully Sucking / Jetting',
  'I/N/R -  Desilt',
  'TRR & Sub Ducting Installation',
  'Gel Wrap Installation',
  'Installation of 12/24F loose tube blown cable',
  'Installation of 48F loose tube blown cable',
  'Installation of 144F loose tube blown cable',
  'Installation of 12/24F ULW Aerial Cable',
  'Installation of 48F ULW Aerial Cable',
];

const ListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.string().optional(),
  search: z.string().optional(),
  lt9: z.string().optional(),
});

const IdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const CreateSchema = z.object({
  lt3: z.string().min(1),
  lt4: z.string().min(1),
  lt5: z.string().min(1),
  lt6: z.enum(SECONDARY_NODE_CATEGORIES),
  lt7: z.string().min(1),
  lt8: z.string().min(1),
  lt9: z.enum(TYPE_OF_WORKS),
  lt10: z.enum(WORK_STATUSES),
  lt11: z.string().min(1),
  lt12: z.string().min(1),
});

const UpdateSchema = z.object({
  lt1: z.string().min(1).optional(),
  lt3: z.string().min(1).optional(),
  lt4: z.string().min(1).optional(),
  lt5: z.string().min(1).optional(),
  lt6: z.string().min(1).optional(),
  lt7: z.string().min(1).optional(),
  lt8: z.string().min(1).optional(),
  lt9: z.string().min(1).optional(),
  lt10: z.string().min(1).optional(),
  lt11: z.string().optional(),
  lt12: z.string().optional(),
  status: z.enum(WORK_RECORD_STATUSES).optional(),
  image: z.string().optional(),
});

module.exports = {
  ListQuerySchema,
  IdParamSchema,
  CreateSchema,
  UpdateSchema,
  WORK_RECORD_STATUSES,
  SECONDARY_NODE_CATEGORIES,
  WORK_STATUSES,
  TYPE_OF_WORKS,
};
