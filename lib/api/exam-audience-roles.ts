import type { ExamAudienceRole } from '@/data/inspector-admin-store';

/**
 * Mobile / store labels (chips in {@link ExamBuilderSheet}) vs server
 * `ROLE_KEYS` in `back-end/src/modules/shared/enums/roles.js`.
 * The API and Mongo enum use snake_case; the UI uses kebab-case for display.
 */
const UI_TO_API: Record<ExamAudienceRole, string> = {
  inspector: 'inspector',
  'inspector-admin': 'inspector_admin',
  'dept-upload': 'decree_upload_department',
  'system-admin': 'system_admin',
  public: 'public_user',
};

const API_TO_UI: Record<string, ExamAudienceRole> = {
  inspector: 'inspector',
  inspector_admin: 'inspector-admin',
  decree_upload_department: 'dept-upload',
  system_admin: 'system-admin',
  public_user: 'public',
};

/**
 * Keys accepted by `POST/PATCH` exam bodies and persisted on `Exam.audienceRoleKeys`.
 */
export function examAudienceKeysForApi(ui: ExamAudienceRole[]): string[] {
  return ui.map((k) => UI_TO_API[k] ?? 'inspector');
}

/**
 * Map API/DB role strings back to UI chip keys for admin screens.
 */
export function examAudienceKeysFromApi(api: string[]): ExamAudienceRole[] {
  return api.map((k) => API_TO_UI[k] ?? 'inspector');
}
