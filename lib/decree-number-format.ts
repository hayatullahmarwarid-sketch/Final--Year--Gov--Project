import type { AppLanguageId } from '@/constants/languages';
import type { SerializedDecree } from '@/lib/api/decree-upload';
import { localizeWesternDigitsInString } from '@/lib/i18n/format';

/** Public-safe fields for any decree row (API or dashboard DTO). */
export type DecreeNumberDisplayInput = {
  decreeNumber: string;
  /** Present when back-end provides normalized label. */
  decreeNumberLabel?: string;
  /** Per–numbering category sequence (1…n) when not legacy. */
  categorySequence?: number | null;
};

/**
 * User-facing label: `#1` … `#n` for per-category numbering, `#123` for legacy plain numeric, else raw.
 */
export function formatDecreeNumberLabel(d: DecreeNumberDisplayInput | SerializedDecree): string {
  if (d.decreeNumberLabel && String(d.decreeNumberLabel).trim()) {
    return String(d.decreeNumberLabel).trim();
  }
  const seq = 'categorySequence' in d ? d.categorySequence : undefined;
  if (typeof seq === 'number' && seq > 0) {
    return `#${seq}`;
  }
  const raw = String(d.decreeNumber ?? '').trim();
  if (/^\d+$/.test(raw)) {
    return `#${raw}`;
  }
  return raw || '—';
}

/** Localized digits for decree labels (`#12` → `#۱۲` in ps/prs). */
export function formatDecreeNumberLabelLocalized(d: DecreeNumberDisplayInput | SerializedDecree, lang: AppLanguageId): string {
  return localizeWesternDigitsInString(formatDecreeNumberLabel(d), lang);
}
