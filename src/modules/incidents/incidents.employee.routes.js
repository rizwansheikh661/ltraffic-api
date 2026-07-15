'use strict';

const { Router } = require('express');
const ctrl = require('./incidents.controller');
const { authenticate } = require('../../middlewares/auth.middleware');
const { authorize } = require('../../middlewares/rbac.middleware');
const { validate } = require('../../middlewares/validate.middleware');
const { uploadFor } = require('../../middlewares/upload.middleware');
const { LEVELS } = require('../../constants/roles');
const {
  EmployeeListQuerySchema,
  CreateSchema,
  IdParamSchema,
} = require('./incidents.validators');

const router = Router();
const canAccess = authorize(
  LEVELS.ADMIN, LEVELS.DRIVING_OPERATIVE, LEVELS.OPERATIVE, LEVELS.ADMIN1,
  LEVELS.CIVILS_TFL_DRIVER, LEVELS.CIVILS_TRAILER_DRIVER, LEVELS.ESSEX_SUPERVISOR, LEVELS.CUSTOMER,
);
const upload = uploadFor('admin/hsupload', {
  allowedMime: ['image/jpeg', 'image/png', 'image/gif', 'image/bmp', 'image/webp', 'application/pdf'],
});

/**
 * @openapi
 * /employee/incidents:
 *   post:
 *     tags: [Incidents]
 *     summary: Report an incident
 *     description: Submit a new H&S incident report. Operative name and reported-by are set from JWT. Image upload optional.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [type, location, report]
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [Accident, Customer Complaint, Customer Engagement, Environmental, Incident, Near Miss, Service Strike]
 *               location: { type: string }
 *               report: { type: string, description: What happened }
 *               involved: { type: string }
 *               anyoneinjured: { type: string, enum: [Yes, No], default: 'No' }
 *               whowasinjured: { type: string }
 *               injuryreport: { type: string }
 *               reportit: { type: string, enum: [Yes, No] }
 *               advise: { type: string, enum: [Yes, No] }
 *               laterdate: { type: string, enum: [Yes, No] }
 *               companydetails: { type: string }
 *               witness: { type: string, enum: [Yes, No], default: 'No' }
 *               witnessname: { type: string }
 *               witnessaddress: { type: string }
 *               witnesscontact: { type: string }
 *               otherwitness: { type: string }
 *               image:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Up to 10 supporting images
 *     responses:
 *       201:
 *         description: Incident reported
 */
router.post('/',
  authenticate,
  canAccess,
  upload.array('image', 10),
  validate({ body: CreateSchema }),
  ctrl.employeeReport,
);

/**
 * @openapi
 * /employee/incidents:
 *   get:
 *     tags: [Incidents]
 *     summary: List own incidents
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Paginated list of own incidents
 */
router.get('/',
  authenticate,
  canAccess,
  validate({ query: EmployeeListQuerySchema }),
  ctrl.employeeList,
);

/**
 * @openapi
 * /employee/incidents/{id}:
 *   get:
 *     tags: [Incidents]
 *     summary: Get own incident by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Incident detail
 *       404:
 *         description: Not found or belongs to different operative
 */
router.get('/:id',
  authenticate,
  canAccess,
  validate({ params: IdParamSchema }),
  ctrl.employeeGetById,
);

module.exports = router;
