import type { AppLanguageId } from '@/constants/languages';

/** BCP-47 style tag for Intl (Dari → Afghanistan Persian). */
export function appLanguageToIntlLocale(lang: AppLanguageId): string {
  if (lang === 'ps') return 'ps-AF';
  if (lang === 'prs') return 'fa-AF';
  return 'en-GB';
}

export function shouldUseEasternArabicNumerals(lang: AppLanguageId): boolean {
  return lang !== 'en';
}

/**
 * Formats numbers with Eastern Arabic (۰–۹) digits for Pashto/Dari when supported.
 */
export function formatNumber(
  value: number,
  lang: AppLanguageId,
  options?: Intl.NumberFormatOptions,
): string {
  const locale = appLanguageToIntlLocale(lang);
  const opts: Intl.NumberFormatOptions = { ...options };
  if (shouldUseEasternArabicNumerals(lang)) {
    // Use Persian-style Eastern Arabic digits: ۰۱۲۳۴۵۶۷۸۹
    opts.numberingSystem = 'arabext';
  }
  try {
    return new Intl.NumberFormat(locale, opts).format(value);
  } catch {
    return String(value);
  }
}

export function formatPercent(value: number, lang: AppLanguageId, fractionDigits = 0): string {
  return formatNumber(value, lang, {
    style: 'percent',
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
}

export function formatDate(
  input: Date | number,
  lang: AppLanguageId,
  options?: Intl.DateTimeFormatOptions,
): string {
  const d = typeof input === 'number' ? new Date(input) : input;
  const locale = appLanguageToIntlLocale(lang);
  const opts: Intl.DateTimeFormatOptions = { ...options };
  if (shouldUseEasternArabicNumerals(lang)) {
    (opts as Intl.DateTimeFormatOptions & { numberingSystem?: string }).numberingSystem = 'arabext';
  }
  try {
    return new Intl.DateTimeFormat(locale, opts).format(d);
  } catch {
    return d.toISOString();
  }
}

export function formatDateMedium(input: Date | number, lang: AppLanguageId): string {
  return formatDate(input, lang, { year: 'numeric', month: 'short', day: 'numeric' });
}

const PS_MONTHS = [
  'جنوري',
  'فبروري',
  'مارچ',
  'اپریل',
  'مې',
  'جون',
  'جولای',
  'اګست',
  'سپتمبر',
  'اکتوبر',
  'نومبر',
  'دسمبر',
] as const;

const FA_MONTHS = [
  'جنوری',
  'فبروری',
  'مارچ',
  'اپریل',
  'می',
  'جون',
  'جولای',
  'آگست',
  'سپتمبر',
  'اکتوبر',
  'نوامبر',
  'دسمبر',
] as const;

/**
 * Public UI date format requirement for Pashto/Dari:
 * - month name + localized day + localized year, with Arabic comma (،)
 * - example: اپریل ۲۶، ۲۰۲۶
 */
/** Replace Western digits (0–9) with locale-appropriate digits (e.g. Eastern Arabic for ps/prs). */
export function localizeWesternDigitsInString(input: string, lang: AppLanguageId): string {
  if (lang === 'en') return input;
  return input.replace(/\d/g, (ch) => {
    const n = Number(ch);
    return Number.isNaN(n) ? ch : formatNumber(n, lang);
  });
}

export function formatDateMonthDayYear(input: Date | number, lang: AppLanguageId): string {
  const d = typeof input === 'number' ? new Date(input) : input;
  if (Number.isNaN(d.getTime())) return '—';
  if (lang === 'en') return formatDateMedium(d, lang);

  const monthIndex = d.getMonth();
  const month =
    (lang === 'ps' ? PS_MONTHS[monthIndex] : FA_MONTHS[monthIndex]) ??
    (lang === 'ps' ? PS_MONTHS[0] : FA_MONTHS[0]);

  const day = formatNumber(d.getDate(), lang);
  const year = formatNumber(d.getFullYear(), lang);
  return `${month} ${day}، ${year}`;
}

/** Re-export for callers that only have i18n code string. */
export function i18nCodeToIntlLocale(code: string): string {
  if (code === 'ps') return 'ps-AF';
  if (code === 'fa') return 'fa-AF';
  return 'en-GB';
}

export type { AppLanguageId };
export { appLanguageToI18n } from './locale-map';
