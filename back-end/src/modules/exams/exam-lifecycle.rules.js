import { AppError } from '../../core/errors/app-error.js';
import { HttpStatus } from '../../core/errors/http-status.js';
import { ExamLifecycle } from '../shared/enums/exam-lifecycle.js';

/**
 * Allowed admin-driven lifecycle transitions (SRS-aligned ordering; supports future public flows).
 * @type {Readonly<Record<string, readonly string[]>>}
 */
export const EXAM_ADMIN_LIFECYCLE_TRANSITIONS = Object.freeze({
  [ExamLifecycle.DRAFT]: [ExamLifecycle.SCHEDULED, ExamLifecycle.OPEN, ExamLifecycle.CLOSED, ExamLifecycle.DRAFT],
  [ExamLifecycle.SCHEDULED]: [ExamLifecycle.OPEN, ExamLifecycle.CLOSED, ExamLifecycle.SCHEDULED, ExamLifecycle.DRAFT],
  [ExamLifecycle.OPEN]: [ExamLifecycle.CLOSED, ExamLifecycle.OPEN, ExamLifecycle.DRAFT],
  [ExamLifecycle.CLOSED]: [ExamLifecycle.PUBLISHED, ExamLifecycle.CLOSED, ExamLifecycle.OPEN, ExamLifecycle.DRAFT],
  [ExamLifecycle.PUBLISHED]: [ExamLifecycle.PUBLISHED, ExamLifecycle.CLOSED, ExamLifecycle.OPEN, ExamLifecycle.DRAFT],
});

/**
 * @param {{ fromStatus: string, toStatus: string }} input
 */
export function assertExamAdminLifecycleTransition(input) {
  const { fromStatus, toStatus } = input;
  if (fromStatus === toStatus) return;

  const allowed = EXAM_ADMIN_LIFECYCLE_TRANSITIONS[fromStatus];
  if (!allowed || !allowed.includes(toStatus)) {
    throw new AppError(`Invalid exam status transition (${fromStatus} → ${toStatus}).`, {
      statusCode: HttpStatus.CONFLICT,
      code: 'EXAM_INVALID_STATUS_TRANSITION',
      details: { fromStatus, toStatus, allowedNext: allowed ? [...allowed] : [] },
    });
  }
}
