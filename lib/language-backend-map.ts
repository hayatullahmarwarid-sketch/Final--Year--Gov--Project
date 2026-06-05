import type { AppLanguageId } from '@/constants/languages';

/** API / DB locale codes for `preferredLanguage`. */
export type BackendPreferredLanguage = 'en' | 'ps' | 'fa';

export function appLanguageIdToBackendPreferred(id: AppLanguageId): BackendPreferredLanguage {
  if (id === 'prs') return 'fa';
  if (id === 'en') return 'en';
  return 'ps';
}

export function backendPreferredToAppLanguageId(code: string | null | undefined): AppLanguageId | null {
  const c = (code ?? '').trim().toLowerCase();
  if (c === 'en') return 'en';
  if (c === 'ps' || c === 'pus') return 'ps';
  if (c === 'fa' || c === 'prs' || c === 'per' || c === 'dari') return 'prs';
  return null;
}
