import { createSerializer } from '../../shared/serialization/serializer.js';

export const serializeHomepageBanner = createSerializer((plain) => ({
  id: plain._id,
  title: plain.title,
  subtitle: plain.subtitle ?? '',
  body: plain.body ?? '',
  ctaLabel: plain.ctaLabel ?? '',
  ctaHref: plain.ctaHref ?? '',
  locale: plain.locale,
  sortOrder: plain.sortOrder ?? 0,
  isActive: plain.isActive ?? true,
  activeFrom: plain.activeFrom ?? null,
  activeTo: plain.activeTo ?? null,
  imageFileId: plain.imageFileId ?? null,
  tenantId: plain.tenantId ?? null,
  createdByUserId: plain.createdByUserId ?? null,
  updatedByUserId: plain.updatedByUserId ?? null,
  createdAt: plain.createdAt,
  updatedAt: plain.updatedAt,
}));
