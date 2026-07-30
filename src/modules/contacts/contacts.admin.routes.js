'use strict';

const { Router } = require('express');
const ctrl = require('./contacts.controller');
const { authenticate } = require('../../middlewares/auth.middleware');
const { authorize } = require('../../middlewares/rbac.middleware');
const { validate } = require('../../middlewares/validate.middleware');
const { LEVELS } = require('../../constants/roles');
const {
  ListQuerySchema,
  IdParamSchema,
  CreateSchema,
  UpdateSchema,
} = require('./contacts.validators');

const router = Router();
const canManage = authorize(LEVELS.ADMIN, LEVELS.ADMIN1);
const canDelete = authorize(LEVELS.ADMIN);

/**
 * @openapi
 * /admin/contacts:
 *   get:
 *     tags: [Admin - Contacts]
 *     summary: List directory contacts
 *     description: Lists the same `hr`-backed directory shown to employees. Supports legacy first-name and surname prefix filters.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: page, schema: { type: integer, default: 1 } }
 *       - { in: query, name: limit, schema: { type: integer, default: 10 } }
 *       - { in: query, name: firstname, schema: { type: string } }
 *       - { in: query, name: surname, schema: { type: string } }
 *     responses:
 *       200: { description: Paginated contact list }
 *   post:
 *     tags: [Admin - Contacts]
 *     summary: Add directory contact
 *     description: Creates a minimal `hr` record for a company directory contact. This does not create a login account.
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [employeeid, firstname, surname]
 *             properties:
 *               employeeid: { type: string, example: '00060' }
 *               firstname: { type: string, example: 'Jane' }
 *               surname: { type: string, example: 'Smith' }
 *               phone: { type: string, example: '07700 900123' }
 *               email: { type: string, format: email, example: 'jane.smith@ltraffic.co.uk' }
 *               jobtitle: { type: string, example: 'Traffic Operative' }
 *               linemanager: { type: string, example: 'Anthony Louch' }
 *               location: { type: string, example: 'Head Office' }
 *     responses:
 *       201: { description: Contact created }
 *       409: { description: Employee ID already exists }
 */
router.get('/', authenticate, canManage, validate({ query: ListQuerySchema }), ctrl.list);
router.post('/', authenticate, canManage, validate({ body: CreateSchema }), ctrl.create);

/**
 * @openapi
 * /admin/contacts/{id}:
 *   get:
 *     tags: [Admin - Contacts]
 *     summary: Get directory contact
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     responses:
 *       200: { description: Contact detail }
 *       404: { description: Contact not found }
 *   put:
 *     tags: [Admin - Contacts]
 *     summary: Edit directory contact
 *     description: 'Updates only directory fields: employee ID, name, company phone/email, job title, line manager and location.'
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               employeeid: { type: string }
 *               firstname: { type: string }
 *               surname: { type: string }
 *               phone: { type: string }
 *               email: { type: string, format: email }
 *               jobtitle: { type: string }
 *               linemanager: { type: string }
 *               location: { type: string }
 *     responses:
 *       200: { description: Contact updated }
 *       404: { description: Contact not found }
 *   delete:
 *     tags: [Admin - Contacts]
 *     summary: Remove directory contact
 *     description: Permanently removes the underlying `hr` record. Available to full Admin only.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     responses:
 *       204: { description: Contact removed }
 *       404: { description: Contact not found }
 */
router.get('/:id', authenticate, canManage, validate({ params: IdParamSchema }), ctrl.getById);
router.put('/:id', authenticate, canManage, validate({ params: IdParamSchema, body: UpdateSchema }), ctrl.update);
router.delete('/:id', authenticate, canDelete, validate({ params: IdParamSchema }), ctrl.remove);

module.exports = router;