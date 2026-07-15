'use strict';

const { Router } = require('express');
const ctrl = require('./si.controller');
const { authenticate } = require('../../middlewares/auth.middleware');
const { authorize } = require('../../middlewares/rbac.middleware');
const { validate } = require('../../middlewares/validate.middleware');
const { LEVELS } = require('../../constants/roles');
const { ListQuerySchema, IdParamSchema, AdminUpdateSchema } = require('./si.validators');

const router = Router();
const canList = authorize(LEVELS.ADMIN, LEVELS.ADMIN1, LEVELS.ESSEX_SUPERVISOR, LEVELS.CUSTOMER);
const canView = authorize(LEVELS.ADMIN, LEVELS.ADMIN1, LEVELS.ESSEX_SUPERVISOR);
const canEdit = authorize(LEVELS.ADMIN, LEVELS.ADMIN1, LEVELS.ESSEX_SUPERVISOR);
const canDelete = authorize(LEVELS.ADMIN);

/**
 * @openapi
 * /admin/site-inspections:
 *   get:
 *     tags: [Admin - Site Inspections]
 *     summary: List site inspections
 *     description: Returns paginated list of site inspections. Requires source query param (civils or wildanet). Optional status filter (live or completed).
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: source
 *         required: true
 *         schema: { type: string, enum: [civils, wildanet] }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [live, completed] }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Search by Site Ganger (in6) prefix match
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
 * /admin/site-inspections/{id}:
 *   get:
 *     tags: [Admin - Site Inspections]
 *     summary: Get site inspection by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *       - in: query
 *         name: source
 *         required: true
 *         schema: { type: string, enum: [civils, wildanet] }
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
 * /admin/site-inspections/{id}:
 *   put:
 *     tags: [Admin - Site Inspections]
 *     summary: Update site inspection
 *     description: Update any fields including status. Admin and supervisors only.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *       - in: query
 *         name: source
 *         required: true
 *         schema: { type: string, enum: [civils, wildanet] }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [In Progress, Inspection Awaiting Review, Pass, Completed, Failed, Follow up Required]
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
 * /admin/site-inspections/{id}:
 *   delete:
 *     tags: [Admin - Site Inspections]
 *     summary: Delete site inspection
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *       - in: query
 *         name: source
 *         required: true
 *         schema: { type: string, enum: [civils, wildanet] }
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

module.exports = router;
