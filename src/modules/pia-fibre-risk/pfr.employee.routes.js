'use strict';

const { Router } = require('express');
const ctrl = require('./pfr.controller');
const { authenticate } = require('../../middlewares/auth.middleware');
const { authorize } = require('../../middlewares/rbac.middleware');
const { validate } = require('../../middlewares/validate.middleware');
const { uploadFor } = require('../../middlewares/upload.middleware');
const { LEVELS } = require('../../constants/roles');
const { ListQuerySchema, WahCreateSchema, UgCreateSchema, MewpCreateSchema } = require('./pfr.validators');

const router = Router();

const canView = authorize(LEVELS.ADMIN, LEVELS.ADMIN1, LEVELS.ADMIN2, LEVELS.CIVILS_TRAILER_DRIVER, LEVELS.ESSEX_SUPERVISOR);
const canCreate = authorize(LEVELS.ADMIN, LEVELS.ADMIN1, LEVELS.CIVILS_TRAILER_DRIVER, LEVELS.ESSEX_SUPERVISOR);

const ALLOWED_MIME = [
  'image/jpeg', 'image/png', 'image/gif', 'image/bmp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/zip',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

const uploadWah = uploadFor('wah', { allowedMime: ALLOWED_MIME });
const uploadUg = uploadFor('ug', { allowedMime: ALLOWED_MIME });
const uploadMewp = uploadFor('mewp', { allowedMime: ALLOWED_MIME });

// ── WAH (Working at Height) ─────────────────────────────────

/**
 * @openapi
 * /employee/pia-fibre-risk/wah:
 *   get:
 *     tags: [PIA & Fibre Risk]
 *     summary: List Working at Height records
 *     description: Returns paginated list of WAH records. Searchable by wah1 (Operative Name) prefix match. Sorted by id DESC.
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
 *         description: Search by Operative Name (wah1) prefix match
 *     responses:
 *       200:
 *         description: Paginated WAH list
 */
router.get('/wah',
  authenticate,
  canView,
  validate({ query: ListQuerySchema }),
  ctrl.wahList,
);

/**
 * @openapi
 * /employee/pia-fibre-risk/wah:
 *   post:
 *     tags: [PIA & Fibre Risk]
 *     summary: Create Working at Height record
 *     description: Creates a new WAH record with image uploads. Operative Name (wah1) and Date/Time (wah3) are auto-populated.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [wah2, wah4, pn, snt, sn, wah5, wah6, wah7, wah8, wah9, wah10, wah11, wah12, wah13]
 *             properties:
 *               wah2: { type: string, description: Job Location }
 *               wah4: { type: string, description: Cabinet Area }
 *               pn: { type: string, description: Primary Node Number }
 *               snt: { type: string, description: SN Type }
 *               sn: { type: string, description: Secondary Node Number }
 *               wah5: { type: string, description: Ladder Inspection in Date (Yes/No) }
 *               wah6: { type: string, description: Ladder ID }
 *               wah7: { type: string, description: Ladders Good Condition (Yes/No) }
 *               wah8: { type: string, description: Harness/Lanyard Condition (Yes/No) }
 *               wah9: { type: string, description: PPE Condition (Yes/No) }
 *               wah10: { type: string, description: Pole safe to climb (Safe/Unsafe) }
 *               wah11: { type: string, description: Work area safe (Yes/No) }
 *               wah12: { type: string, description: Ladders secured (Yes/No) }
 *               wah13: { type: string, description: Lone Working (Yes/No) }
 *               wah14: { type: string, description: Notes/Defects }
 *               images:
 *                 type: array
 *                 items: { type: string, format: binary }
 *     responses:
 *       201:
 *         description: WAH record created
 */
router.post('/wah',
  authenticate,
  canCreate,
  uploadWah.array('images', 10),
  validate({ body: WahCreateSchema }),
  ctrl.wahCreate,
);

// ── UG (Underground Works) ──────────────────────────────────

/**
 * @openapi
 * /employee/pia-fibre-risk/ug:
 *   get:
 *     tags: [PIA & Fibre Risk]
 *     summary: List Underground Works records
 *     description: Returns paginated list of UG records. Searchable by ug1 (Operative Name) prefix match. Sorted by id DESC.
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
 *         description: Search by Operative Name (ug1) prefix match
 *     responses:
 *       200:
 *         description: Paginated UG list
 */
router.get('/ug',
  authenticate,
  canView,
  validate({ query: ListQuerySchema }),
  ctrl.ugList,
);

/**
 * @openapi
 * /employee/pia-fibre-risk/ug:
 *   post:
 *     tags: [PIA & Fibre Risk]
 *     summary: Create Underground Works record
 *     description: Creates a new UG record with image uploads. Operative Name (ug1) and Date/Time (ug3) are auto-populated.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [ug2, ug4, pn, snt, sn, ug5, ug6, ug7, ug8, ug9, ug10, ug11, ug12]
 *             properties:
 *               ug2: { type: string, description: Job Location }
 *               ug4: { type: string, description: Cabinet Area }
 *               pn: { type: string, description: Primary Node Number }
 *               snt: { type: string, description: SN Type }
 *               sn: { type: string, description: Secondary Node Number }
 *               ug5: { type: string, description: Barriers/Gate Guards (Yes/No) }
 *               ug6: { type: string, description: Sandbags available (Yes/No) }
 *               ug7: { type: string, description: Gas Monitor (Yes/No) }
 *               ug8: { type: string, description: PPE Condition (Yes/No) }
 *               ug9: { type: string, description: Weather suitable (Yes/No) }
 *               ug10: { type: string, description: Safe working area (Yes/No) }
 *               ug11: { type: string, description: Correct equipment (Yes/No) }
 *               ug12: { type: string, description: Confirm Safe Site (Safe/Unsafe) }
 *               ug13: { type: string, description: Notes/Defects }
 *               images:
 *                 type: array
 *                 items: { type: string, format: binary }
 *     responses:
 *       201:
 *         description: UG record created
 */
router.post('/ug',
  authenticate,
  canCreate,
  uploadUg.array('images', 10),
  validate({ body: UgCreateSchema }),
  ctrl.ugCreate,
);

// ── MEWP ────────────────────────────────────────────────────

/**
 * @openapi
 * /employee/pia-fibre-risk/mewp:
 *   get:
 *     tags: [PIA & Fibre Risk]
 *     summary: List MEWP Works records
 *     description: Returns paginated list of MEWP records. Searchable by mewp1 (Operative Name) prefix match. Sorted by id DESC.
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
 *         description: Search by Operative Name (mewp1) prefix match
 *     responses:
 *       200:
 *         description: Paginated MEWP list
 */
router.get('/mewp',
  authenticate,
  canView,
  validate({ query: ListQuerySchema }),
  ctrl.mewpList,
);

/**
 * @openapi
 * /employee/pia-fibre-risk/mewp:
 *   post:
 *     tags: [PIA & Fibre Risk]
 *     summary: Create MEWP Works record
 *     description: Creates a new MEWP record with image uploads. Operative Name (mewp1) and Date/Time (mewp3) are auto-populated.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [mewp2, mewp4, pn, snt, sn, mewp5, mewp6, mewp7, mewp8, mewp9, mewp10, mewp11, mewp12, mewp13]
 *             properties:
 *               mewp2: { type: string, description: Job Location }
 *               mewp4: { type: string, description: Cabinet Area }
 *               pn: { type: string, description: Primary Node Number }
 *               snt: { type: string, description: SN Type }
 *               sn: { type: string, description: Secondary Node Number }
 *               mewp5: { type: string, description: LOLER Inspection in Date (Yes/No) }
 *               mewp6: { type: string, description: MEWP Registration }
 *               mewp7: { type: string, description: MEWP Good Condition (Yes/No) }
 *               mewp8: { type: string, description: Harness/Lanyard (Yes/No) }
 *               mewp9: { type: string, description: PPE Condition (Yes/No) }
 *               mewp10: { type: string, description: Pole safe (Safe/Unsafe) }
 *               mewp11: { type: string, description: Work area safe (Yes/No) }
 *               mewp12: { type: string, description: MEWP Stabilised (Yes/No) }
 *               mewp13: { type: string, description: Not lone working (Confirm/No) }
 *               mewp14: { type: string, description: Notes/Defects }
 *               images:
 *                 type: array
 *                 items: { type: string, format: binary }
 *     responses:
 *       201:
 *         description: MEWP record created
 */
router.post('/mewp',
  authenticate,
  canCreate,
  uploadMewp.array('images', 10),
  validate({ body: MewpCreateSchema }),
  ctrl.mewpCreate,
);

module.exports = router;
