'use strict';

const { Router } = require('express');
const ctrl = require('./ct.controller');
const { authenticate } = require('../../middlewares/auth.middleware');
const { authorize } = require('../../middlewares/rbac.middleware');
const { validate } = require('../../middlewares/validate.middleware');
const { LEVELS } = require('../../constants/roles');
const { ListQuerySchema, IdParamSchema, UpdateSchema } = require('./ct.validators');

const router = Router();

const { ADMIN } = LEVELS;

const canAccess = authorize(ADMIN);
const canDelete = authorize(ADMIN);

/**
 * @openapi
 * /admin/clegg-testing:
 *   get:
 *     tags: [Admin - Clegg Testing]
 *     summary: List all Clegg test records
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
  canAccess,
  validate({ query: ListQuerySchema }),
  ctrl.adminList,
);

/**
 * @openapi
 * /admin/clegg-testing/{id}:
 *   get:
 *     tags: [Admin - Clegg Testing]
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
  canAccess,
  validate({ params: IdParamSchema }),
  ctrl.adminGetById,
);

/**
 * @openapi
 * /admin/clegg-testing/{id}:
 *   put:
 *     tags: [Admin - Clegg Testing]
 *     summary: Update Clegg test record
 *     description: Updates an existing Clegg test record. All fields optional.
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
 *               ct1: { type: string }
 *               ct2: { type: string }
 *               ct3: { type: string }
 *               ct4: { type: string }
 *               ct5: { type: string }
 *               ct6: { type: string }
 *               ct7: { type: string }
 *               ct8: { type: string }
 *               ct9: { type: string }
 *               ct10: { type: string }
 *               ct11: { type: string }
 *               ct12: { type: string }
 *               ct13: { type: string }
 *               image: { type: string }
 *     responses:
 *       200:
 *         description: Clegg test updated
 *       404:
 *         description: Not found
 */
router.put('/:id',
  authenticate,
  canAccess,
  validate({ params: IdParamSchema, body: UpdateSchema }),
  ctrl.adminUpdate,
);

/**
 * @openapi
 * /admin/clegg-testing/{id}:
 *   delete:
 *     tags: [Admin - Clegg Testing]
 *     summary: Delete Clegg test record
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
  ctrl.adminDelete,
);

module.exports = router;
