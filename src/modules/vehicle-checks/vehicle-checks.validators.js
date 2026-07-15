'use strict';

const { z } = require('zod');

const yesNo = z.enum(['Yes', 'No']);
const yesNoNa = z.enum(['Yes', 'No', 'N/a']);

const ListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  searchDate: z.string().optional(),
  status: z.enum(['action-required', 'closed', 'all']).optional(),
});

const EmployeeListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
});

const CreateSchema = z.object({
  vehiclereg: z.string().min(1, 'Vehicle registration is required'),
  mileage: z.coerce.number().int().min(0, 'Mileage must be 0 or greater'),
  routeplanned: yesNo.default('Yes'),
  roadconditions: yesNo.default('Yes'),
  dressedforweather: yesNo.default('Yes'),
  emergencyequip: yesNo.default('Yes'),
  tires: yesNo.default('Yes'),
  lights: yesNo.default('Yes'),
  windows: yesNo.default('Yes'),
  loads: yesNo.default('Yes'),
  washer: yesNo.default('Yes'),
  oil: yesNo.default('Yes'),
  fluid: yesNo.default('Yes'),
  belts: yesNo.default('Yes'),
  seatbelt: yesNo.default('Yes'),
  horn: yesNo.default('Yes'),
  mirrors: yesNo.default('Yes'),
  brakes: yesNo.default('Yes'),
  trailercoupling: yesNoNa.default('N/a'),
  safetyconnection: yesNoNa.default('N/a'),
  loadsecured: yesNo.default('Yes'),
  loadweight: yesNo.default('Yes'),
  vehiclecondition: z.enum(['Good', 'Average', 'Poor', 'Very Poor', 'Dangerous']).default('Good'),
  safe: z.enum(['Safe', 'Unsafe']).default('Safe'),
  report: z.string().default(''),
});

const AdminUpdateSchema = z.object({
  drivername: z.string().min(1).optional(),
  vehiclereg: z.string().min(1).optional(),
  mileage: z.coerce.number().int().min(0).optional(),
  routeplanned: yesNo.optional(),
  roadconditions: yesNo.optional(),
  dressedforweather: yesNo.optional(),
  emergencyequip: yesNo.optional(),
  tires: yesNo.optional(),
  lights: yesNo.optional(),
  windows: yesNo.optional(),
  loads: yesNo.optional(),
  washer: yesNo.optional(),
  oil: yesNo.optional(),
  fluid: yesNo.optional(),
  belts: yesNo.optional(),
  seatbelt: yesNo.optional(),
  horn: yesNo.optional(),
  mirrors: yesNo.optional(),
  brakes: yesNo.optional(),
  trailercoupling: yesNoNa.optional(),
  safetyconnection: yesNoNa.optional(),
  loadsecured: yesNo.optional(),
  loadweight: yesNo.optional(),
  vehiclecondition: z.enum(['Good', 'Average', 'Poor', 'Very Poor', 'Dangerous', 'Closed']).optional(),
  safe: z.enum(['Safe', 'Unsafe', 'Closed']).optional(),
  report: z.string().optional(),
  notes: z.string().optional(),
});

const AdminCreateSchema = CreateSchema.extend({
  drivername: z.string().min(1, 'Driver name is required'),
  notes: z.string().default('Notes'),
  vehiclecondition: z.enum(['Good', 'Average', 'Poor', 'Very Poor', 'Dangerous', 'Closed']).default('Good'),
  safe: z.enum(['Safe', 'Unsafe', 'Closed']).default('Safe'),
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
  AdminUpdateSchema,
  AdminCreateSchema,
  IdParamSchema,
  DocIdParamSchema,
};
