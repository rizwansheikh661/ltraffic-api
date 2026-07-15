'use strict';

const { Router } = require('express');
const ctrl = require('./si.controller');
const { authenticate } = require('../../middlewares/auth.middleware');
const { authorize } = require('../../middlewares/rbac.middleware');
const { validate } = require('../../middlewares/validate.middleware');
const { uploadFor } = require('../../middlewares/upload.middleware');
const { LEVELS } = require('../../constants/roles');
const { ListQuerySchema, IdParamSchema, PartParamSchema, Part1Schema } = require('./si.validators');

const router = Router();
const canAccess = authorize(
  LEVELS.ADMIN, LEVELS.ADMIN1, LEVELS.CIVILS_TRAILER_DRIVER, LEVELS.ESSEX_SUPERVISOR,
);

const ALLOWED_MIME = [
  'image/jpeg', 'image/png', 'image/gif', 'image/bmp', 'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
];

/**
 * @openapi
 * /employee/site-inspections:
 *   post:
 *     tags: [Site Inspections]
 *     summary: Create Part 1 of a site inspection
 *     description: |
 *       Creates a new site inspection (Part 1 — Site Information).
 *       Requires source query param and civilsId in body.
 *       Auto-populates site reference, location, client, ganger from the parent job.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: source
 *         required: true
 *         schema: { type: string, enum: [civils, wildanet] }
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [civilsId]
 *             properties:
 *               civilsId: { type: integer }
 *               in7: { type: string, description: Operatives on Site }
 *               in8: { type: string, description: Site Activities }
 *               images:
 *                 type: array
 *                 items: { type: string, format: binary }
 *     responses:
 *       201:
 *         description: Part 1 created
 *       404:
 *         description: Parent job not found
 */
router.post('/',
  authenticate,
  canAccess,
  (req, res, next) => {
    const source = req.query.source || 'civils';
    const { SOURCES } = require('./si.repository');
    const s = SOURCES[source];
    if (!s) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid source' } });
    const upload = uploadFor(`${s.prefix}1`, { allowedMime: ALLOWED_MIME });
    upload.array('images', 4)(req, res, next);
  },
  validate({ body: Part1Schema }),
  ctrl.employeeCreate,
);

/**
 * @openapi
 * /employee/site-inspections/{id}/part/{partNum}:
 *   put:
 *     tags: [Site Inspections]
 *     summary: Submit a part of the site inspection
 *     description: Submit Parts 2-8. Part 8 sets status to "Inspection Awaiting Review".
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *       - in: path
 *         name: partNum
 *         required: true
 *         schema: { type: integer, minimum: 2, maximum: 8 }
 *       - in: query
 *         name: source
 *         required: true
 *         schema: { type: string, enum: [civils, wildanet] }
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               images:
 *                 type: array
 *                 items: { type: string, format: binary }
 *     responses:
 *       200:
 *         description: Part submitted
 *       404:
 *         description: Inspection not found
 */
router.put('/:id/part/:partNum',
  authenticate,
  canAccess,
  validate({ params: PartParamSchema }),
  (req, res, next) => {
    const source = req.query.source || 'civils';
    const partNum = Number(req.params.partNum);
    const { SOURCES } = require('./si.repository');
    const s = SOURCES[source];
    if (!s) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid source' } });
    const upload = uploadFor(`${s.prefix}${partNum}`, { allowedMime: ALLOWED_MIME });
    upload.array('images', 4)(req, res, next);
  },
  ctrl.employeeSubmitPart,
);

/**
 * @openapi
 * /employee/site-inspections:
 *   get:
 *     tags: [Site Inspections]
 *     summary: List own site inspections
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: source
 *         required: true
 *         schema: { type: string, enum: [civils, wildanet] }
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
 *         description: Own inspections
 */
router.get('/',
  authenticate,
  canAccess,
  validate({ query: ListQuerySchema }),
  ctrl.employeeList,
);

/**
 * @openapi
 * /employee/site-inspections/{id}:
 *   get:
 *     tags: [Site Inspections]
 *     summary: Get own site inspection by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *       - in: query
 *         name: source
 *         required: true
 *         schema: { type: string, enum: [civils, wildanet] }
 *     responses:
 *       200:
 *         description: Inspection detail
 *       404:
 *         description: Not found
 */
router.get('/:id',
  authenticate,
  canAccess,
  validate({ params: IdParamSchema }),
  ctrl.employeeGetById,
);

module.exports = router;
