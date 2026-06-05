/**
 * Maps `POST /api/v1/public/exam-attempts` question payloads into `ExamQuestion` for the take UI.
 */
import type { ExamQuestion } from '@/data/exam-content';

const MC = 'multiple_choice';
const TF = 'true_false';

const DISPLAY_KEYS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

function mapMcq(
  row: Record<string, unknown>,
  opts: { t?: (key: string, options?: Record<string, unknown>) => string } = {},
): ExamQuestion | null {
  const id = typeof row.id === 'string' ? row.id : '';
  const stem = typeof row.stem === 'string' ? row.stem : '';
  const rawOpts = row.options;
  if (!Array.isArray(rawOpts) || rawOpts.length === 0) return null;
  const options = rawOpts.map((o, i) => {
    const ob = o as Record<string, unknown>;
    const serverKey = typeof ob.optionKey === 'string' ? ob.optionKey : String(i);
    const label = typeof ob.label === 'string' ? ob.label : '';
    const key = DISPLAY_KEYS[i] ?? String(i + 1);
    return { key, label, serverKey };
  });
  const first = options[0];
  return {
    id: id || `q-${Math.random().toString(36).slice(2)}`,
    type: 'mcq',
    text: stem || (opts.t ? opts.t('examQuestionFallback') : 'Question'),
    options,
    correctKey: first?.key ?? 'A',
  };
}

function mapTf(
  row: Record<string, unknown>,
  opts: { t?: (key: string, options?: Record<string, unknown>) => string } = {},
): ExamQuestion | null {
  const id = typeof row.id === 'string' ? row.id : '';
  const stem = typeof row.stem === 'string' ? row.stem : '';
  return {
    id: id || `q-${Math.random().toString(36).slice(2)}`,
    type: 'tf',
    text: stem || (opts.t ? opts.t('examStatementFallback') : 'Statement'),
    correct: false,
  };
}

export function mapPublicExamQuestionsToExamQuestions(
  rows: unknown[],
  opts: { t?: (key: string, options?: Record<string, unknown>) => string } = {},
): ExamQuestion[] {
  const out: ExamQuestion[] = [];
  for (const raw of rows) {
    if (!raw || typeof raw !== 'object') continue;
    const row = raw as Record<string, unknown>;
    const t = row.type;
    if (t === MC) {
      const q = mapMcq(row, opts);
      if (q) out.push(q);
    } else if (t === TF) {
      const q = mapTf(row, opts);
      if (q) out.push(q);
    }
    /** `short_text` and other types are no longer supported in the app; skip. */
  }
  return out;
}

export function buildExamAttemptAnswersPayload(
  questions: ExamQuestion[],
  answers: (string | boolean | null)[],
): { questionId: string; selectedOptionKeys?: string[]; booleanAnswer?: boolean | null; textAnswer?: string | null }[] {
  const payload: {
    questionId: string;
    selectedOptionKeys?: string[];
    booleanAnswer?: boolean | null;
    textAnswer?: string | null;
  }[] = [];

  questions.forEach((q, i) => {
    const a = answers[i];
    if (q.type === 'mcq') {
      const questionId = q.id;
      if (a === null || a === undefined || typeof a !== 'string') {
        payload.push({ questionId, selectedOptionKeys: [] });
        return;
      }
      const opt = q.options.find((o) => o.key === a || o.serverKey === a);
      const serverKey = opt?.serverKey ?? a;
      payload.push({ questionId, selectedOptionKeys: [serverKey] });
      return;
    }
    if (q.type === 'tf') {
      payload.push({
        questionId: q.id,
        booleanAnswer: typeof a === 'boolean' ? a : null,
      });
    }
  });

  return payload;
}
