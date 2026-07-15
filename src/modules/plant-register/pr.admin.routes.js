'use strict';

const { Router } = require('express');
const ctrl = require('./pr.controller');
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
} = require('./pr.validators');

const router = Router();
const canView = authorize(LEVELS.ADMIN, LEVELS.ADMIN1);
const canDelete = authorize(LEVELS.ADMIN);

const upload = uploadFor('prfiles', {
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
 * /admin/plant-register:
 *   get:
 *     tags: [Admin - Plant Register]
 *     summary: List plant register entries
 *     description: Returns paginated plant register list. Searchable by item name or identification number (prefix match). Sorted by expiry ASC.
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
 *         description: Search by item name or ident (prefix match)
 *     responses:
 *       200:
 *         description: Paginated plant register list
 */
router.get('/',
  authenticate,
  canView,
  validate({ query: ListQuerySchema }),
  ctrl.list,
);

/**
 * @openapi
 * /admin/plant-register/{id}:
 *   get:
 *     tags: [Admin - Plant Register]
 *     summary: Get plant register entry by ID
 *     description: Returns full plant register entry details.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Plant register entry details
 *       404:
 *         description: Not found
 */
router.get('/:id',
  authenticate,
  canView,
  validate({ params: IdParamSchema }),
  ctrl.getById,
);

/**
 * @openapi
 * /admin/plant-register:
 *   post:
 *     tags: [Admin - Plant Register]
 *     summary: Create plant register entry
 *     description: Adds a new entry to the plant register.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [item, ident, allocatedto, date, cond]
 *             properties:
 *               item:
 *                 type: string
 *                 description: Plant item name
 *               description:
 *                 type: string
 *               ident:
 *                 type: string
 *                 description: Identification / serial number
 *               allocatedto:
 *                 type: string
 *                 description: Person plant is allocated to
 *               date:
 *                 type: string
 *                 description: Allocation date
 *               cond:
 *                 type: string
 *                 description: Condition
 *               expiry:
 *                 type: string
 *                 description: Service/calibration expiry date
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Plant entry created
 */
router.post('/',
  authenticate,
  canView,
  validate({ body: CreateSchema }),
  ctrl.create,
);

/**
 * @openapi
 * /admin/plant-register/{id}:
 *   put:
 *     tags: [Admin - Plant Register]
 *     summary: Update plant register entry
 *     description: Updates an existing plant register entry. All fields are optional — only provided fields are updated.
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
 *               item:
 *                 type: string
 *               description:
 *                 type: string
 *               ident:
 *                 type: string
 *               allocatedto:
 *                 type: string
 *               date:
 *                 type: string
 *               cond:
 *                 type: string
 *               expiry:
 *                 type: string
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Plant entry updated
 *       404:
 *         description: Not found
 */
router.put('/:id',
  authenticate,
  canView,
  validate({ params: IdParamSchema, body: UpdateSchema }),
  ctrl.update,
);

/**
 * @openapi
 * /admin/plant-register/{id}:
 *   delete:
 *     tags: [Admin - Plant Register]
 *     summary: Delete plant register entry
 *     description: Permanently deletes a plant register entry.
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
 * /admin/plant-register/{id}/documents:
 *   get:
 *     tags: [Admin - Plant Register]
 *     summary: List documents for a plant register entry
 *     description: Returns paginated list of uploaded documents for a specific plant register entry. Searchable by submittedby or arrival_datetime (prefix match).
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
 *         description: Plant register entry not found
 */
router.get('/:id/documents',
  authenticate,
  canView,
  validate({ params: IdParamSchema, query: DocListQuerySchema }),
  ctrl.listDocuments,
);

/**
 * @openapi
 * /admin/plant-register/{id}/documents:
 *   post:
 *     tags: [Admin - Plant Register]
 *     summary: Upload a document for a plant register entry
 *     description: |
 *       Uploads a document (image, PDF, or office file) associated with a plant register entry.
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
 *         description: Plant register entry not found
 *       415:
 *         description: Unsupported file type
 */
router.post('/:id/documents',
  authenticate,
  canView,
  validate({ params: IdParamSchema }),
  upload.single('file'),
  validate({ body: UploadDocSchema }),
  ctrl.uploadDocument,
);

/**
 * @openapi
 * /admin/plant-register/{id}/documents/{docId}:
 *   delete:
 *     tags: [Admin - Plant Register]
 *     summary: Delete a document
 *     description: Permanently deletes an uploaded document from the plant register entry.
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
