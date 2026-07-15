'use strict';

const { z } = require('zod');

const CABINET_AREAS = [
  'Germoe, Penzance', 'Helston', 'Leedstown', 'Marazion',
  'Penzance', 'St Buryan', 'St Ives',
];

const SN_TYPES = ['UGPN', 'UGSN', 'PMSN', 'PMCE', 'MSN', 'MCE', 'Track Joint'];

const YES_NO = ['Yes', 'No'];
const SAFE_UNSAFE = ['Safe', 'Unsafe'];
const CONFIRM_NO = ['Confirm', 'No'];

const LADDER_IDS = [
  'LytePro+ Telecoms Industrial Triple Extension Ladder (SN:LTLADD001)',
  'Lyte Telecoms Glass Fibre Extension Ladder (SN:LTLADD002)',
];

const MEWP_REGISTRATIONS = [
  'FY21 TVU - Ford Transit L2H2 130PS MEWP',
  'OY72 CHG - MAN MEWP',
];

const ListQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  search: z.string().optional(),
});

const IdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const yn = z.enum(YES_NO);

const WahCreateSchema = z.object({
  wah2: z.string().min(1),
  wah4: z.enum(CABINET_AREAS),
  pn: z.string().min(1),
  snt: z.enum(SN_TYPES),
  sn: z.string().min(1),
  wah5: yn,
  wah6: z.enum(LADDER_IDS),
  wah7: yn,
  wah8: yn,
  wah9: yn,
  wah10: z.enum(SAFE_UNSAFE),
  wah11: yn,
  wah12: yn,
  wah13: yn,
  wah14: z.string().optional().default(''),
});

const UgCreateSchema = z.object({
  ug2: z.string().min(1),
  ug4: z.enum(CABINET_AREAS),
  pn: z.string().min(1),
  snt: z.enum(SN_TYPES),
  sn: z.string().min(1),
  ug5: yn,
  ug6: yn,
  ug7: yn,
  ug8: yn,
  ug9: yn,
  ug10: yn,
  ug11: yn,
  ug12: z.enum(SAFE_UNSAFE),
  ug13: z.string().optional().default(''),
});

const MewpCreateSchema = z.object({
  mewp2: z.string().min(1),
  mewp4: z.enum(CABINET_AREAS),
  pn: z.string().min(1),
  snt: z.enum(SN_TYPES),
  sn: z.string().min(1),
  mewp5: yn,
  mewp6: z.enum(MEWP_REGISTRATIONS),
  mewp7: yn,
  mewp8: yn,
  mewp9: yn,
  mewp10: z.enum(SAFE_UNSAFE),
  mewp11: yn,
  mewp12: yn,
  mewp13: z.enum(CONFIRM_NO),
  mewp14: z.string().optional().default(''),
});

module.exports = {
  ListQuerySchema,
  IdParamSchema,
  WahCreateSchema,
  UgCreateSchema,
  MewpCreateSchema,
  CABINET_AREAS,
  SN_TYPES,
  LADDER_IDS,
  MEWP_REGISTRATIONS,
};
