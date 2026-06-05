import { ConflictError } from '../shared/http/index.js';
import { ExamAttemptStatus } from '../shared/enums/exam-attempt-status.js';

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_ATTEMPTS = 3;

/**
 * @param {string | Date | null | undefined} t
 */
function getTime(t) {
  if (!t) return 0;
  const d = t instanceof Date ? t : new Date(t);
  return Number.isNaN(d.getTime()) ? 0 : d.getTime();
}

/**
 * @param {{
 *   certRow: Record<string, unknown> | null,
 *   completedAttempts: Array<Record<string, unknown>>,
 * }} input
 * @returns {{ attemptNumber: number }}
 */
export function assertEligibleForNewExamAttempt(input) {
  const { certRow, completedAttempts } = input;

  if (certRow) {
    const meta = certRow.metadata && typeof certRow.metadata === 'object' ? certRow.metadata : {};
    const validTo = meta.validTo ? new Date(String(meta.validTo)) : null;
    if (validTo && !Number.isNaN(validTo.getTime()) && validTo.getTime() > Date.now()) {
      const ymd = validTo.toISOString().slice(0, 10);
      throw new ConflictError(
        `You already passed this exam. A valid certificate is on file (until ${ymd}). You can take this exam again after the certificate expires.`,
      );
    }
  }

  const bySubmitted = (a, b) =>
    getTime(/** @type {string|Date} */ (a.submittedAt)) - getTime(/** @type {string|Date} */ (b.submittedAt));
  const completed = [...completedAttempts].filter(Boolean).sort(bySubmitted);

  const graded = completed.filter((a) => a.status === ExamAttemptStatus.GRADED);
  const lastPass = [...graded].filter((a) => a.passed === true).pop() ?? null;
  const afterPassCutoff = lastPass
    ? getTime(/** @type {string|Date} */ (lastPass.submittedAt))
    : -1;

  const inCycle = lastPass
    ? completed.filter((a) => getTime(/** @type {string|Date} */ (a.submittedAt)) > afterPassCutoff)
    : completed;

  if (inCycle.length >= MAX_ATTEMPTS) {
    throw new ConflictError('No attempts remaining for this exam.');
  }

  const gradedInCycle = lastPass
    ? graded.filter((a) => getTime(/** @type {string|Date} */ (a.submittedAt)) > afterPassCutoff)
    : graded;

  const failRows = gradedInCycle.filter((a) => a.passed === false);
  if (failRows.length >= MAX_ATTEMPTS) {
    throw new ConflictError('You have failed this exam 3 times and cannot take it again.');
  }

  if (failRows.length > 0) {
    const lastFail = failRows[failRows.length - 1];
    const ref =
      getTime(/** @type {string|Date} */ (lastFail.gradedAt)) ||
      getTime(/** @type {string|Date} */ (lastFail.submittedAt));
    if (ref > 0 && Date.now() < ref + ONE_WEEK_MS) {
      throw new ConflictError('You must wait 7 days after a failed attempt before trying again.');
    }
  }

  return { attemptNumber: Math.min(MAX_ATTEMPTS, inCycle.length + 1) };
}
