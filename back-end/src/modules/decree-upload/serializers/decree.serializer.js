import { serializeDecreeCategory } from './decree-category.serializer.js';
import { serializeDecreeVersion } from './decree-version.serializer.js';

/**
 * @param {Record<string, unknown>} decree
 * @returns {string}
 */
export function buildDecreeNumberLabel(decree) {
  const seq = decree.categorySequence;
  if (typeof seq === 'number' && seq > 0) {
    return `#${seq}`;
  }
  const raw = String(decree.decreeNumber ?? '').trim();
  if (/^\d+$/.test(raw)) {
    return `#${raw}`;
  }
  return raw || '—';
}

/**
 * @param {Record<string, unknown>} decree
 * @param {{
 *   categories?: Record<string, unknown>[],
 *   currentPublishedVersion?: Record<string, unknown> | null,
 *   activeDraftVersion?: Record<string, unknown> | null,
 *   listStripVersionBodies?: boolean,
 * }} [embed]
 */
export function serializeDecree(decree, embed = {}) {
  const categories = (embed.categories ?? []).map((c) => serializeDecreeCategory(c));
  const uploadedBy =
    embed.createdByUser && typeof embed.createdByUser === 'object'
      ? String(embed.createdByUser.displayName ?? '').trim() || null
      : null;
  const meta =
    decree.metadata && typeof decree.metadata === 'object' && !Array.isArray(decree.metadata)
      ? decree.metadata
      : {};
  const refScheme = typeof meta.referenceScheme === 'string' ? meta.referenceScheme : '';
  const officialReference =
    refScheme === 'category_sequence'
      ? null
      : typeof meta.officialReference === 'string' && meta.officialReference.trim()
        ? meta.officialReference.trim()
        : typeof decree.decreeNumber === 'string'
          ? decree.decreeNumber.trim()
          : '';
  const departmentCodeMeta =
    typeof meta.departmentCode === 'string' && meta.departmentCode.trim() ? meta.departmentCode.trim() : null;
  return {
    id: String(decree._id),
    decreeNumber: decree.decreeNumber,
    decreeNumberLabel: buildDecreeNumberLabel(decree),
    officialReference: officialReference || null,
    departmentCode: departmentCodeMeta,
    categorySequence: typeof decree.categorySequence === 'number' ? decree.categorySequence : null,
    numberingCategoryId: decree.numberingCategoryId ? String(decree.numberingCategoryId) : null,
    titleSummary: decree.titleSummary,
    titlePs: typeof decree.titlePs === 'string' ? decree.titlePs : '',
    titleFa: typeof decree.titleFa === 'string' ? decree.titleFa : '',
    titleEn: typeof decree.titleEn === 'string' ? decree.titleEn : '',
    categoryIds: (decree.categoryIds ?? []).map((x) => String(x)),
    categories,
    tagKeys: decree.tagKeys ?? [],
    status: decree.status,
    lineageRootDecreeId: String(decree.lineageRootDecreeId),
    currentPublishedVersionId: decree.currentPublishedVersionId
      ? String(decree.currentPublishedVersionId)
      : null,
    activeDraftVersionId: decree.activeDraftVersionId ? String(decree.activeDraftVersionId) : null,
    supersededByDecreeId: decree.supersededByDecreeId ? String(decree.supersededByDecreeId) : null,
    effectiveFrom: decree.effectiveFrom ?? null,
    effectiveTo: decree.effectiveTo ?? null,
    publishedAt: decree.publishedAt ?? null,
    lastAmendedAt: decree.lastAmendedAt ?? null,
    creationDate: decree.creationDate ?? null,
    visibility: decree.visibility,
    tenantId: decree.tenantId ?? null,
    metadata: decree.metadata ?? null,
    metadataCompleteness: decree.metadataCompleteness
      ? {
          score: decree.metadataCompleteness.score,
          missingKeys: decree.metadataCompleteness.missingKeys ?? [],
          evaluatedAt: decree.metadataCompleteness.evaluatedAt ?? null,
        }
      : null,
    viewCount: typeof decree.viewCount === 'number' ? decree.viewCount : 0,
    downloadCount: typeof decree.downloadCount === 'number' ? decree.downloadCount : 0,
    primaryPdfPageCount:
      typeof decree.primaryPdfPageCount === 'number' && decree.primaryPdfPageCount >= 0
        ? decree.primaryPdfPageCount
        : null,
    currentPublishedVersion: serializeDecreeVersion(embed.currentPublishedVersion, {
      stripBodies: embed.listStripVersionBodies,
    }),
    activeDraftVersion: serializeDecreeVersion(embed.activeDraftVersion, {
      stripBodies: embed.listStripVersionBodies,
    }),
    createdAt: decree.createdAt ?? null,
    updatedAt: decree.updatedAt ?? null,
    uploadedBy,
  };
}
