import { ExamQuestionType } from '../shared/enums/exam-question-type.js';

/**
 * Auto-grade attempt answers against authoritative question rows.
 *
 * This service is the single source of truth for scoring across personas — public users,
 * inspectors, inspector-admin. Do NOT duplicate this logic anywhere else.
 *
 * @param {Array<Record<string, unknown>>} questions
 * @param {Array<{
 *   questionId: unknown,
 *   selectedOptionKeys?: string[],
 *   booleanAnswer?: boolean | null,
 *   textAnswer?: string | null,
 * }>} answersInput
 * @returns {{
 *   score: number,
 *   maxScore: number,
 *   answers: Array<Record<string, unknown>>,
 *   passed: boolean,
 *   passPct: number,
 *   needsManualGrading: boolean,
 * }}
 */
export function gradeAttempt(questions, answersInput, options = {}) {
  const passThresholdPct = typeof options.passThresholdPct === 'number' ? options.passThresholdPct : 55;

  let score = 0;
  let maxScore = 0;

  for (const q of questions) {
    maxScore += typeof q.points === 'number' ? q.points : 0;
  }

  const answers = [];
  for (const q of questions) {
    const raw = answersInput.find((a) => String(a.questionId) === String(q._id));
    let autoGradedPoints = 0;

    if (q.type === ExamQuestionType.MULTIPLE_CHOICE) {
      const correct = new Set((q.correctOptionKeys ?? []).map(String));
      const sel = new Set((raw?.selectedOptionKeys ?? []).map(String));
      if (correct.size > 0) {
        let ok = false;
        if (correct.size === 1) {
          ok = setEquals(correct, sel);
        } else {
          /* Multiple acceptable keys: either the exact set (all-correct) or a single pick that is in the set. */
          ok = setEquals(correct, sel) || (sel.size === 1 && correct.has([...sel][0]));
        }
        if (ok) autoGradedPoints = typeof q.points === 'number' ? q.points : 0;
      }
    } else if (q.type === ExamQuestionType.TRUE_FALSE) {
      if (
        q.correctBoolean !== null &&
        q.correctBoolean !== undefined &&
        raw?.booleanAnswer === q.correctBoolean
      ) {
        autoGradedPoints = typeof q.points === 'number' ? q.points : 0;
      }
    } else if (q.type === ExamQuestionType.ESSAY) {
      // Manual grading only — keep learner text for the grader.
    }

    score += autoGradedPoints;
    answers.push({
      questionId: q._id,
      selectedOptionKeys: raw?.selectedOptionKeys,
      booleanAnswer: raw?.booleanAnswer ?? null,
      textAnswer: raw?.textAnswer ?? null,
      autoGradedPoints,
      manualGradedPoints: null,
      graderComment: null,
    });
  }

  const passPct = maxScore > 0 ? (score / maxScore) * 100 : 0;
  const passed = passPct >= passThresholdPct;
  const needsManualGrading = questions.some((q) => q.type === ExamQuestionType.ESSAY);

  return { score, maxScore, answers, passed, passPct, needsManualGrading };
}

/**
 * @param {Array<Record<string, unknown>>} questions
 * @param {Array<Record<string, unknown>>} answers
 */
export function totalScoreFromAnswers(questions, answers) {
  let score = 0;
  let maxScore = 0;
  for (const q of questions) {
    maxScore += typeof q.points === 'number' ? q.points : 0;
    const a = answers.find((x) => String(x.questionId) === String(q._id));
    if (!a) continue;
    if (q.type === ExamQuestionType.ESSAY) {
      score += typeof a.manualGradedPoints === 'number' ? a.manualGradedPoints : 0;
    } else {
      score += typeof a.autoGradedPoints === 'number' ? a.autoGradedPoints : 0;
    }
  }
  return { score, maxScore };
}

/**
 * @param {Array<Record<string, unknown>>} questions
 * @param {Array<Record<string, unknown>>} answers
 */
export function allEssaysHaveManualScores(questions, answers) {
  for (const q of questions) {
    if (q.type !== ExamQuestionType.ESSAY) continue;
    const a = answers.find((x) => String(x.questionId) === String(q._id));
    if (!a || typeof a.manualGradedPoints !== 'number' || Number.isNaN(a.manualGradedPoints)) return false;
    const pts = q.points ?? 0;
    if (a.manualGradedPoints < 0 || a.manualGradedPoints > pts) return false;
  }
  return true;
}

/**
 * @param {Array<Record<string, unknown>>} questions
 * @param {Array<Record<string, unknown>>} currentAnswers
 * @param {Array<{ questionId: unknown, manualGradedPoints: number, graderComment?: string | null }>} manualGrades
 */
export function applyManualEssayGrades(questions, currentAnswers, manualGrades) {
  const essayIds = new Set(
    questions.filter((q) => q.type === ExamQuestionType.ESSAY).map((q) => String(q._id)),
  );
  const patchByQ = new Map(manualGrades.map((m) => [String(m.questionId), m]));
  return (currentAnswers ?? []).map((a) => {
    if (!essayIds.has(String(a.questionId))) return { ...a };
    const p = patchByQ.get(String(a.questionId));
    if (!p) return { ...a };
    return {
      ...a,
      manualGradedPoints: p.manualGradedPoints,
      graderComment: p.graderComment ?? a.graderComment ?? null,
    };
  });
}

/**
 * @param {unknown} a
 * @param {unknown} b
 */
function setEquals(a, b) {
  if (!(a instanceof Set) || !(b instanceof Set)) return false;
  if (a.size !== b.size) return false;
  for (const x of a) {
    if (!b.has(x)) return false;
  }
  return true;
}
