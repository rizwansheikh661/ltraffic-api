'use strict';

const { Router } = require('express');
const ctrl = require('./wj.controller');
const { authenticate } = require('../../middlewares/auth.middleware');
const { authorize } = require('../../middlewares/rbac.middleware');
const { validate } = require('../../middlewares/validate.middleware');
const { LEVELS } = require('../../constants/roles');
const {
  EmployeeListQuerySchema,
  IdParamSchema,
  DocListQuerySchema,
} = require('./wj.validators');

const router = Router();

const { ADMIN, ADMIN1, ADMIN2, CIVILS_TRAILER_DRIVER, ESSEX_SUPERVISOR, CUSTOMER } = LEVELS;

const canAccess = authorize(ADMIN, ADMIN1, ADMIN2, CIVILS_TRAILER_DRIVER, ESSEX_SUPERVISOR);
const canViewDocs = authorize(ADMIN, ADMIN1, ADMIN2, CIVILS_TRAILER_DRIVER, CUSTOMER, ESSEX_SUPERVISOR);

/**
 * @openapi
 * /employee/wildanet-jobs:
 *   get:
 *     tags: [Wildanet Jobs]
 *     summary: List active Wildanet jobs
 *     description: Returns paginated list of active Wildanet jobs (excludes Completed, Cancelled, Closed, Invoiced, Awaiting Invoicing). Searchable by solonumber and assignedto (prefix match). Sorted by startdate DESC.
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
 *         description: Search by solonumber (prefix match)
 *       - in: query
 *         name: assignedto
 *         schema: { type: string }
 *         description: Filter by assignedto (prefix match)
 *     responses:
 *       200:
 *         description: Paginated active job list
 */
router.get('/',
  authenticate,
  canAccess,
  validate({ query: EmployeeListQuerySchema }),
  ctrl.employeeList,
);

/**
 * @openapi
 * /employee/wildanet-jobs/{id}:
 *   get:
 *     tags: [Wildanet Jobs]
 *     summary: Get Wildanet job by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Job details with image URLs
 *       404:
 *         description: Not found
 */
router.get('/:id',
  authenticate,
  canAccess,
  validate({ params: IdParamSchema }),
  ctrl.employeeGetById,
);

/**
 * @openapi
 * /employee/wildanet-jobs/{id}/documents:
 *   get:
 *     tags: [Wildanet Jobs]
 *     summary: List documents for a Wildanet job
 *     description: Returns paginated list of uploaded documents for a job.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
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
 *         description: Paginated document list
 *       404:
 *         description: Job not found
 */
router.get('/:id/documents',
  authenticate,
  canViewDocs,
  validate({ params: IdParamSchema, query: DocListQuerySchema }),
  ctrl.employeeGetDocuments,
);

module.exports = router;
