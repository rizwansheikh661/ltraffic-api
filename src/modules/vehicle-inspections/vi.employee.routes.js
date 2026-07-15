'use strict';

const { Router } = require('express');
const ctrl = require('./vi.controller');
const { authenticate } = require('../../middlewares/auth.middleware');
const { authorize } = require('../../middlewares/rbac.middleware');
const { validate } = require('../../middlewares/validate.middleware');
const { uploadFor } = require('../../middlewares/upload.middleware');
const { LEVELS } = require('../../constants/roles');
const { ListQuerySchema, IdParamSchema, PartParamSchema, Part1Schema, VirCreateSchema } = require('./vi.validators');

const router = Router();
const canCreate = authorize(
  LEVELS.ADMIN, LEVELS.ADMIN1, LEVELS.CIVILS_TRAILER_DRIVER, LEVELS.ESSEX_SUPERVISOR, LEVELS.ADMIN2,
);
const canAccess = authorize(
  LEVELS.ADMIN, LEVELS.ADMIN1, LEVELS.CIVILS_TRAILER_DRIVER, LEVELS.ESSEX_SUPERVISOR,
);
const canView = authorize(
  LEVELS.ADMIN, LEVELS.ADMIN1, LEVELS.CIVILS_TRAILER_DRIVER, LEVELS.ESSEX_SUPERVISOR, LEVELS.ADMIN2,
);

const ALLOWED_MIME = [
  'image/jpeg', 'image/png', 'image/gif', 'image/bmp', 'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
];

/**
 * @openapi
 * /employee/vehicle-inspections:
 *   post:
 *     tags: [Vehicle Inspections]
 *     summary: Create Part 1 of a vehicle inspection
 *     description: |
 *       Creates a new vehicle inspection (Part 1 — Interior, Exterior, Glass & Mirrors).
 *       Requires vrId in body to look up the parent vehicle record.
 *       Auto-populates vic1 (name), vic2 (reg from VR), vic4 (datetime).
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [vrId]
 *             properties:
 *               vrId: { type: integer }
 *               vic3: { type: string, description: Mileage }
 *               vic5: { type: string, enum: [Pass, Fail], description: Seat(s) Condition }
 *               images:
 *                 type: array
 *                 items: { type: string, format: binary }
 *     responses:
 *       201:
 *         description: Part 1 created
 *       404:
 *         description: Vehicle record not found
 */
router.post('/',
  authenticate,
  canCreate,
  uploadFor('vic1', { allowedMime: ALLOWED_MIME }).array('images', 4),
  validate({ body: Part1Schema }),
  ctrl.employeeCreate,
);

/**
 * @openapi
 * /employee/vehicle-inspections/{id}/part/{partNum}:
 *   put:
 *     tags: [Vehicle Inspections]
 *     summary: Submit a part of the vehicle inspection
 *     description: Submit Parts 2-4. Part 4 sets status to "Completed".
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *       - in: path
 *         name: partNum
 *         required: true
 *         schema: { type: integer, minimum: 2, maximum: 4 }
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               images:
 *                 type: array
 *                 items: { type: string, format: binary }
 *     responses:
 *       200:
 *         description: Part submitted
 *       404:
 *         description: Inspection not found
 */
router.put('/:id/part/:partNum',
  authenticate,
  canAccess,
  validate({ params: PartParamSchema }),
  (req, res, next) => {
    const partNum = Number(req.params.partNum);
    const upload = uploadFor(`vic${partNum}`, { allowedMime: ALLOWED_MIME });
    upload.array('images', 4)(req, res, next);
  },
  ctrl.employeeSubmitPart,
);

/**
 * @openapi
 * /employee/vehicle-inspections:
 *   get:
 *     tags: [Vehicle Inspections]
 *     summary: List own vehicle inspections
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
 *     responses:
 *       200:
 *         description: Own inspections
 */
router.get('/',
  authenticate,
  canAccess,
  validate({ query: ListQuerySchema }),
  ctrl.employeeList,
);

/**
 * @openapi
 * /employee/vehicle-inspections/{id}:
 *   get:
 *     tags: [Vehicle Inspections]
 *     summary: Get own vehicle inspection by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Inspection detail
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
 * /employee/vehicle-inspections/{id}/repairs:
 *   post:
 *     tags: [Vehicle Inspections]
 *     summary: Add inspection repair (VIR)
 *     description: |
 *       Creates a Vehicle Inspection Repair record linked to the VIC.
 *       Auto-populates vir1 (reg from VIC), vir9 (signature), vir10 (completed by).
 *       Status is always "Completed".
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               vir2: { type: string, description: Inspection repair date/time }
 *               vir3: { type: string, description: Vehicle mileage }
 *               vir4: { type: string, description: Reported defect details }
 *               vir5: { type: string, enum: [Yes, No], description: Defect rectified }
 *               vir6: { type: string, description: Works completed description }
 *               vir7: { type: string, enum: [Pass, Fail] }
 *               vir8: { type: string, description: Notes }
 *               images:
 *                 type: array
 *                 items: { type: string, format: binary }
 *     responses:
 *       201:
 *         description: Repair created
 *       404:
 *         description: Parent inspection not found
 */
router.post('/:id/repairs',
  authenticate,
  canAccess,
  validate({ params: IdParamSchema }),
  uploadFor('vir', { allowedMime: ALLOWED_MIME }).array('images', 4),
  ctrl.employeeAddRepair,
);

module.exports = router;
