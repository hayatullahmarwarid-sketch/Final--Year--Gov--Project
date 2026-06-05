/**
 * MCQ / question-bank utilities — works with any script (Latin, Pashto, Arabic, digits, etc.).
 * Avoid relying on ASCII-only matching or naive comma split when labels may include commas.
 */

/**
 * One option per line, OR a single line split on common comma characters (incl. Arabic / fullwidth).
 */
export function parseOptionLabels(raw: string): string[] {
  const t = raw.trim();
  if (!t) return [];
  const byLine = t.split(/\r?\n/);
  const nonEmptyLines = byLine.map((s) => s.trim()).filter(Boolean);
  if (nonEmptyLines.length > 1) return nonEmptyLines;
  if (nonEmptyLines.length === 1) {
    // ASCII comma, Arabic comma U+060C, fullwidth U+FF0C, some locales use "؛" wrong for lists — use commas only
    return nonEmptyLines[0]
      .split(/[,，،٫，]/u)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

/**
 * True if two option labels are the same response (Unicode normalize + case-fold where applicable).
 */
export function optionLabelEquals(a: string, b: string): boolean {
  if (a === b) return true;
  const x = a.trim().normalize('NFC');
  const y = b.trim().normalize('NFC');
  if (x === y) return true;
  // Case-insensitive for scripts that have case; accent-insensitive where supported
  try {
    if (x.localeCompare(y, undefined, { sensitivity: 'accent' }) === 0) return true;
  } catch {
    // ignore
  }
  return x.localeCompare(y, undefined, { sensitivity: 'base' }) === 0;
}

/** `a`…`z`, then `k26`, `k27`, … (avoids non-letter code points after `z`). */
export function optionKeyForIndex(i: number): string {
  if (i < 0) return 'a';
  if (i < 26) return String.fromCharCode(97 + i);
  return `k${i}`;
}

/**
 * Map accepted answer labels to API `optionKey` values in option order.
 * Returns `null` if a label has no matching option.
 */
export function mapAcceptedLabelsToOptionKeys(
  optionLabels: string[],
  acceptedLabels: string[],
): string[] | null {
  const keys: string[] = [];
  const seen = new Set<string>();
  for (const label of acceptedLabels) {
    if (!label.trim()) continue;
    const idx = optionLabels.findIndex((o) => optionLabelEquals(o, label));
    if (idx < 0) return null;
    const key = optionKeyForIndex(idx);
    if (!seen.has(key)) {
      seen.add(key);
      keys.push(key);
    }
  }
  return keys.length > 0 ? keys : null;
}

/** For short-answer autograde: trim + normalize; base-insensitive where supported. */
export type McqBuildResult =
  | { ok: true; options: { optionKey: string; label: string }[]; correctOptionKeys: string[] }
  | { ok: false; error: string };

/**
 * From raw option labels and one or more accepted answer labels, build API option rows + `correctOptionKeys`.
 */
export function buildMcqForApi(
  optionLabels: string[],
  correctAnswer: string,
  additionalCorrectLabels?: string[],
): McqBuildResult {
  const labels = optionLabels.map((s) => s.trim()).filter(Boolean);
  if (labels.length < 1) {
    return { ok: false, error: 'At least one option is required for multiple choice.' };
  }
  const acc = [correctAnswer.trim(), ...((additionalCorrectLabels ?? []).map((s) => s.trim()).filter(Boolean))].filter(
    Boolean,
  );
  const unique: string[] = [];
  for (const a of acc) {
    if (unique.some((u) => optionLabelEquals(u, a))) continue;
    unique.push(a);
  }
  if (unique.length < 1) {
    return { ok: false, error: 'A correct answer is required.' };
  }
  const keys = mapAcceptedLabelsToOptionKeys(labels, unique);
  if (keys == null) {
    return {
      ok: false,
      error: 'The correct answer must match one of the options exactly (any language or script).',
    };
  }
  const options = labels.map((label, i) => ({
    optionKey: optionKeyForIndex(i),
    label,
  }));
  return { ok: true, options, correctOptionKeys: keys };
}
