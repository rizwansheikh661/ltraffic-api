'use strict';

const { Router } = require('express');
const ctrl = require('./hr.controller');
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
} = require('./hr.validators');

const router = Router();
const canView = authorize(LEVELS.ADMIN, LEVELS.ADMIN1);
const canEdit = authorize(LEVELS.ADMIN, LEVELS.ADMIN1);
const canDelete = authorize(LEVELS.ADMIN);
const upload = uploadFor('hrfiles', {
  allowedMime: [
    'image/jpeg', 'image/png', 'image/gif', 'image/bmp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
  ],
});

/**
 * @openapi
 * /admin/hr:
 *   get:
 *     tags: [Admin - HR]
 *     summary: List employees
 *     description: Returns paginated employee list. Searchable by first name or surname (prefix match).
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
 *         description: Search by first name or surname (prefix match)
 *     responses:
 *       200:
 *         description: Paginated employee list
 */
router.get('/',
  authenticate,
  canView,
  validate({ query: ListQuerySchema }),
  ctrl.list,
);

/**
 * @openapi
 * /admin/hr/{id}:
 *   get:
 *     tags: [Admin - HR]
 *     summary: Get employee by ID
 *     description: Returns full employee record including personal details, emergency contacts, and file URLs.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Full employee detail
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
 * /admin/hr/{id}:
 *   put:
 *     tags: [Admin - HR]
 *     summary: Update employee
 *     description: Update any employee fields. All fields are optional — only provided fields are updated.
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
 *               firstname: { type: string }
 *               surname: { type: string }
 *               jobtitle: { type: string }
 *               location: { type: string }
 *               linemanager: { type: string }
 *               ltrafficemail: { type: string }
 *               ltrafficphone: { type: string }
 *               salary: { type: string }
 *               notes: { type: string }
 *     responses:
 *       200:
 *         description: Employee updated
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
 * /admin/hr/{id}:
 *   delete:
 *     tags: [Admin - HR]
 *     summary: Delete employee
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
 * /admin/hr/{id}/documents:
 *   get:
 *     tags: [Admin - HR]
 *     summary: List HR documents for an employee
 *     description: Returns paginated list of uploaded HR documents (licences, PPE, contracts, etc.)
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
 *         description: Search by uploader name (prefix)
 *       - in: query
 *         name: searchDate
 *         schema: { type: string }
 *         description: Search by upload date (prefix)
 *     responses:
 *       200:
 *         description: Paginated document list
 *       404:
 *         description: Employee not found
 */
router.get('/:id/documents',
  authenticate,
  canView,
  validate({ params: IdParamSchema, query: DocListQuerySchema }),
  ctrl.listDocuments,
);

/**
 * @openapi
 * /admin/hr/{id}/documents:
 *   post:
 *     tags: [Admin - HR]
 *     summary: Upload HR document
 *     description: |
 *       Upload a document for an employee's HR file.
 *       Document types: Driver Eyesight Check, Driving Licence, Driving Licence Check, Ladder Inspection, Medical Check, Passport, PPE Issue, Service Contract, Toolbox Talk, Other.
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
 *                 enum: [Driver Eyesight Check, Driving Licence, Driving Licence Check, Ladder Inspection, Medical Check, Passport, PPE Issue, Service Contract, Toolbox Talk, Other]
 *               docdesc:
 *                 type: string
 *     responses:
 *       201:
 *         description: Document uploaded
 *       404:
 *         description: Employee not found
 */
router.post('/:id/documents',
  authenticate,
  canEdit,
  validate({ params: IdParamSchema }),
  upload.single('file'),
  validate({ body: UploadDocSchema }),
  ctrl.uploadDocument,
);

/**
 * @openapi
 * /admin/hr/{id}/documents/{docId}:
 *   delete:
 *     tags: [Admin - HR]
 *     summary: Delete HR document
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
 *       404:
 *         description: Not found
 */
router.delete('/:id/documents/:docId',
  authenticate,
  canDelete,
  validate({ params: DocIdParamSchema }),
  ctrl.deleteDocument,
);

module.exports = router;
