'use strict';

const { Router } = require('express');
const ctrl = require('./vi.controller');
const { authenticate } = require('../../middlewares/auth.middleware');
const { authorize } = require('../../middlewares/rbac.middleware');
const { validate } = require('../../middlewares/validate.middleware');
const { LEVELS } = require('../../constants/roles');
const { ListQuerySchema, IdParamSchema, RepairParamSchema, AdminUpdateSchema } = require('./vi.validators');

const router = Router();
const canList = authorize(LEVELS.ADMIN, LEVELS.ADMIN1, LEVELS.ESSEX_SUPERVISOR);
const canView = authorize(LEVELS.ADMIN, LEVELS.ADMIN1, LEVELS.ESSEX_SUPERVISOR, LEVELS.ADMIN2);
const canEdit = authorize(LEVELS.ADMIN, LEVELS.ADMIN1);
const canDelete = authorize(LEVELS.ADMIN);

/**
 * @openapi
 * /admin/vehicle-inspections:
 *   get:
 *     tags: [Admin - Vehicle Inspections]
 *     summary: List vehicle inspections
 *     description: Returns paginated list of vehicle inspections. Optional search by vehicle registration (vic2).
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
 *         description: Search by vehicle registration prefix
 *     responses:
 *       200:
 *         description: Paginated inspection list
 */
router.get('/',
  authenticate,
  canList,
  validate({ query: ListQuerySchema }),
  ctrl.adminList,
);

/**
 * @openapi
 * /admin/vehicle-inspections/{id}:
 *   get:
 *     tags: [Admin - Vehicle Inspections]
 *     summary: Get vehicle inspection by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Full inspection detail with image URLs
 *       404:
 *         description: Not found
 */
router.get('/:id',
  authenticate,
  canView,
  validate({ params: IdParamSchema }),
  ctrl.adminGetById,
);

/**
 * @openapi
 * /admin/vehicle-inspections/{id}:
 *   put:
 *     tags: [Admin - Vehicle Inspections]
 *     summary: Update vehicle inspection
 *     description: Update any fields including status. Admin and Admin1 only.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [In Progress, Completed]
 *     responses:
 *       200:
 *         description: Updated inspection
 *       404:
 *         description: Not found
 */
router.put('/:id',
  authenticate,
  canEdit,
  validate({ params: IdParamSchema, body: AdminUpdateSchema }),
  ctrl.adminUpdate,
);

/**
 * @openapi
 * /admin/vehicle-inspections/{id}:
 *   delete:
 *     tags: [Admin - Vehicle Inspections]
 *     summary: Delete vehicle inspection
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       204:
 *         description: Deleted
 *       404:
 *         description: Not found
 */
router.delete('/:id',
  authenticate,
  canDelete,
  validate({ params: IdParamSchema }),
  ctrl.adminRemove,
);

/**
 * @openapi
 * /admin/vehicle-inspections/{id}/repairs:
 *   get:
 *     tags: [Admin - Vehicle Inspections]
 *     summary: List inspection repairs (VIR)
 *     description: Returns all repair records for a vehicle inspection.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Repair list
 *       404:
 *         description: Parent inspection not found
 */
router.get('/:id/repairs',
  authenticate,
  canView,
  validate({ params: IdParamSchema }),
  ctrl.adminListRepairs,
);

/**
 * @openapi
 * /admin/vehicle-inspections/{id}/repairs/{repairId}:
 *   delete:
 *     tags: [Admin - Vehicle Inspections]
 *     summary: Delete inspection repair
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *       - in: path
 *         name: repairId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       204:
 *         description: Deleted
 *       404:
 *         description: Not found
 */
router.delete('/:id/repairs/:repairId',
  authenticate,
  canDelete,
  validate({ params: RepairParamSchema }),
  ctrl.adminRemoveRepair,
);

module.exports = router;
