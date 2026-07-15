'use strict';

const { Router } = require('express');
const ctrl = require('./wr.controller');
const { authenticate } = require('../../middlewares/auth.middleware');
const { authorize } = require('../../middlewares/rbac.middleware');
const { validate } = require('../../middlewares/validate.middleware');
const { uploadFor } = require('../../middlewares/upload.middleware');
const { LEVELS } = require('../../constants/roles');
const { ListQuerySchema, IdParamSchema, CreateSchema } = require('./wr.validators');

const router = Router();

const { ADMIN, ADMIN1, ADMIN2, CIVILS_TRAILER_DRIVER, ESSEX_SUPERVISOR } = LEVELS;

const canAccess = authorize(ADMIN, ADMIN1, ADMIN2, CIVILS_TRAILER_DRIVER, ESSEX_SUPERVISOR);

const ALLOWED_MIME = [
  'image/jpeg', 'image/png', 'image/gif', 'image/bmp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/zip',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

const upload = uploadFor('wr', { allowedMime: ALLOWED_MIME });

/**
 * @openapi
 * /employee/work-records:
 *   get:
 *     tags: [Work Records]
 *     summary: List work records
 *     description: Returns paginated list of work records. Filterable by status. Searchable by lt1 (Recorded By) and lt9 (Type of Works) prefix match. Pending status sorts ASC, all others DESC.
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
 *         description: Filter by work record status
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Search by lt1 Recorded By (prefix match)
 *       - in: query
 *         name: lt9
 *         schema: { type: string }
 *         description: Filter by lt9 Type of Works (prefix match)
 *     responses:
 *       200:
 *         description: Paginated work record list
 */
router.get('/',
  authenticate,
  canAccess,
  validate({ query: ListQuerySchema }),
  ctrl.employeeList,
);

/**
 * @openapi
 * /employee/work-records/{id}:
 *   get:
 *     tags: [Work Records]
 *     summary: Get work record by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Work record details with image URLs
 *       404:
 *         description: Not found
 */
router.get('/:id',
  authenticate,
  canAccess,
  validate({ params: IdParamSchema }),
  ctrl.employeeGetById,
);

/**
 * @openapi
 * /employee/work-records:
 *   post:
 *     tags: [Work Records]
 *     summary: Create work record
 *     description: Creates a new work record with image uploads. Send as multipart/form-data. Recorded By (lt1) and Date/Time (lt2) are auto-populated. Status is set to Pending.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [lt3, lt4, lt5, lt6, lt7, lt8, lt9, lt10, lt11, lt12]
 *             properties:
 *               lt3: { type: string, description: Road Name }
 *               lt4: { type: string, description: Cabinet Area }
 *               lt5: { type: string, description: Primary Node number }
 *               lt6: { type: string, description: Secondary Node category }
 *               lt7: { type: string, description: Secondary Node number }
 *               lt8: { type: string, description: Structure ID }
 *               lt9: { type: string, description: Type of Works }
 *               lt10: { type: string, description: Work Status }
 *               lt11: { type: string, description: Notes }
 *               lt12: { type: string, description: Ducting Length }
 *               images:
 *                 type: array
 *                 items: { type: string, format: binary }
 *     responses:
 *       201:
 *         description: Work record created
 */
router.post('/',
  authenticate,
  canAccess,
  upload.array('images', 10),
  validate({ body: CreateSchema }),
  ctrl.employeeCreate,
);

module.exports = router;
