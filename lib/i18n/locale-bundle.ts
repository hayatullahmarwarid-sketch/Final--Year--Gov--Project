/**
 * Builds a locale bundle from English base + translated JSON that may still contain
 * `[PS] …` / `[FA] …` placeholders. Placeholder entries are skipped so the English base
 * string is used until a real translation is committed for that key.
 */
export function composeLocaleBundle(
  enFlat: Record<string, string>,
  translatedFlat: Record<string, string>,
  placeholderPrefix: '[PS] ' | '[FA] ',
): Record<string, string> {
  const out: Record<string, string> = { ...enFlat };
  for (const [k, v] of Object.entries(translatedFlat)) {
    if (typeof v !== 'string') continue;
    if (v.startsWith(placeholderPrefix)) continue;
    out[k] = v;
  }
  return out;
}
