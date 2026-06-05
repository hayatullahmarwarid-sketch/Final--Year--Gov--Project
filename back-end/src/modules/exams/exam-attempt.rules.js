import { AppError } from '../../core/errors/app-error.js';
import { HttpStatus } from '../../core/errors/http-status.js';
import { ExamLifecycle } from '../shared/enums/exam-lifecycle.js';
import { ExamQuestionType } from '../shared/enums/exam-question-type.js';

const ATTEMPT_ALLOWED_STATUSES = new Set([
  ExamLifecycle.OPEN,
  ExamLifecycle.PUBLISHED,
  ExamLifecycle.SCHEDULED,
]);

/**
 * Merge persisted in-progress answers with the payload submitted on final submit.
 *
 * @param {Array<Record<string, unknown>>} [existing]
 * @param {Array<Record<string, unknown>>} incoming
 */
export function mergeExamAnswersForSubmit(existing = [], incoming = []) {
  const map = new Map((existing ?? []).map((a) => [String(a.questionId), { ...a }]));
  for (const row of incoming) {
    const id = String(row.questionId);
    const prev = map.get(id) ?? { questionId: row.questionId };
    map.set(id, {
      ...prev,
      questionId: row.questionId,
      ...(row.selectedOptionKeys !== undefined ? { selectedOptionKeys: row.selectedOptionKeys } : {}),
      ...(row.booleanAnswer !== undefined ? { booleanAnswer: row.booleanAnswer } : {}),
      ...(row.textAnswer !== undefined ? { textAnswer: row.textAnswer } : {}),
    });
  }
  return [...map.values()];
}

/**
 * Business validation for attempts (deadlines, open window, question coverage).
 * Enforced in the service layer (not Mongoose).
 *
 * @param {{
 *   exam: { status: string, scheduledOpensAt?: Date | null, scheduledClosesAt?: Date | null, timeLimitMinutes?: number | null },
 *   attempt: { startedAt: Date, answers: Array<{ questionId: unknown }> },
 *   activeQuestions: Array<{ _id: unknown }>,
 *   now?: Date,
 *   skipTimeCheck?: boolean,
 * }} input
 */
export function assertExamAttemptFollowsExamRules(input) {
  const now = input.now ?? new Date();
  const { exam, attempt, activeQuestions, skipTimeCheck: skipTime } = input;

  if (!ATTEMPT_ALLOWED_STATUSES.has(exam.status)) {
    throw new AppError('Exam is not open for attempts.', {
      statusCode: HttpStatus.CONFLICT,
      code: 'EXAM_NOT_OPEN',
    });
  }

  if (exam.scheduledOpensAt && now < exam.scheduledOpensAt) {
    throw new AppError('Exam has not opened yet.', {
      statusCode: HttpStatus.CONFLICT,
      code: 'EXAM_NOT_STARTED',
    });
  }

  if (exam.scheduledClosesAt && now > exam.scheduledClosesAt) {
    throw new AppError('Exam submission window has closed.', {
      statusCode: HttpStatus.CONFLICT,
      code: 'EXAM_CLOSED',
    });
  }

  if (!skipTime && exam.timeLimitMinutes != null) {
    const limitMs = exam.timeLimitMinutes * 60_000;
    /** Allow late arrival of the submit request (network latency, device clock skew vs server). */
    const submitGraceMs = 90_000;
    if (now.getTime() - new Date(attempt.startedAt).getTime() > limitMs + submitGraceMs) {
      throw new AppError('Exam time limit exceeded.', {
        statusCode: HttpStatus.CONFLICT,
        code: 'EXAM_TIME_LIMIT_EXCEEDED',
      });
    }
  }

  const requiredIds = new Set(activeQuestions.map((q) => String(q._id)));
  const answered = new Set(attempt.answers.map((a) => String(a.questionId)));

  for (const id of requiredIds) {
    if (!answered.has(id)) {
      throw new AppError('Attempt is missing answers for one or more questions.', {
        statusCode: HttpStatus.BAD_REQUEST,
        code: 'EXAM_ATTEMPT_INCOMPLETE',
      });
    }
  }

  for (const id of answered) {
    if (!requiredIds.has(id)) {
      throw new AppError('Attempt references questions that are not part of this exam.', {
        statusCode: HttpStatus.BAD_REQUEST,
        code: 'EXAM_ATTEMPT_INVALID_QUESTIONS',
      });
    }
  }
}

/**
 * Ensure one answer entry per active question (empty defaults) for server-side finalization (e.g. time expired).
 *
 * @param {Array<Record<string, unknown>>} activeQuestions
 * @param {Array<Record<string, unknown>>} mergedAnswers
 */
export function fillMissingAnswersForQuestions(activeQuestions, mergedAnswers) {
  const map = new Map(
    (mergedAnswers ?? []).map((a) => {
      const id = String(a.questionId);
      return [id, { ...a }];
    }),
  );
  for (const q of activeQuestions) {
    const id = String(q._id);
    if (map.has(id)) continue;
    if (q.type === ExamQuestionType.MULTIPLE_CHOICE) {
      map.set(id, { questionId: q._id, selectedOptionKeys: [] });
    } else if (q.type === ExamQuestionType.TRUE_FALSE) {
      map.set(id, { questionId: q._id, booleanAnswer: null });
    } else if (q.type === ExamQuestionType.ESSAY) {
      map.set(id, { questionId: q._id, textAnswer: null });
    } else {
      map.set(id, { questionId: q._id, textAnswer: null });
    }
  }
  return [...map.values()];
}
