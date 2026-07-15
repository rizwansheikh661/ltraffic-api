'use strict';

const { Router } = require('express');
const ctrl = require('./civ.controller');
const { authenticate } = require('../../middlewares/auth.middleware');
const { authorize } = require('../../middlewares/rbac.middleware');
const { validate } = require('../../middlewares/validate.middleware');
const { LEVELS } = require('../../constants/roles');
const {
  EmployeeListQuerySchema,
  IdParamSchema,
  DocListQuerySchema,
} = require('./civ.validators');

const router = Router();

const { ADMIN, ADMIN1, ADMIN2, CIVILS_TRAILER_DRIVER, ESSEX_SUPERVISOR, CUSTOMER } = LEVELS;

const canAccess = authorize(ADMIN, ADMIN1, ADMIN2, CIVILS_TRAILER_DRIVER, ESSEX_SUPERVISOR, CUSTOMER);
const canViewDocs = authorize(ADMIN, ADMIN1, ADMIN2, CIVILS_TRAILER_DRIVER, CUSTOMER, ESSEX_SUPERVISOR);

/* ──────────────────────────────────────────────────────────────
 *  Reusable schemas — civils module
 * ────────────────────────────────────────────────────────────── */

/**
 * @openapi
 * components:
 *   schemas:
 *     CivilsJob:
 *       type: object
 *       description: Civils job register entry from the `civils` table.
 *       properties:
 *         id:
 *           type: integer
 *           description: Primary key.
 *           example: 1
 *         jobstatus:
 *           type: string
 *           description: 'Job status.'
 *           example: 'Live'
 *         assignedto:
 *           type: string
 *           nullable: true
 *           description: 'Assigned team/person.'
 *           example: 'Gang A'
 *         client:
 *           type: string
 *           nullable: true
 *           description: 'Client name.'
 *           example: 'Cornwall Council'
 *         authority:
 *           type: string
 *           nullable: true
 *           description: 'Authority name.'
 *           example: 'Cornwall Council'
 *         community:
 *           type: string
 *           nullable: true
 *           description: 'Community area.'
 *           example: 'Bodmin'
 *         solonumber:
 *           type: string
 *           nullable: true
 *           description: 'SOLO reference number.'
 *           example: 'SO-12345'
 *         location:
 *           type: string
 *           nullable: true
 *           description: 'Job location.'
 *           example: 'A38 Bodmin'
 *         postcode:
 *           type: string
 *           nullable: true
 *           description: 'Postcode.'
 *           example: 'PL31 2AB'
 *         permitstatus:
 *           type: string
 *           nullable: true
 *           description: 'Permit status.'
 *           example: 'Granted'
 *         startdate:
 *           type: string
 *           nullable: true
 *           description: 'Start date.'
 *           example: '2025-06-01'
 *         enddate:
 *           type: string
 *           nullable: true
 *           description: 'End date.'
 *           example: '2025-07-31'
 *         notes:
 *           type: string
 *           nullable: true
 *           description: 'Additional notes.'
 *           example: 'Permit extended to end of July'
 *     CivilsDocument:
 *       type: object
 *       description: Document attached to a civils job (from `upload_data` table).
 *       properties:
 *         id:
 *           type: integer
 *           description: Document primary key.
 *           example: 42
 *         arrival_datetime:
 *           type: string
 *           nullable: true
 *           description: Upload timestamp.
 *           example: '2025-06-15 10:00:00'
 *         file_name:
 *           type: string
 *           nullable: true
 *           description: Stored filename (relative path).
 *           example: 'uploads/1_1718441234_photo.jpg'
 *         file_url:
 *           type: string
 *           nullable: true
 *           description: Full URL to the document file.
 *           example: 'http://192.168.1.100/uploads/1_1718441234_photo.jpg'
 *         submittedby:
 *           type: string
 *           nullable: true
 *           description: Name of user who uploaded.
 *           example: 'Administrator'
 *         doctype:
 *           type: string
 *           nullable: true
 *           description: Document type.
 *           example: 'Job Pack'
 *         docdesc:
 *           type: string
 *           nullable: true
 *           description: Document description.
 *           example: 'Site Job Pack'
 */

/* ──────────────────────────────────────────────────────────────
 *  GET /employee/civils
 * ────────────────────────────────────────────────────────────── */

/**
 * @openapi
 * /employee/civils:
 *   get:
 *     operationId: employeeListCivils
 *     tags: [Civils]
 *     summary: List active civils jobs
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Returns paginated list of active civils jobs. Excludes Completed, Cancelled, Closed, Invoiced, Awaiting Invoicing. Searchable by solonumber and assignedto (prefix match). Sorted by startdate DESC.
 *
 *       **Allowed roles:** Admin (1), Admin1 (4), Civils Trailer Driver (6), Admin2 (7), Essex Supervisor (8), Customer (9)
 *       **Blocked roles:** Driving Operative (2), Operative (3), Civils TFL Driver (5)
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/CivilsJob' }
 *                 meta: { $ref: '#/components/schemas/PaginationMeta' }
 *       401:
 *         $ref: '#/components/responses/Unauthorized401'
 *       403:
 *         $ref: '#/components/responses/Forbidden403'
 *       422:
 *         $ref: '#/components/responses/ValidationError422'
 */
router.get('/',
  authenticate,
  canAccess,
  validate({ query: EmployeeListQuerySchema }),
  ctrl.employeeList,
);

/* ──────────────────────────────────────────────────────────────
 *  GET /employee/civils/:id
 * ────────────────────────────────────────────────────────────── */

/**
 * @openapi
 * /employee/civils/{id}:
 *   get:
 *     operationId: employeeGetCivils
 *     tags: [Civils]
 *     summary: Get civils job by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Job details
 *       404:
 *         description: Not found
 */
router.get('/:id',
  authenticate,
  canAccess,
  validate({ params: IdParamSchema }),
  ctrl.employeeGetById,
);

/* ──────────────────────────────────────────────────────────────
 *  GET /employee/civils/:id/documents
 * ────────────────────────────────────────────────────────────── */

/**
 * @openapi
 * /employee/civils/{id}/documents:
 *   get:
 *     operationId: employeeListCivilsDocuments
 *     tags: [Civils]
 *     summary: List documents for a civils job
 *     description: Returns paginated list of uploaded documents for a civils job.
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
