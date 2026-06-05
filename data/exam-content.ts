import type { ExamListItem } from '@/data/exams';

export type ExamQuestionType = 'mcq' | 'tf';

/** `key` is UI label (often A–D); `serverKey` is the API `optionKey` when taking a live exam. */
export type ExamMcqOption = { key: string; label: string; serverKey?: string };

export type ExamQuestionMcq = {
  id: string;
  type: 'mcq';
  text: string;
  options: ExamMcqOption[];
  /** Offline / legacy correct key; live exams omit and grade on the server. */
  correctKey: string;
};

export type ExamQuestionTf = {
  id: string;
  type: 'tf';
  text: string;
  correct: boolean;
};

export type ExamQuestion = ExamQuestionMcq | ExamQuestionTf;

export type ExamRules = {
  totalQuestions: number;
  durationMin: number;
  passMarkPct: number;
};

/**
 * Hardcoded question pool was removed. Live exams are fetched from the API
 * (`GET /api/v1/public/exams/:id`) and normalized by `lib/public/exam-api-questions.ts`.
 * This builder remains so callers depending on it receive an empty list until API data loads.
 */
export function buildExamQuestions(_total: number): ExamQuestion[] {
  return [];
}

export function getExamRulesFromListItem(item: ExamListItem): ExamRules {
  return {
    totalQuestions: item.questionCount,
    durationMin: item.durationMin,
    passMarkPct: item.passMarkPct,
  };
}

export function getExamQuestionsForListItem(_item: ExamListItem): ExamQuestion[] {
  return [];
}
