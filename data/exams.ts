import { Brand } from '@/constants/brand';
import { palette } from '@/lib/theme';

export type ExamStatus = 'available' | 'upcoming' | 'completed';

export type ExamListItem = {
  id: string;
  category: string;
  status: ExamStatus;
  title: string;
  durationMin: number;
  questionCount: number;
  passMarkPct: number;
  /** Set when status is completed */
  scorePct?: number;
  /** Certificate id granted when the user passes this exam (from API). */
  rewardCertificateId?: string | null;
};

export type ExamFilterTab = 'all' | ExamStatus;

/** Dot colors for idle chips — same visual language as Decrees category chips. */
export const EXAM_FILTER_TABS: { key: ExamFilterTab; label: string; dot: string }[] = [
  { key: 'all', label: 'All', dot: Brand.green },
  { key: 'available', label: 'Available', dot: palette.primary },
  { key: 'upcoming', label: 'Upcoming', dot: Brand.gold },
  { key: 'completed', label: 'Completed', dot: palette.primaryShade2 },
];

export function countExamsByFilter(exams: ExamListItem[], tab: ExamFilterTab): number {
  if (tab === 'all') return exams.length;
  return exams.filter((e) => e.status === tab).length;
}
