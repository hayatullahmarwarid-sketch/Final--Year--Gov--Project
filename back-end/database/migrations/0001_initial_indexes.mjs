/**
 * Baseline migration that materializes all mongoose schemas and runs `syncIndexes` once.
 * Safe to re-run (mongoose idempotently reconciles indexes). After this migration the API
 * boots with `autoIndex: false` in production and `syncIndexes()` is never called at boot.
 */
import '../models/index.js';
import { SchemaMigrationModel } from '../models/schema-migration.model.js';
import { UserModel } from '../models/user.model.js';
import { RefreshTokenModel } from '../models/refresh-token.model.js';
import { AuditLogModel } from '../models/audit-log.model.js';
import { StoredFileModel } from '../models/stored-file.model.js';
import { DecreeModel } from '../models/decree.model.js';
import { DecreeCategoryModel } from '../models/decree-category.model.js';
import { DecreeVersionModel } from '../models/decree-version.model.js';
import { DecreeBookmarkModel } from '../models/decree-bookmark.model.js';
import { InspectionTemplateModel } from '../models/inspection-template.model.js';
import { InspectionAssignmentModel } from '../models/inspection-assignment.model.js';
import { InspectionSubmissionModel } from '../models/inspection-submission.model.js';
import { InspectionEvidenceFileModel } from '../models/inspection-evidence-file.model.js';
import { ExamModel } from '../models/exam.model.js';
import { ExamQuestionModel } from '../models/exam-question.model.js';
import { ExamAttemptModel } from '../models/exam-attempt.model.js';
import { CertificateModel } from '../models/certificate.model.js';
import { NotificationModel } from '../models/notification.model.js';
import { NotificationUserStateModel } from '../models/notification-user-state.model.js';
import { StaticContentPageModel } from '../models/static-content-page.model.js';
import { HomepageBannerModel } from '../models/homepage-banner.model.js';
import { DashboardMetricsSnapshotModel } from '../models/dashboard-metrics-snapshot.model.js';
import { SystemPlatformSettingsModel } from '../models/system-platform-settings.model.js';
import { RoleModel } from '../models/role.model.js';

export const name = '0001_initial_indexes';

const ALL_MODELS = [
  SchemaMigrationModel,
  UserModel,
  RefreshTokenModel,
  AuditLogModel,
  StoredFileModel,
  DecreeModel,
  DecreeCategoryModel,
  DecreeVersionModel,
  DecreeBookmarkModel,
  InspectionTemplateModel,
  InspectionAssignmentModel,
  InspectionSubmissionModel,
  InspectionEvidenceFileModel,
  ExamModel,
  ExamQuestionModel,
  ExamAttemptModel,
  CertificateModel,
  NotificationModel,
  NotificationUserStateModel,
  StaticContentPageModel,
  HomepageBannerModel,
  DashboardMetricsSnapshotModel,
  SystemPlatformSettingsModel,
  RoleModel,
];

export async function up({ logger }) {
  for (const m of ALL_MODELS) {
    try {
      await m.syncIndexes();
    } catch (err) {
      logger?.warn?.({ err, model: m.modelName }, 'migration.sync_indexes_failed');
      throw err;
    }
  }
}

export async function down() {
  // Non-destructive baseline; nothing to undo. If you really need to drop every index,
  // write a separate migration that lists specific ones.
}
