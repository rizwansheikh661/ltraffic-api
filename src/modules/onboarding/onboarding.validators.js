'use strict';

const { z } = require('zod');

const OnboardingSubmitSchema = z.object({
  firstname: z.string().min(1),
  middlename: z.string().optional().default(''),
  surname: z.string().min(1),
  dob: z.string().min(1),
  address: z.string().min(1),
  telephone: z.string().min(1),
  email: z.string().email(),
  nationality: z.string().min(1),
  contactname1: z.string().min(1),
  contacttelephone1: z.string().min(1),
  relation1: z.string().min(1),
  contactname2: z.string().optional().default(''),
  contacttelephone2: z.string().optional().default(''),
  relation2: z.string().optional().default(''),
  startdate: z.string().min(1),
  cis: z.string().optional().default(''),
  ninumber: z.string().min(1),
  confirm: z.string().optional().default(''),
  date_signed: z.string().optional().default(''),
});

module.exports = { OnboardingSubmitSchema };
