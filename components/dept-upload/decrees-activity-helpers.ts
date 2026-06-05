import type { RejectActivityAppend } from '@/components/dept-upload/DeptUploadRecentActivityCard';

type TFn = (key: string, options?: Record<string, unknown>) => string;

export function buildRejectActivityEntry(params: {
  key: string;
  decreeNum: string;
  fullTitle: string;
  categoryName: string;
  reason: string;
}, t: TFn): RejectActivityAppend {
  return {
    key: params.key,
    verb: t('deptRejectVerb'),
    title: `${params.decreeNum} — ${params.fullTitle}`,
    meta: `${params.categoryName} · ${t('deptRejectMetaJustNow')}`,
    icon: 'close-circle',
    bg: 'rgba(244, 63, 94, 0.15)',
    color: '#E11D48',
    performedBy: t('deptActivityPerformedByYou'),
    timeLabel: t('deptRejectMetaJustNow'),
    details: params.reason.trim() || t('deptRejectDetailsFallback'),
  };
}
