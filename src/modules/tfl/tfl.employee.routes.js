'use strict';

const { Router } = require('express');
const ctrl = require('./tfl.controller');
const { authenticate } = require('../../middlewares/auth.middleware');
const { authorize } = require('../../middlewares/rbac.middleware');
const { validate } = require('../../middlewares/validate.middleware');
const { LEVELS } = require('../../constants/roles');
const {
  EmployeeListQuerySchema,
  IdParamSchema,
  DocListQuerySchema,
  MaterialListQuerySchema,
} = require('./tfl.validators');

const router = Router();

const { ADMIN, ADMIN1, CIVILS_TFL_DRIVER } = LEVELS;

const canAccess = authorize(ADMIN, ADMIN1, CIVILS_TFL_DRIVER);

/* ──────────────────────────────────────────────────────────────
 *  Reusable schemas — TFL module
 * ────────────────────────────────────────────────────────────── */

/**
 * @openapi
 * components:
 *   schemas:
 *     TflJob:
 *       type: object
 *       description: TFL job register entry from the `tfl` table.
 *       properties:
 *         id:
 *           type: integer
 *           description: Primary key.
 *           example: 4
 *         jobstatus:
 *           type: string
 *           description: Job status.
 *           example: 'In Progress'
 *         assignedto:
 *           type: string
 *           nullable: true
 *           description: Assigned team/person.
 *           example: 'Civils Team 1'
 *         customer:
 *           type: string
 *           nullable: true
 *           description: Customer name.
 *           example: 'Telent'
 *         jobnumber:
 *           type: string
 *           nullable: true
 *           description: Job number.
 *           example: '00701'
 *         sitereference:
 *           type: string
 *           nullable: true
 *           description: Site reference code.
 *           example: '28/038'
 *         location:
 *           type: string
 *           nullable: true
 *           description: Job location.
 *           example: 'HILLSIDE - CRAVEN PARK'
 *         postcode:
 *           type: string
 *           nullable: true
 *           description: Postcode.
 *           example: 'NW10 8QN'
 *         area:
 *           type: string
 *           nullable: true
 *           description: London borough area.
 *           example: '28 - Brent'
 *         workstream:
 *           type: string
 *           nullable: true
 *           description: Workstream type.
 *           example: 'Civils & Installation'
 *         permitstatus:
 *           type: string
 *           nullable: true
 *           description: Permit status.
 *           example: 'Granted'
 *         startdate:
 *           type: string
 *           nullable: true
 *           description: Start date.
 *           example: '2025-06-01'
 *         enddate:
 *           type: string
 *           nullable: true
 *           description: End date.
 *           example: '2025-07-31'
 *         notes:
 *           type: string
 *           nullable: true
 *           description: Additional notes.
 *           example: 'Works in progress'
 *     TflDocument:
 *       type: object
 *       description: Document attached to a TFL job (from `upload_tfl` table).
 *       properties:
 *         id:
 *           type: integer
 *           description: Document primary key.
 *           example: 3
 *         arrival_datetime:
 *           type: string
 *           nullable: true
 *           description: Upload timestamp.
 *           example: '2025-06-15 10:00:00'
 *         file_name:
 *           type: string
 *           nullable: true
 *           description: Stored filename (relative path).
 *           example: 'tfl/697965tflped05.pdf'
 *         file_url:
 *           type: string
 *           nullable: true
 *           description: Full URL to the document file.
 *           example: 'http://192.168.1.100/tfl/697965tflped05.pdf'
 *         submittedby:
 *           type: string
 *           nullable: true
 *           description: Name of user who uploaded.
 *           example: 'Administrator'
 *         doctype:
 *           type: string
 *           nullable: true
 *           description: Document type.
 *           example: 'Permit Details'
 *         docdesc:
 *           type: string
 *           nullable: true
 *           description: Document description.
 *           example: 'Approved Permit Details'
 *     TflMaterial:
 *       type: object
 *       description: TFL material inventory entry from the `tflmaterial` table.
 *       properties:
 *         id:
 *           type: integer
 *           description: Primary key.
 *           example: 1
 *         item:
 *           type: string
 *           description: Material item name.
 *           example: 'Cable Duct 100mm'
 *         unitsremaining:
 *           type: string
 *           description: Units remaining.
 *           example: '50'
 *         location:
 *           type: string
 *           description: Storage location.
 *           example: 'Yard A'
 *         status:
 *           type: string
 *           description: Stock status.
 *           example: 'In Stock'
 */

/* ──────────────────────────────────────────────────────────────
 *  GET /employee/tfl/materials  (before /:id to avoid capture)
 * ────────────────────────────────────────────────────────────── */

/**
 * @openapi
 * /employee/tfl/materials:
 *   get:
 *     operationId: employeeListTflMaterials
 *     tags: [TFL]
 *     summary: List TFL materials
 *     description: |
 *       Returns paginated list of TFL materials. Filterable by status (prefix match).
 *
 *       **Allowed roles:** Admin (1), Admin1 (4), Civils TFL Driver (5)
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
 *         description: Filter by status (prefix match)
 *     responses:
 *       200:
 *         description: Paginated material list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/TflMaterial' }
 *                 meta: { $ref: '#/components/schemas/PaginationMeta' }
 *       401:
 *         $ref: '#/components/responses/Unauthorized401'
 *       403:
 *         $ref: '#/components/responses/Forbidden403'
 */
router.get('/materials',
  authenticate,
  canAccess,
  validate({ query: MaterialListQuerySchema }),
  ctrl.employeeListMaterials,
);

/* ──────────────────────────────────────────────────────────────
 *  GET /employee/tfl
 * ────────────────────────────────────────────────────────────── */

/**
 * @openapi
 * /employee/tfl:
 *   get:
 *     operationId: employeeListTfl
 *     tags: [TFL]
 *     summary: List active TFL jobs
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Returns paginated list of active TFL jobs. Excludes Pending, Delayed, Completed, Cancelled, Awaiting Invoicing, Invoiced, Closed. Searchable by jobnumber and assignedto (prefix match). Sorted by startdate DESC.
 *
 *       **Allowed roles:** Admin (1), Admin1 (4), Civils TFL Driver (5)
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
 *         description: Search by jobnumber (prefix match)
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
 *                   items: { $ref: '#/components/schemas/TflJob' }
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
 *  GET /employee/tfl/:id
 * ────────────────────────────────────────────────────────────── */

/**
 * @openapi
 * /employee/tfl/{id}:
 *   get:
 *     operationId: employeeGetTfl
 *     tags: [TFL]
 *     summary: Get TFL job by ID
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
 *  GET /employee/tfl/:id/documents
 * ────────────────────────────────────────────────────────────── */

/**
 * @openapi
 * /employee/tfl/{id}/documents:
 *   get:
 *     operationId: employeeListTflDocuments
 *     tags: [TFL]
 *     summary: List documents for a TFL job
 *     description: Returns paginated list of uploaded documents for a TFL job.
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
  canAccess,
  validate({ params: IdParamSchema, query: DocListQuerySchema }),
  ctrl.employeeGetDocuments,
);

module.exports = router;
