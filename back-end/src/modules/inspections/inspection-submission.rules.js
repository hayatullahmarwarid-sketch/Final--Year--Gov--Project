import { AppError } from '../../core/errors/app-error.js';
import { HttpStatus } from '../../core/errors/http-status.js';

/**
 * Business validation: submission answers must align with the template snapshot
 * carried on the assignment (`templateRevisionSnapshot` + template document).
 * Enforced in the service layer (not Mongoose).
 *
 * @param {{
 *   template: { revision: number, sections?: Array<{ sectionKey: string, items: Array<{ itemKey: string, type: string, required?: boolean }> }> },
 *   templateRevisionSnapshot: number,
 *   answers: Array<{ sectionKey: string, itemKey: string }>,
 * }} input
 */
export function assertInspectionSubmissionMatchesTemplate(input) {
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

  for (const section of template.sections ?? []) {
    for (const item of section.items ?? []) {
      if (!item.required) continue;
      const k = `${section.sectionKey}::${item.itemKey}`;
      if (!seen.has(k)) {
        throw new AppError(`Missing required answer for ${item.itemKey}.`, {
          statusCode: HttpStatus.BAD_REQUEST,
          code: 'INSPECTION_SUBMISSION_MISSING_REQUIRED',
        });
      }
    }
  }
}
