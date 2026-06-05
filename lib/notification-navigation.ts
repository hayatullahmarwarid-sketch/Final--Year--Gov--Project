import { type Href, router } from 'expo-router';

import type { ExamAttemptRecord } from '@/contexts/public-user-data-context';
import {
  resolveNotificationCertificateId,
  resolveNotificationViewTarget,
  type InboxNotification,
  type NotificationViewTarget,
} from '@/data/notifications-models';

function latestAttempt(examAttempts: Record<string, ExamAttemptRecord>): ExamAttemptRecord | undefined {
  const list = [...Object.values(examAttempts)];
  if (list.length === 0) return undefined;
  return list.sort((a, b) => (a.completedAt < b.completedAt ? 1 : -1))[0];
}

function go(target: NotificationViewTarget, examAttempts: Record<string, ExamAttemptRecord>): void {
  switch (target.type) {
    case 'decree':
      router.push(`/decree/${target.decreeId}` as Href);
      return;
    case 'certificate':
      router.push(`/certificate/${target.certificateId}` as Href);
      return;
    case 'exam_start':
      router.push(`/exam/${target.examId}/instructions` as Href);
      return;
    case 'exam_review': {
      const att = examAttempts[target.examId];
      if (att) {
        // Results screen reads this user's attempt from scoped storage (same as Review on Exams tab).
        router.push(`/exam/${target.examId}/results` as Href);
      } else {
        router.push(`/exam/${target.examId}/instructions` as Href);
      }
      return;
    }
    case 'exam_review_latest': {
      const att = latestAttempt(examAttempts);
      if (att) {
        router.push(`/exam/${att.examId}/results` as Href);
      } else {
        router.push('/(tabs)/exams' as Href);
      }
      return;
    }
    case 'exams_tab':
      router.push('/(tabs)/exams' as Href);
      return;
    case 'decrees_tab':
      router.push('/(tabs)/decrees' as Href);
      return;
    case 'edit_profile':
      router.push('/edit-profile' as Href);
      return;
    default:
      return;
  }
}

/**
 * Handles the primary "View" action for an inbox row (notifications opened from Home, etc.).
 */
export function navigateNotificationView(
  item: InboxNotification,
  examAttempts: Record<string, ExamAttemptRecord>,
): void {
  const target = resolveNotificationViewTarget(item);
  if (target) {
    go(target, examAttempts);
    return;
  }
  switch (item.category) {
    case 'decree':
      router.push('/(tabs)/decrees' as Href);
      return;
    case 'certificate':
      router.push({ pathname: '/(tabs)/certificates', params: { earnedOnly: '1' } } as Href);
      return;
    case 'exam_result': {
      const att = latestAttempt(examAttempts);
      if (att) {
        router.push(`/exam/${att.examId}/results` as Href);
      } else {
        router.push('/(tabs)/exams' as Href);
      }
      return;
    }
    case 'exam_reminder':
      router.push('/(tabs)/exams' as Href);
      return;
    case 'account':
      router.push('/edit-profile' as Href);
      return;
    default:
      router.push('/(tabs)' as Href);
  }
}

/** "View Certificate" pill — opens certificate detail when id is known. */
export function navigateNotificationCertificate(item: InboxNotification): void {
  const id = resolveNotificationCertificateId(item);
  if (id) {
    router.push(`/certificate/${id}` as Href);
    return;
  }
  router.push({ pathname: '/(tabs)/certificates', params: { earnedOnly: '1' } } as Href);
}
