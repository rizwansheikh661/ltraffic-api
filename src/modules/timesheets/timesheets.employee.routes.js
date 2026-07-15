'use strict';

const { Router } = require('express');
const ctrl = require('./timesheets.controller');
const { authenticate } = require('../../middlewares/auth.middleware');
const { authorize } = require('../../middlewares/rbac.middleware');
const { validate } = require('../../middlewares/validate.middleware');
const { LEVELS } = require('../../constants/roles');
const {
  EmployeeListQuerySchema,
  CreateSchema,
  IdParamSchema,
} = require('./timesheets.validators');

const router = Router();
const canAccess = authorize(
  LEVELS.ADMIN, LEVELS.DRIVING_OPERATIVE, LEVELS.ADMIN1,
  LEVELS.CIVILS_TFL_DRIVER, LEVELS.CIVILS_TRAILER_DRIVER, LEVELS.ESSEX_SUPERVISOR,
);

/**
 * @openapi
 * /employee/timesheets/submit:
 *   post:
 *     tags: [Timesheets]
 *     summary: Submit a weekly timesheet
 *     description: Creates a new timesheet with status "Submitted". Uses the authenticated user's name and ltrafficid.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [week, days]
 *             properties:
 *               week:
 *                 type: string
 *                 description: Week commencing label (e.g. "Monday - 07/07/2025")
 *               days:
 *                 type: array
 *                 minItems: 1
 *                 maxItems: 7
 *                 items:
 *                   type: object
 *                   properties:
 *                     date: { type: string }
 *                     hours: { type: string, description: Hours worked (e.g. "8") }
 *                     location: { type: string }
 *                     activity: { type: string, description: "Civils Installation, Defects, Supervision, Validation, Holiday, Sick" }
 *                     contract: { type: string, description: "Essex - Gigaclear, London - Transport for London" }
 *               comments: { type: string }
 *     responses:
 *       201:
 *         description: Timesheet submitted
 */
router.post('/submit',
  authenticate,
  canAccess,
  validate({ body: CreateSchema }),
  ctrl.employeeSubmit,
);

/**
 * @openapi
 * /employee/timesheets/draft:
 *   post:
 *     tags: [Timesheets]
 *     summary: Save a timesheet as draft
 *     description: Creates a new timesheet with status "Draft". Can be submitted later.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [week, days]
 *             properties:
 *               week: { type: string }
 *               days:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     date: { type: string }
 *                     hours: { type: string }
 *                     location: { type: string }
 *                     activity: { type: string }
 *                     contract: { type: string }
 *               comments: { type: string }
 *     responses:
 *       201:
 *         description: Draft saved
 */
router.post('/draft',
  authenticate,
  canAccess,
  validate({ body: CreateSchema }),
  ctrl.employeeDraft,
);

/**
 * @openapi
 * /employee/timesheets:
 *   get:
 *     tags: [Timesheets]
 *     summary: List own timesheets
 *     description: Returns paginated list of the authenticated employee's timesheets. Optionally filter by exact status.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [Draft, Submitted, Approved, Rejected] }
 *         description: Filter by exact status value
 *     responses:
 *       200:
 *         description: Paginated list of own timesheets
 */
router.get('/',
  authenticate,
  canAccess,
  validate({ query: EmployeeListQuerySchema }),
  ctrl.employeeList,
);

/**
 * @openapi
 * /employee/timesheets/{id}:
 *   get:
 *     tags: [Timesheets]
 *     summary: Get own timesheet by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Full timesheet detail with 7-day breakdown
 *       404:
 *         description: Not found or belongs to different employee
 */
router.get('/:id',
  authenticate,
  canAccess,
  validate({ params: IdParamSchema }),
  ctrl.employeeGetById,
);

module.exports = router;
