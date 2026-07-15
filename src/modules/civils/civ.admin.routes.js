'use strict';

const { Router } = require('express');
const ctrl = require('./civ.controller');
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
} = require('./civ.validators');

const router = Router();

const { ADMIN, ADMIN1, ADMIN2, ESSEX_SUPERVISOR } = LEVELS;

const canList = authorize(ADMIN, ADMIN1, ADMIN2, ESSEX_SUPERVISOR);
const canView = authorize(ADMIN, ADMIN1, ADMIN2, LEVELS.CIVILS_TRAILER_DRIVER, ESSEX_SUPERVISOR);
const canEdit = authorize(ADMIN, ADMIN1, ADMIN2);
const canCreate = authorize(ADMIN, ADMIN1, ADMIN2);
const canDelete = authorize(ADMIN, ADMIN1, ADMIN2);
const canViewDocs = authorize(ADMIN, ADMIN1, ADMIN2, LEVELS.CIVILS_TRAILER_DRIVER, LEVELS.CUSTOMER, ESSEX_SUPERVISOR);
const canUploadDoc = authorize(ADMIN, ADMIN1, ADMIN2);

const ALLOWED_MIME = [
  'image/jpeg', 'image/png', 'image/gif', 'image/bmp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/zip',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

const uploadDoc = uploadFor('uploads', { allowedMime: ALLOWED_MIME });

/* ──────────────────────────────────────────────────────────────
 *  GET /admin/civils
 * ────────────────────────────────────────────────────────────── */

/**
 * @openapi
 * /admin/civils:
 *   get:
 *     operationId: adminListCivils
 *     tags: [Admin - Civils]
 *     summary: List all civils jobs
 *     description: Returns paginated list of all civils jobs regardless of status. Searchable by solonumber, assignedto, jobstatus, and permitstatus (prefix match). Sorted by startdate DESC.
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
 *  GET /admin/civils/:id
 * ────────────────────────────────────────────────────────────── */

/**
 * @openapi
 * /admin/civils/{id}:
 *   get:
 *     operationId: adminGetCivils
 *     tags: [Admin - Civils]
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
  canView,
  validate({ params: IdParamSchema }),
  ctrl.adminGetById,
);

/* ──────────────────────────────────────────────────────────────
 *  POST /admin/civils
 * ────────────────────────────────────────────────────────────── */

/**
 * @openapi
 * /admin/civils:
 *   post:
 *     operationId: adminCreateCivils
 *     tags: [Admin - Civils]
 *     summary: Create civils job
 *     description: Creates a new civils job.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [jobstatus, assignedto, client, authority, community, solonumber, location, postcode, permitstatus]
 *             properties:
 *               jobstatus: { type: string }
 *               assignedto: { type: string }
 *               client: { type: string }
 *               authority: { type: string }
 *               community: { type: string }
 *               solonumber: { type: string }
 *               location: { type: string }
 *               postcode: { type: string }
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
 *  PUT /admin/civils/:id
 * ────────────────────────────────────────────────────────────── */

/**
 * @openapi
 * /admin/civils/{id}:
 *   put:
 *     operationId: adminUpdateCivils
 *     tags: [Admin - Civils]
 *     summary: Update civils job
 *     description: Updates an existing civils job. All fields are optional.
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
 *               client: { type: string }
 *               authority: { type: string }
 *               community: { type: string }
 *               solonumber: { type: string }
 *               location: { type: string }
 *               postcode: { type: string }
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
 *  DELETE /admin/civils/:id
 * ────────────────────────────────────────────────────────────── */

/**
 * @openapi
 * /admin/civils/{id}:
 *   delete:
 *     operationId: adminDeleteCivils
 *     tags: [Admin - Civils]
 *     summary: Delete civils job
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
 *  GET /admin/civils/:id/documents
 * ────────────────────────────────────────────────────────────── */

/**
 * @openapi
 * /admin/civils/{id}/documents:
 *   get:
 *     operationId: adminListCivilsDocuments
 *     tags: [Admin - Civils]
 *     summary: List documents for a civils job
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
 *  POST /admin/civils/:id/documents
 * ────────────────────────────────────────────────────────────── */

/**
 * @openapi
 * /admin/civils/{id}/documents:
 *   post:
 *     operationId: adminUploadCivilsDocument
 *     tags: [Admin - Civils]
 *     summary: Upload document for a civils job
 *     description: Uploads a document associated with a civils job. Send as multipart/form-data.
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
 *  DELETE /admin/civils/:id/documents/:docId
 * ────────────────────────────────────────────────────────────── */

/**
 * @openapi
 * /admin/civils/{id}/documents/{docId}:
 *   delete:
 *     operationId: adminDeleteCivilsDocument
 *     tags: [Admin - Civils]
 *     summary: Delete a document
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
  canDelete,
  validate({ params: DocIdParamSchema }),
  ctrl.adminDeleteDocument,
);

module.exports = router;
