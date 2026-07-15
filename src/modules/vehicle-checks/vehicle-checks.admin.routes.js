'use strict';

const { Router } = require('express');
const ctrl = require('./vehicle-checks.controller');
const { authenticate } = require('../../middlewares/auth.middleware');
const { authorize } = require('../../middlewares/rbac.middleware');
const { validate } = require('../../middlewares/validate.middleware');
const { uploadFor } = require('../../middlewares/upload.middleware');
const { LEVELS } = require('../../constants/roles');
const {
  ListQuerySchema,
  AdminCreateSchema,
  AdminUpdateSchema,
  IdParamSchema,
  DocIdParamSchema,
} = require('./vehicle-checks.validators');

const router = Router();
const canView = authorize(LEVELS.ADMIN, LEVELS.ADMIN1, LEVELS.ADMIN2);
const canEdit = authorize(LEVELS.ADMIN, LEVELS.ADMIN1);
const canDelete = authorize(LEVELS.ADMIN);
const upload = uploadFor('vehicleupload', {
  allowedMime: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
});

/**
 * @openapi
 * components:
 *   schemas:
 *     VehicleCheck:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         drivername:
 *           type: string
 *         vehiclereg:
 *           type: string
 *         mileage:
 *           type: integer
 *         arrival_datetime:
 *           type: string
 *         planning:
 *           type: object
 *           properties:
 *             routeplanned: { type: string, enum: [Yes, No] }
 *             roadconditions: { type: string, enum: [Yes, No] }
 *             dressedforweather: { type: string, enum: [Yes, No] }
 *             emergencyequip: { type: string, enum: [Yes, No] }
 *         circleCheck:
 *           type: object
 *           properties:
 *             tires: { type: string, enum: [Yes, No] }
 *             lights: { type: string, enum: [Yes, No] }
 *             windows: { type: string, enum: [Yes, No] }
 *             loads: { type: string, enum: [Yes, No] }
 *         underTheHood:
 *           type: object
 *           properties:
 *             washer: { type: string, enum: [Yes, No] }
 *             oil: { type: string, enum: [Yes, No] }
 *             fluid: { type: string, enum: [Yes, No] }
 *             belts: { type: string, enum: [Yes, No] }
 *         behindTheWheel:
 *           type: object
 *           properties:
 *             seatbelt: { type: string, enum: [Yes, No] }
 *             horn: { type: string, enum: [Yes, No] }
 *             mirrors: { type: string, enum: [Yes, No] }
 *             brakes: { type: string, enum: [Yes, No] }
 *         trailerAndLoad:
 *           type: object
 *           properties:
 *             trailercoupling: { type: string, enum: [Yes, No, N/a] }
 *             safetyconnection: { type: string, enum: [Yes, No, N/a] }
 *             loadsecured: { type: string, enum: [Yes, No] }
 *             loadweight: { type: string, enum: [Yes, No] }
 *         vehiclecondition:
 *           type: string
 *           enum: [Good, Average, Poor, Very Poor, Dangerous, Closed]
 *         safe:
 *           type: string
 *           enum: [Safe, Unsafe, Closed]
 *         report:
 *           type: string
 *         notes:
 *           type: string
 *           nullable: true
 *     VehicleCheckSummary:
 *       type: object
 *       properties:
 *         id: { type: integer }
 *         drivername: { type: string }
 *         vehiclereg: { type: string }
 *         mileage: { type: integer }
 *         arrival_datetime: { type: string }
 *         vehiclecondition: { type: string }
 *         safe: { type: string }
 *     VehicleCheckDocument:
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
 * /admin/vehicle-checks:
 *   get:
 *     tags: [Admin - Vehicle Checks]
 *     summary: List all vehicle checks
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
 *         description: Search by driver name
 *       - in: query
 *         name: searchDate
 *         schema: { type: string }
 *         description: Filter by date prefix (e.g. 2024-01-15)
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [action-required, closed, all] }
 *         description: Filter by status category
 *     responses:
 *       200:
 *         description: Paginated vehicle check list
 */
router.get('/',
  authenticate,
  canView,
  validate({ query: ListQuerySchema }),
  ctrl.adminList,
);

/**
 * @openapi
 * /admin/vehicle-checks/{id}:
 *   get:
 *     tags: [Admin - Vehicle Checks]
 *     summary: Get vehicle check by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Vehicle check detail
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
 * /admin/vehicle-checks:
 *   post:
 *     tags: [Admin - Vehicle Checks]
 *     summary: Create vehicle check (admin)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [drivername, vehiclereg, mileage]
 *             properties:
 *               drivername: { type: string }
 *               vehiclereg: { type: string }
 *               mileage: { type: integer }
 *               routeplanned: { type: string, enum: [Yes, No], default: 'Yes' }
 *               roadconditions: { type: string, enum: [Yes, No], default: 'Yes' }
 *               dressedforweather: { type: string, enum: [Yes, No], default: 'Yes' }
 *               emergencyequip: { type: string, enum: [Yes, No], default: 'Yes' }
 *               tires: { type: string, enum: [Yes, No], default: 'Yes' }
 *               lights: { type: string, enum: [Yes, No], default: 'Yes' }
 *               windows: { type: string, enum: [Yes, No], default: 'Yes' }
 *               loads: { type: string, enum: [Yes, No], default: 'Yes' }
 *               washer: { type: string, enum: [Yes, No], default: 'Yes' }
 *               oil: { type: string, enum: [Yes, No], default: 'Yes' }
 *               fluid: { type: string, enum: [Yes, No], default: 'Yes' }
 *               belts: { type: string, enum: [Yes, No], default: 'Yes' }
 *               seatbelt: { type: string, enum: [Yes, No], default: 'Yes' }
 *               horn: { type: string, enum: [Yes, No], default: 'Yes' }
 *               mirrors: { type: string, enum: [Yes, No], default: 'Yes' }
 *               brakes: { type: string, enum: [Yes, No], default: 'Yes' }
 *               trailercoupling: { type: string, enum: [Yes, No, N/a], default: 'N/a' }
 *               safetyconnection: { type: string, enum: [Yes, No, N/a], default: 'N/a' }
 *               loadsecured: { type: string, enum: [Yes, No], default: 'Yes' }
 *               loadweight: { type: string, enum: [Yes, No], default: 'Yes' }
 *               vehiclecondition: { type: string, enum: [Good, Average, Poor, Very Poor, Dangerous, Closed], default: 'Good' }
 *               safe: { type: string, enum: [Safe, Unsafe, Closed], default: 'Safe' }
 *               report: { type: string }
 *               notes: { type: string }
 *     responses:
 *       201:
 *         description: Vehicle check created
 */
router.post('/',
  authenticate,
  canEdit,
  validate({ body: AdminCreateSchema }),
  ctrl.adminCreate,
);

/**
 * @openapi
 * /admin/vehicle-checks/{id}:
 *   put:
 *     tags: [Admin - Vehicle Checks]
 *     summary: Update vehicle check
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
 *               drivername: { type: string }
 *               vehiclereg: { type: string }
 *               mileage: { type: integer }
 *               vehiclecondition: { type: string, enum: [Good, Average, Poor, Very Poor, Dangerous, Closed] }
 *               safe: { type: string, enum: [Safe, Unsafe, Closed] }
 *               notes: { type: string }
 *               report: { type: string }
 *     responses:
 *       200:
 *         description: Vehicle check updated
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
 * /admin/vehicle-checks/{id}:
 *   delete:
 *     tags: [Admin - Vehicle Checks]
 *     summary: Delete vehicle check
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
 * /admin/vehicle-checks/{id}/documents:
 *   get:
 *     tags: [Admin - Vehicle Checks]
 *     summary: List documents for a vehicle check
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
 *       404:
 *         description: Vehicle check not found
 */
router.get('/:id/documents',
  authenticate,
  canView,
  validate({ params: IdParamSchema }),
  ctrl.adminGetDocuments,
);

/**
 * @openapi
 * /admin/vehicle-checks/{id}/documents:
 *   post:
 *     tags: [Admin - Vehicle Checks]
 *     summary: Upload a document for a vehicle check
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
 *       404:
 *         description: Vehicle check not found
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
 * /admin/vehicle-checks/{id}/documents/{docId}:
 *   delete:
 *     tags: [Admin - Vehicle Checks]
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
