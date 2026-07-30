'use strict';

const { Router } = require('express');
const controller = require('./content-pages.controller');
const { authenticate } = require('../../middlewares/auth.middleware');
const { authorize } = require('../../middlewares/rbac.middleware');
const { validate } = require('../../middlewares/validate.middleware');
const { LEVELS } = require('../../constants/roles');
const { SlugParamSchema, UpdatePageSchema } = require('./content-pages.validators');

const router = Router();
const canEdit = authorize(LEVELS.ADMIN, LEVELS.ADMIN1);

router.get('/', authenticate, controller.list);
router.get('/:slug', authenticate, validate({ params: SlugParamSchema }), controller.getBySlug);
router.put('/:slug', authenticate, canEdit,
  validate({ params: SlugParamSchema, body: UpdatePageSchema }), controller.update);

/**
 * @openapi
 * components:
 *   schemas:
 *     ContentPage:
 *       type: object
 *       properties:
 *         slug: { type: string, enum: [about-us, privacy-policy, terms-and-conditions] }
 *         title: { type: string, example: 'Privacy Policy' }
 *         content: { type: string, example: '<p>Policy content</p>' }
 *         updated_by: { type: integer, nullable: true }
 *         updated_at: { type: string, format: date-time }
 * /account/pages:
 *   get:
 *     tags: [My Account]
 *     summary: List My Account content pages
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: About Us, Privacy Policy and Terms & Conditions pages }
 * /account/pages/{slug}:
 *   get:
 *     tags: [My Account]
 *     summary: Get a My Account content page
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema: { type: string, enum: [about-us, privacy-policy, terms-and-conditions] }
 *     responses:
 *       200: { description: Requested content page }
 *   put:
 *     tags: [My Account]
 *     summary: Update a My Account content page
 *     description: Admin and Admin1 only.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema: { type: string, enum: [about-us, privacy-policy, terms-and-conditions] }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, content]
 *             properties:
 *               title: { type: string }
 *               content: { type: string }
 *     responses:
 *       200: { description: Updated content page }
 */
module.exports = router;
