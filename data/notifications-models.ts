export type NotificationCategory =
  | 'decree'
  | 'certificate'
  | 'exam_result'
  | 'exam_reminder'
  | 'account';

/** Primary "View" navigation — used from the notifications list (e.g. opened from Home). */
export type NotificationViewTarget =
  | { type: 'decree'; decreeId: string }
  | { type: 'certificate'; certificateId: string }
  /** Open results for this exam id using the signed-in user's stored attempt (URL params not required). */
  | { type: 'exam_review'; examId: string }
  /** Open results for the user's most recently completed exam (graded). */
  | { type: 'exam_review_latest' }
  | { type: 'exam_start'; examId: string }
  | { type: 'exams_tab' }
  | { type: 'decrees_tab' }
  | { type: 'edit_profile' };

export type InboxNotification = {
  id: string;
  category: NotificationCategory;
  title: string;
  description: string;
  timeLabel: string;
  read: boolean;
  showViewButton?: boolean;
  showPassedBadge?: boolean;
  showViewCertificate?: boolean;
  /** Where the "View" pill navigates (optional legacy presets in `NOTIFICATION_VIEW_PRESETS`). */
  viewTarget?: NotificationViewTarget;
  /** Where "View Certificate" navigates (required when `showViewCertificate` is true). */
  certificateId?: string;
};

/** Legacy deep-link presets by notification id (empty; API rows include `viewTarget` / `certificateId`). */
export const NOTIFICATION_VIEW_PRESETS: Partial<Record<string, NotificationViewTarget>> = {};

export const NOTIFICATION_CERTIFICATE_PRESETS: Partial<Record<string, string>> = {};

export function resolveNotificationViewTarget(
  item: InboxNotification,
): NotificationViewTarget | undefined {
  return item.viewTarget ?? NOTIFICATION_VIEW_PRESETS[item.id];
}

export function resolveNotificationCertificateId(item: InboxNotification): string | undefined {
  return item.certificateId ?? NOTIFICATION_CERTIFICATE_PRESETS[item.id];
}

/** Inbox initial state before API load — always empty; data comes from `GET /api/v1/notifications`. */
export const INITIAL_INBOX_NOTIFICATIONS: InboxNotification[] = [];
