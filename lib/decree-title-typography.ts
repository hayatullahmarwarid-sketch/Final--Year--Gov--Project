import type { AppLanguageId } from '@/constants/languages';

/** Arabic, Arabic Supplement, Arabic Extended-A, Arabic Presentation Forms-A/B */
const ARABIC_SCRIPT_RE = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

/** Pick paragraph direction for mixed UI + decree text (legacy helpers). */
export function decreeTitleWritingDirection(title: string, uiLanguage: AppLanguageId): 'ltr' | 'rtl' {
  if (uiLanguage !== 'en') return 'rtl';
  return ARABIC_SCRIPT_RE.test(title) ? 'rtl' : 'ltr';
}

function trimStr(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

/**
 * Public-facing decree title for the current UI language, with graceful fallbacks
 * when older decrees only have `titleSummary`.
 */
export function pickPublicDecreeTitleFromRow(row: Record<string, unknown>, uiLanguage: AppLanguageId): string {
  const ts = trimStr(row.titleSummary);
  const ps = trimStr(row.titlePs);
  const fa = trimStr(row.titleFa);
  const en = trimStr(row.titleEn);
  if (uiLanguage === 'en') return en || ts || ps || fa;
  if (uiLanguage === 'prs') return fa || ts || ps || en;
  return ps || ts || fa || en;
}
