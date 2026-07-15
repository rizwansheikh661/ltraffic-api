'use strict';

const { Router } = require('express');
const ctrl = require('./vehicle-checks.controller');
const { authenticate } = require('../../middlewares/auth.middleware');
const { authorize } = require('../../middlewares/rbac.middleware');
const { validate } = require('../../middlewares/validate.middleware');
const { LEVELS } = require('../../constants/roles');
const {
  EmployeeListQuerySchema,
  CreateSchema,
  IdParamSchema,
} = require('./vehicle-checks.validators');

const router = Router();
const canSubmit = authorize(
  LEVELS.ADMIN, LEVELS.DRIVING_OPERATIVE, LEVELS.ADMIN1,
  LEVELS.CIVILS_TFL_DRIVER, LEVELS.CIVILS_TRAILER_DRIVER, LEVELS.ESSEX_SUPERVISOR,
);
const canView = authorize(
  LEVELS.ADMIN, LEVELS.DRIVING_OPERATIVE, LEVELS.ADMIN1,
  LEVELS.CIVILS_TFL_DRIVER, LEVELS.CIVILS_TRAILER_DRIVER, LEVELS.ADMIN2, LEVELS.ESSEX_SUPERVISOR,
);

/**
 * @openapi
 * /employee/vehicle-checks:
 *   post:
 *     tags: [Vehicle Checks]
 *     summary: Submit a vehicle check
 *     description: Submits a new vehicle check. Throttled to one submission per 8 hours per driver.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [vehiclereg, mileage]
 *             properties:
 *               vehiclereg: { type: string }
 *               mileage: { type: integer }
 *               routeplanned: { type: string, enum: [Yes, No], default: 'Yes' }
 *               roadconditions: { type: string, enum: [Yes, No], default: 'Yes' }
 *               dressedforweather: { type: string, enum: [Yes, No], default: 'Yes' }
 *               emergencyequip: { type: string, enum: [Yes, No], default: 'Yes' }
 *               tires: { type: string, enum: [Yes, No], default: 'Yes' }
 *               lights: { type: string, enum: [Yes, No], default: 'Yes' }
 *               windows: { type: string, enum: [Yes, No], default: 'Yes' }
 *               loads: { type: string, enum: [Yes, No], default: 'Yes' }
 *               washer: { type: string, enum: [Yes, No], default: 'Yes' }
 *               oil: { type: string, enum: [Yes, No], default: 'Yes' }
 *               fluid: { type: string, enum: [Yes, No], default: 'Yes' }
 *               belts: { type: string, enum: [Yes, No], default: 'Yes' }
 *               seatbelt: { type: string, enum: [Yes, No], default: 'Yes' }
 *               horn: { type: string, enum: [Yes, No], default: 'Yes' }
 *               mirrors: { type: string, enum: [Yes, No], default: 'Yes' }
 *               brakes: { type: string, enum: [Yes, No], default: 'Yes' }
 *               trailercoupling: { type: string, enum: [Yes, No, N/a], default: 'N/a' }
 *               safetyconnection: { type: string, enum: [Yes, No, N/a], default: 'N/a' }
 *               loadsecured: { type: string, enum: [Yes, No], default: 'Yes' }
 *               loadweight: { type: string, enum: [Yes, No], default: 'Yes' }
 *               vehiclecondition: { type: string, enum: [Good, Average, Poor, Very Poor, Dangerous], default: 'Good' }
 *               safe: { type: string, enum: [Safe, Unsafe], default: 'Safe' }
 *               report: { type: string }
 *     responses:
 *       201:
 *         description: Vehicle check submitted
 *       400:
 *         description: Throttled — already submitted within 8 hours
 */
router.post('/',
  authenticate,
  canSubmit,
  validate({ body: CreateSchema }),
  ctrl.employeeCreate,
);

/**
 * @openapi
 * /employee/vehicle-checks:
 *   get:
 *     tags: [Vehicle Checks]
 *     summary: List own vehicle checks
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
 *         name: search
 *         schema: { type: string }
 *         description: Search by date
 *     responses:
 *       200:
 *         description: Paginated list of own vehicle checks
 */
router.get('/',
  authenticate,
  canView,
  validate({ query: EmployeeListQuerySchema }),
  ctrl.employeeList,
);

/**
 * @openapi
 * /employee/vehicle-checks/{id}:
 *   get:
 *     tags: [Vehicle Checks]
 *     summary: Get own vehicle check by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Vehicle check detail
 *       404:
 *         description: Not found or belongs to different driver
 */
router.get('/:id',
  authenticate,
  canView,
  validate({ params: IdParamSchema }),
  ctrl.employeeGetById,
);

module.exports = router;
