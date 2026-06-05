import { z } from 'zod';

const optionalIsoDate = z
  .union([z.string(), z.date(), z.number()])
  .optional()
  .transform((v) => {
    if (v === undefined || v === null || v === '') return undefined;
    const d = v instanceof Date ? v : new Date(v);
    if (Number.isNaN(d.getTime())) return undefined;
    return d;
  });

export const listQueryBaseObjectSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  /** Preferred page size key for new endpoints. */
  limit: z.coerce.number().int().min(1).max(100).optional(),
  /** @deprecated Prefer `limit`; kept for older clients. */
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
  /** Comma-separated fields, optional `-` prefix for descending (e.g. `-createdAt,title`). */
  sort: z.string().trim().max(200).optional(),
  search: z.string().trim().max(200).optional(),
  from: optionalIsoDate,
  to: optionalIsoDate,
  /** Opaque string; modules narrow with z.enum locally. */
  status: z.string().trim().max(64).optional(),
});

/**
 * @param {{ pageSize?: number, limit?: number }} q
 */
export function normalizeListLimit(q) {
  const { pageSize, limit, ...rest } = q;
  return { ...rest, limit: limit ?? pageSize ?? 20 };
}

/**
 * Cross-cutting list query fields. Domain routes extend `listQueryBaseObjectSchema`
 * and reuse `normalizeListLimit` so pagination defaults stay consistent.
 */
export const listQueryBaseSchema = listQueryBaseObjectSchema.transform(normalizeListLimit);

/**
 * @param {import('zod').ZodRawShape} shape
 */
export function extendListQuery(shape) {
  return listQueryBaseObjectSchema.extend(shape).transform(normalizeListLimit);
}

/** Pagination-only slice (before `limit` defaulting); prefer `listQueryBaseSchema` for new code. */
export const listPaginationInputSchema = listQueryBaseObjectSchema.pick({
  page: true,
  limit: true,
  pageSize: true,
});
