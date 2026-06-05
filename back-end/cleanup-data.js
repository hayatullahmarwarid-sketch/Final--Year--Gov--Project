/**
 * MongoDB application data cleanup — deletes ALL non-user application data.
 *
 * Design goals:
 * - Remove decrees, certificates, templates, uploads, notifications, etc.
 * - Preserve user accounts (all roles) so the system remains usable.
 * - Preserve critical system collections that keep the app stable (`roles`, `schema_migrations`).
 *
 * ## How to run
 * From the `back-end/` directory (so `.env` and `MONGODB_URI` resolve the same as the API):
 *
 *   node cleanup-data.js
 *
 * Optional flags:
 *   --keep-platform-settings   Do not delete `system_platform_settings` (keeps one row of default app settings if present).
 *   --preserve-refresh-tokens  Keep `refresh_tokens` (otherwise all refresh tokens are removed and everyone must sign in again).
 *   --delete-upload-files      After DB cleanup, prompt to delete files under the disk upload root (see below).
 *   --yes-upload-files         Non-interactive: delete upload files (same rules as prompt; use only in scripts/CI with care).
 *   --delete-stored-objects    Also delete storage objects referenced by `stored_files` (works for disk + S3).
 *   --delete-example-com-users   Delete ALL users whose email contains `@example.com` (any role), and their refresh tokens.
 *   --delete-example-inspectors  Same as `--delete-example-com-users` (deprecated alias).
 *   --only-delete-example-com-users  Only remove `@example.com` users and their refresh tokens; does NOT wipe other collections.
 *   --purge-user-profile-stats   Unset any cached profile stats fields (if present) without touching operational profile fields.
 *   --wipe-public-user-profiles  Reset `profile` to `{}` for `roleKey: public_user` only (removes any client-visible counters stored there).
 *
 * For upload file deletion without a TTY, you must set:
 *   CONFIRM_DELETE_UPLOAD_FILES=YES
 * (in addition to `--delete-upload-files` or `--yes-upload-files`).
 *
 * ## What is preserved
 *   - `users` — ALL user accounts
 *   - `roles` — role definitions
 *   - `schema_migrations` — migration history (so `db:migrate` state stays valid)
 *   - `refresh_tokens` — only when `--preserve-refresh-tokens` is passed (default is wipe all tokens)
 *
 * ## Collection name note
 * This app uses explicit collection names in Mongoose (e.g. `decrees`, `decree_views`, `audit_logs`).
 * Legacy DBs with different names are not auto-targeted; if you have old names, delete them manually or
 * adjust the preserve list in this file (this script now deletes everything except preserved collections).
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { stdin as input, stdout as output } from 'node:process';
import mongoose from 'mongoose';
import { getEnv } from './src/config/env.js';
import { getStorageProvider } from './src/services/storage/get-storage-provider.js';

const argv = new Set(process.argv.slice(2));

const DEFAULT_PRESERVE_COLLECTIONS = ['users', 'roles', 'schema_migrations'];
/** Comma-separated emails to keep when trimming other users (no defaults — set explicitly if needed). */
const DEFAULT_KEEP_STAFF_EMAILS = [];

/** Folders / path segments to never delete when cleaning disk uploads (profile & avatar assets). */
const UPLOAD_PATH_DENY = [/avatars[\\/]/i, /[\\/]avatars[\\/]/i, /^avatars$/i];

/**
 * @param {string} fullPath
 * @returns {boolean} true if this path should be skipped (protected)
 */
function isProtectedUploadPath(fullPath) {
  const norm = fullPath.split(path.sep).join('/');
  return UPLOAD_PATH_DENY.some((re) => re.test(norm));
}

/**
 * Remove a file or recursively remove directory contents. Skips protected paths.
 * @param {string} entryPath
 * @param {{ files: number, dirs: number, skipped: number }} stats
 */
function purgeUploadsEntry(entryPath, stats) {
  if (!fs.existsSync(entryPath)) return;
  if (isProtectedUploadPath(entryPath)) {
    stats.skipped += 1;
    return;
  }
  const st = fs.lstatSync(entryPath);
  if (st.isDirectory()) {
    for (const ent of fs.readdirSync(entryPath, { withFileTypes: true })) {
      const p = path.join(entryPath, ent.name);
      purgeUploadsEntry(p, stats);
    }
    try {
      if (fs.existsSync(entryPath) && fs.readdirSync(entryPath).length === 0) {
        fs.rmdirSync(entryPath);
        stats.dirs += 1;
      }
    } catch {
      // ignore
    }
  } else {
    fs.unlinkSync(entryPath);
    stats.files += 1;
  }
}

/**
 * @param {string} question
 * @returns {Promise<string>}
 */
function ask(question) {
  const rl = createInterface({ input, output });
  return new Promise((resolve) => {
    rl.question(question, (ans) => {
      rl.close();
      resolve(ans.trim());
    });
  });
}

/**
 * Delete provider objects referenced by StoredFile rows.
 * This is optional because it depends on storage credentials (S3) and can be slow on large datasets.
 *
 * @param {import('mongoose').Connection['db']} db
 * @param {Set<string>} existing
 * @param {{ collection: string, deleted: number, status: string }[]} summary
 */
async function deleteStoredObjects(db, existing, summary) {
  if (!existing.has('stored_files')) {
    console.log('[skip] stored_files objects: collection not present');
    summary.push({ collection: 'stored_files objects', deleted: 0, status: 'missing' });
    return;
  }

  const env = getEnv();
  const provider = getStorageProvider();
  const storedFilesCol = db.collection('stored_files');

  const cursor = storedFilesCol
    .find({ providerFileId: { $type: 'string', $gt: '' } })
    .project({ provider: 1, providerFileId: 1, folder: 1 });

  let deleted = 0;
  let skipped = 0;
  let failed = 0;
  let scanned = 0;

  for await (const row of cursor) {
    scanned += 1;
    const providerName = String(row?.provider ?? '').trim().toLowerCase();
    const key = String(row?.providerFileId ?? '').trim();
    const folder = row?.folder ? String(row.folder) : null;

    // Safety: only delete objects that match the currently configured provider.
    if (!providerName || providerName !== provider.providerName) {
      skipped += 1;
      continue;
    }

    // Safety: never delete avatar assets.
    if (folder && /avatars/i.test(folder)) {
      skipped += 1;
      continue;
    }
    if (/avatars[\\/]/i.test(key) || /[\\/]avatars[\\/]/i.test(key)) {
      skipped += 1;
      continue;
    }

    try {
      const r = await provider.delete(key);
      if (r?.deleted) deleted += 1;
    } catch (err) {
      failed += 1;
      // Keep going: DB cleanup must still complete.
      if (env.NODE_ENV !== 'test') {
        console.warn({ err }, `Failed to delete stored object: ${key}`);
      }
    }
  }

  console.log(
    `[ok]   stored_files objects: scanned=${scanned}, deleted=${deleted}, skipped=${skipped}, failed=${failed}`,
  );
  summary.push({ collection: 'stored_files objects', deleted, status: 'ok' });
}

/**
 * Remove cached "profile stats" fields from user documents, if any exist in this DB.
 * This keeps user accounts but strips app-facing counters like certificates/exams/pass-rate if they were persisted.
 *
 * @param {import('mongoose').Connection['db']} db
 * @param {Set<string>} existing
 * @param {{ collection: string, deleted: number, status: string }[]} summary
 */
async function purgeUserProfileStats(db, existing, summary) {
  if (!existing.has('users')) {
    console.log('[skip] users profile stats: collection not present');
    summary.push({ collection: 'users (purge profile stats)', deleted: 0, status: 'missing' });
    return;
  }
  const usersCol = db.collection('users');
  const result = await usersCol.updateMany(
    {},
    {
      $unset: {
        // Known/likely app cache fields (safe to remove when present).
        'profile.earnedCertificateIds': '',
        'profile.earnedCertificates': '',
        'profile.certificateIds': '',
        'profile.certificatesCount': '',
        'profile.examIdsTaken': '',
        'profile.examsTaken': '',
        'profile.passRate': '',
        'profile.passRatePct': '',
        'profile.publicStats': '',
        'profile.stats': '',
      },
    },
  );
  const n = result.modifiedCount ?? 0;
  console.log(`[ok]   users (purge profile stats): ${n} document(s) updated`);
  summary.push({ collection: 'users (purge profile stats)', deleted: n, status: 'ok' });
}

/**
 * Delete every user whose email contains `@example.com` (test / mock accounts, any role)
 * and revoke their refresh-token rows.
 *
 * @param {import('mongoose').Connection['db']} db
 * @param {Set<string>} existing
 * @param {{ collection: string, deleted: number, status: string }[]} summary
 */
async function deleteExampleComUsers(db, existing, summary) {
  if (!existing.has('users')) {
    console.log('[skip] users (@example.com): collection not present');
    summary.push({ collection: 'users (@example.com)', deleted: 0, status: 'missing' });
    return;
  }
  const usersCol = db.collection('users');
  const filter = { email: { $type: 'string', $regex: /@example\.com/i } };
  const ids = (await usersCol.find(filter).project({ _id: 1 }).toArray()).map((d) => d._id);
  let tokensRemoved = 0;
  if (ids.length && existing.has('refresh_tokens')) {
    const tr = await db.collection('refresh_tokens').deleteMany({ userId: { $in: ids } });
    tokensRemoved = tr.deletedCount ?? 0;
    console.log(`[ok]   refresh_tokens (users @example.com): ${tokensRemoved} document(s) removed`);
    summary.push({ collection: 'refresh_tokens (users @example.com)', deleted: tokensRemoved, status: 'ok' });
  }
  const r = await usersCol.deleteMany(filter);
  const n = r.deletedCount ?? 0;
  console.log(`[ok]   users (@example.com): ${n} document(s) removed`);
  summary.push({ collection: 'users (@example.com)', deleted: n, status: 'ok' });
}

/**
 * Remove legacy local dev staff accounts (system@gmail.com, decree@gmail.com, inspectoradmin@gmail.com).
 *
 * @param {import('mongoose').Connection['db']} db
 * @param {Set<string>} existing
 * @param {{ collection: string, deleted: number, status: string }[]} summary
 */
async function deleteDevStaffUsers(db, existing, summary) {
  if (!existing.has('users')) {
    console.log('[skip] users (dev staff): collection not present');
    summary.push({ collection: 'users (dev staff)', deleted: 0, status: 'missing' });
    return;
  }
  const usersCol = db.collection('users');
  const devEmails = ['system@gmail.com', 'decree@gmail.com', 'inspectoradmin@gmail.com'];
  const filter = { email: { $in: devEmails } };
  const ids = (await usersCol.find(filter).project({ _id: 1 }).toArray()).map((d) => d._id);
  let tokensRemoved = 0;
  if (ids.length && existing.has('refresh_tokens')) {
    const tr = await db.collection('refresh_tokens').deleteMany({ userId: { $in: ids } });
    tokensRemoved = tr.deletedCount ?? 0;
    console.log(`[ok]   refresh_tokens (dev staff): ${tokensRemoved} document(s) removed`);
    summary.push({ collection: 'refresh_tokens (dev staff)', deleted: tokensRemoved, status: 'ok' });
  }
  const r = await usersCol.deleteMany(filter);
  const n = r.deletedCount ?? 0;
  console.log(`[ok]   users (dev staff): ${n} document(s) removed`);
  summary.push({ collection: 'users (dev staff)', deleted: n, status: 'ok' });
}

/**
 * Reset `profile` for public users only. This is safe for public-user accounts and helps ensure
 * no cached counters (certificates / exams / pass rate) remain in persisted profile JSON.
 *
 * @param {import('mongoose').Connection['db']} db
 * @param {Set<string>} existing
 * @param {{ collection: string, deleted: number, status: string }[]} summary
 */
async function wipePublicUserProfiles(db, existing, summary) {
  if (!existing.has('users')) {
    console.log('[skip] users (wipe public_user profiles): collection not present');
    summary.push({ collection: 'users (wipe public_user profiles)', deleted: 0, status: 'missing' });
    return;
  }
  const usersCol = db.collection('users');
  const r = await usersCol.updateMany(
    { roleKey: 'public_user' },
    { $set: { profile: {} } },
  );
  const n = r.modifiedCount ?? 0;
  console.log(`[ok]   users (wipe public_user profiles): ${n} document(s) updated`);
  summary.push({ collection: 'users (wipe public_user profiles)', deleted: n, status: 'ok' });
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri || typeof uri !== 'string' || !uri.trim()) {
    console.error('Missing MONGODB_URI. Set it in back-end/.env or the environment.');
    process.exit(1);
  }

  const keepPlatformSettings = argv.has('--keep-platform-settings');
  const preserveRefreshTokens = argv.has('--preserve-refresh-tokens');
  const keepAllUsers = argv.has('--keep-all-users');
  const wantDeleteFiles = argv.has('--delete-upload-files') || argv.has('--yes-upload-files');
  const nonInteractiveFiles = argv.has('--yes-upload-files');
  const deleteStoredObjectsFlag = argv.has('--delete-stored-objects');
  const deleteExampleComUsersFlag =
    argv.has('--delete-example-com-users') || argv.has('--delete-example-inspectors');
  const deleteDevStaffUsersFlag = argv.has('--delete-dev-staff-users');
  const onlyDeleteExampleComUsersFlag = argv.has('--only-delete-example-com-users');
  const purgeUserProfileStatsFlag = argv.has('--purge-user-profile-stats');
  const wipePublicUserProfilesFlag = argv.has('--wipe-public-user-profiles');

  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  if (!db) {
    throw new Error('No database handle after connect');
  }

  const existing = new Set(
    (await db.listCollections().toArray())
      .map((c) => c.name)
      .filter((n) => n !== undefined),
  );

  if (onlyDeleteExampleComUsersFlag) {
    const summary = [];
    console.log('Removing users with @example.com in email (any role) and their refresh tokens…\n');
    await deleteExampleComUsers(db, existing, summary);
    console.log('\n--- Summary ---');
    for (const row of summary) {
      if (row.status === 'ok') {
        console.log(`  ${row.collection}: ${row.deleted}`);
      } else {
        console.log(`  ${row.collection}: (not found)`);
      }
    }
    await mongoose.disconnect();
    console.log('\nDone. Database disconnected.');
    return;
  }

  const summary = [];

  const preserve = new Set(DEFAULT_PRESERVE_COLLECTIONS);
  if (keepPlatformSettings) preserve.add('system_platform_settings');
  if (preserveRefreshTokens) preserve.add('refresh_tokens');

  console.log(
    keepAllUsers
      ? 'Connecting OK. Deleting ALL non-user application data (preserving ALL users)…\n'
      : 'Connecting OK. Deleting ALL application data (preserving ONLY 3 staff accounts)…\n',
  );

  if (deleteStoredObjectsFlag) {
    await deleteStoredObjects(db, existing, summary);
  } else {
    console.log('Tip: pass --delete-stored-objects to delete underlying upload objects referenced by stored_files.');
  }

  if (purgeUserProfileStatsFlag) {
    await purgeUserProfileStats(db, existing, summary);
  } else {
    console.log('Tip: pass --purge-user-profile-stats to remove cached stats fields from users.profile (if present).');
  }

  if (deleteExampleComUsersFlag) {
    if (argv.has('--delete-example-inspectors') && !argv.has('--delete-example-com-users')) {
      console.log('Note: --delete-example-inspectors is deprecated; use --delete-example-com-users (all roles).');
    }
    await deleteExampleComUsers(db, existing, summary);
  } else {
    console.log('Tip: pass --delete-example-com-users to remove all users with @example.com emails (any role).');
  }

  if (deleteDevStaffUsersFlag) {
    await deleteDevStaffUsers(db, existing, summary);
  } else {
    console.log(
      'Tip: pass --delete-dev-staff-users to remove legacy dev staff accounts (system@gmail.com, decree@gmail.com, inspectoradmin@gmail.com).',
    );
  }

  if (wipePublicUserProfilesFlag) {
    await wipePublicUserProfiles(db, existing, summary);
  } else {
    console.log('Tip: pass --wipe-public-user-profiles to reset `profile` for public_user accounts only.');
  }

  // Optional: trim users to an explicit keep-list from CLEANUP_KEEP_STAFF_EMAILS (comma-separated).
  // With no defaults, this step is skipped unless emails are configured (avoids accidental full user wipe).
  if (!keepAllUsers) {
    if (!existing.has('users')) {
      console.log('[skip] users (trim): collection not present');
      summary.push({ collection: 'users (trim)', deleted: 0, status: 'missing' });
    } else {
      const envList = String(process.env.CLEANUP_KEEP_STAFF_EMAILS ?? '')
        .split(',')
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean);
      const keepEmails = envList.length ? envList : DEFAULT_KEEP_STAFF_EMAILS.map((e) => e.trim().toLowerCase());
      if (keepEmails.length === 0) {
        console.log(
          '[skip] users (trim): CLEANUP_KEEP_STAFF_EMAILS unset — not deleting users (use --keep-all-users to preserve everyone explicitly, or set CLEANUP_KEEP_STAFF_EMAILS=a@b.com,... to trim).',
        );
        summary.push({ collection: 'users (trim skipped — no keep list)', deleted: 0, status: 'skipped' });
      } else {
        const usersCol = db.collection('users');
        const keepFilter = { email: { $in: keepEmails } };
        const keepIds = (await usersCol.find(keepFilter).project({ _id: 1 }).toArray()).map((d) => d._id);

        if (existing.has('refresh_tokens')) {
          if (preserveRefreshTokens) {
            const tr = await db
              .collection('refresh_tokens')
              .deleteMany(keepIds.length ? { userId: { $nin: keepIds } } : {});
            const n = tr.deletedCount ?? 0;
            console.log(`[ok]   refresh_tokens (non-staff users): ${n} document(s) removed`);
            summary.push({ collection: 'refresh_tokens (non-staff users)', deleted: n, status: 'ok' });
          } else {
            const tr = await db.collection('refresh_tokens').deleteMany({});
            const n = tr.deletedCount ?? 0;
            console.log(`[ok]   refresh_tokens: ${n} document(s) removed`);
            summary.push({ collection: 'refresh_tokens', deleted: n, status: 'ok' });
          }
        }

        const r = await usersCol.deleteMany({ email: { $nin: keepEmails } });
        const n = r.deletedCount ?? 0;
        console.log(`[ok]   users (deleted non-staff): ${n} document(s) removed`);
        summary.push({ collection: 'users (deleted non-staff)', deleted: n, status: 'ok' });
      }
    }
  } else {
    console.log('Note: --keep-all-users set; user accounts are preserved.');
  }

  /** @type {string[]} */
  const collectionsToDelete = [...existing].filter((name) => !preserve.has(name));
  collectionsToDelete.sort();

  for (const name of collectionsToDelete) {
    const result = await db.collection(name).deleteMany({});
    const n = result.deletedCount ?? 0;
    console.log(`[ok]   ${name}: ${n} document(s) removed`);
    summary.push({ collection: name, deleted: n, status: 'ok' });
  }

  const totalDeleted = summary.filter((r) => r.status === 'ok').reduce((a, r) => a + r.deleted, 0);

  console.log('\n--- Summary (deleted per collection) ---');
  for (const row of summary) {
    if (row.status === 'ok') {
      console.log(`  ${row.collection}: ${row.deleted}`);
    } else {
      console.log(`  ${row.collection}: (not found)`);
    }
  }
  console.log(`\nTotal documents deleted: ${totalDeleted}`);
  const preservedList = [...preserve].sort().join(', ');
  console.log(`Preserved collections: ${preservedList}\n`);

  if (wantDeleteFiles) {
    const uploadRoot = path.resolve(process.cwd(), String(process.env.UPLOAD_DIR || 'uploads').trim() || 'uploads');
    console.log('--- Optional: physical files on disk ---');
    console.log(`Upload root: ${uploadRoot}`);
    console.log('Protected: any path under or named `avatars/` (profile / avatar files).');
    let proceed = false;
    if (nonInteractiveFiles) {
      if (String(process.env.CONFIRM_DELETE_UPLOAD_FILES || '').trim() === 'YES') {
        proceed = true;
      } else {
        console.error('Refusing --yes-upload-files: set CONFIRM_DELETE_UPLOAD_FILES=YES to confirm.');
      }
    } else if (process.stdout.isTTY && process.stdin.isTTY) {
      const a = await ask('Delete other files under the upload root? Type YES to continue: ');
      proceed = a === 'YES';
    } else {
      console.log('Not a TTY: set CONFIRM_DELETE_UPLOAD_FILES=YES and use --yes-upload-files, or re-run in a terminal with --delete-upload-files.');
    }

    if (proceed) {
      if (!fs.existsSync(uploadRoot)) {
        console.log('Upload root does not exist; nothing to delete.');
      } else {
        const stats = { files: 0, dirs: 0, skipped: 0 };
        for (const ent of fs.readdirSync(uploadRoot, { withFileTypes: true })) {
          const p = path.join(uploadRoot, ent.name);
          if (ent.isDirectory() && /avatars/i.test(ent.name)) {
            console.log(`[skip directory] ${p}`);
            stats.skipped += 1;
            continue;
          }
          purgeUploadsEntry(p, stats);
        }
        console.log(
          `\nUpload cleanup: ${stats.files} file(s) removed, ${stats.dirs} empty dir(s) removed, ${stats.skipped} path(s) skipped (protected).`,
        );
      }
    } else {
      console.log('Skipping physical file deletion.');
    }
  } else {
    console.log('Tip: pass --delete-upload-files to remove files under the upload root (excludes `avatars/`).');
  }

  await mongoose.disconnect();
  console.log('\nDone. Database disconnected.');
}

main().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
