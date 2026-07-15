'use strict';

const { Router } = require('express');
const ctrl = require('./documents.controller');
const { authenticate } = require('../../middlewares/auth.middleware');
const { authorize } = require('../../middlewares/rbac.middleware');
const { validate } = require('../../middlewares/validate.middleware');
const { LEVELS } = require('../../constants/roles');
const {
  TypeParamSchema,
  TypeIdParamSchema,
  ListQuerySchema,
  CreateSchema,
  UpdateSchema,
} = require('./documents.validators');

const router = Router();
const canView = authorize(LEVELS.ADMIN, LEVELS.ADMIN1);
const canWrite = authorize(LEVELS.ADMIN, LEVELS.ADMIN1);
const canDelete = authorize(LEVELS.ADMIN);

/**
 * @openapi
 * /admin/documents/{type}:
 *   get:
 *     tags: [Admin - Documents]
 *     summary: List documents by type
 *     description: Returns paginated document list. Types are policies, method-statements, processes, coshh.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [policies, method-statements, processes, coshh]
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 40 }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Search by reference or title (prefix match)
 *     responses:
 *       200:
 *         description: Paginated document list
 */
router.get('/:type',
  authenticate,
  canView,
  validate({ params: TypeParamSchema, query: ListQuerySchema }),
  ctrl.list,
);

/**
 * @openapi
 * /admin/documents/{type}/{id}:
 *   get:
 *     tags: [Admin - Documents]
 *     summary: Get document by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [policies, method-statements, processes, coshh]
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Document detail
 *       404:
 *         description: Not found
 */
router.get('/:type/:id',
  authenticate,
  canView,
  validate({ params: TypeIdParamSchema }),
  ctrl.getById,
);

/**
 * @openapi
 * /admin/documents/{type}:
 *   post:
 *     tags: [Admin - Documents]
 *     summary: Create document
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [policies, method-statements, processes, coshh]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [reference, title, version]
 *             properties:
 *               reference: { type: string, description: Document reference (used as PDF filename) }
 *               title: { type: string, description: Document title/link text }
 *               version: { type: string, description: Document issue/version }
 *     responses:
 *       201:
 *         description: Document created
 */
router.post('/:type',
  authenticate,
  canWrite,
  validate({ params: TypeParamSchema, body: CreateSchema }),
  ctrl.adminCreate,
);

/**
 * @openapi
 * /admin/documents/{type}/{id}:
 *   put:
 *     tags: [Admin - Documents]
 *     summary: Update document
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [policies, method-statements, processes, coshh]
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
 *               reference: { type: string }
 *               title: { type: string }
 *               version: { type: string }
 *     responses:
 *       200:
 *         description: Document updated
 *       404:
 *         description: Not found
 */
router.put('/:type/:id',
  authenticate,
  canWrite,
  validate({ params: TypeIdParamSchema, body: UpdateSchema }),
  ctrl.adminUpdate,
);

/**
 * @openapi
 * /admin/documents/{type}/{id}:
 *   delete:
 *     tags: [Admin - Documents]
 *     summary: Delete document
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [policies, method-statements, processes, coshh]
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
router.delete('/:type/:id',
  authenticate,
  canDelete,
  validate({ params: TypeIdParamSchema }),
  ctrl.adminDelete,
);

module.exports = router;
