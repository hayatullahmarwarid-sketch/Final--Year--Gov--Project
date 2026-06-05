import type { AppLanguageId } from '@/constants/languages';

/** i18next resource language codes (Dari uses `fa`). */
export function appLanguageToI18n(lang: AppLanguageId): 'en' | 'ps' | 'fa' {
  if (lang === 'prs') return 'fa';
  return lang;
}
