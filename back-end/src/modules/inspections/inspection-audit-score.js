/**
 * Compute a baseline audit score (0..100) from template + answers.
 *
 * Goal: produce a meaningful initial score BEFORE admin review, so inspector-admin UI
 * can show "Audit Score" and dashboards can compute Avg. Score from real submissions.
 *
 * Scoring model (deterministic, template-aware):
 * - Each template item contributes up to 1 point (with partial credit for ratings).
 * - "Yes/No" / checklist items: Yes = 1, No = 0 (captures compliance).
 * - Photo required: >=1 evidenceFileIds = 1 else 0.
 * - GPS: valid "lat, lng" string = 1 else 0.
 * - Signature: non-empty payload = 1 else 0.
 * - Dropdown/checkbox: >=1 selection = 1 else 0.
 * - Text/number/date: present (non-empty / finite) = 1 else 0.
 * - Rating: normalized using item.validation.min/max when present; otherwise assume 1..5.
 *
 * If template has 0 scorable items, score returns 0 (safe default).
 *
 * @param {{
 *   template: { sections?: unknown[] },
 *   answers: Array<Record<string, unknown>>
 * }} input
 */
export function computeInspectionAuditScore(input) {
  const template = input?.template ?? {};
  const answers = Array.isArray(input?.answers) ? input.answers : [];

  /** @type {Map<string, Record<string, unknown>>} */
  const answerByKey = new Map();
  for (const a of answers) {
    if (!a || typeof a !== 'object') continue;
    const sectionKey = String(a.sectionKey ?? '');
    const itemKey = String(a.itemKey ?? '');
    if (!sectionKey || !itemKey) continue;
    answerByKey.set(`${sectionKey}::${itemKey}`, /** @type {Record<string, unknown>} */ (a));
  }

  /** @type {Array<{ sectionKey: string, itemKey: string, type: string, required: boolean, validation?: { min?: number|null, max?: number|null } }>} */
  const items = [];
  const sections = /** @type {Array<{ sectionKey?: unknown, items?: unknown[] }>} */ (template.sections ?? []);
  for (const s of sections) {
    const sectionKey = String(s?.sectionKey ?? '');
    const rows = Array.isArray(s?.items) ? s.items : [];
    if (!sectionKey) continue;
    for (const it of rows) {
      const obj = /** @type {Record<string, unknown>} */ (it && typeof it === 'object' ? it : {});
      const itemKey = String(obj.itemKey ?? '');
      if (!itemKey) continue;
      const v = obj.validation && typeof obj.validation === 'object' ? obj.validation : undefined;
      const min = v && typeof v.min === 'number' && Number.isFinite(v.min) ? v.min : null;
      const max = v && typeof v.max === 'number' && Number.isFinite(v.max) ? v.max : null;
      items.push({
        sectionKey,
        itemKey,
        type: String(obj.type ?? 'text'),
        required: obj.required === true,
        validation: { min, max },
      });
    }
  }

  let earned = 0;
  let total = 0;

  const gpsLike = (t) => /^-?\d+(\.\d+)?,\s*-?\d+(\.\d+)?$/.test(String(t ?? '').trim());

  for (const it of items) {
    const key = `${it.sectionKey}::${it.itemKey}`;
    const ans = answerByKey.get(key);
    total += 1;
    if (!ans) continue;

    const valueText = ans.valueText != null ? String(ans.valueText).trim() : '';
    const valueNumberRaw = ans.valueNumber;
    const valueNumber = typeof valueNumberRaw === 'number' ? valueNumberRaw : Number(valueNumberRaw);
    const valueBoolean = ans.valueBoolean;
    const selectedOptionKeys = Array.isArray(ans.selectedOptionKeys) ? ans.selectedOptionKeys.map((x) => String(x)) : [];
    const evidenceFileIds = Array.isArray(ans.evidenceFileIds) ? ans.evidenceFileIds.map((x) => String(x)).filter(Boolean) : [];

    switch (it.type) {
      case 'checklist': {
        // Template supports both: boolean (legacy) and selectedOptionKeys ("yes"/"no").
        const yesSelected = selectedOptionKeys.some((k) => /^yes$/i.test(k));
        const noSelected = selectedOptionKeys.some((k) => /^no$/i.test(k));
        if (typeof valueBoolean === 'boolean') {
          earned += valueBoolean ? 1 : 0;
        } else if (yesSelected) {
          earned += 1;
        } else if (noSelected) {
          earned += 0;
        } else {
          // answered-but-unknown stays 0
          earned += 0;
        }
        break;
      }
      case 'checkbox':
      case 'dropdown': {
        earned += selectedOptionKeys.length > 0 ? 1 : 0;
        break;
      }
      case 'photo_required':
      case 'photo': {
        earned += evidenceFileIds.length > 0 ? 1 : 0;
        break;
      }
      case 'gps': {
        earned += gpsLike(valueText) ? 1 : 0;
        break;
      }
      case 'signature': {
        earned += valueText.length > 0 ? 1 : 0;
        break;
      }
      case 'date': {
        earned += valueText.length > 0 || ans.valueDate != null ? 1 : 0;
        break;
      }
      case 'number': {
        earned += Number.isFinite(valueNumber) ? 1 : 0;
        break;
      }
      case 'rating': {
        const min = typeof it.validation?.min === 'number' ? it.validation.min : 1;
        const max = typeof it.validation?.max === 'number' ? it.validation.max : 5;
        if (!Number.isFinite(valueNumber) || max <= min) {
          earned += 0;
        } else {
          const clamped = Math.max(min, Math.min(max, valueNumber));
          earned += (clamped - min) / (max - min);
        }
        break;
      }
      case 'text':
      default: {
        earned += valueText.length > 0 ? 1 : 0;
        break;
      }
    }
  }

  if (total <= 0) return 0;
  const pct = Math.round((earned / total) * 100);
  return Math.max(0, Math.min(100, pct));
}

