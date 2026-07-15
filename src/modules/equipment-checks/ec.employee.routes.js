'use strict';

const { Router } = require('express');
const ctrl = require('./ec.controller');
const { authenticate } = require('../../middlewares/auth.middleware');
const { authorize } = require('../../middlewares/rbac.middleware');
const { validate } = require('../../middlewares/validate.middleware');
const { uploadFor } = require('../../middlewares/upload.middleware');
const { LEVELS } = require('../../constants/roles');
const { ListQuerySchema, IdParamSchema, CreateSchema } = require('./ec.validators');

const router = Router();
const canAccess = authorize(
  LEVELS.ADMIN, LEVELS.ADMIN1, LEVELS.CIVILS_TRAILER_DRIVER, LEVELS.ESSEX_SUPERVISOR,
);
const canView = authorize(
  LEVELS.ADMIN, LEVELS.ADMIN1, LEVELS.ADMIN2, LEVELS.CIVILS_TRAILER_DRIVER, LEVELS.ESSEX_SUPERVISOR,
);

const upload = uploadFor('equipmentcheck', {
  allowedMime: [
    'image/jpeg', 'image/png', 'image/gif', 'image/bmp', 'image/webp',
    'application/pdf',
  ],
});

/**
 * @openapi
 * /employee/equipment-checks:
 *   post:
 *     tags: [Equipment Checks]
 *     summary: Submit a new equipment check
 *     description: |
 *       Submits a PUWER equipment/plant inspection check. At least one image is required.
 *       Send as multipart/form-data with field name "images" for uploaded files (max 4).
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [description, ident, images]
 *             properties:
 *               description:
 *                 type: string
 *                 description: Description of Equipment / Plant
 *               ident:
 *                 type: string
 *                 description: Identification / Serial Number
 *               brakes:
 *                 type: string
 *                 enum: [Pass, Fail]
 *                 default: Pass
 *               steering:
 *                 type: string
 *                 enum: [Pass, Fail]
 *                 default: Pass
 *               seatbelt:
 *                 type: string
 *                 enum: [Pass, Fail]
 *                 default: Pass
 *               mirrors:
 *                 type: string
 *                 enum: [Pass, Fail]
 *                 default: Pass
 *               tyres:
 *                 type: string
 *                 enum: [Pass, Fail]
 *                 default: Pass
 *               wheelsecurity:
 *                 type: string
 *                 enum: [Pass, Fail]
 *                 default: Pass
 *               rotatingbeacon:
 *                 type: string
 *                 enum: [Pass, Fail]
 *                 default: Pass
 *               horn:
 *                 type: string
 *                 enum: [Pass, Fail]
 *                 default: Pass
 *               warninglights:
 *                 type: string
 *                 enum: [Pass, Fail]
 *                 default: Pass
 *               coolant:
 *                 type: string
 *                 enum: [Pass, Fail]
 *                 default: Pass
 *               seat:
 *                 type: string
 *                 enum: [Pass, Fail]
 *                 default: Pass
 *               access:
 *                 type: string
 *                 enum: [Pass, Fail]
 *                 default: Pass
 *               fuel:
 *                 type: string
 *                 enum: [Pass, Fail]
 *                 default: Pass
 *               cond:
 *                 type: string
 *                 enum: [Good, Average, Poor, Very Poor, Dangerous]
 *                 default: Good
 *               safe:
 *                 type: string
 *                 enum: [Safe, Unsafe]
 *                 default: Safe
 *               report:
 *                 type: string
 *                 description: Defects / damage details
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Equipment images (1-4 files required)
 *     responses:
 *       201:
 *         description: Equipment check submitted
 *       400:
 *         description: Validation error or no images
 */
router.post('/',
  authenticate,
  canAccess,
  upload.array('images', 4),
  validate({ body: CreateSchema }),
  ctrl.employeeSubmit,
);

/**
 * @openapi
 * /employee/equipment-checks:
 *   get:
 *     tags: [Equipment Checks]
 *     summary: List own equipment checks
 *     description: Returns paginated list of equipment checks submitted by the authenticated user. Searchable by date (prefix match).
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
 *         description: Search by date (prefix match)
 *     responses:
 *       200:
 *         description: Paginated list of own equipment checks
 */
router.get('/',
  authenticate,
  canAccess,
  validate({ query: ListQuerySchema }),
  ctrl.employeeList,
);

/**
 * @openapi
 * /employee/equipment-checks/{id}:
 *   get:
 *     tags: [Equipment Checks]
 *     summary: Get own equipment check by ID
 *     description: Returns detail of a specific equipment check owned by the authenticated user.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Equipment check detail
 *       404:
 *         description: Not found or belongs to different user
 */
router.get('/:id',
  authenticate,
  canView,
  validate({ params: IdParamSchema }),
  ctrl.employeeGetById,
);

module.exports = router;
