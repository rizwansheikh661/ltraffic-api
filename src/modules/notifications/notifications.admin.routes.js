'use strict';
const { Router }=require('express'); const ctrl=require('./notifications.controller'); const {authenticate}=require('../../middlewares/auth.middleware'); const {authorize}=require('../../middlewares/rbac.middleware'); const {validate}=require('../../middlewares/validate.middleware'); const {LEVELS}=require('../../constants/roles'); const {EventParamSchema,UpdatePreferenceSchema}=require('./notifications.validators');
const router=Router(); const admin=authorize(LEVELS.ADMIN);
/** @openapi
 * /admin/notifications/preferences:
 *   get:
 *     tags: [Admin - Notifications]
 *     summary: List submission notification settings
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: Notification preferences } }
 */
router.get('/preferences',authenticate,admin,ctrl.list);
/** @openapi
 * /admin/notifications/preferences/{eventType}:
 *   put:
 *     tags: [Admin - Notifications]
 *     summary: Set Admin and Manager submission alerts on or off
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: eventType, required: true, schema: { type: string, enum: [TIMESHEET_SUBMITTED, INCIDENT_REPORTED, VEHICLE_CHECK_SUBMITTED] } }]
 *     requestBody: { required: true, content: { application/json: { schema: { type: object, required: [notify_admin, notify_manager], properties: { notify_admin: { type: boolean }, notify_manager: { type: boolean } } } } } }
 *     responses: { 200: { description: Preference updated } }
 */
router.put('/preferences/:eventType',authenticate,admin,validate({params:EventParamSchema,body:UpdatePreferenceSchema}),ctrl.update);
module.exports=router;