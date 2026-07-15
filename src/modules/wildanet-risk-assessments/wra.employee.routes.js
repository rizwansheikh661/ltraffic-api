'use strict';

const { Router } = require('express');
const ctrl = require('./wra.controller');
const { authenticate } = require('../../middlewares/auth.middleware');
const { authorize } = require('../../middlewares/rbac.middleware');
const { validate } = require('../../middlewares/validate.middleware');
const { uploadFor } = require('../../middlewares/upload.middleware');
const { LEVELS } = require('../../constants/roles');
const { ListQuerySchema, IdParamSchema, PartParamSchema, Part1Schema } = require('./wra.validators');

const router = Router();

const canAccess = authorize(LEVELS.ADMIN, LEVELS.ADMIN1, LEVELS.CIVILS_TRAILER_DRIVER, LEVELS.ESSEX_SUPERVISOR);

const ALLOWED_MIME = [
  'image/jpeg', 'image/png', 'image/gif', 'image/bmp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/zip',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

const uploadPart1 = uploadFor('wra', { allowedMime: ALLOWED_MIME });
const uploadPart2 = uploadFor('wra1', { allowedMime: ALLOWED_MIME });
const uploadPart3 = uploadFor('wra2', { allowedMime: ALLOWED_MIME });
const uploadPart4 = uploadFor('wra3', { allowedMime: ALLOWED_MIME });
const uploadPart5 = uploadFor('wra4', { allowedMime: ALLOWED_MIME });

function uploadForPart(req, res, next) {
  const partNum = Number(req.params.partNum);
  const handler = partNum === 2 ? uploadPart2
    : partNum === 3 ? uploadPart3
      : partNum === 4 ? uploadPart4
        : partNum === 5 ? uploadPart5 : null;
  if (!handler) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid part number' } });
  return handler.array('images', 4)(req, res, next);
}

/**
 * @openapi
 * /employee/wildanet-risk-assessments:
 *   get:
 *     tags: [Wildanet Risk Assessments]
 *     summary: List own risk assessments
 *     description: Returns paginated list of risk assessments created by the current user. Searchable by ra3 (Job Number) prefix match.
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
 *         description: Search by Job Number (ra3) prefix match
 *     responses:
 *       200:
 *         description: Paginated risk assessment list
 */
router.get('/',
  authenticate,
  canAccess,
  validate({ query: ListQuerySchema }),
  ctrl.employeeList,
);

/**
 * @openapi
 * /employee/wildanet-risk-assessments/{id}:
 *   get:
 *     tags: [Wildanet Risk Assessments]
 *     summary: Get own risk assessment by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Risk assessment detail with image URLs
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
 * /employee/wildanet-risk-assessments:
 *   post:
 *     tags: [Wildanet Risk Assessments]
 *     summary: Create Part 1 of a risk assessment
 *     description: |
 *       Creates a new Wildanet Risk Assessment (Part 1 — Site Details).
 *       Requires wildanetId (parent job). Auto-populates job number, location, client, dates, and completed by.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [wildanetId, ra8, ra9, ra10, ra11]
 *             properties:
 *               wildanetId: { type: integer, description: Parent Wildanet job ID }
 *               ra1: { type: string, description: Project Name }
 *               ra8: { type: string, description: Scope of Works }
 *               ra9: { type: string, description: Site Job Pack Available (Yes/No) }
 *               ra10: { type: string, description: Services Identified on Job Pack (Yes/No) }
 *               ra11: { type: string, description: Services Located on Site (Yes/No) }
 *               ra12: { type: string, description: Services identified details }
 *               images:
 *                 type: array
 *                 items: { type: string, format: binary }
 *     responses:
 *       201:
 *         description: Risk assessment created
 */
router.post('/',
  authenticate,
  canAccess,
  uploadPart1.array('images', 4),
  validate({ body: Part1Schema }),
  ctrl.employeeCreate,
);

/**
 * @openapi
 * /employee/wildanet-risk-assessments/{id}/part/{partNum}:
 *   put:
 *     tags: [Wildanet Risk Assessments]
 *     summary: Submit risk assessment part (2-5)
 *     description: |
 *       Submits a subsequent part of the risk assessment wizard.
 *       Part 2: Personnel In Attendance. Part 3: Hazards. Part 4: Permit to Dig. Part 5: End of Day (sets status to RA Completed).
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
 *         schema: { type: integer, minimum: 2, maximum: 5 }
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
 *         description: Updated risk assessment
 *       404:
 *         description: Not found
 */
router.put('/:id/part/:partNum',
  authenticate,
  canAccess,
  validate({ params: PartParamSchema }),
  uploadForPart,
  ctrl.employeeSubmitPart,
);

module.exports = router;
