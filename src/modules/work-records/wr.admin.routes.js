'use strict';

const { Router } = require('express');
const ctrl = require('./wr.controller');
const { authenticate } = require('../../middlewares/auth.middleware');
const { authorize } = require('../../middlewares/rbac.middleware');
const { validate } = require('../../middlewares/validate.middleware');
const { LEVELS } = require('../../constants/roles');
const { ListQuerySchema, IdParamSchema, UpdateSchema } = require('./wr.validators');

const router = Router();

const { ADMIN, ADMIN1 } = LEVELS;

const canList = authorize(ADMIN, ADMIN1);
const canEdit = authorize(ADMIN, ADMIN1);
const canDelete = authorize(ADMIN);

/**
 * @openapi
 * /admin/work-records:
 *   get:
 *     tags: [Admin - Work Records]
 *     summary: List all work records
 *     description: Returns paginated list of work records. Filterable by status. Searchable by lt1 (Recorded By) and lt9 (Type of Works) prefix match. Pending status sorts ASC, all others DESC.
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
 *         schema: { type: string }
 *         description: Filter by work record status
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Search by lt1 Recorded By (prefix match)
 *       - in: query
 *         name: lt9
 *         schema: { type: string }
 *         description: Filter by lt9 Type of Works (prefix match)
 *     responses:
 *       200:
 *         description: Paginated work record list
 */
router.get('/',
  authenticate,
  canList,
  validate({ query: ListQuerySchema }),
  ctrl.adminList,
);

/**
 * @openapi
 * /admin/work-records/{id}:
 *   get:
 *     tags: [Admin - Work Records]
 *     summary: Get work record by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Work record details with image URLs
 *       404:
 *         description: Not found
 */
router.get('/:id',
  authenticate,
  canList,
  validate({ params: IdParamSchema }),
  ctrl.adminGetById,
);

/**
 * @openapi
 * /admin/work-records/{id}:
 *   put:
 *     tags: [Admin - Work Records]
 *     summary: Update work record
 *     description: Updates an existing work record. All fields are optional. Includes status changes.
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
 *               lt1: { type: string }
 *               lt3: { type: string }
 *               lt4: { type: string }
 *               lt5: { type: string }
 *               lt6: { type: string }
 *               lt7: { type: string }
 *               lt8: { type: string }
 *               lt9: { type: string }
 *               lt10: { type: string }
 *               lt11: { type: string }
 *               lt12: { type: string }
 *               status: { type: string }
 *               image: { type: string }
 *     responses:
 *       200:
 *         description: Work record updated
 *       404:
 *         description: Not found
 */
router.put('/:id',
  authenticate,
  canEdit,
  validate({ params: IdParamSchema, body: UpdateSchema }),
  ctrl.adminUpdate,
);

/**
 * @openapi
 * /admin/work-records/{id}:
 *   delete:
 *     tags: [Admin - Work Records]
 *     summary: Delete work record
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
