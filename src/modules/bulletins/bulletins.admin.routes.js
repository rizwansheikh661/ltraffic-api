'use strict';

const { Router } = require('express');
const ctrl = require('./bulletins.controller');
const { authenticate } = require('../../middlewares/auth.middleware');
const { authorize } = require('../../middlewares/rbac.middleware');
const { validate } = require('../../middlewares/validate.middleware');
const { uploadFor } = require('../../middlewares/upload.middleware');
const { LEVELS } = require('../../constants/roles');
const {
  ListQuerySchema,
  CreateSchema,
  UpdateSchema,
  IdParamSchema,
} = require('./bulletins.validators');

const router = Router();
const requireAdminRole = authorize(LEVELS.ADMIN, LEVELS.ADMIN1);
const upload = uploadFor('bulletin', {
  allowedMime: ['image/jpeg', 'image/png', 'image/gif', 'image/bmp', 'image/webp', 'application/pdf'],
});

/* ──────────────────────────────────────────────────────────────
 *  Reusable schemas — Bulletins (Admin)
 * ────────────────────────────────────────────────────────────── */

/**
 * @openapi
 * components:
 *   schemas:
 *     Bulletin:
 *       type: object
 *       description: |
 *         A company bulletin managed by admins. Employees must acknowledge
 *         active bulletins before using the app. Maps to the `bulletinnew` table.
 *
 *         **PHP compatibility:** same data shape as PHP `bulletin.php` and
 *         `bulletinedit.php`. The `new` column (0/1) is mapped to `active`
 *         (boolean) and `status` (string) for mobile readability.
 *       required: [id, title, ref, description, active, status, arrival_datetime]
 *       properties:
 *         id:
 *           type: integer
 *           description: 'Auto-increment primary key from `bulletinnew.id`.'
 *           example: 42
 *         title:
 *           type: string
 *           description: 'Bulletin title displayed to employees.'
 *           example: 'Health & Safety Update - July 2026'
 *         ref:
 *           type: string
 *           description: 'Unique reference code for audit tracking. Used in `bulletinconfirm.ref`.'
 *           example: 'HS-2026-07'
 *         description:
 *           type: string
 *           description: 'Full bulletin text / body content.'
 *           example: 'All operatives must complete the updated safety module by 31 July 2026.'
 *         image:
 *           type: string
 *           nullable: true
 *           description: 'Filename of the attached image stored in the `bulletin/` upload folder. Null if no image.'
 *           example: 'bulletin-hs-update.jpg'
 *         image_url:
 *           type: string
 *           nullable: true
 *           description: 'Full public URL to the image file. Null if no image attached.'
 *           example: 'https://ltraffic.co.uk/uploads/bulletin/bulletin-hs-update.jpg'
 *         download:
 *           type: string
 *           nullable: true
 *           description: 'Filename of the attached download (PDF / document). Null if none.'
 *           example: 'hs-policy-v3.pdf'
 *         download_url:
 *           type: string
 *           nullable: true
 *           description: 'Full public URL to the download file. Null if no attachment.'
 *           example: 'https://ltraffic.co.uk/uploads/bulletin/hs-policy-v3.pdf'
 *         active:
 *           type: boolean
 *           description: 'Derived from `bulletinnew.new` column. `true` = active (new=1), `false` = inactive (new=0).'
 *           example: true
 *         status:
 *           type: string
 *           enum: [Active, Inactive]
 *           description: 'Human-readable status string. Same meaning as the `active` boolean.'
 *           example: 'Active'
 *         arrival_datetime:
 *           type: string
 *           format: date-time
 *           description: 'Creation timestamp from `bulletinnew.arrival_datetime`. Set to `NOW()` on insert.'
 *           example: '2026-07-14T10:30:00.000Z'
 *         read_confirm:
 *           type: string
 *           nullable: true
 *           description: |
 *             Comma-separated list of employee names who have read this bulletin.
 *             Built via GROUP_CONCAT on `bulletinread` joined with `login_users`.
 *             Null if no one has read it yet. **Admin-only field** — not returned
 *             to employees.
 *           example: 'Anthony Louch, Dean Stokes, Mark Smith'
 *
 *     BulletinReader:
 *       type: object
 *       description: |
 *         A user who has acknowledged a specific bulletin. Sourced from
 *         `bulletinread` joined with `login_users`.
 *       required: [user_id, name, email]
 *       properties:
 *         user_id:
 *           type: integer
 *           description: 'User primary key from `login_users.user_id`.'
 *           example: 5
 *         name:
 *           type: string
 *           description: 'Employee display name from `login_users.name`.'
 *           example: 'Dean Stokes'
 *         email:
 *           type: string
 *           format: email
 *           description: 'Employee email from `login_users.email`.'
 *           example: 'dean@ltraffic.co.uk'
 */

/* ──────────────────────────────────────────────────────────────
 *  GET /admin/bulletins
 * ────────────────────────────────────────────────────────────── */

/**
 * @openapi
 * /admin/bulletins:
 *   get:
 *     operationId: adminListBulletins
 *     tags: [Admin - Bulletins]
 *     summary: List all bulletins
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Returns a paginated list of all bulletins with reader names. Supports
 *       search by title (substring match) and reference (prefix match), and
 *       filtering by active/inactive status.
 *
 *       **PHP compatibility:** replaces the bulletin list in `bulletin.php`.
 *       The admin list includes a `read_confirm` field (comma-separated reader
 *       names) built via GROUP_CONCAT, matching the PHP admin view.
 *
 *       **Database:** `bulletinnew` with subquery on `bulletinread` + `login_users`.
 *
 *       **Sorting:** `id DESC` (newest first).
 *       **Default page size:** 20. **Maximum:** 100.
 *
 *       **RBAC:**
 *
 *       | Role | Access |
 *       |------|--------|
 *       | Admin (1) | Yes |
 *       | Admin1 (4) | Yes |
 *       | All others | Denied (403) |
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
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: 'Search by bulletin title (substring match — `LIKE %search%`).'
 *       - in: query
 *         name: searchRef
 *         schema:
 *           type: string
 *         description: 'Search by reference code (prefix match — `LIKE searchRef%`).'
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive]
 *         description: 'Filter by status. Omit to return all.'
 *     responses:
 *       200:
 *         description: Paginated bulletin list with reader names.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/Bulletin' }
 *                 meta: { $ref: '#/components/schemas/PaginationMeta' }
 *             example:
 *               success: true
 *               data:
 *                 - id: 42
 *                   title: 'Health & Safety Update - July 2026'
 *                   ref: 'HS-2026-07'
 *                   description: 'All operatives must complete the updated safety module.'
 *                   image: 'bulletin-hs-update.jpg'
 *                   image_url: 'https://ltraffic.co.uk/uploads/bulletin/bulletin-hs-update.jpg'
 *                   download: 'hs-policy-v3.pdf'
 *                   download_url: 'https://ltraffic.co.uk/uploads/bulletin/hs-policy-v3.pdf'
 *                   active: true
 *                   status: 'Active'
 *                   arrival_datetime: '2026-07-14T10:30:00.000Z'
 *                   read_confirm: 'Anthony Louch, Dean Stokes'
 *               meta:
 *                 page: 1
 *                 limit: 20
 *                 total: 42
 *       401:
 *         $ref: '#/components/responses/Unauthorized401'
 *       403:
 *         $ref: '#/components/responses/Forbidden403'
 *       422:
 *         $ref: '#/components/responses/ValidationError422'
 */
router.get('/',
  authenticate,
  requireAdminRole,
  validate({ query: ListQuerySchema }),
  ctrl.adminList,
);

/* ──────────────────────────────────────────────────────────────
 *  GET /admin/bulletins/{id}
 * ────────────────────────────────────────────────────────────── */

/**
 * @openapi
 * /admin/bulletins/{id}:
 *   get:
 *     operationId: adminGetBulletin
 *     tags: [Admin - Bulletins]
 *     summary: Get bulletin by ID
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Returns a single bulletin with all fields including `read_confirm`
 *       (comma-separated list of employees who read it).
 *
 *       **PHP compatibility:** replaces `bulletinedit.php` detail view.
 *
 *       **Database:** `bulletinnew` by primary key.
 *
 *       **RBAC:**
 *
 *       | Role | Access |
 *       |------|--------|
 *       | Admin (1) | Yes |
 *       | Admin1 (4) | Yes |
 *       | All others | Denied (403) |
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
 *         description: Bulletin detail with image/download URLs.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { $ref: '#/components/schemas/Bulletin' }
 *             example:
 *               success: true
 *               data:
 *                 id: 42
 *                 title: 'Health & Safety Update - July 2026'
 *                 ref: 'HS-2026-07'
 *                 description: 'All operatives must complete the updated safety module.'
 *                 image: 'bulletin-hs-update.jpg'
 *                 image_url: 'https://ltraffic.co.uk/uploads/bulletin/bulletin-hs-update.jpg'
 *                 download: 'hs-policy-v3.pdf'
 *                 download_url: 'https://ltraffic.co.uk/uploads/bulletin/hs-policy-v3.pdf'
 *                 active: true
 *                 status: 'Active'
 *                 arrival_datetime: '2026-07-14T10:30:00.000Z'
 *                 read_confirm: 'Anthony Louch, Dean Stokes'
 *       401:
 *         $ref: '#/components/responses/Unauthorized401'
 *       403:
 *         $ref: '#/components/responses/Forbidden403'
 *       404:
 *         $ref: '#/components/responses/NotFound404'
 *       422:
 *         $ref: '#/components/responses/ValidationError422'
 */
router.get('/:id',
  authenticate,
  requireAdminRole,
  validate({ params: IdParamSchema }),
  ctrl.adminGetById,
);

/* ──────────────────────────────────────────────────────────────
 *  GET /admin/bulletins/{id}/readers
 * ────────────────────────────────────────────────────────────── */

/**
 * @openapi
 * /admin/bulletins/{id}/readers:
 *   get:
 *     operationId: adminGetBulletinReaders
 *     tags: [Admin - Bulletins]
 *     summary: Get users who have read this bulletin
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Returns the list of employees who have acknowledged this bulletin,
 *       with their user ID, name, and email.
 *
 *       **PHP compatibility:** replaces the "Read By" section in `bulletinedit.php`.
 *
 *       **Database:** `bulletinread` joined with `login_users` where
 *       `bulletinread.bulletin = :id`.
 *
 *       **Business rule:** the bulletin must exist (404 if not), even if no
 *       readers are found (returns empty array).
 *
 *       **RBAC:**
 *
 *       | Role | Access |
 *       |------|--------|
 *       | Admin (1) | Yes |
 *       | Admin1 (4) | Yes |
 *       | All others | Denied (403) |
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
 *         description: List of readers. Empty array if none.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/BulletinReader' }
 *             example:
 *               success: true
 *               data:
 *                 - user_id: 5
 *                   name: 'Dean Stokes'
 *                   email: 'dean@ltraffic.co.uk'
 *                 - user_id: 12
 *                   name: 'Mark Smith'
 *                   email: 'mark@ltraffic.co.uk'
 *       401:
 *         $ref: '#/components/responses/Unauthorized401'
 *       403:
 *         $ref: '#/components/responses/Forbidden403'
 *       404:
 *         $ref: '#/components/responses/NotFound404'
 *       422:
 *         $ref: '#/components/responses/ValidationError422'
 */
router.get('/:id/readers',
  authenticate,
  requireAdminRole,
  validate({ params: IdParamSchema }),
  ctrl.adminGetReaders,
);

/* ──────────────────────────────────────────────────────────────
 *  POST /admin/bulletins
 * ────────────────────────────────────────────────────────────── */

/**
 * @openapi
 * /admin/bulletins:
 *   post:
 *     operationId: adminCreateBulletin
 *     tags: [Admin - Bulletins]
 *     summary: Create bulletin
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Creates a new bulletin with optional image and download attachments.
 *       The `arrival_datetime` is set to `NOW()` automatically.
 *
 *       **PHP compatibility:** replaces the "Add Bulletin" form in
 *       `bulletinedit.php`. The `new` field maps to `bulletinnew.new`
 *       (1 = Active, 0 = Inactive), defaulting to 1 (Active).
 *
 *       **Database:** INSERT into `bulletinnew`.
 *
 *       **Business rules:**
 *       - `arrival_datetime` is auto-set to `NOW()`.
 *       - `readby` is initialized to empty string (legacy column).
 *       - `new` defaults to `'1'` (Active) if omitted.
 *       - Image and download filenames are stored as-is in the DB columns.
 *
 *       **Upload:**
 *
 *       | Field | Max Files | Allowed Types | Storage Folder |
 *       |-------|-----------|---------------|----------------|
 *       | `image` | 1 | JPEG, PNG, GIF, BMP, WebP, PDF | `bulletin/` |
 *       | `download` | 1 | JPEG, PNG, GIF, BMP, WebP, PDF | `bulletin/` |
 *
 *       Files are stored under `UPLOADS_ROOT/bulletin/` (the PHP web root).
 *
 *       **RBAC:**
 *
 *       | Role | Access |
 *       |------|--------|
 *       | Admin (1) | Yes |
 *       | Admin1 (4) | Yes |
 *       | All others | Denied (403) |
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [title, ref, description]
 *             properties:
 *               title:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 500
 *                 description: 'Bulletin title. Displayed to all employees.'
 *                 example: 'Health & Safety Update - July 2026'
 *               ref:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 255
 *                 description: 'Unique reference code for audit tracking.'
 *                 example: 'HS-2026-07'
 *               description:
 *                 type: string
 *                 minLength: 1
 *                 description: 'Full bulletin text / body content.'
 *                 example: 'All operatives must complete the updated safety module by 31 July.'
 *               new:
 *                 type: string
 *                 enum: ['0', '1']
 *                 default: '1'
 *                 description: 'Active flag. `1` = Active (employees must acknowledge), `0` = Inactive (hidden).'
 *                 example: '1'
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: 'Optional image attachment (JPEG, PNG, GIF, BMP, WebP, or PDF).'
 *               download:
 *                 type: string
 *                 format: binary
 *                 description: 'Optional downloadable file (JPEG, PNG, GIF, BMP, WebP, or PDF).'
 *     responses:
 *       201:
 *         description: Bulletin created. Returns the full bulletin object.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { $ref: '#/components/schemas/Bulletin' }
 *             example:
 *               success: true
 *               data:
 *                 id: 43
 *                 title: 'Health & Safety Update - July 2026'
 *                 ref: 'HS-2026-07'
 *                 description: 'All operatives must complete the updated safety module by 31 July.'
 *                 image: 'bulletin-hs-update.jpg'
 *                 image_url: 'https://ltraffic.co.uk/uploads/bulletin/bulletin-hs-update.jpg'
 *                 download: null
 *                 download_url: null
 *                 active: true
 *                 status: 'Active'
 *                 arrival_datetime: '2026-07-14T10:30:00.000Z'
 *                 read_confirm: null
 *       401:
 *         $ref: '#/components/responses/Unauthorized401'
 *       403:
 *         $ref: '#/components/responses/Forbidden403'
 *       422:
 *         $ref: '#/components/responses/ValidationError422'
 */
router.post('/',
  authenticate,
  requireAdminRole,
  upload.fields([{ name: 'image', maxCount: 1 }, { name: 'download', maxCount: 1 }]),
  validate({ body: CreateSchema }),
  ctrl.adminCreate,
);

/* ──────────────────────────────────────────────────────────────
 *  PUT /admin/bulletins/{id}
 * ────────────────────────────────────────────────────────────── */

/**
 * @openapi
 * /admin/bulletins/{id}:
 *   put:
 *     operationId: adminUpdateBulletin
 *     tags: [Admin - Bulletins]
 *     summary: Update bulletin
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Updates an existing bulletin. All body fields are optional — only
 *       provided fields are updated. Uploading a new `image` or `download`
 *       replaces the previous file reference in the database.
 *
 *       **PHP compatibility:** replaces the edit form in `bulletinedit.php`.
 *       Allowed fields: `title`, `ref`, `description`, `new` (active flag),
 *       `image`, `download`.
 *
 *       **Database:** UPDATE `bulletinnew` WHERE `id = :id`.
 *
 *       **Business rule:** returns 404 if the bulletin does not exist.
 *
 *       **Upload:**
 *
 *       | Field | Max Files | Allowed Types | Storage Folder |
 *       |-------|-----------|---------------|----------------|
 *       | `image` | 1 | JPEG, PNG, GIF, BMP, WebP, PDF | `bulletin/` |
 *       | `download` | 1 | JPEG, PNG, GIF, BMP, WebP, PDF | `bulletin/` |
 *
 *       **RBAC:**
 *
 *       | Role | Access |
 *       |------|--------|
 *       | Admin (1) | Yes |
 *       | Admin1 (4) | Yes |
 *       | All others | Denied (403) |
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: 'Bulletin primary key.'
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 500
 *                 description: 'Updated bulletin title.'
 *                 example: 'Health & Safety Update - July 2026 (Revised)'
 *               ref:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 255
 *                 description: 'Updated reference code.'
 *                 example: 'HS-2026-07-R1'
 *               description:
 *                 type: string
 *                 minLength: 1
 *                 description: 'Updated bulletin body.'
 *                 example: 'Updated: all operatives must complete the revised module by 15 August.'
 *               new:
 *                 type: string
 *                 enum: ['0', '1']
 *                 description: 'Set active/inactive. `1` = Active, `0` = Inactive.'
 *                 example: '1'
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: 'Replacement image. Overwrites the previous filename in DB.'
 *               download:
 *                 type: string
 *                 format: binary
 *                 description: 'Replacement download file. Overwrites the previous filename in DB.'
 *     responses:
 *       200:
 *         description: Bulletin updated. Returns the full updated bulletin.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { $ref: '#/components/schemas/Bulletin' }
 *             example:
 *               success: true
 *               data:
 *                 id: 42
 *                 title: 'Health & Safety Update - July 2026 (Revised)'
 *                 ref: 'HS-2026-07-R1'
 *                 description: 'Updated: all operatives must complete the revised module by 15 August.'
 *                 image: 'bulletin-hs-update-v2.jpg'
 *                 image_url: 'https://ltraffic.co.uk/uploads/bulletin/bulletin-hs-update-v2.jpg'
 *                 download: 'hs-policy-v3.pdf'
 *                 download_url: 'https://ltraffic.co.uk/uploads/bulletin/hs-policy-v3.pdf'
 *                 active: true
 *                 status: 'Active'
 *                 arrival_datetime: '2026-07-14T10:30:00.000Z'
 *                 read_confirm: 'Anthony Louch, Dean Stokes'
 *       401:
 *         $ref: '#/components/responses/Unauthorized401'
 *       403:
 *         $ref: '#/components/responses/Forbidden403'
 *       404:
 *         $ref: '#/components/responses/NotFound404'
 *       422:
 *         $ref: '#/components/responses/ValidationError422'
 */
router.put('/:id',
  authenticate,
  requireAdminRole,
  upload.fields([{ name: 'image', maxCount: 1 }, { name: 'download', maxCount: 1 }]),
  validate({ params: IdParamSchema, body: UpdateSchema }),
  ctrl.adminUpdate,
);

/* ──────────────────────────────────────────────────────────────
 *  DELETE /admin/bulletins/{id}
 * ────────────────────────────────────────────────────────────── */

/**
 * @openapi
 * /admin/bulletins/{id}:
 *   delete:
 *     operationId: adminDeleteBulletin
 *     tags: [Admin - Bulletins]
 *     summary: Delete bulletin
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Permanently deletes a bulletin. This is a hard delete — the row is
 *       removed from `bulletinnew`. Read tracking rows in `bulletinread` and
 *       audit rows in `bulletinconfirm` are NOT cascade-deleted (they remain
 *       as orphaned records, matching PHP behaviour).
 *
 *       **PHP compatibility:** replaces the delete action in `bulletin.php`.
 *
 *       **Database:** DELETE FROM `bulletinnew` WHERE `id = :id`.
 *
 *       **Business rule:** returns 404 if the bulletin does not exist.
 *
 *       **RBAC:**
 *
 *       | Role | Access |
 *       |------|--------|
 *       | Admin (1) | Yes |
 *       | Admin1 (4) | Yes |
 *       | All others | Denied (403) |
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: 'Bulletin primary key.'
 *     responses:
 *       204:
 *         description: Bulletin deleted. No response body.
 *       401:
 *         $ref: '#/components/responses/Unauthorized401'
 *       403:
 *         $ref: '#/components/responses/Forbidden403'
 *       404:
 *         $ref: '#/components/responses/NotFound404'
 *       422:
 *         $ref: '#/components/responses/ValidationError422'
 */
router.delete('/:id',
  authenticate,
  requireAdminRole,
  validate({ params: IdParamSchema }),
  ctrl.adminDelete,
);

module.exports = router;
