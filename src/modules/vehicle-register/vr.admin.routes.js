'use strict';

const { Router } = require('express');
const ctrl = require('./vr.controller');
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
} = require('./vr.validators');

const router = Router();
const canViewList = authorize(LEVELS.ADMIN, LEVELS.ADMIN1, LEVELS.ESSEX_SUPERVISOR, LEVELS.ADMIN2);
const canViewDetail = authorize(LEVELS.ADMIN, LEVELS.ADMIN1, LEVELS.ADMIN2);
const canEdit = authorize(LEVELS.ADMIN, LEVELS.ADMIN1);
const canAdd = authorize(LEVELS.ADMIN, LEVELS.ADMIN1, LEVELS.ADMIN2);
const canDelete = authorize(LEVELS.ADMIN);

const upload = uploadFor('vrfiles', {
  allowedMime: [
    'image/jpeg', 'image/png', 'image/gif', 'image/bmp', 'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
  ],
});

/**
 * @openapi
 * /admin/vehicle-register:
 *   get:
 *     tags: [Admin - Vehicle Register]
 *     summary: List active vehicles
 *     description: Returns paginated list of active vehicles (cond=Yes). Searchable by registration number or allocated-to (prefix match). Sorted by reg ASC.
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
 *         description: Search by registration or allocated-to (prefix match)
 *     responses:
 *       200:
 *         description: Paginated active vehicle list
 */
router.get('/',
  authenticate,
  canViewList,
  validate({ query: ListQuerySchema }),
  ctrl.list,
);

/**
 * @openapi
 * /admin/vehicle-register/archived:
 *   get:
 *     tags: [Admin - Vehicle Register]
 *     summary: List archived vehicles
 *     description: Returns paginated list of archived/completed vehicles (cond=No). Searchable by registration number or allocated-to (prefix match). Sorted by reg ASC.
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
 *         description: Search by registration or allocated-to (prefix match)
 *     responses:
 *       200:
 *         description: Paginated archived vehicle list
 */
router.get('/archived',
  authenticate,
  canViewDetail,
  validate({ query: ListQuerySchema }),
  ctrl.listArchived,
);

/**
 * @openapi
 * /admin/vehicle-register/{id}:
 *   get:
 *     tags: [Admin - Vehicle Register]
 *     summary: Get vehicle register entry by ID
 *     description: Returns full vehicle register entry details.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Vehicle register entry details
 *       404:
 *         description: Not found
 */
router.get('/:id',
  authenticate,
  canViewDetail,
  validate({ params: IdParamSchema }),
  ctrl.getById,
);

/**
 * @openapi
 * /admin/vehicle-register:
 *   post:
 *     tags: [Admin - Vehicle Register]
 *     summary: Create vehicle register entry
 *     description: Adds a new vehicle to the register.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [reg, allocatedto, cond]
 *             properties:
 *               reg:
 *                 type: string
 *                 description: Vehicle registration number
 *               description:
 *                 type: string
 *               allocatedto:
 *                 type: string
 *                 description: Person vehicle is allocated to
 *               date:
 *                 type: string
 *                 description: Allocation date
 *               cond:
 *                 type: string
 *                 enum: [Yes, No]
 *                 description: Active status (Yes=active, No=archived)
 *               mexpiry:
 *                 type: string
 *                 description: MOT expiry date
 *               texpiry:
 *                 type: string
 *                 description: Vehicle tax expiry date
 *               sexpiry:
 *                 type: string
 *                 description: Service expiry date
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Vehicle entry created
 */
router.post('/',
  authenticate,
  canAdd,
  validate({ body: CreateSchema }),
  ctrl.create,
);

/**
 * @openapi
 * /admin/vehicle-register/{id}:
 *   put:
 *     tags: [Admin - Vehicle Register]
 *     summary: Update vehicle register entry
 *     description: Updates an existing vehicle register entry. All fields are optional — only provided fields are updated.
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
 *               reg:
 *                 type: string
 *               description:
 *                 type: string
 *               allocatedto:
 *                 type: string
 *               date:
 *                 type: string
 *               cond:
 *                 type: string
 *                 enum: [Yes, No]
 *               mexpiry:
 *                 type: string
 *               texpiry:
 *                 type: string
 *               sexpiry:
 *                 type: string
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Vehicle entry updated
 *       404:
 *         description: Not found
 */
router.put('/:id',
  authenticate,
  canEdit,
  validate({ params: IdParamSchema, body: UpdateSchema }),
  ctrl.update,
);

/**
 * @openapi
 * /admin/vehicle-register/{id}:
 *   delete:
 *     tags: [Admin - Vehicle Register]
 *     summary: Delete vehicle register entry
 *     description: Permanently deletes a vehicle register entry.
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
  ctrl.remove,
);

/**
 * @openapi
 * /admin/vehicle-register/{id}/documents:
 *   get:
 *     tags: [Admin - Vehicle Register]
 *     summary: List documents for a vehicle register entry
 *     description: Returns paginated list of uploaded documents for a specific vehicle register entry. Searchable by submittedby or arrival_datetime (prefix match).
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
 *         description: Search by submittedby or upload datetime (prefix match)
 *     responses:
 *       200:
 *         description: Paginated document list
 *       404:
 *         description: Vehicle register entry not found
 */
router.get('/:id/documents',
  authenticate,
  canViewDetail,
  validate({ params: IdParamSchema, query: DocListQuerySchema }),
  ctrl.listDocuments,
);

/**
 * @openapi
 * /admin/vehicle-register/{id}/documents:
 *   post:
 *     tags: [Admin - Vehicle Register]
 *     summary: Upload a document for a vehicle register entry
 *     description: |
 *       Uploads a document (image, PDF, or office file) associated with a vehicle register entry.
 *       Send as multipart/form-data with field name "file" for the uploaded file.
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
 *                 enum: [Condition Image, Service / Calibration Expiry, Other]
 *               docdesc:
 *                 type: string
 *                 description: Document description
 *     responses:
 *       201:
 *         description: Document uploaded
 *       404:
 *         description: Vehicle register entry not found
 *       415:
 *         description: Unsupported file type
 */
router.post('/:id/documents',
  authenticate,
  canViewDetail,
  validate({ params: IdParamSchema }),
  upload.single('file'),
  validate({ body: UploadDocSchema }),
  ctrl.uploadDocument,
);

/**
 * @openapi
 * /admin/vehicle-register/{id}/documents/{docId}:
 *   delete:
 *     tags: [Admin - Vehicle Register]
 *     summary: Delete a document
 *     description: Permanently deletes an uploaded document from the vehicle register entry.
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
  ctrl.removeDocument,
);

module.exports = router;
