/**
 * Maps public exam / certificate API payloads into list shapes used by the mobile UI.
 */
import type { CertificateLevel, CertificateListItem } from '@/data/certificates';
import type { ExamListItem, ExamStatus } from '@/data/exams';

function passMarkPctFromExam(row: Record<string, unknown>): number {
  const ps = row.passingScore;
  if (typeof ps === 'number' && ps >= 0 && ps <= 100) {
    return Math.min(100, Math.max(0, Math.round(ps)));
  }
  const ms = row.maxScore;
  if (typeof ps === 'number' && typeof ms === 'number' && ms > 0) {
    return Math.min(100, Math.max(0, Math.round((ps / ms) * 100)));
  }
  if (typeof ps === 'number') return Math.min(100, Math.max(0, Math.round(ps)));
  return 55;
}

export function apiExamSummaryToListItem(row: Record<string, unknown>): ExamListItem {
  const statusRaw = typeof row.status === 'string' ? row.status : '';
  let status: ExamStatus = 'upcoming';
  if (statusRaw === 'open') status = 'available';
  else if (statusRaw === 'scheduled') status = 'upcoming';

  const meta = row.metadata && typeof row.metadata === 'object' ? (row.metadata as Record<string, unknown>) : null;
  const reward =
    meta && typeof meta.rewardCertificateId === 'string'
      ? meta.rewardCertificateId.trim()
      : typeof row.rewardCertificateId === 'string'
        ? row.rewardCertificateId.trim()
        : null;

  const catName =
    typeof row.decreeCategoryName === 'string' && row.decreeCategoryName.trim()
      ? row.decreeCategoryName.trim()
      : 'Exams';

  return {
    id: String(row.id ?? ''),
    category: catName,
    status,
    title: typeof row.title === 'string' ? row.title : 'Exam',
    durationMin: typeof row.timeLimitMinutes === 'number' ? row.timeLimitMinutes : 45,
    questionCount: typeof row.questionsCount === 'number' ? row.questionsCount : 0,
    passMarkPct: passMarkPctFromExam(row),
    rewardCertificateId: reward || null,
  };
}

export function mergeExamCatalogWithResults(
  exams: ExamListItem[],
  resultsByExamId: Map<string, { scorePct: number }>,
): ExamListItem[] {
  return exams.map((e) => {
    const r = resultsByExamId.get(e.id);
    if (r) return { ...e, status: 'completed' as const, scorePct: r.scorePct };
    return e;
  });
}

export function resultsRowsToScoreMap(items: Record<string, unknown>[]): Map<string, { scorePct: number }> {
  const m = new Map<string, { scorePct: number }>();
  for (const it of items) {
    const examId = typeof it.examId === 'string' ? it.examId : '';
    if (!examId) continue;
    const score = typeof it.score === 'number' ? it.score : null;
    const maxScore = typeof it.maxScore === 'number' ? it.maxScore : null;
    const scorePct =
      score != null && maxScore != null && maxScore > 0
        ? Math.round((score / maxScore) * 100)
        : score != null
          ? Math.round(score)
          : 0;
    m.set(examId, { scorePct });
  }
  return m;
}

function formatCertDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}

function levelFromApi(row: Record<string, unknown>): CertificateLevel {
  const meta = row.metadata && typeof row.metadata === 'object' ? (row.metadata as Record<string, unknown>) : null;
  const lv = meta?.level;
  if (lv === 'advanced' || lv === 'intermediate' || lv === 'basic') return lv;
  const kind = typeof row.kind === 'string' ? row.kind : '';
  if (kind.includes('advanced')) return 'advanced';
  if (kind.includes('basic')) return 'basic';
  return 'intermediate';
}

export function apiCertificateToListItem(row: Record<string, unknown>): CertificateListItem {
  const meta = row.metadata && typeof row.metadata === 'object' ? (row.metadata as Record<string, unknown>) : null;
  const num = typeof row.certificateNumber === 'string' ? row.certificateNumber : String(row.id ?? '');
  const scorePct =
    typeof meta?.scorePct === 'number'
      ? Math.round(meta.scorePct)
      : typeof meta?.score === 'number'
        ? Math.round(meta.score)
        : typeof meta?.passPct === 'number'
          ? Math.round(meta.passPct)
          : typeof row.passingThreshold === 'object' && row.passingThreshold
            ? (() => {
                const t = row.passingThreshold as Record<string, unknown>;
                const ps = t.passingScore;
                const ms = t.maxScore;
                if (typeof ps === 'number' && typeof ms === 'number' && ms > 0)
                  return Math.round((ps / ms) * 100);
                return 0;
              })()
            : 0;

  const verifyQr =
    typeof meta?.verifyQrDataUrl === 'string' && meta.verifyQrDataUrl.startsWith('data:')
      ? meta.verifyQrDataUrl
      : undefined;
  const pdfUrl = typeof row.pdfUrl === 'string' && row.pdfUrl.trim() ? row.pdfUrl.trim() : undefined;

  // Compute the expires label from the new metadata fields (validToYmd / validTo)
  // and fall back to the prior "see official record" copy when no expiry was set.
  const validToYmd =
    typeof meta?.validToYmd === 'string' && meta.validToYmd
      ? meta.validToYmd
      : typeof meta?.validTo === 'string' && meta.validTo
        ? meta.validTo.slice(0, 10)
        : '';
  const expiresLabel =
    (typeof meta?.expiresLabel === 'string' && meta.expiresLabel) ||
    (validToYmd ? formatCertDate(validToYmd) : 'See official record for validity');

  return {
    id: String(row.id ?? row._id ?? ''),
    categoryTitle:
      (typeof meta?.categoryTitle === 'string' && meta.categoryTitle) ||
      (typeof meta?.category === 'string' && meta.category) ||
      'Sharia Decrees Certificate',
    level: levelFromApi(row),
    dateLabel: formatCertDate(typeof row.issuedAt === 'string' ? row.issuedAt : undefined),
    certificateId: num,
    categoryBadge:
      (typeof meta?.categoryBadge === 'string' && meta.categoryBadge) ||
      (typeof meta?.categoryTitle === 'string' && meta.categoryTitle) ||
      (typeof meta?.category === 'string' && meta.category) ||
      'Certificate',
    scorePct,
    expiresLabel,
    verifyQrDataUrl: verifyQr,
    pdfUrl,
  };
}
