'use strict';

const { Router } = require('express');
const ctrl = require('./contacts.controller');
const { authenticate } = require('../../middlewares/auth.middleware');
const { validate } = require('../../middlewares/validate.middleware');
const {
  ListQuerySchema,
  IdParamSchema,
} = require('./contacts.validators');

const router = Router();

/* ──────────────────────────────────────────────────────────────
 *  Reusable schemas — contacts module
 * ────────────────────────────────────────────────────────────── */

/**
 * @openapi
 * components:
 *   schemas:
 *     ContactEmployee:
 *       type: object
 *       description: Employee contact directory entry from the `hr` table.
 *       required: [id, employeeid, name]
 *       properties:
 *         id:
 *           type: integer
 *           description: 'Primary key from `hr.id`.'
 *           example: 42
 *         employeeid:
 *           type: string
 *           description: 'Company employee ID.'
 *           example: '00012'
 *         name:
 *           type: string
 *           description: 'Full name (`firstname` + `surname`).'
 *           example: 'Dean Louch'
 *         phone:
 *           type: string
 *           nullable: true
 *           description: 'Company phone number.'
 *           example: '07700 900123'
 *         email:
 *           type: string
 *           nullable: true
 *           description: 'Company email.'
 *           example: 'dl@ltraffic.co.uk'
 *         jobtitle:
 *           type: string
 *           nullable: true
 *           description: 'Job title.'
 *           example: 'Driving Operative'
 *         linemanager:
 *           type: string
 *           nullable: true
 *           description: 'Line manager name.'
 *           example: 'Anthony Louch'
 *         location:
 *           type: string
 *           nullable: true
 *           description: 'Office or site location.'
 *           example: 'Head Office'
 *         photo_url:
 *           type: string
 *           nullable: true
 *           description: 'Full URL to employee photo. Null if no photo set.'
 *           example: 'http://192.168.1.100/admin/employeephoto/DeanLouch.jpg'
 */

/* ──────────────────────────────────────────────────────────────
 *  GET /employee/contacts
 * ────────────────────────────────────────────────────────────── */

/**
 * @openapi
 * /employee/contacts:
 *   get:
 *     operationId: employeeListContacts
 *     tags: [Contacts]
 *     summary: List employee contact directory
 *     security:
 *       - bearerAuth: []
 *     description: Returns paginated employee directory. Search by first name or surname (prefix match). Sorted by `employeeid ASC`.
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: 'Page number (1-based).'
 *         example: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: 'Items per page. Max 100.'
 *         example: 20
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: 'Prefix match on first name or surname.'
 *         example: 'dea'
 *     responses:
 *       200:
 *         description: Paginated contact list.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/ContactEmployee' }
 *                 meta: { $ref: '#/components/schemas/PaginationMeta' }
 *             example:
 *               success: true
 *               data:
 *                 - id: 42
 *                   employeeid: '00012'
 *                   name: 'Dean Louch'
 *                   phone: '07700 900123'
 *                   email: 'dl@ltraffic.co.uk'
 *                   jobtitle: 'Driving Operative'
 *                   linemanager: 'Anthony Louch'
 *                   location: 'Head Office'
 *                   photo_url: 'http://192.168.1.100/admin/employeephoto/DeanLouch.jpg'
 *                 - id: 43
 *                   employeeid: '00013'
 *                   name: 'Steve Toth'
 *                   phone: '07700 900124'
 *                   email: 'st@ltraffic.co.uk'
 *                   jobtitle: 'Operative'
 *                   linemanager: 'Anthony Louch'
 *                   location: 'Head Office'
 *                   photo_url: null
 *               meta:
 *                 page: 1
 *                 limit: 20
 *                 total: 47
 *       401:
 *         $ref: '#/components/responses/Unauthorized401'
 *       422:
 *         $ref: '#/components/responses/ValidationError422'
 */
router.get('/',
  authenticate,
  validate({ query: ListQuerySchema }),
  ctrl.list,
);

/* ──────────────────────────────────────────────────────────────
 *  GET /employee/contacts/{id}
 * ────────────────────────────────────────────────────────────── */

/**
 * @openapi
 * /employee/contacts/{id}:
 *   get:
 *     operationId: employeeGetContact
 *     tags: [Contacts]
 *     summary: Get contact by ID
 *     security:
 *       - bearerAuth: []
 *     description: Returns full details of a single employee contact by `hr.id`.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: 'HR record primary key.'
 *         example: 42
 *     responses:
 *       200:
 *         description: Contact detail.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { $ref: '#/components/schemas/ContactEmployee' }
 *             example:
 *               success: true
 *               data:
 *                 id: 42
 *                 employeeid: '00012'
 *                 name: 'Dean Louch'
 *                 phone: '07700 900123'
 *                 email: 'dl@ltraffic.co.uk'
 *                 jobtitle: 'Driving Operative'
 *                 linemanager: 'Anthony Louch'
 *                 location: 'Head Office'
 *                 photo_url: 'http://192.168.1.100/admin/employeephoto/DeanLouch.jpg'
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
  ctrl.getById,
);

module.exports = router;
