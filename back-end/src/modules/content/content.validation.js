import { z } from 'zod';
import { extendListQuery } from '../shared/query/list-query.schema.js';
import { objectIdString } from '../shared/validation/zod-helpers.js';
import { STATIC_PAGE_STATUS_KEYS } from '../shared/enums/static-page-status.js';

export const listContentPagesQuerySchema = extendListQuery({
  locale: z.string().trim().min(2).max(16).optional(),
  slug: z.string().trim().min(1).max(120).optional(),
  tag: z.string().trim().min(1).max(64).optional(),
  /** Narrow CMS rows without colliding with the generic list `status` query field. */
  pageStatus: z.enum([...STATIC_PAGE_STATUS_KEYS]).optional(),
  publishedOnly: z.coerce.boolean().default(false),
  tenantId: z.string().trim().max(64).nullable().optional(),
});

export const createContentPageBodySchema = z.object({
  slug: z.string().trim().min(1).max(120),
  locale: z.string().trim().min(2).max(16).default('ps'),
  title: z.string().trim().min(1).max(300),
  body: z.string().min(1).max(200000),
  status: z.enum([...STATIC_PAGE_STATUS_KEYS]).default('draft'),
  publishedAt: z.coerce.date().nullable().optional(),
  sortOrder: z.coerce.number().int().min(0).max(1_000_000).optional(),
  tags: z.array(z.string().trim().min(1).max(64)).max(40).optional(),
  tenantId: z.string().trim().max(64).nullable().optional(),
});

export const patchContentPageBodySchema = z
  .object({
    slug: z.string().trim().min(1).max(120).optional(),
    locale: z.string().trim().min(2).max(16).optional(),
    title: z.string().trim().min(1).max(300).optional(),
    body: z.string().min(1).max(200000).optional(),
    status: z.enum([...STATIC_PAGE_STATUS_KEYS]).optional(),
    publishedAt: z.coerce.date().nullable().optional(),
    sortOrder: z.coerce.number().int().min(0).max(1_000_000).optional(),
    tags: z.array(z.string().trim().min(1).max(64)).max(40).optional(),
    tenantId: z.string().trim().max(64).nullable().optional(),
  })
  .refine((o) => Object.keys(o).length > 0, { message: 'At least one field is required' });

export const contentPageIdParamSchema = z.object({
  id: objectIdString,
});

export const getContentPageByIdQuerySchema = z.object({
  publishedOnly: z.coerce.boolean().default(false),
});

export const listHomepageBannersQuerySchema = extendListQuery({
  locale: z.string().trim().min(2).max(16).optional(),
  publishedOnly: z.coerce.boolean().default(false),
  tenantId: z.string().trim().max(64).nullable().optional(),
});

export const createHomepageBannerBodySchema = z.object({
  title: z.string().trim().min(1).max(200),
  subtitle: z.string().trim().max(300).optional(),
  body: z.string().trim().max(8000).optional(),
  ctaLabel: z.string().trim().max(120).optional(),
  ctaHref: z.string().trim().max(2000).optional(),
  locale: z.string().trim().min(2).max(16).default('ps'),
  sortOrder: z.coerce.number().int().min(0).max(1_000_000).optional(),
  isActive: z.coerce.boolean().optional(),
  activeFrom: z.coerce.date().nullable().optional(),
  activeTo: z.coerce.date().nullable().optional(),
  imageFileId: objectIdString.optional(),
  tenantId: z.string().trim().max(64).nullable().optional(),
});

export const patchHomepageBannerBodySchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    subtitle: z.string().trim().max(300).optional(),
    body: z.string().trim().max(8000).optional(),
    ctaLabel: z.string().trim().max(120).optional(),
    ctaHref: z.string().trim().max(2000).optional(),
    locale: z.string().trim().min(2).max(16).optional(),
    sortOrder: z.coerce.number().int().min(0).max(1_000_000).optional(),
    isActive: z.coerce.boolean().optional(),
    activeFrom: z.coerce.date().nullable().optional(),
    activeTo: z.coerce.date().nullable().optional(),
    imageFileId: objectIdString.nullable().optional(),
    tenantId: z.string().trim().max(64).nullable().optional(),
  })
  .refine((o) => Object.keys(o).length > 0, { message: 'At least one field is required' });

export const homepageBannerIdParamSchema = z.object({
  id: objectIdString,
});
