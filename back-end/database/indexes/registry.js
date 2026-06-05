import '../models/index.js';
import { AuditLogModel } from '../models/audit-log.model.js';
import { CertificateModel } from '../models/certificate.model.js';
import { DashboardMetricsSnapshotModel } from '../models/dashboard-metrics-snapshot.model.js';
import { DecreeCategoryModel } from '../models/decree-category.model.js';
import { DecreeModel } from '../models/decree.model.js';
import { DecreeViewModel } from '../models/decree-view.model.js';
import { DecreeBookmarkModel } from '../models/decree-bookmark.model.js';
import { DecreeVersionModel } from '../models/decree-version.model.js';
import { ExamAttemptModel } from '../models/exam-attempt.model.js';
import { ExamModel } from '../models/exam.model.js';
import { ExamQuestionModel } from '../models/exam-question.model.js';
import { InspectionAssignmentModel } from '../models/inspection-assignment.model.js';
import { InspectionEvidenceFileModel } from '../models/inspection-evidence-file.model.js';
import { InspectionSubmissionModel } from '../models/inspection-submission.model.js';
import { InspectionTemplateModel } from '../models/inspection-template.model.js';
import { NotificationModel } from '../models/notification.model.js';
import { RoleModel } from '../models/role.model.js';
import { StaticContentPageModel } from '../models/static-content-page.model.js';
import { HomepageBannerModel } from '../models/homepage-banner.model.js';
import { NotificationUserStateModel } from '../models/notification-user-state.model.js';
import { StoredFileModel } from '../models/stored-file.model.js';
import { UserModel } from '../models/user.model.js';
import { RefreshTokenModel } from '../models/refresh-token.model.js';
import { SystemPlatformSettingsModel } from '../models/system-platform-settings.model.js';
import { DeviceTokenModel } from '../models/device-token.model.js';
import { NotificationPreferenceModel } from '../models/notification-preference.model.js';
import { NotificationLogModel } from '../models/notification-log.model.js';
import { SchemaMigrationModel } from '../models/schema-migration.model.js';

import { getEnv } from '../../src/config/env.js';
import { getLogger } from '../../src/config/logger.js';

const models = [
  RoleModel,
  UserModel,
  RefreshTokenModel,
  DecreeCategoryModel,
  DecreeModel,
  DecreeViewModel,
  DecreeBookmarkModel,
  DecreeVersionModel,
  StoredFileModel,
  InspectionTemplateModel,
  InspectionAssignmentModel,
  InspectionSubmissionModel,
  InspectionEvidenceFileModel,
  ExamModel,
  ExamQuestionModel,
  ExamAttemptModel,
  CertificateModel,
  NotificationModel,
  StaticContentPageModel,
  HomepageBannerModel,
  NotificationUserStateModel,
  AuditLogModel,
  DashboardMetricsSnapshotModel,
  SystemPlatformSettingsModel,
  DeviceTokenModel,
  NotificationPreferenceModel,
  NotificationLogModel,
  SchemaMigrationModel,
];

/**
 * Dev/test convenience: run `syncIndexes` so fresh databases get all indexes without migrations.
 * In production this is a no-op — use `npm run db:migrate` instead (Phase 3).
 */
export async function ensureModelIndexes() {
  const env = getEnv();
  if (env.NODE_ENV === 'production') {
    getLogger().info('ensureModelIndexes: skipped (production uses `npm run db:migrate`).');
    return;
  }
  await Promise.all(models.map((m) => m.syncIndexes()));
}
