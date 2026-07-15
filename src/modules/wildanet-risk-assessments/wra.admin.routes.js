'use strict';

const { Router } = require('express');
const ctrl = require('./wra.controller');
const { authenticate } = require('../../middlewares/auth.middleware');
const { authorize } = require('../../middlewares/rbac.middleware');
const { validate } = require('../../middlewares/validate.middleware');
const { LEVELS } = require('../../constants/roles');
const { ListQuerySchema, IdParamSchema, AdminUpdateSchema } = require('./wra.validators');

const router = Router();

const canList = authorize(LEVELS.ADMIN, LEVELS.ADMIN1, LEVELS.ADMIN2, LEVELS.CIVILS_TRAILER_DRIVER, LEVELS.ESSEX_SUPERVISOR);
const canView = authorize(LEVELS.ADMIN, LEVELS.ADMIN1, LEVELS.ESSEX_SUPERVISOR);
const canEdit = authorize(LEVELS.ADMIN, LEVELS.ADMIN1, LEVELS.ESSEX_SUPERVISOR);
const canDelete = authorize(LEVELS.ADMIN);

/**
 * @openapi
 * /admin/wildanet-risk-assessments:
 *   get:
 *     tags: [Admin - Wildanet Risk Assessments]
 *     summary: List Wildanet risk assessments
 *     description: Returns paginated list. Searchable by id or ra3 (Job Number) prefix match. Filter by status (live or completed).
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
 *         description: Search by id or Job Number (ra3) prefix match
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [live, completed] }
 *     responses:
 *       200:
 *         description: Paginated risk assessment list
 */
router.get('/',
  authenticate,
  canList,
  validate({ query: ListQuerySchema }),
  ctrl.adminList,
);

/**
 * @openapi
 * /admin/wildanet-risk-assessments/{id}:
 *   get:
 *     tags: [Admin - Wildanet Risk Assessments]
 *     summary: Get risk assessment by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Full risk assessment detail with image URLs
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
 * /admin/wildanet-risk-assessments/{id}:
 *   put:
 *     tags: [Admin - Wildanet Risk Assessments]
 *     summary: Update risk assessment
 *     description: Updates an existing risk assessment record. All fields optional.
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
 *                 enum: [In Progress, RA Completed]
 *               ra1: { type: string }
 *               ra8: { type: string }
 *               ra9: { type: string }
 *               ra10: { type: string }
 *               ra11: { type: string }
 *               ra12: { type: string }
 *     responses:
 *       200:
 *         description: Updated risk assessment
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
 * /admin/wildanet-risk-assessments/{id}:
 *   delete:
 *     tags: [Admin - Wildanet Risk Assessments]
 *     summary: Delete risk assessment
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

module.exports = router;
