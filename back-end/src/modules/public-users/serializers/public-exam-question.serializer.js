import { ExamQuestionType } from '../../shared/enums/exam-question-type.js';
import { shuffleArray } from '../lib/shuffle.js';

/**
 * @param {unknown} raw
 * @returns {'ps' | 'fa' | 'en'}
 */
function normalizeLocale(raw) {
  const k = String(raw ?? '').trim().toLowerCase();
  if (k === 'ps') return 'ps';
  if (k === 'fa' || k === 'prs' || k === 'dari') return 'fa';
  return 'en';
}

/**
 * Picks a localized string from legacy single-field or optional multi-field shapes.
 *
 * Supported shapes:
 * - `row[key]` string (legacy)
 * - `row[key]` object: `{ ps, fa, en }`
 * - `row[keyPs]`, `row[keyFa]`, `row[keyEn]` strings (optional)
 *
 * @param {Record<string, unknown>} row
 * @param {string} key
 * @param {'ps' | 'fa' | 'en'} locale
 * @param {string} [fallback]
 */
function pickLocalizedText(row, key, locale, fallback = '') {
  const base = row[key];
  if (typeof base === 'string' && base.trim()) return base.trim();
  if (base && typeof base === 'object' && !Array.isArray(base)) {
    const o = /** @type {Record<string, unknown>} */ (base);
    const v =
      locale === 'ps'
        ? o.ps ?? o.fa ?? o.en
        : locale === 'fa'
          ? o.fa ?? o.ps ?? o.en
          : o.en ?? o.ps ?? o.fa;
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  const ps = row[`${key}Ps`];
  const fa = row[`${key}Fa`];
  const en = row[`${key}En`];
  const candidates =
    locale === 'ps' ? [ps, fa, en] : locale === 'fa' ? [fa, ps, en] : [en, ps, fa];
  for (const c of candidates) {
    if (typeof c === 'string' && c.trim()) return c.trim();
  }
  return fallback;
}

/**
 * @param {Record<string, unknown>} q
 * @param {{ shuffleOptions?: boolean, includeExplanation?: boolean, locale?: string }} [opts]
 */
export function serializePublicExamQuestion(q, opts = {}) {
  const locale = normalizeLocale(opts.locale);
  let options =
    q.type === ExamQuestionType.MULTIPLE_CHOICE
      ? (q.options ?? []).map((o) => ({
          optionKey: o.optionKey,
          label: pickLocalizedText(o, 'label', locale, ''),
        }))
      : undefined;

  if (opts.shuffleOptions && options?.length) {
    options = shuffleArray(options);
  }

  return {
    id: String(q._id),
    order: q.order,
    type: q.type,
    stem: pickLocalizedText(q, 'stem', locale, ''),
    explanation: opts.includeExplanation ? q.explanation ?? null : null,
    options,
    points: q.points,
  };
}
