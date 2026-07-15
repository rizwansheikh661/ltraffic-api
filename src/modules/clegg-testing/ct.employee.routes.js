'use strict';

const { Router } = require('express');
const ctrl = require('./ct.controller');
const { authenticate } = require('../../middlewares/auth.middleware');
const { authorize } = require('../../middlewares/rbac.middleware');
const { validate } = require('../../middlewares/validate.middleware');
const { uploadFor } = require('../../middlewares/upload.middleware');
const { LEVELS } = require('../../constants/roles');
const { ListQuerySchema, IdParamSchema, CreateSchema } = require('./ct.validators');

const router = Router();

const { ADMIN, ADMIN1, ADMIN2, CIVILS_TRAILER_DRIVER, ESSEX_SUPERVISOR } = LEVELS;

const canView = authorize(ADMIN, ADMIN1, ADMIN2, CIVILS_TRAILER_DRIVER, ESSEX_SUPERVISOR);
const canCreate = authorize(ADMIN, ADMIN1, CIVILS_TRAILER_DRIVER, ESSEX_SUPERVISOR);

const ALLOWED_MIME = [
  'image/jpeg', 'image/png', 'image/gif', 'image/bmp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/zip',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

const upload = uploadFor('clegg', { allowedMime: ALLOWED_MIME });

/**
 * @openapi
 * /employee/clegg-testing:
 *   get:
 *     tags: [Clegg Testing]
 *     summary: List Clegg test records
 *     description: Returns paginated list of Clegg test results. Searchable by ct4 (Conducted By) prefix match. Sorted by id DESC.
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
 *         description: Search by ct4 Conducted By (prefix match)
 *     responses:
 *       200:
 *         description: Paginated Clegg test list
 */
router.get('/',
  authenticate,
  canView,
  validate({ query: ListQuerySchema }),
  ctrl.employeeList,
);

/**
 * @openapi
 * /employee/clegg-testing/{id}:
 *   get:
 *     tags: [Clegg Testing]
 *     summary: Get Clegg test record by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Clegg test details with image URLs
 *       404:
 *         description: Not found
 */
router.get('/:id',
  authenticate,
  canView,
  validate({ params: IdParamSchema }),
  ctrl.employeeGetById,
);

/**
 * @openapi
 * /employee/clegg-testing:
 *   post:
 *     tags: [Clegg Testing]
 *     summary: Create Clegg test record
 *     description: Creates a new Clegg test record with image uploads. Send as multipart/form-data. Conducted By (ct4) and Date (ct3) are auto-populated.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [ct2, ct5, ct6, ct7, ct8, ct9, ct10]
 *             properties:
 *               ct1: { type: string, description: Job Number }
 *               ct2: { type: string, description: Location of Test }
 *               ct5: { type: string, description: Cabinet Area }
 *               ct6: { type: string, description: Surface Type }
 *               ct7: { type: string, description: Test Unit Used }
 *               ct8: { type: string, description: Calibration Expiry Date }
 *               ct9: { type: string, description: Clegg Test Reading }
 *               ct10: { type: string, description: Clegg Test Result (Pass/Fail) }
 *               ct11: { type: string, description: Re-Test Reading }
 *               ct12: { type: string, description: Re-Test Result }
 *               ct13: { type: string, description: Notes }
 *               images:
 *                 type: array
 *                 items: { type: string, format: binary }
 *     responses:
 *       201:
 *         description: Clegg test created
 */
router.post('/',
  authenticate,
  canCreate,
  upload.array('images', 6),
  validate({ body: CreateSchema }),
  ctrl.employeeCreate,
);

module.exports = router;
