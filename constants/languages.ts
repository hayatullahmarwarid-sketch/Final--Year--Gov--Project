export type AppLanguageId = 'ps' | 'prs' | 'en';

export type AppLanguageOption = {
  id: AppLanguageId;
  regionCode: string;
  nativeName: string;
  englishName: string;
};

export const APP_LANGUAGES: AppLanguageOption[] = [
  { id: 'ps', regionCode: 'AF', nativeName: 'پښتو', englishName: 'Pashto' },
  { id: 'prs', regionCode: 'AF', nativeName: 'دری', englishName: 'Dari' },
];

export function appLanguageEnglishName(id: AppLanguageId): string {
  return APP_LANGUAGES.find((l) => l.id === id)?.englishName ?? 'Pashto';
}

/** Maps portal / BCP-style locale codes from the API to in-app language ids. */
export function portalLocaleCodeToAppId(code: string): AppLanguageId | null {
  const c = code.trim().toLowerCase();
  if (c === 'ps' || c === 'pus') return 'ps';
  if (c === 'en' || c === 'eng') return 'en';
  if (c === 'prs' || c === 'fa' || c === 'per' || c === 'dari') return 'prs';
  return null;
}

/** Builds selectable options in server order; skips unknown locale codes. */
export function orderedLanguageOptionsFromPortal(supportedPortalCodes: string[]): AppLanguageOption[] {
  const seen = new Set<AppLanguageId>();
  const out: AppLanguageOption[] = [];
  for (const code of supportedPortalCodes) {
    const id = portalLocaleCodeToAppId(code);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const opt = APP_LANGUAGES.find((l) => l.id === id);
    if (opt) out.push(opt);
  }
  return out;
}
