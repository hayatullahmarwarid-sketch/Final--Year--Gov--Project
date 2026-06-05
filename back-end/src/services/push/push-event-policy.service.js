import { deptUploadSettingsRepository } from '../../../database/repositories/dept-upload-settings.repository.js';
import { notificationPreferenceRepository } from '../../../database/repositories/notification-preference.repository.js';

/**
 * @typedef {'dept_new_upload' | 'dept_status_change' | 'public_catalog_update' | 'system_alert' | null} PushEventKind
 */

/**
 * @param {Record<string, unknown> | null | undefined} doc
 */
async function readDeptPushFlags() {
  const doc = await deptUploadSettingsRepository.findSingletonLean();
  const n = doc?.notifications && typeof doc.notifications === 'object' ? doc.notifications : {};
  const push = /** @type {Record<string, unknown>} */ (n.push ?? {});
  return {
    enabled: push.enabled !== false,
    newUploads: push.newUploads !== false,
    statusChanges: push.statusChanges !== false,
    systemAlerts: push.systemAlerts !== false,
  };
}

/**
 * `eventKind === null` → no filtering (legacy notifications).
 *
 * @param {string[]} recipientUserIds
 * @param {PushEventKind} eventKind
 * @returns {Promise<string[]>}
 */
export async function filterRecipientsForPushFanout(recipientUserIds, eventKind) {
  if (!eventKind) return recipientUserIds;

  let dept = null;
  if (eventKind === 'dept_new_upload' || eventKind === 'dept_status_change') {
    dept = await readDeptPushFlags();
    if (!dept.enabled) return [];
  }

  const prefMap = await notificationPreferenceRepository.findMapByUserIds(recipientUserIds);
  /** @type {string[]} */
  const out = [];

  for (const uid of recipientUserIds) {
    const row = prefMap.get(uid);
    const pushEnabled = row?.pushEnabled !== false;
    if (!pushEnabled) continue;

    const nu = row?.newUploads !== false;
    const sc = row?.statusChanges !== false;
    const sa = row?.systemAlerts !== false;

    let ok = true;
    switch (eventKind) {
      case 'dept_new_upload':
        ok = nu && dept && dept.newUploads;
        break;
      case 'dept_status_change':
        ok = sc && dept && dept.statusChanges;
        break;
      case 'public_catalog_update':
        ok = sc;
        break;
      case 'system_alert':
        ok = sa;
        break;
      default:
        ok = true;
    }

    if (ok) out.push(uid);
  }

  return out;
}
