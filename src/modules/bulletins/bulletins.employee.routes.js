'use strict';

const { Router } = require('express');
const ctrl = require('./bulletins.controller');
const { authenticate } = require('../../middlewares/auth.middleware');
const { validate } = require('../../middlewares/validate.middleware');
const { ListQuerySchema, IdParamSchema } = require('./bulletins.validators');

const router = Router();

/* ──────────────────────────────────────────────────────────────
 *  Reusable schemas — Bulletins (Employee)
 * ────────────────────────────────────────────────────────────── */

/**
 * @openapi
 * components:
 *   schemas:
 *     BulletinEmployee:
 *       type: object
 *       description: |
 *         Employee view of a bulletin. Same fields as `Bulletin` except
 *         `read_confirm` is removed and `is_read` is added to indicate whether
 *         the current authenticated user has acknowledged this bulletin.
 *
 *         **PHP compatibility:** matches the employee bulletin view in PHP.
 *         The `is_read` flag is derived from `bulletinread` for the current user.
 *       required: [id, title, ref, description, active, status, arrival_datetime, is_read]
 *       properties:
 *         id:
 *           type: integer
 *           description: 'Auto-increment primary key from `bulletinnew.id`.'
 *           example: 42
 *         title:
 *           type: string
 *           description: 'Bulletin title.'
 *           example: 'Health & Safety Update - July 2026'
 *         ref:
 *           type: string
 *           description: 'Reference code for audit tracking.'
 *           example: 'HS-2026-07'
 *         description:
 *           type: string
 *           description: 'Full bulletin text / body content.'
 *           example: 'All operatives must complete the updated safety module by 31 July 2026.'
 *         image:
 *           type: string
 *           nullable: true
 *           description: 'Filename of the attached image. Null if none.'
 *           example: 'bulletin-hs-update.jpg'
 *         image_url:
 *           type: string
 *           nullable: true
 *           description: 'Full public URL to the image. Null if no image.'
 *           example: 'https://ltraffic.co.uk/uploads/bulletin/bulletin-hs-update.jpg'
 *         download:
 *           type: string
 *           nullable: true
 *           description: 'Filename of the attached download. Null if none.'
 *           example: 'hs-policy-v3.pdf'
 *         download_url:
 *           type: string
 *           nullable: true
 *           description: 'Full public URL to the download file. Null if none.'
 *           example: 'https://ltraffic.co.uk/uploads/bulletin/hs-policy-v3.pdf'
 *         active:
 *           type: boolean
 *           description: '`true` = active (new=1), `false` = inactive (new=0).'
 *           example: true
 *         status:
 *           type: string
 *           enum: [Active, Inactive]
 *           description: 'Human-readable status string.'
 *           example: 'Active'
 *         arrival_datetime:
 *           type: string
 *           format: date-time
 *           description: 'Creation timestamp.'
 *           example: '2026-07-14T10:30:00.000Z'
 *         is_read:
 *           type: boolean
 *           description: |
 *             Whether the current authenticated user has acknowledged this bulletin.
 *             Derived from `bulletinread` for the user''s `user_id`.
 *           example: false
 */

/* ──────────────────────────────────────────────────────────────
 *  GET /employee/bulletins/pending
 * ────────────────────────────────────────────────────────────── */

/**
 * @openapi
 * /employee/bulletins/pending:
 *   get:
 *     operationId: employeeGetPendingBulletins
 *     tags: [Bulletins]
 *     summary: Get unconfirmed active bulletins for current user
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Returns active bulletins (`new` = 1) that the current user has NOT yet
 *       acknowledged. The mobile app should call this on every launch and
 *       **block navigation** if the result array is non-empty — employees must
 *       read and acknowledge all pending bulletins before using other features.
 *
 *       **PHP compatibility:** replaces the bulletin popup / forced-read screen
 *       in the PHP employee area.
 *
 *       **Database:** cross-references `bulletinnew` (where `new` = 1) against
 *       `bulletinread` for the current user. Returns bulletins with no matching
 *       read row.
 *
 *       **Business rules:**
 *       - Only active bulletins are included (inactive are skipped).
 *       - All returned items have `is_read: false`.
 *       - Returns empty array `[]` when everything is acknowledged.
 *       - Not paginated — returns all pending bulletins at once.
 *
 *       **RBAC:**
 *
 *       | Role | Access |
 *       |------|--------|
 *       | All authenticated users | Yes |
 *     responses:
 *       200:
 *         description: Pending bulletins. Empty array if all are acknowledged.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/BulletinEmployee' }
 *             examples:
 *               hasPending:
 *                 summary: User has unread bulletins
 *                 value:
 *                   success: true
 *                   data:
 *                     - id: 42
 *                       title: 'Health & Safety Update - July 2026'
 *                       ref: 'HS-2026-07'
 *                       description: 'All operatives must complete the updated safety module.'
 *                       image: null
 *                       image_url: null
 *                       download: 'hs-policy-v3.pdf'
 *                       download_url: 'https://ltraffic.co.uk/uploads/bulletin/hs-policy-v3.pdf'
 *                       active: true
 *                       status: 'Active'
 *                       arrival_datetime: '2026-07-14T10:30:00.000Z'
 *                       is_read: false
 *               allRead:
 *                 summary: All bulletins acknowledged
 *                 value:
 *                   success: true
 *                   data: []
 *       401:
 *         $ref: '#/components/responses/Unauthorized401'
 */
router.get('/pending',
  authenticate,
  ctrl.employeePending,
);

/* ──────────────────────────────────────────────────────────────
 *  GET /employee/bulletins
 * ────────────────────────────────────────────────────────────── */

/**
 * @openapi
 * /employee/bulletins:
 *   get:
 *     operationId: employeeListBulletins
 *     tags: [Bulletins]
 *     summary: List all bulletins with read status for current user
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Returns a paginated list of all bulletins (both active and inactive)
 *       with an `is_read` flag indicating whether the current user has
 *       acknowledged each one.
 *
 *       **PHP compatibility:** replaces the employee bulletin list view.
 *       Unlike the admin list, this does NOT include `read_confirm` — employees
 *       see only their own read status.
 *
 *       **Database:** `bulletinnew` with per-row lookup on `bulletinread` for
 *       the authenticated user's `user_id`.
 *
 *       **Sorting:** `id DESC` (newest first).
 *       **Default page size:** 20. **Maximum:** 100.
 *
 *       **RBAC:**
 *
 *       | Role | Access |
 *       |------|--------|
 *       | All authenticated users | Yes |
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: 'Page number (1-based).'
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: 'Items per page. Maximum 100.'
 *     responses:
 *       200:
 *         description: Paginated bulletins with per-user read status.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/BulletinEmployee' }
 *                 meta: { $ref: '#/components/schemas/PaginationMeta' }
 *             example:
 *               success: true
 *               data:
 *                 - id: 42
 *                   title: 'Health & Safety Update - July 2026'
 *                   ref: 'HS-2026-07'
 *                   description: 'All operatives must complete the updated safety module.'
 *                   image: null
 *                   image_url: null
 *                   download: 'hs-policy-v3.pdf'
 *                   download_url: 'https://ltraffic.co.uk/uploads/bulletin/hs-policy-v3.pdf'
 *                   active: true
 *                   status: 'Active'
 *                   arrival_datetime: '2026-07-14T10:30:00.000Z'
 *                   is_read: true
 *                 - id: 41
 *                   title: 'PPE Reminder'
 *                   ref: 'PPE-2026-06'
 *                   description: 'Reminder to wear PPE at all times on site.'
 *                   image: null
 *                   image_url: null
 *                   download: null
 *                   download_url: null
 *                   active: true
 *                   status: 'Active'
 *                   arrival_datetime: '2026-06-01T09:00:00.000Z'
 *                   is_read: false
 *               meta:
 *                 page: 1
 *                 limit: 20
 *                 total: 42
 *       401:
 *         $ref: '#/components/responses/Unauthorized401'
 *       422:
 *         $ref: '#/components/responses/ValidationError422'
 */
router.get('/',
  authenticate,
  validate({ query: ListQuerySchema }),
  ctrl.employeeList,
);

/* ──────────────────────────────────────────────────────────────
 *  GET /employee/bulletins/{id}
 * ────────────────────────────────────────────────────────────── */

/**
 * @openapi
 * /employee/bulletins/{id}:
 *   get:
 *     operationId: employeeGetBulletin
 *     tags: [Bulletins]
 *     summary: Get single bulletin with read status
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Returns a single bulletin with the current user's `is_read` status.
 *
 *       **PHP compatibility:** replaces the employee bulletin detail view.
 *
 *       **Database:** `bulletinnew` by primary key, with `bulletinread` lookup
 *       for the current user.
 *
 *       **Business rule:** returns 404 if the bulletin ID does not exist.
 *
 *       **RBAC:**
 *
 *       | Role | Access |
 *       |------|--------|
 *       | All authenticated users | Yes |
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: 'Bulletin primary key.'
 *     responses:
 *       200:
 *         description: Bulletin detail with read status.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { $ref: '#/components/schemas/BulletinEmployee' }
 *             example:
 *               success: true
 *               data:
 *                 id: 42
 *                 title: 'Health & Safety Update - July 2026'
 *                 ref: 'HS-2026-07'
 *                 description: 'All operatives must complete the updated safety module.'
 *                 image: null
 *                 image_url: null
 *                 download: 'hs-policy-v3.pdf'
 *                 download_url: 'https://ltraffic.co.uk/uploads/bulletin/hs-policy-v3.pdf'
 *                 active: true
 *                 status: 'Active'
 *                 arrival_datetime: '2026-07-14T10:30:00.000Z'
 *                 is_read: true
 *       401:
 *         $ref: '#/components/responses/Unauthorized401'
 *       404:
 *         $ref: '#/components/responses/NotFound404'
 *       422:
 *         $ref: '#/components/responses/ValidationError422'
 */
router.get('/:id',
  authenticate,
  validate({ params: IdParamSchema }),
  ctrl.employeeGetById,
);

/* ──────────────────────────────────────────────────────────────
 *  POST /employee/bulletins/{id}/acknowledge
 * ────────────────────────────────────────────────────────────── */

/**
 * @openapi
 * /employee/bulletins/{id}/acknowledge:
 *   post:
 *     operationId: employeeAcknowledgeBulletin
 *     tags: [Bulletins]
 *     summary: Acknowledge a bulletin
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Records that the current user has read and confirmed the bulletin.
 *       No request body is needed — the user identity comes from the JWT.
 *
 *       **What happens:**
 *       1. Verifies the bulletin exists (404 if not).
 *       2. If not already read, inserts a row into `bulletinread`
 *          (`bulletin` = id, `user_id` = current user).
 *       3. Inserts an audit row into `bulletinconfirm`
 *          (`ref` = bulletin ref, `operative` = user name, `confirm` = 'confirm').
 *
 *       **PHP compatibility:** replaces the "I have read and understood"
 *       confirmation action in the PHP employee area. Writes to the same
 *       `bulletinread` and `bulletinconfirm` tables.
 *
 *       **Business rules:**
 *       - **Idempotent for read tracking:** calling multiple times does NOT
 *         create duplicate `bulletinread` rows. The second call skips the insert.
 *       - **NOT idempotent for audit:** each call inserts a new `bulletinconfirm`
 *         row (matching PHP behaviour — every confirmation click is logged).
 *       - No request body required.
 *
 *       **RBAC:**
 *
 *       | Role | Access |
 *       |------|--------|
 *       | All authenticated users | Yes |
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: 'Bulletin primary key to acknowledge.'
 *     responses:
 *       200:
 *         description: Bulletin acknowledged.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: object
 *                   properties:
 *                     acknowledged:
 *                       type: boolean
 *                       description: 'Always `true` on success.'
 *                       example: true
 *             example:
 *               success: true
 *               data:
 *                 acknowledged: true
 *       401:
 *         $ref: '#/components/responses/Unauthorized401'
 *       404:
 *         $ref: '#/components/responses/NotFound404'
 *       422:
 *         $ref: '#/components/responses/ValidationError422'
 */
router.post('/:id/acknowledge',
  authenticate,
  validate({ params: IdParamSchema }),
  ctrl.employeeAcknowledge,
);

module.exports = router;
