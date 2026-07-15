'use strict';

const { Router } = require('express');
const ctrl = require('./pfr.controller');
const { authenticate } = require('../../middlewares/auth.middleware');
const { authorize } = require('../../middlewares/rbac.middleware');
const { validate } = require('../../middlewares/validate.middleware');
const { LEVELS } = require('../../constants/roles');
const { IdParamSchema } = require('./pfr.validators');

const router = Router();

const canDelete = authorize(LEVELS.ADMIN);

/**
 * @openapi
 * /admin/pia-fibre-risk/wah/{id}:
 *   delete:
 *     tags: [Admin - PIA & Fibre Risk]
 *     summary: Delete Working at Height record
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
router.delete('/wah/:id',
  authenticate,
  canDelete,
  validate({ params: IdParamSchema }),
  ctrl.wahDelete,
);

/**
 * @openapi
 * /admin/pia-fibre-risk/ug/{id}:
 *   delete:
 *     tags: [Admin - PIA & Fibre Risk]
 *     summary: Delete Underground Works record
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
router.delete('/ug/:id',
  authenticate,
  canDelete,
  validate({ params: IdParamSchema }),
  ctrl.ugDelete,
);

/**
 * @openapi
 * /admin/pia-fibre-risk/mewp/{id}:
 *   delete:
 *     tags: [Admin - PIA & Fibre Risk]
 *     summary: Delete MEWP Works record
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
router.delete('/mewp/:id',
  authenticate,
  canDelete,
  validate({ params: IdParamSchema }),
  ctrl.mewpDelete,
);

module.exports = router;
