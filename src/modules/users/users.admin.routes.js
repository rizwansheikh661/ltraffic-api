'use strict';

const { Router } = require('express');
const ctrl = require('./users.controller');
const { authenticate } = require('../../middlewares/auth.middleware');
const { authorize } = require('../../middlewares/rbac.middleware');
const { validate } = require('../../middlewares/validate.middleware');
const { LEVELS } = require('../../constants/roles');
const {
  ListQuerySchema,
  IdParamSchema,
  CreateSchema,
  UpdateSchema,
} = require('./users.validators');

const router = Router();
const canView = authorize(LEVELS.ADMIN);
const canCreate = authorize(LEVELS.ADMIN, LEVELS.ADMIN1);
const canEdit = authorize(LEVELS.ADMIN);

/**
 * @openapi
 * /admin/users:
 *   get:
 *     tags: [Admin - Users]
 *     summary: List user accounts
 *     description: Returns paginated user account list. Searchable by employee name (prefix match).
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
 *         description: Search by employee name (prefix match)
 *     responses:
 *       200:
 *         description: Paginated user list
 */
router.get('/',
  authenticate,
  canView,
  validate({ query: ListQuerySchema }),
  ctrl.list,
);

/**
 * @openapi
 * /admin/users/{id}:
 *   get:
 *     tags: [Admin - Users]
 *     summary: Get user account by ID
 *     description: Returns full user account details including level, team, vehicle, and onboarding status.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: User account details
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
 * /admin/users:
 *   post:
 *     tags: [Admin - Users]
 *     summary: Create user account
 *     description: |
 *       Creates a new login account. Password is stored with dual-write (MD5 for PHP compatibility + bcrypt sidecar).
 *       The onboarding field should be left empty or "0" so the Onboarding module detects the user as needing to complete onboarding.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [user_level, username, name, password]
 *             properties:
 *               user_level:
 *                 type: string
 *                 description: 'PHP-serialized level e.g. a:1:{i:0;s:1:"2";}'
 *               restricted:
 *                 type: integer
 *                 enum: [0, 1]
 *                 default: 0
 *               username:
 *                 type: string
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 8
 *               teamup:
 *                 type: string
 *               vehiclereg:
 *                 type: string
 *               ltrafficid:
 *                 type: string
 *               team:
 *                 type: string
 *                 enum: [Director, Traffic Signals Installation, Traffic Signals Civils, Traffic Signal Maintenance, Utilities Civils, Office Staff, Customer]
 *               name1:
 *                 type: string
 *                 description: Full name without spaces (used for photo/signature file convention)
 *               onboarding:
 *                 type: string
 *     responses:
 *       201:
 *         description: User created
 *       409:
 *         description: Username or email already exists
 */
router.post('/',
  authenticate,
  canCreate,
  validate({ body: CreateSchema }),
  ctrl.create,
);

/**
 * @openapi
 * /admin/users/{id}:
 *   put:
 *     tags: [Admin - Users]
 *     summary: Update user account
 *     description: |
 *       Update any user account fields. All fields are optional — only provided fields are updated.
 *       If password is provided, it triggers a dual-write (MD5 + bcrypt sidecar) and revokes all refresh tokens.
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
 *               user_level:
 *                 type: string
 *               restricted:
 *                 type: integer
 *                 enum: [0, 1]
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *                 minLength: 8
 *               teamup:
 *                 type: string
 *               vehiclereg:
 *                 type: string
 *               ltrafficid:
 *                 type: string
 *               team:
 *                 type: string
 *               name1:
 *                 type: string
 *               onboarding:
 *                 type: string
 *     responses:
 *       200:
 *         description: User updated
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
 * /admin/users/{id}:
 *   delete:
 *     tags: [Admin - Users]
 *     summary: Delete user account
 *     description: Permanently deletes the user account, revokes all refresh tokens, and removes bcrypt sidecar.
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
  canEdit,
  validate({ params: IdParamSchema }),
  ctrl.remove,
);

module.exports = router;
