/**
 * Maps `GET /api/v1/notifications` inbox rows into `InboxNotification` for existing list UI.
 */
import type { InboxNotification, NotificationCategory, NotificationViewTarget } from '@/data/notifications-models';

const CATEGORIES: NotificationCategory[] = [
  'decree',
  'certificate',
  'exam_result',
  'exam_reminder',
  'account',
];

function isCategory(v: unknown): v is NotificationCategory {
  return typeof v === 'string' && (CATEGORIES as string[]).includes(v);
}

function timeLabelFromIso(
  iso: string | null | undefined,
  opts: {
    t: (key: string, options?: Record<string, unknown>) => string;
    number: (n: number) => string;
    dateMedium: (input: Date | number) => string;
  },
): string {
  if (!iso) return '';
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '';
  const diffMs = Date.now() - t;
  const sec = Math.floor(diffMs / 1000);
  if (sec < 45) return opts.t('relativeJustNow');
  const min = Math.floor(sec / 60);
  if (min < 60) return opts.t('relativeMinutesAgo', { minutes: opts.number(min) });
  const hr = Math.floor(min / 60);
  if (hr < 24) return opts.t('relativeHoursAgo', { hours: opts.number(hr) });
  const day = Math.floor(hr / 24);
  if (day < 7) return opts.t('relativeDaysAgo', { days: opts.number(day) });
  return opts.dateMedium(t);
}

function parseCertificatePassPct(rawBody: string, metaPass: unknown): number | undefined {
  if (typeof metaPass === 'number' && Number.isFinite(metaPass)) return Math.round(metaPass);
  const m = rawBody.match(/with\s+(\d+(?:\.\d+)?)\s*%/i);
  if (!m) return undefined;
  const n = Number(m[1]);
  return Number.isFinite(n) ? Math.round(n) : undefined;
}

/** Backend sends English: `Your exam has been graded (score 12/20).` */
function parseExamGradedScores(rawBody: string): { score: number; max: number } | undefined {
  const m = rawBody.match(/\(score\s+(\d+)\s*\/\s*(\d+)\s*\)/i);
  if (!m) return undefined;
  const score = Number(m[1]);
  const max = Number(m[2]);
  if (!Number.isFinite(score) || !Number.isFinite(max)) return undefined;
  return { score, max };
}

function resolveLocalizedInboxStrings(args: {
  fmt: {
    t: (key: string, options?: Record<string, unknown>) => string;
    number: (n: number) => string;
  };
  rawTitle: string;
  rawBody: string;
  kind: string;
  metaType: string;
  eventKind: string;
  titleNorm: string;
  metaPassPct: unknown;
}): { title: string; description: string } {
  const { fmt, rawTitle, rawBody, kind, metaType, eventKind, titleNorm, metaPassPct } = args;

  if (kind === 'system_announcement' || eventKind === 'system_alert') {
    return {
      title: rawTitle.trim() || fmt.t('notificationsDefaultTitle'),
      description: rawBody,
    };
  }

  const looksLikeCertificateIssued =
    kind === 'certificate_issued' ||
    (titleNorm === 'certificate issued' && /you passed the exam/i.test(rawBody));
  if (looksLikeCertificateIssued) {
    const passPct = parseCertificatePassPct(rawBody, metaPassPct);
    return {
      title: fmt.t('notifCertificateIssuedTitle'),
      description: fmt.t('notifCertificateIssuedBody', {
        percent: passPct != null ? fmt.number(passPct) : fmt.t('notifPercentUnknown'),
      }),
    };
  }

  const isExamResultReady = kind === 'exam_results' || titleNorm === 'exam result ready';
  if (isExamResultReady) {
    const graded = parseExamGradedScores(rawBody);
    return {
      title: fmt.t('notifExamResultReadyTitle'),
      description: graded
        ? fmt.t('notifExamResultReadyDescription', {
            score: fmt.number(graded.score),
            max: fmt.number(graded.max),
          })
        : fmt.t('notifExamResultReadyFallback'),
    };
  }

  const isNewDecreeBroadcast = metaType === 'new_decree';
  if (isNewDecreeBroadcast || titleNorm === 'new decree issued') {
    return {
      title: fmt.t('notifNewDecreeIssuedTitle'),
      description: rawBody,
    };
  }

  return {
    title: rawTitle.trim() || fmt.t('notificationsDefaultTitle'),
    description: rawBody,
  };
}

function parseViewTarget(raw: unknown): NotificationViewTarget | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
  const o = raw as Record<string, unknown>;
  const type = o.type;
  if (type === 'decree' && typeof o.decreeId === 'string' && o.decreeId.trim()) {
    return { type: 'decree', decreeId: o.decreeId.trim() };
  }
  if (type === 'certificate' && typeof o.certificateId === 'string' && o.certificateId.trim()) {
    return { type: 'certificate', certificateId: o.certificateId.trim() };
  }
  if (type === 'exam_review' && typeof o.examId === 'string' && o.examId.trim()) {
    return { type: 'exam_review', examId: o.examId.trim() };
  }
  if (type === 'exam_review_latest') return { type: 'exam_review_latest' };
  if (type === 'exam_start' && typeof o.examId === 'string' && o.examId.trim()) {
    return { type: 'exam_start', examId: o.examId.trim() };
  }
  if (type === 'exams_tab') return { type: 'exams_tab' };
  if (type === 'decrees_tab') return { type: 'decrees_tab' };
  if (type === 'edit_profile') return { type: 'edit_profile' };
  return undefined;
}

/**
 * Converts a global inbox notification JSON object into the mobile list shape.
 * Optional `metadata.mobileCategory`, `metadata.viewTarget`, `metadata.certificateId`, etc.
 */
export function apiInboxRowToInboxNotification(
  row: Record<string, unknown>,
  fmt: {
    t: (key: string, options?: Record<string, unknown>) => string;
    number: (n: number) => string;
    dateMedium: (input: Date | number) => string;
  },
): InboxNotification {
  const idRaw = row.id ?? row._id;
  const id = typeof idRaw === 'string' ? idRaw : String(idRaw ?? '');
  const rawTitle = typeof row.title === 'string' ? row.title : '';
  const rawBody = typeof row.body === 'string' ? row.body : '';
  const readStatus = typeof row.readStatus === 'string' ? row.readStatus : 'unread';
  const read = readStatus === 'read';
  const createdAt = typeof row.createdAt === 'string' ? row.createdAt : null;

  const meta =
    row.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata)
      ? (row.metadata as Record<string, unknown>)
      : {};

  const kind = typeof meta.kind === 'string' ? meta.kind.trim() : '';
  const metaType = typeof meta.type === 'string' ? meta.type.trim() : '';
  const eventKind = typeof meta.eventKind === 'string' ? meta.eventKind.trim() : '';
  const titleNorm = rawTitle.trim().toLowerCase();

  const { title, description: body } = resolveLocalizedInboxStrings({
    fmt,
    rawTitle,
    rawBody,
    kind,
    metaType,
    eventKind,
    titleNorm,
    metaPassPct: meta.passPct,
  });

  let category: NotificationCategory = 'account';
  if (isCategory(meta.mobileCategory)) category = meta.mobileCategory;
  else if (isCategory(meta.category)) category = meta.category;

  const viewTarget = parseViewTarget(meta.viewTarget);
  const certificateId = typeof meta.certificateId === 'string' ? meta.certificateId.trim() : undefined;

  const showPassedBadge = meta.examPassed === true || /passed/i.test(rawTitle);
  const showViewCertificate = Boolean(certificateId) || category === 'certificate';
  const showViewButton = meta.showViewButton !== false && !showViewCertificate;

  return {
    id,
    category,
    title,
    description: body,
    timeLabel: timeLabelFromIso(createdAt, fmt),
    read,
    showViewButton,
    showPassedBadge: Boolean(showPassedBadge),
    showViewCertificate,
    viewTarget,
    certificateId: certificateId || undefined,
  };
}
