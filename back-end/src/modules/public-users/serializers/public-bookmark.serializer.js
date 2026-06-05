import { buildDecreeNumberLabel } from '../../decree-upload/serializers/decree.serializer.js';

/**
 * @param {Record<string, unknown>} row
 * @param {{ decree?: Record<string, unknown> | null }} [embed]
 */
export function serializePublicBookmark(row, embed = {}) {
  return {
    id: String(row._id),
    decreeId: String(row.decreeId),
    ownerUserId: String(row.ownerUserId),
    decree: embed.decree
      ? {
          id: String(embed.decree._id),
          decreeNumber: embed.decree.decreeNumber,
          decreeNumberLabel: buildDecreeNumberLabel(embed.decree),
          titleSummary: embed.decree.titleSummary,
          titlePs: embed.decree.titlePs ?? '',
          titleFa: embed.decree.titleFa ?? '',
          titleEn: embed.decree.titleEn ?? '',
          status: embed.decree.status,
          publishedAt: embed.decree.publishedAt ?? null,
          primaryPdfPageCount:
            typeof embed.decree.primaryPdfPageCount === 'number' && embed.decree.primaryPdfPageCount >= 0
              ? embed.decree.primaryPdfPageCount
              : null,
        }
      : null,
    tenantId: row.tenantId ?? null,
    createdAt: row.createdAt ?? null,
    updatedAt: row.updatedAt ?? null,
  };
}
