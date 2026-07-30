'use strict';

const { z } = require('zod');

const PAGE_SLUGS = ['about-us', 'privacy-policy', 'terms-and-conditions'];

const SlugParamSchema = z.object({
  slug: z.enum(PAGE_SLUGS),
});

const UpdatePageSchema = z.object({
  title: z.string().trim().min(1).max(255),
  content: z.string().max(100000).default(''),
});

module.exports = { PAGE_SLUGS, SlugParamSchema, UpdatePageSchema };
