'use strict';

const { Router } = require('express');
const ctrl = require('./incidents.controller');
const { authenticate } = require('../../middlewares/auth.middleware');
const { authorize } = require('../../middlewares/rbac.middleware');
const { validate } = require('../../middlewares/validate.middleware');
const { uploadFor } = require('../../middlewares/upload.middleware');
const { LEVELS } = require('../../constants/roles');
const {
  ListQuerySchema,
  AdminCreateSchema,
  AdminUpdateSchema,
  StatusUpdateSchema,
  IdParamSchema,
  DocIdParamSchema,
} = require('./incidents.validators');

const router = Router();
const canView = authorize(LEVELS.ADMIN, LEVELS.ADMIN1, LEVELS.ESSEX_SUPERVISOR);
const canEdit = authorize(LEVELS.ADMIN, LEVELS.ADMIN1);
const canDelete = authorize(LEVELS.ADMIN);
const upload = uploadFor('admin/hsupload', {
  allowedMime: ['image/jpeg', 'image/png', 'image/gif', 'image/bmp', 'image/webp', 'application/pdf'],
});

/**
 * @openapi
 * components:
 *   schemas:
 *     Incident:
 *       type: object
 *       properties:
 *         id: { type: integer }
 *         operativesname: { type: string }
 *         arrival_datetime: { type: string }
 *         type: { type: string }
 *         location: { type: string }
 *         reportedby: { type: string }
 *         report: { type: string }
 *         involved: { type: string, nullable: true }
 *         injury:
 *           type: object
 *           properties:
 *             anyoneinjured: { type: string }
 *             whowasinjured: { type: string, nullable: true }
 *             injuryreport: { type: string, nullable: true }
 *         reporting:
 *           type: object
 *           properties:
 *             reportit: { type: string, nullable: true }
 *             advise: { type: string, nullable: true }
 *             laterdate: { type: string, nullable: true }
 *             companydetails: { type: string, nullable: true }
 *         witnesses:
 *           type: object
 *           properties:
 *             witness: { type: string }
 *             witnessname: { type: string, nullable: true }
 *             witnessaddress: { type: string, nullable: true }
 *             witnesscontact: { type: string, nullable: true }
 *             otherwitness: { type: string, nullable: true }
 *         notes: { type: string, nullable: true }
 *         status: { type: string, enum: [Open, Closed] }
 *         image: { type: string, nullable: true, description: 'Comma-separated image paths (PHP compat)' }
 *         image_urls:
 *           type: array
 *           items: { type: string }
 *           description: Resolved URLs for all attached images
 *     IncidentSummary:
 *       type: object
 *       properties:
 *         id: { type: integer }
 *         operativesname: { type: string }
 *         arrival_datetime: { type: string }
 *         type: { type: string }
 *         location: { type: string }
 *         status: { type: string }
 *     IncidentDocument:
 *       type: object
 *       properties:
 *         id: { type: integer }
 *         submittedby: { type: string }
 *         arrival_datetime: { type: string }
 *         file_name: { type: string }
 *         file_url: { type: string, nullable: true }
 */

/**
 * @openapi
 * /admin/incidents:
 *   get:
 *     tags: [Admin - Incidents]
 *     summary: List incidents with filters
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
 *         description: Search by operative name
 *       - in: query
 *         name: searchDate
 *         schema: { type: string }
 *         description: Filter by date prefix
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [open, closed, all] }
 *     responses:
 *       200:
 *         description: Paginated incident list
 */
router.get('/',
  authenticate,
  canView,
  validate({ query: ListQuerySchema }),
  ctrl.adminList,
);

/**
 * @openapi
 * /admin/incidents/{id}:
 *   get:
 *     tags: [Admin - Incidents]
 *     summary: Get incident by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Full incident detail
 *       404:
 *         description: Not found
 */
router.get('/:id',
  authenticate,
  canView,
  validate({ params: IdParamSchema }),
  ctrl.adminGetById,
);

/**
 * @openapi
 * /admin/incidents:
 *   post:
 *     tags: [Admin - Incidents]
 *     summary: Create incident (admin)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [operativesname, arrival_datetime, type, location, reportedby, report]
 *             properties:
 *               operativesname: { type: string }
 *               arrival_datetime: { type: string }
 *               type: { type: string }
 *               location: { type: string }
 *               reportedby: { type: string }
 *               report: { type: string }
 *               notes: { type: string }
 *     responses:
 *       201:
 *         description: Incident created
 */
router.post('/',
  authenticate,
  canEdit,
  validate({ body: AdminCreateSchema }),
  ctrl.adminCreate,
);

/**
 * @openapi
 * /admin/incidents/{id}:
 *   put:
 *     tags: [Admin - Incidents]
 *     summary: Update incident
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
 *               operativesname: { type: string }
 *               type: { type: string }
 *               location: { type: string }
 *               status: { type: string, enum: [Open, Closed] }
 *               notes: { type: string }
 *               report: { type: string }
 *     responses:
 *       200:
 *         description: Incident updated
 *       404:
 *         description: Not found
 */
router.put('/:id',
  authenticate,
  canEdit,
  validate({ params: IdParamSchema, body: AdminUpdateSchema }),
  ctrl.adminUpdate,
);

/**
 * @openapi
 * /admin/incidents/{id}/status:
 *   post:
 *     tags: [Admin - Incidents]
 *     summary: Change incident status (Open/Closed)
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
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status: { type: string, enum: [Open, Closed] }
 *               notes: { type: string, description: Investigation notes }
 *     responses:
 *       200:
 *         description: Status updated
 *       404:
 *         description: Not found
 */
router.post('/:id/status',
  authenticate,
  canEdit,
  validate({ params: IdParamSchema, body: StatusUpdateSchema }),
  ctrl.adminUpdateStatus,
);

/**
 * @openapi
 * /admin/incidents/{id}:
 *   delete:
 *     tags: [Admin - Incidents]
 *     summary: Delete incident
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

// ── Documents ─────────────────────────────────────────────────

/**
 * @openapi
 * /admin/incidents/{id}/documents:
 *   get:
 *     tags: [Admin - Incidents]
 *     summary: List documents for an incident
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Document list
 */
router.get('/:id/documents',
  authenticate,
  canView,
  validate({ params: IdParamSchema }),
  ctrl.adminGetDocuments,
);

/**
 * @openapi
 * /admin/incidents/{id}/documents:
 *   post:
 *     tags: [Admin - Incidents]
 *     summary: Upload document for an incident
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
 *             required: [file]
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Document uploaded
 */
router.post('/:id/documents',
  authenticate,
  canEdit,
  validate({ params: IdParamSchema }),
  upload.single('file'),
  ctrl.adminUploadDocument,
);

/**
 * @openapi
 * /admin/incidents/{id}/documents/{docId}:
 *   delete:
 *     tags: [Admin - Incidents]
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
 *         description: Deleted
 */
router.delete('/:id/documents/:docId',
  authenticate,
  canDelete,
  validate({ params: DocIdParamSchema }),
  ctrl.adminDeleteDocument,
);

module.exports = router;
