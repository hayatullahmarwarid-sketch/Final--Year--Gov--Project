import { serializePublicExamSummary } from './public-exam.serializer.js';

/**
 * @param {Record<string, unknown>} attempt
 * @param {{ exam?: Record<string, unknown> | null }} [embed]
 */
export function serializePublicExamResult(attempt, embed = {}) {
  return {
    attemptId: String(attempt._id),
    examId: String(attempt.examId),
    status: attempt.status,
    startedAt: attempt.startedAt ?? null,
    submittedAt: attempt.submittedAt ?? null,
    gradedAt: attempt.gradedAt ?? null,
    score: attempt.score ?? null,
    maxScore: attempt.maxScore ?? null,
    passed: attempt.passed ?? null,
    exam: embed.exam ? serializePublicExamSummary(embed.exam) : null,
  };
}
