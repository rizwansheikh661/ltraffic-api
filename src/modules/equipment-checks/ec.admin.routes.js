'use strict';

const { Router } = require('express');
const ctrl = require('./ec.controller');
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
  UpdateSchema,
  UploadDocSchema,
} = require('./ec.validators');

const router = Router();
const canList = authorize(
  LEVELS.ADMIN, LEVELS.ADMIN1, LEVELS.CIVILS_TRAILER_DRIVER, LEVELS.ESSEX_SUPERVISOR,
);
const canView = authorize(
  LEVELS.ADMIN, LEVELS.ADMIN1, LEVELS.ADMIN2, LEVELS.CIVILS_TRAILER_DRIVER,
);
const canEdit = authorize(LEVELS.ADMIN);
const canDelete = authorize(LEVELS.ADMIN);

const upload = uploadFor('presite', {
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
 * /admin/equipment-checks:
 *   get:
 *     tags: [Admin - Equipment Checks]
 *     summary: List all equipment checks
 *     description: Returns paginated list of all equipment checks. Searchable by operative name (prefix match). Sorted by newest first.
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
 *         description: Search by operative name (prefix match)
 *     responses:
 *       200:
 *         description: Paginated equipment check list
 */
router.get('/',
  authenticate,
  canList,
  validate({ query: ListQuerySchema }),
  ctrl.adminList,
);

/**
 * @openapi
 * /admin/equipment-checks/{id}:
 *   get:
 *     tags: [Admin - Equipment Checks]
 *     summary: Get equipment check by ID
 *     description: Returns full equipment check details including image URLs.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Equipment check details
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
 * /admin/equipment-checks/{id}:
 *   put:
 *     tags: [Admin - Equipment Checks]
 *     summary: Update equipment check
 *     description: Updates an existing equipment check. All fields optional — only provided fields are updated. Admin only.
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
 *               operativesname:
 *                 type: string
 *               description:
 *                 type: string
 *               ident:
 *                 type: string
 *               brakes:
 *                 type: string
 *                 enum: [Pass, Fail]
 *               steering:
 *                 type: string
 *                 enum: [Pass, Fail]
 *               seatbelt:
 *                 type: string
 *                 enum: [Pass, Fail]
 *               mirrors:
 *                 type: string
 *                 enum: [Pass, Fail]
 *               tyres:
 *                 type: string
 *                 enum: [Pass, Fail]
 *               wheelsecurity:
 *                 type: string
 *                 enum: [Pass, Fail]
 *               rotatingbeacon:
 *                 type: string
 *                 enum: [Pass, Fail]
 *               horn:
 *                 type: string
 *                 enum: [Pass, Fail]
 *               warninglights:
 *                 type: string
 *                 enum: [Pass, Fail]
 *               coolant:
 *                 type: string
 *                 enum: [Pass, Fail]
 *               seat:
 *                 type: string
 *                 enum: [Pass, Fail]
 *               access:
 *                 type: string
 *                 enum: [Pass, Fail]
 *               fuel:
 *                 type: string
 *                 enum: [Pass, Fail]
 *               cond:
 *                 type: string
 *                 enum: [Good, Average, Poor, Very Poor, Dangerous]
 *               safe:
 *                 type: string
 *                 enum: [Safe, Unsafe]
 *               report:
 *                 type: string
 *               image:
 *                 type: string
 *                 description: Comma-separated image paths
 *     responses:
 *       200:
 *         description: Equipment check updated
 *       404:
 *         description: Not found
 */
router.put('/:id',
  authenticate,
  canEdit,
  validate({ params: IdParamSchema, body: UpdateSchema }),
  ctrl.adminUpdate,
);

/**
 * @openapi
 * /admin/equipment-checks/{id}:
 *   delete:
 *     tags: [Admin - Equipment Checks]
 *     summary: Delete equipment check
 *     description: Permanently deletes an equipment check. Admin only.
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
  ctrl.adminRemove,
);

/**
 * @openapi
 * /admin/equipment-checks/{id}/documents:
 *   get:
 *     tags: [Admin - Equipment Checks]
 *     summary: List documents for an equipment check
 *     description: Returns paginated list of supplemental documents uploaded for a specific equipment check.
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
 *         description: Search by submittedby or datetime (prefix match)
 *     responses:
 *       200:
 *         description: Paginated document list
 *       404:
 *         description: Equipment check not found
 */
router.get('/:id/documents',
  authenticate,
  canView,
  validate({ params: IdParamSchema, query: DocListQuerySchema }),
  ctrl.adminListDocuments,
);

/**
 * @openapi
 * /admin/equipment-checks/{id}/documents:
 *   post:
 *     tags: [Admin - Equipment Checks]
 *     summary: Upload a supplemental document
 *     description: |
 *       Uploads a supplemental document (Site Image) for an equipment check.
 *       Send as multipart/form-data with field name "file".
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
 *             required: [file, docdesc]
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               docdesc:
 *                 type: string
 *                 description: Document description
 *     responses:
 *       201:
 *         description: Document uploaded
 *       404:
 *         description: Equipment check not found
 *       415:
 *         description: Unsupported file type
 */
router.post('/:id/documents',
  authenticate,
  canView,
  validate({ params: IdParamSchema }),
  upload.single('file'),
  validate({ body: UploadDocSchema }),
  ctrl.adminUploadDocument,
);

/**
 * @openapi
 * /admin/equipment-checks/{id}/documents/{docId}:
 *   delete:
 *     tags: [Admin - Equipment Checks]
 *     summary: Delete a document
 *     description: Permanently deletes an uploaded document. Admin only.
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
  ctrl.adminRemoveDocument,
);

module.exports = router;
