'use strict';

const { Router } = require('express');
const ctrl = require('./timesheets.controller');
const { authenticate } = require('../../middlewares/auth.middleware');
const { authorize } = require('../../middlewares/rbac.middleware');
const { validate } = require('../../middlewares/validate.middleware');
const { LEVELS } = require('../../constants/roles');
const {
  ListQuerySchema,
  AdminCreateSchema,
  IdParamSchema,
} = require('./timesheets.validators');

const router = Router();
const canView = authorize(LEVELS.ADMIN, LEVELS.ADMIN1);
const canEdit = authorize(LEVELS.ADMIN, LEVELS.ADMIN1);
const canDelete = authorize(LEVELS.ADMIN);

/**
 * @openapi
 * components:
 *   schemas:
 *     Timesheet:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         week:
 *           type: string
 *           description: Week commencing label (e.g. "Monday - 07/07/2025")
 *         ltrafficid:
 *           type: string
 *         name:
 *           type: string
 *         comments:
 *           type: string
 *         status:
 *           type: string
 *           enum: [Draft, Submitted, Approved, Rejected]
 *         days:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               date: { type: string }
 *               hours: { type: string }
 *               location: { type: string }
 *               activity: { type: string }
 *               contract: { type: string }
 *     TimesheetSummary:
 *       type: object
 *       properties:
 *         id: { type: integer }
 *         week: { type: string }
 *         ltrafficid: { type: string }
 *         name: { type: string }
 *         status: { type: string }
 */

/**
 * @openapi
 * /admin/timesheets:
 *   get:
 *     tags: [Admin - Timesheets]
 *     summary: List timesheets with filters
 *     description: |
 *       Status filter modes:
 *       - `submitted` (default): shows Submitted + Rejected (pending review)
 *       - `approved`: shows Approved only
 *       - `draft`: shows Draft only
 *       - `all`: no filter
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
 *         description: Search by operative name
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [submitted, approved, draft, all] }
 *         description: Status filter mode
 *     responses:
 *       200:
 *         description: Paginated timesheet list
 */
router.get('/',
  authenticate,
  canView,
  validate({ query: ListQuerySchema }),
  ctrl.adminList,
);

/**
 * @openapi
 * /admin/timesheets/{id}:
 *   get:
 *     tags: [Admin - Timesheets]
 *     summary: Get timesheet by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Full timesheet detail with 7-day breakdown
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
 * /admin/timesheets:
 *   post:
 *     tags: [Admin - Timesheets]
 *     summary: Create timesheet on behalf of employee
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, week, days]
 *             properties:
 *               name: { type: string, description: Operative name }
 *               ltrafficid: { type: string }
 *               week: { type: string, description: Week commencing label }
 *               days:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     date: { type: string }
 *                     hours: { type: string }
 *                     location: { type: string }
 *                     activity: { type: string }
 *                     contract: { type: string }
 *               comments: { type: string }
 *     responses:
 *       201:
 *         description: Timesheet created
 */
router.post('/',
  authenticate,
  canEdit,
  validate({ body: AdminCreateSchema }),
  ctrl.adminCreate,
);

/**
 * @openapi
 * /admin/timesheets/{id}/approve:
 *   post:
 *     tags: [Admin - Timesheets]
 *     summary: Approve a timesheet
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Timesheet approved
 *       404:
 *         description: Not found
 */
router.post('/:id/approve',
  authenticate,
  canEdit,
  validate({ params: IdParamSchema }),
  ctrl.adminApprove,
);

/**
 * @openapi
 * /admin/timesheets/{id}/reject:
 *   post:
 *     tags: [Admin - Timesheets]
 *     summary: Reject a timesheet
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Timesheet rejected
 *       404:
 *         description: Not found
 */
router.post('/:id/reject',
  authenticate,
  canEdit,
  validate({ params: IdParamSchema }),
  ctrl.adminReject,
);

/**
 * @openapi
 * /admin/timesheets/{id}:
 *   delete:
 *     tags: [Admin - Timesheets]
 *     summary: Delete a timesheet
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

module.exports = router;
