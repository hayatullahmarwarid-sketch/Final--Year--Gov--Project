import type { LocalizedContentBlock, SerializedDecree } from '@/lib/api/decree-upload';

/**
 * Keep only fields the decree-upload API accepts (`localizedBlockSchema`).
 * List endpoints sometimes return stripped stubs (`hasTitle`, `hasBody`, …); spreading those
 * into PATCH bodies triggers Zod "Unrecognized key(s)".
 */
export function pickApiLocalizedBlock(b: LocalizedContentBlock | Record<string, unknown>): LocalizedContentBlock | null {
  if (!b || typeof b !== 'object' || Array.isArray(b)) return null;
  const locale = String((b as { locale?: unknown }).locale ?? '').trim();
  if (!locale) return null;
  const out: LocalizedContentBlock = { locale };
  if ('title' in b) {
    const t = (b as { title?: unknown }).title;
    out.title = t == null ? null : String(t).trim().slice(0, 500) || null;
  }
  if ('bodyPlain' in b) {
    const t = (b as { bodyPlain?: unknown }).bodyPlain;
    out.bodyPlain = t == null ? null : String(t);
  }
  if ('bodyRich' in b) {
    const t = (b as { bodyRich?: unknown }).bodyRich;
    out.bodyRich = t == null ? null : String(t);
  }
  return out;
}

/**
 * Generate a URL-safe slug for a category name.
 * For non-Latin (e.g. Pashto / Dari) input, falls back to a short timestamp slug
 * so that the backend's `/^[a-z0-9]+(?:-[a-z0-9]+)*$/i` constraint is satisfied.
 */
export function slugifyCategoryName(name: string): string {
  const s = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (s.length > 0) return s.slice(0, 120);
  return 'cat-' + Date.now().toString(36);
}

/** Build localized content blocks for Pashto and Dari content (English dropped from upload forms). */
export function buildLocalizedBlocks(ps: string, dr: string, en = ''): LocalizedContentBlock[] {
  const out: LocalizedContentBlock[] = [];
  if (ps.trim()) out.push({ locale: 'ps', bodyPlain: ps.trim() });
  if (dr.trim()) out.push({ locale: 'fa', bodyPlain: dr.trim() });
  if (en.trim()) out.push({ locale: 'en', bodyPlain: en.trim() });
  return out;
}

/** Plain body for one locale from version blocks (edit forms). */
export function localePlainFromBlocks(blocks: LocalizedContentBlock[] | undefined | null, locale: string): string {
  if (!blocks?.length) return '';
  const b = blocks.find((x) => x.locale === locale);
  const raw = b?.bodyPlain ?? b?.bodyRich;
  return typeof raw === 'string' ? raw : '';
}

/**
 * Baseline blocks for editing: amendment draft when present, otherwise the published version.
 */
export function pickLocalizedBaselineBlocks(d: SerializedDecree): LocalizedContentBlock[] {
  if (d.activeDraftVersionId) {
    const draft = d.activeDraftVersion?.localizedContent;
    return Array.isArray(draft) ? (draft as LocalizedContentBlock[]) : [];
  }
  const pub = d.currentPublishedVersion?.localizedContent;
  return Array.isArray(pub) ? (pub as LocalizedContentBlock[]) : [];
}

/**
 * Merge Pashto / Dari inputs into baseline so other locales and titles are preserved,
 * and cleared fields update `bodyPlain` without dropping unrelated locales.
 */
export function mergeLocalizedContentForEdit(
  baseline: LocalizedContentBlock[],
  ps: string,
  fa: string,
  en = '',
): LocalizedContentBlock[] {
  const map = new Map<string, LocalizedContentBlock>();
  for (const b of baseline) {
    const picked = pickApiLocalizedBlock(b);
    if (picked) map.set(picked.locale, picked);
  }
  const upsert = (locale: string, text: string) => {
    const trimmed = text.trim();
    const prev = map.get(locale);
    if (!trimmed && !prev) return;
    const next: LocalizedContentBlock = {
      locale,
      bodyPlain: trimmed ? trimmed : null,
    };
    if (prev?.title != null) next.title = prev.title;
    if (prev?.bodyRich != null) next.bodyRich = prev.bodyRich;
    map.set(locale, next);
  };
  upsert('ps', ps);
  upsert('fa', fa);
  upsert('en', en);
  return Array.from(map.values());
}

export function statusLabel(status: string): string {
  switch (status) {
    case 'active':
      return 'published';
    case 'draft':
      return 'draft';
    case 'archived':
      return 'archived';
    case 'superseded':
      return 'superseded';
    default:
      return status;
  }
}
