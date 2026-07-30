'use strict';
const { z } = require('zod');
const EventParamSchema=z.object({ eventType:z.enum(['TIMESHEET_SUBMITTED','INCIDENT_REPORTED','VEHICLE_CHECK_SUBMITTED']) });
const UpdatePreferenceSchema=z.object({ notify_admin:z.coerce.boolean(), notify_manager:z.coerce.boolean() });
module.exports={EventParamSchema,UpdatePreferenceSchema};