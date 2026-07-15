'use strict';

const { Router } = require('express');
const ctrl = require('./tfl.controller');
const { authenticate } = require('../../middlewares/auth.middleware');
const { authorize } = require('../../middlewares/rbac.middleware');
const { validate } = require('../../middlewares/validate.middleware');
const { uploadFor } = require('../../middlewares/upload.middleware');
const { LEVELS } = require('../../constants/roles');
const {
  ListQuerySchema,
  IdParamSchema,
  DocIdParamSchema,
  DocListQuerySchema,
  CreateSchema,
  UpdateSchema,
  UploadDocSchema,
  MaterialListQuerySchema,
  MaterialIdParamSchema,
  MaterialCreateSchema,
  MaterialUpdateSchema,
} = require('./tfl.validators');

const router = Router();

const { ADMIN, ADMIN1, ADMIN2, DRIVING_OPERATIVE, OPERATIVE, CIVILS_TFL_DRIVER, CIVILS_TRAILER_DRIVER, ESSEX_SUPERVISOR } = LEVELS;

const canList = authorize(ADMIN, ADMIN1);
const canView = authorize(ADMIN, ADMIN1, CIVILS_TFL_DRIVER);
const canEdit = authorize(ADMIN, ADMIN1);
const canCreate = authorize(ADMIN, ADMIN1);
const canDelete = authorize(ADMIN, ADMIN1);
const canDeleteDoc = authorize(ADMIN);
const canViewDocs = authorize(ADMIN, ADMIN1, CIVILS_TFL_DRIVER);
const canUploadDoc = authorize(ADMIN, ADMIN1);
const canListMaterials = authorize(ADMIN, ADMIN1, CIVILS_TFL_DRIVER);
const canCreateMaterial = authorize(ADMIN, DRIVING_OPERATIVE, OPERATIVE, ADMIN1, CIVILS_TFL_DRIVER, CIVILS_TRAILER_DRIVER, ADMIN2, ESSEX_SUPERVISOR);
const canEditMaterial = authorize(ADMIN, ADMIN1, CIVILS_TFL_DRIVER);
const canDeleteMaterial = authorize(ADMIN);

const ALLOWED_MIME = [
  'image/jpeg', 'image/png', 'image/gif', 'image/bmp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/zip',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

const uploadDoc = uploadFor('tfl', { allowedMime: ALLOWED_MIME });

/* ══════════════════════════════════════════════════════════════
 *  MATERIALS (registered before /:id to avoid param capture)
 * ══════════════════════════════════════════════════════════════ */

/* ──────────────────────────────────────────────────────────────
 *  GET /admin/tfl/materials
 * ────────────────────────────────────────────────────────────── */

/**
 * @openapi
 * /admin/tfl/materials:
 *   get:
 *     operationId: adminListTflMaterials
 *     tags: [Admin - TFL]
 *     summary: List TFL materials
 *     description: Returns paginated list of TFL materials. Filterable by status (prefix match).
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
 */
router.get('/materials',
  authenticate,
  canListMaterials,
  validate({ query: MaterialListQuerySchema }),
  ctrl.adminListMaterials,
);

/* ──────────────────────────────────────────────────────────────
 *  POST /admin/tfl/materials
 * ────────────────────────────────────────────────────────────── */

/**
 * @openapi
 * /admin/tfl/materials:
 *   post:
 *     operationId: adminCreateTflMaterial
 *     tags: [Admin - TFL]
 *     summary: Create TFL material
 *     description: Creates a new TFL material entry.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [item, unitsremaining, location, status]
 *             properties:
 *               item: { type: string }
 *               unitsremaining: { type: string }
 *               location: { type: string }
 *               status: { type: string, enum: ['In Stock', 'Low Stock', 'Out of Stock', 'On Order'] }
 *     responses:
 *       201:
 *         description: Material created
 */
router.post('/materials',
  authenticate,
  canCreateMaterial,
  validate({ body: MaterialCreateSchema }),
  ctrl.adminCreateMaterial,
);

/* ──────────────────────────────────────────────────────────────
 *  PUT /admin/tfl/materials/:id
 * ────────────────────────────────────────────────────────────── */

/**
 * @openapi
 * /admin/tfl/materials/{id}:
 *   put:
 *     operationId: adminUpdateTflMaterial
 *     tags: [Admin - TFL]
 *     summary: Update TFL material
 *     description: Updates an existing TFL material. All fields are optional.
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
 *               item: { type: string }
 *               unitsremaining: { type: string }
 *               location: { type: string }
 *               status: { type: string, enum: ['In Stock', 'Low Stock', 'Out of Stock', 'On Order'] }
 *     responses:
 *       200:
 *         description: Material updated
 *       404:
 *         description: Not found
 */
router.put('/materials/:id',
  authenticate,
  canEditMaterial,
  validate({ params: MaterialIdParamSchema, body: MaterialUpdateSchema }),
  ctrl.adminUpdateMaterial,
);

/* ──────────────────────────────────────────────────────────────
 *  DELETE /admin/tfl/materials/:id
 * ────────────────────────────────────────────────────────────── */

/**
 * @openapi
 * /admin/tfl/materials/{id}:
 *   delete:
 *     operationId: adminDeleteTflMaterial
 *     tags: [Admin - TFL]
 *     summary: Delete TFL material
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
router.delete('/materials/:id',
  authenticate,
  canDeleteMaterial,
  validate({ params: MaterialIdParamSchema }),
  ctrl.adminDeleteMaterial,
);

/* ══════════════════════════════════════════════════════════════
 *  JOBS
 * ══════════════════════════════════════════════════════════════ */

/* ──────────────────────────────────────────────────────────────
 *  GET /admin/tfl
 * ────────────────────────────────────────────────────────────── */

/**
 * @openapi
 * /admin/tfl:
 *   get:
 *     operationId: adminListTfl
 *     tags: [Admin - TFL]
 *     summary: List all TFL jobs
 *     description: Returns paginated list of all TFL jobs regardless of status. Searchable by jobnumber, assignedto, jobstatus, and permitstatus (prefix match). Sorted by startdate DESC.
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
 *         description: Search by jobnumber (prefix match)
 *       - in: query
 *         name: assignedto
 *         schema: { type: string }
 *         description: Filter by assignedto (prefix match)
 *       - in: query
 *         name: jobstatus
 *         schema: { type: string }
 *         description: Filter by jobstatus (prefix match)
 *       - in: query
 *         name: permitstatus
 *         schema: { type: string }
 *         description: Filter by permitstatus (prefix match)
 *     responses:
 *       200:
 *         description: Paginated job list
 */
router.get('/',
  authenticate,
  canList,
  validate({ query: ListQuerySchema }),
  ctrl.adminList,
);

/* ──────────────────────────────────────────────────────────────
 *  POST /admin/tfl
 * ────────────────────────────────────────────────────────────── */

/**
 * @openapi
 * /admin/tfl:
 *   post:
 *     operationId: adminCreateTfl
 *     tags: [Admin - TFL]
 *     summary: Create TFL job
 *     description: Creates a new TFL job.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [jobstatus, assignedto, customer, jobnumber, sitereference, location, postcode, area, workstream, permitstatus]
 *             properties:
 *               jobstatus: { type: string }
 *               assignedto: { type: string }
 *               customer: { type: string }
 *               jobnumber: { type: string }
 *               sitereference: { type: string }
 *               location: { type: string }
 *               postcode: { type: string }
 *               area: { type: string }
 *               workstream: { type: string }
 *               permitstatus: { type: string }
 *               startdate: { type: string }
 *               enddate: { type: string }
 *               notes: { type: string }
 *     responses:
 *       201:
 *         description: Job created
 */
router.post('/',
  authenticate,
  canCreate,
  validate({ body: CreateSchema }),
  ctrl.adminCreate,
);

/* ──────────────────────────────────────────────────────────────
 *  GET /admin/tfl/:id
 * ────────────────────────────────────────────────────────────── */

/**
 * @openapi
 * /admin/tfl/{id}:
 *   get:
 *     operationId: adminGetTfl
 *     tags: [Admin - TFL]
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
  canView,
  validate({ params: IdParamSchema }),
  ctrl.adminGetById,
);

/* ──────────────────────────────────────────────────────────────
 *  PUT /admin/tfl/:id
 * ────────────────────────────────────────────────────────────── */

/**
 * @openapi
 * /admin/tfl/{id}:
 *   put:
 *     operationId: adminUpdateTfl
 *     tags: [Admin - TFL]
 *     summary: Update TFL job
 *     description: Updates an existing TFL job. All fields are optional.
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
 *               jobstatus: { type: string }
 *               assignedto: { type: string }
 *               customer: { type: string }
 *               jobnumber: { type: string }
 *               sitereference: { type: string }
 *               location: { type: string }
 *               postcode: { type: string }
 *               area: { type: string }
 *               workstream: { type: string }
 *               permitstatus: { type: string }
 *               startdate: { type: string }
 *               enddate: { type: string }
 *               notes: { type: string }
 *     responses:
 *       200:
 *         description: Job updated
 *       404:
 *         description: Not found
 */
router.put('/:id',
  authenticate,
  canEdit,
  validate({ params: IdParamSchema, body: UpdateSchema }),
  ctrl.adminUpdate,
);

/* ──────────────────────────────────────────────────────────────
 *  DELETE /admin/tfl/:id
 * ────────────────────────────────────────────────────────────── */

/**
 * @openapi
 * /admin/tfl/{id}:
 *   delete:
 *     operationId: adminDeleteTfl
 *     tags: [Admin - TFL]
 *     summary: Delete TFL job
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

/* ──────────────────────────────────────────────────────────────
 *  GET /admin/tfl/:id/documents
 * ────────────────────────────────────────────────────────────── */

/**
 * @openapi
 * /admin/tfl/{id}/documents:
 *   get:
 *     operationId: adminListTflDocuments
 *     tags: [Admin - TFL]
 *     summary: List documents for a TFL job
 *     description: Returns paginated list of uploaded documents for a job. Searchable by submittedby or arrival_datetime (prefix match).
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
  ctrl.adminGetDocuments,
);

/* ──────────────────────────────────────────────────────────────
 *  POST /admin/tfl/:id/documents
 * ────────────────────────────────────────────────────────────── */

/**
 * @openapi
 * /admin/tfl/{id}/documents:
 *   post:
 *     operationId: adminUploadTflDocument
 *     tags: [Admin - TFL]
 *     summary: Upload document for a TFL job
 *     description: Uploads a document associated with a TFL job. Send as multipart/form-data.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file, doctype, docdesc]
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               doctype:
 *                 type: string
 *               docdesc:
 *                 type: string
 *     responses:
 *       201:
 *         description: Document uploaded
 *       404:
 *         description: Job not found
 */
router.post('/:id/documents',
  authenticate,
  canUploadDoc,
  validate({ params: IdParamSchema }),
  uploadDoc.single('file'),
  validate({ body: UploadDocSchema }),
  ctrl.adminUploadDocument,
);

/* ──────────────────────────────────────────────────────────────
 *  DELETE /admin/tfl/:id/documents/:docId
 * ────────────────────────────────────────────────────────────── */

/**
 * @openapi
 * /admin/tfl/{id}/documents/{docId}:
 *   delete:
 *     operationId: adminDeleteTflDocument
 *     tags: [Admin - TFL]
 *     summary: Delete a TFL document
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *       - in: path
 *         name: docId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       204:
 *         description: Document deleted
 *       404:
 *         description: Not found
 */
router.delete('/:id/documents/:docId',
  authenticate,
  canDeleteDoc,
  validate({ params: DocIdParamSchema }),
  ctrl.adminDeleteDocument,
);

module.exports = router;
