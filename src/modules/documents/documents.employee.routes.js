'use strict';

const { Router } = require('express');
const ctrl = require('./documents.controller');
const { authenticate } = require('../../middlewares/auth.middleware');
const { validate } = require('../../middlewares/validate.middleware');
const {
  TypeParamSchema,
  TypeIdParamSchema,
  ListQuerySchema,
} = require('./documents.validators');

const router = Router();

/**
 * @openapi
 * /employee/documents/{type}:
 *   get:
 *     tags: [Documents]
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
  validate({ params: TypeParamSchema, query: ListQuerySchema }),
  ctrl.list,
);

/**
 * @openapi
 * /employee/documents/{type}/{id}:
 *   get:
 *     tags: [Documents]
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
  validate({ params: TypeIdParamSchema }),
  ctrl.getById,
);

module.exports = router;
