/**
 * SAFE runtime / application data reset for the Government Decree System.
 *
 * Removes MongoDB content (decrees, exams, certificates, inspections, notifications,
 * dashboard snapshots, public users, etc.) while keeping:
 *   - code, routes, APIs (unchanged)
 *   - roles collection + RBAC definitions (re-seeded idempotently)
 *   - users with non–public_user roles (system_admin, inspector_admin, decree_upload_department, inspector)
 *   - system_platform_settings, dept_upload_settings, schema_migrations, static_content_pages
 *
 * Does NOT drop collections (indexes + migrations stay healthy); uses deleteMany({}).
 *
 * Run from `back-end/` (requires `back-end/.env` with MONGODB_URI, JWT_*, etc.):
 *   npm run db:reset-runtime -- --dry-run
 *   npm run db:reset-runtime -- --execute
 *
 * Optional env when no system_admin remains after cleanup:
 *   CLEANUP_BOOTSTRAP_SYSTEM_ADMIN_EMAIL
 *   CLEANUP_BOOTSTRAP_SYSTEM_ADMIN_PASSWORD   (min 12 chars recommended)
 *
 * Flags:
 *   --dry-run     Print collection counts only (no writes). If combined with --execute, dry-run wins.
 *   --execute     Perform database deletes (run --dry-run first).
 *   --skip-files  Skip local disk cleanup under UPLOAD_DIR (use for STORAGE_PROVIDER=s3 or CI).
 */
import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import { connectMongo, disconnectMongo } from '../database/connection/mongoose.js';
import '../database/models/index.js';
import { ExamQuestionBankModel } from '../database/models/exam-question-bank.model.js';
import { CertificateModel } from '../database/models/certificate.model.js';
import { ExamAttemptModel } from '../database/models/exam-attempt.model.js';
import { ExamQuestionModel } from '../database/models/exam-question.model.js';
import { ExamModel } from '../database/models/exam.model.js';
import { PendingInspectionOfflineModel } from '../database/models/pending-inspection-offline.model.js';
import { InspectionEvidenceFileModel } from '../database/models/inspection-evidence-file.model.js';
import { InspectionSubmissionModel } from '../database/models/inspection-submission.model.js';
import { InspectionAssignmentModel } from '../database/models/inspection-assignment.model.js';
import { DecreeViewModel } from '../database/models/decree-view.model.js';
import { DecreeBookmarkModel } from '../database/models/decree-bookmark.model.js';
import { DecreeVersionModel } from '../database/models/decree-version.model.js';
import { DecreeModel } from '../database/models/decree.model.js';
import { InspectionTemplateModel } from '../database/models/inspection-template.model.js';
import { DecreeCategoryModel } from '../database/models/decree-category.model.js';
import { NotificationUserStateModel } from '../database/models/notification-user-state.model.js';
import { NotificationLogModel } from '../database/models/notification-log.model.js';
import { NotificationModel } from '../database/models/notification.model.js';
import { HomepageBannerModel } from '../database/models/homepage-banner.model.js';
import { DashboardMetricsSnapshotModel } from '../database/models/dashboard-metrics-snapshot.model.js';
import { AuditLogModel } from '../database/models/audit-log.model.js';
import { StoredFileModel } from '../database/models/stored-file.model.js';
import { ReferenceSequenceCounterModel } from '../database/models/reference-sequence-counter.model.js';
import { RefreshTokenModel } from '../database/models/refresh-token.model.js';
import { DeviceTokenModel } from '../database/models/device-token.model.js';
import { NotificationPreferenceModel } from '../database/models/notification-preference.model.js';
import { UserModel } from '../database/models/user.model.js';
import { RoleModel } from '../database/models/role.model.js';
import { runAllSeeders } from '../database/seeders/run-seed.js';
import { getEnv } from '../src/config/env.js';
import { RoleKey } from '../src/modules/shared/enums/roles.js';
import { hashPassword } from '../src/lib/auth.js';

const argv = new Set(process.argv.slice(2));
const dryRun = argv.has('--dry-run');
const execute = argv.has('--execute');
const skipFiles = argv.has('--skip-files');

/** @type {Array<{ key: string; model: import('mongoose').Model<unknown>; filter: Record<string, unknown> }>} */
const DELETE_STEPS = [
  { key: 'certificates', model: CertificateModel, filter: {} },
  { key: 'exam_attempts', model: ExamAttemptModel, filter: {} },
  { key: 'exam_questions', model: ExamQuestionModel, filter: {} },
  { key: 'exams', model: ExamModel, filter: {} },
  { key: 'exam_question_bank', model: ExamQuestionBankModel, filter: {} },
  { key: 'pending_inspection_offline', model: PendingInspectionOfflineModel, filter: {} },
  { key: 'inspection_evidence_files', model: InspectionEvidenceFileModel, filter: {} },
  { key: 'inspection_submissions', model: InspectionSubmissionModel, filter: {} },
  { key: 'inspection_assignments', model: InspectionAssignmentModel, filter: {} },
  { key: 'decree_views', model: DecreeViewModel, filter: {} },
  { key: 'decree_bookmarks', model: DecreeBookmarkModel, filter: {} },
  { key: 'decree_versions', model: DecreeVersionModel, filter: {} },
  { key: 'decrees', model: DecreeModel, filter: {} },
  { key: 'inspection_templates', model: InspectionTemplateModel, filter: {} },
  { key: 'decree_categories', model: DecreeCategoryModel, filter: {} },
  { key: 'notification_user_states', model: NotificationUserStateModel, filter: {} },
  { key: 'notification_logs', model: NotificationLogModel, filter: {} },
  { key: 'notifications', model: NotificationModel, filter: {} },
  { key: 'homepage_banners', model: HomepageBannerModel, filter: {} },
  { key: 'dashboard_metrics_snapshots', model: DashboardMetricsSnapshotModel, filter: {} },
  { key: 'audit_logs', model: AuditLogModel, filter: {} },
  { key: 'stored_files', model: StoredFileModel, filter: {} },
  { key: 'reference_sequence_counters', model: ReferenceSequenceCounterModel, filter: {} },
  { key: 'refresh_tokens', model: RefreshTokenModel, filter: {} },
  { key: 'device_tokens', model: DeviceTokenModel, filter: {} },
  { key: 'notification_preferences', model: NotificationPreferenceModel, filter: {} },
  { key: 'users_public_user_only', model: UserModel, filter: { roleKey: RoleKey.PUBLIC_USER } },
];

/**
 * @param {string} dir
 * @param {{ dryRun: boolean }} opts
 * @returns {Promise<{ filesRemoved: number; dirsVisited: number }>}
 */
async function wipeDiskUploadTree(dir, opts) {
  let filesRemoved = 0;
  let dirsVisited = 0;

  async function walk(absDir) {
    dirsVisited += 1;
    let entries;
    try {
      entries = await fs.readdir(absDir, { withFileTypes: true });
    } catch (err) {
      if (err && typeof err === 'object' && 'code' in err && err.code === 'ENOENT') return;
      throw err;
    }

    for (const ent of entries) {
      if (ent.name === '.gitkeep') continue;
      const abs = path.join(absDir, ent.name);
      if (ent.isDirectory()) {
        await walk(abs);
      } else if (ent.isFile()) {
        if (opts.dryRun) {
          filesRemoved += 1;
        } else {
          await fs.unlink(abs);
          filesRemoved += 1;
        }
      }
    }
  }

  await walk(dir);
  return { filesRemoved, dirsVisited };
}

/**
 * @returns {Promise<{ created: boolean; email?: string }>}
 */
async function ensureAtLeastOneSystemAdmin() {
  const existing = await UserModel.countDocuments({ roleKey: RoleKey.SYSTEM_ADMIN });
  if (existing > 0) return { created: false };

  const email = process.env.CLEANUP_BOOTSTRAP_SYSTEM_ADMIN_EMAIL?.trim().toLowerCase() ?? '';
  const password = process.env.CLEANUP_BOOTSTRAP_SYSTEM_ADMIN_PASSWORD;
  if (!email || !password) {
    console.warn(
      '[reset-runtime-data] WARNING: No system_admin user exists. ' +
        'Create one via the System Admin UI, or set CLEANUP_BOOTSTRAP_SYSTEM_ADMIN_EMAIL + ' +
        'CLEANUP_BOOTSTRAP_SYSTEM_ADMIN_PASSWORD and re-run this script.',
    );
    return { created: false };
  }

  if (password.length < 12) {
    console.warn(
      '[reset-runtime-data] CLEANUP_BOOTSTRAP_SYSTEM_ADMIN_PASSWORD is too short (<12). Refusing auto-bootstrap.',
    );
    return { created: false };
  }

  const emailTaken = await UserModel.exists({ email });
  if (emailTaken) {
    console.warn(
      `[reset-runtime-data] User with email ${email} already exists; skipping bootstrap system_admin.`,
    );
    return { created: false };
  }

  const role = await RoleModel.findOne({ key: RoleKey.SYSTEM_ADMIN }).select('_id').lean();
  if (!role) {
    console.warn('[reset-runtime-data] Role system_admin missing in DB; run npm run seed:roles first.');
    return { created: false };
  }

  const passwordHash = await hashPassword(password);
  await UserModel.create({
    email,
    displayName: 'System Administrator',
    roleKey: RoleKey.SYSTEM_ADMIN,
    roleId: role._id,
    status: 'active',
    preferredLocale: 'ps',
    preferredLanguage: 'en',
    passwordHash,
    authProvider: 'password',
    emailVerifiedAt: new Date(),
  });

  return { created: true, email };
}

async function main() {
  if (!dryRun && !execute) {
    console.error(
      'Specify --dry-run to preview counts, or --execute to delete runtime data.\n' +
        'Example: npm run db:reset-runtime -- --dry-run\n' +
        '         npm run db:reset-runtime -- --execute',
    );
    process.exit(1);
  }

  await connectMongo();

  if (dryRun) {
    if (execute) {
      console.warn('[reset-runtime-data] Both --dry-run and --execute passed; running dry-run only.\n');
    }
    console.log('[reset-runtime-data] DRY RUN — document counts (no changes):\n');
    for (const s of DELETE_STEPS) {
      const c = await s.model.countDocuments(s.filter);
      console.log(`  ${s.key}: ${c}`);
    }

    const env = getEnv();
    if (!skipFiles && env.STORAGE_PROVIDER === 'disk') {
      const uploadRoot = path.resolve(process.cwd(), env.UPLOAD_DIR);
      const { filesRemoved } = await wipeDiskUploadTree(uploadRoot, { dryRun: true });
      console.log(`  disk_files_under_${env.UPLOAD_DIR}: ~${filesRemoved} files (would delete)`);
    } else if (skipFiles) {
      console.log('  disk_files: skipped (--skip-files)');
    } else {
      console.log(`  disk_files: skipped (STORAGE_PROVIDER=${env.STORAGE_PROVIDER})`);
    }

    await disconnectMongo();
    return;
  }

  console.log('[reset-runtime-data] EXECUTE — deleting runtime data…');

  const seedSummary = await runAllSeeders();
  console.log('[reset-runtime-data] Roles re-seeded (idempotent):', seedSummary);

  const summary = {};
  for (const s of DELETE_STEPS) {
    const res = await s.model.deleteMany(s.filter);
    summary[s.key] = res.deletedCount ?? 0;
    console.log(`  deleted ${s.key}: ${summary[s.key]}`);
  }

  const bootstrap = await ensureAtLeastOneSystemAdmin();
  if (bootstrap.created) {
    console.log(`[reset-runtime-data] Created bootstrap system_admin for ${bootstrap.email}`);
  }

  if (!skipFiles) {
    const env = getEnv();
    if (env.STORAGE_PROVIDER !== 'disk') {
      console.log(
        `[reset-runtime-data] STORAGE_PROVIDER=${env.STORAGE_PROVIDER} — skipping local disk wipe ` +
          '(metadata rows in stored_files were still cleared).',
      );
    } else {
      const uploadRoot = path.resolve(process.cwd(), env.UPLOAD_DIR);
      const cwd = path.resolve(process.cwd());
      if (!uploadRoot.startsWith(cwd + path.sep) && uploadRoot !== cwd) {
        console.error('[reset-runtime-data] Refusing disk wipe: UPLOAD_DIR resolves outside project cwd.');
        process.exit(1);
      }
      const { filesRemoved } = await wipeDiskUploadTree(uploadRoot, { dryRun: false });
      console.log(`[reset-runtime-data] Removed ${filesRemoved} file(s) under ${uploadRoot} (.gitkeep preserved).`);
    }
  } else {
    console.log('[reset-runtime-data] --skip-files: disk untouched.');
  }

  console.log('[reset-runtime-data] Done.', summary);
  await disconnectMongo();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
