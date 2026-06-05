import { createSerializer } from '../../shared/serialization/serializer.js';

export const serializeContentPage = createSerializer((plain) => ({
  id: plain._id,
  slug: plain.slug,
  locale: plain.locale,
  title: plain.title,
  body: plain.body,
  status: plain.status,
  publishedAt: plain.publishedAt ?? null,
  sortOrder: plain.sortOrder ?? 0,
  tags: plain.tags ?? [],
  tenantId: plain.tenantId ?? null,
  createdByUserId: plain.createdByUserId ?? null,
  updatedByUserId: plain.updatedByUserId ?? null,
  createdAt: plain.createdAt,
  updatedAt: plain.updatedAt,
}));
