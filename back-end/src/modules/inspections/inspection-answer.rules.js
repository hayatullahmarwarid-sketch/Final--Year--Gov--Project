import { AppError } from '../../core/errors/app-error.js';
import { HttpStatus } from '../../core/errors/http-status.js';

/**
 * @param {unknown} template
 * @param {string} sectionKey
 * @param {string} itemKey
 */
function findTemplateItem(template, sectionKey, itemKey) {
  const sections = /** @type {Array<{ sectionKey: string, items?: unknown[] }>} */ (template?.sections ?? []);
  for (const section of sections) {
    if (section.sectionKey !== sectionKey) continue;
    const items = /** @type {Array<{ itemKey: string, type: string, required?: boolean, options?: Array<{ optionKey: string }>, validation?: { min?: number | null, max?: number | null, pattern?: string | null } }>} */ (
      section.items ?? []
    );
    for (const item of items) {
      if (item.itemKey === itemKey) return item;
    }
  }
  return null;
}

/**
 * Draft/partial saves: template keys must exist; duplicates forbidden. Does not enforce required coverage.
 *
 * @param {{
 *   template: { revision: number, sections?: unknown[] },
 *   templateRevisionSnapshot: number,
 *   answers: Array<{ sectionKey: string, itemKey: string }>,
 * }} input
 */
export function assertInspectionDraftAnswersPartial(input) {
  const { template, templateRevisionSnapshot, answers } = input;

  if (template.revision !== templateRevisionSnapshot) {
    throw new AppError('Assignment template revision does not match the current template head.', {
      statusCode: HttpStatus.CONFLICT,
      code: 'INSPECTION_TEMPLATE_REVISION_MISMATCH',
    });
  }

  const expectedKeys = new Set();
  for (const section of template.sections ?? []) {
    for (const item of section.items ?? []) {
      expectedKeys.add(`${section.sectionKey}::${item.itemKey}`);
    }
  }

  const seen = new Set();
  for (const row of answers) {
    const k = `${row.sectionKey}::${row.itemKey}`;
    if (!expectedKeys.has(k)) {
      throw new AppError('Submission contains keys that are not present on the inspection template.', {
        statusCode: HttpStatus.BAD_REQUEST,
        code: 'INSPECTION_SUBMISSION_UNKNOWN_ITEM',
      });
    }
    if (seen.has(k)) {
      throw new AppError('Submission contains duplicate answers for the same template item.', {
        statusCode: HttpStatus.BAD_REQUEST,
        code: 'INSPECTION_SUBMISSION_DUPLICATE_ITEM',
      });
    }
    seen.add(k);
  }
}

/**
 * @param {unknown} v
 * @returns {Date | null}
 */
function coerceDate(v) {
  if (v === undefined || v === null) return null;
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Validates answer payloads against template item types for a final inspection submit.
 * Call after `assertInspectionSubmissionMatchesTemplate` so required keys are already present.
 *
 * @param {{
 *   template: { sections?: unknown[] },
 *   answers: Array<Record<string, unknown>>,
 * }} input
 */
export function assertInspectionAnswerPayloadsForFinalSubmit(input) {
  const { template, answers } = input;

  for (const row of answers) {
    const sectionKey = String(row.sectionKey ?? '');
    const itemKey = String(row.itemKey ?? '');
    const item = findTemplateItem(template, sectionKey, itemKey);
    if (!item) {
      throw new AppError('Submission contains keys that are not present on the inspection template.', {
        statusCode: HttpStatus.BAD_REQUEST,
        code: 'INSPECTION_SUBMISSION_UNKNOWN_ITEM',
      });
    }

    const evidenceIds = Array.isArray(row.evidenceFileIds) ? row.evidenceFileIds.map((x) => String(x)) : [];

    const required = item.required === true;

    switch (item.type) {
      case 'checklist':
      case 'checkbox':
      case 'dropdown': {
        const opts = item.options ?? [];
        if (opts.length > 0) {
          const keys = Array.isArray(row.selectedOptionKeys) ? row.selectedOptionKeys.map((x) => String(x)) : [];
          if (keys.length === 0 && required) {
            throw new AppError(`Missing selected options for ${itemKey}.`, {
              statusCode: HttpStatus.BAD_REQUEST,
              code: 'INSPECTION_ANSWER_INCOMPLETE',
            });
          }
          const allowed = new Set(opts.map((o) => o.optionKey));
          for (const k of keys) {
            if (!allowed.has(k)) {
              throw new AppError(`Invalid option key for ${itemKey}.`, {
                statusCode: HttpStatus.BAD_REQUEST,
                code: 'INSPECTION_ANSWER_INVALID_OPTION',
              });
            }
          }
          if (item.type === 'dropdown' && keys.length > 1) {
            throw new AppError(`Dropdown accepts a single option for ${itemKey}.`, {
              statusCode: HttpStatus.BAD_REQUEST,
              code: 'INSPECTION_ANSWER_INVALID_OPTION',
            });
          }
        } else if ((row.valueBoolean === undefined || row.valueBoolean === null) && required) {
          throw new AppError(`Missing checklist value for ${itemKey}.`, {
            statusCode: HttpStatus.BAD_REQUEST,
            code: 'INSPECTION_ANSWER_INCOMPLETE',
          });
        }
        break;
      }
      case 'text': {
        const t = row.valueText === undefined || row.valueText === null ? '' : String(row.valueText).trim();
        if (t.length === 0 && required) {
          throw new AppError(`Missing text for ${itemKey}.`, {
            statusCode: HttpStatus.BAD_REQUEST,
            code: 'INSPECTION_ANSWER_INCOMPLETE',
          });
        }
        const pattern = item.validation?.pattern;
        if (pattern && t.length > 0) {
          const re = new RegExp(pattern);
          if (!re.test(row.valueText === undefined || row.valueText === null ? '' : String(row.valueText))) {
            throw new AppError(`Text does not match validation pattern for ${itemKey}.`, {
              statusCode: HttpStatus.BAD_REQUEST,
              code: 'INSPECTION_ANSWER_PATTERN',
            });
          }
        }
        break;
      }
      case 'number':
      case 'rating': {
        const n = row.valueNumber;
        if (required && (n === undefined || n === null || Number.isNaN(Number(n)))) {
          throw new AppError(`Missing number for ${itemKey}.`, {
            statusCode: HttpStatus.BAD_REQUEST,
            code: 'INSPECTION_ANSWER_INCOMPLETE',
          });
        }
        if (n !== undefined && n !== null && !Number.isNaN(Number(n))) {
          const num = Number(n);
          const min = item.validation?.min;
          const max = item.validation?.max;
          if (min !== undefined && min !== null && num < min) {
            throw new AppError(`Number below minimum for ${itemKey}.`, {
              statusCode: HttpStatus.BAD_REQUEST,
              code: 'INSPECTION_ANSWER_RANGE',
            });
          }
          if (max !== undefined && max !== null && num > max) {
            throw new AppError(`Number above maximum for ${itemKey}.`, {
              statusCode: HttpStatus.BAD_REQUEST,
              code: 'INSPECTION_ANSWER_RANGE',
            });
          }
        }
        break;
      }
      case 'date': {
        const d = coerceDate(row.valueDate);
        if (!d && required) {
          throw new AppError(`Missing date for ${itemKey}.`, {
            statusCode: HttpStatus.BAD_REQUEST,
            code: 'INSPECTION_ANSWER_INCOMPLETE',
          });
        }
        break;
      }
      case 'photo_required':
      case 'photo': {
        if (evidenceIds.length === 0 && required) {
          throw new AppError(`Missing evidence files for ${itemKey}.`, {
            statusCode: HttpStatus.BAD_REQUEST,
            code: 'INSPECTION_ANSWER_INCOMPLETE',
          });
        }
        break;
      }
      case 'gps': {
        const t = row.valueText === undefined || row.valueText === null ? '' : String(row.valueText).trim();
        if (t.length === 0 && required) {
          throw new AppError(`Missing GPS coordinates for ${itemKey}.`, {
            statusCode: HttpStatus.BAD_REQUEST,
            code: 'INSPECTION_ANSWER_INCOMPLETE',
          });
        }
        if (t.length > 0) {
          const gpsLike = /^-?\d+(\.\d+)?,\s*-?\d+(\.\d+)?$/.test(t);
          if (!gpsLike) {
            throw new AppError(`Invalid GPS value for ${itemKey}.`, {
              statusCode: HttpStatus.BAD_REQUEST,
              code: 'INSPECTION_ANSWER_INVALID_OPTION',
            });
          }
        }
        break;
      }
      case 'signature': {
        const t = row.valueText === undefined || row.valueText === null ? '' : String(row.valueText).trim();
        if (t.length === 0 && required) {
          throw new AppError(`Missing signature payload for ${itemKey}.`, {
            statusCode: HttpStatus.BAD_REQUEST,
            code: 'INSPECTION_ANSWER_INCOMPLETE',
          });
        }
        break;
      }
      default:
        throw new AppError(`Unsupported template item type: ${item.type}`, {
          statusCode: HttpStatus.BAD_REQUEST,
          code: 'INSPECTION_TEMPLATE_ITEM_TYPE',
        });
    }
  }
}

/**
 * @param {unknown[]} answers
 * @returns {Array<Record<string, unknown>>}
 */
export function normalizeInspectionAnswersForPersistence(answers) {
  const list = Array.isArray(answers) ? answers : [];
  return list.map((raw) => {
    const row = /** @type {Record<string, unknown>} */ (raw && typeof raw === 'object' ? raw : {});
    const evidenceFileIds = Array.isArray(row.evidenceFileIds)
      ? row.evidenceFileIds.map((id) => String(id)).filter(Boolean)
      : [];
    return {
      itemKey: String(row.itemKey ?? ''),
      sectionKey: String(row.sectionKey ?? ''),
      valueText: row.valueText === undefined ? null : row.valueText,
      valueNumber: row.valueNumber === undefined ? null : row.valueNumber,
      valueBoolean: row.valueBoolean === undefined ? null : row.valueBoolean,
      valueDate: row.valueDate === undefined || row.valueDate === null ? null : coerceDate(row.valueDate),
      selectedOptionKeys: Array.isArray(row.selectedOptionKeys) ? row.selectedOptionKeys.map((x) => String(x)) : undefined,
      evidenceFileIds: evidenceFileIds.length ? evidenceFileIds : undefined,
    };
  });
}
