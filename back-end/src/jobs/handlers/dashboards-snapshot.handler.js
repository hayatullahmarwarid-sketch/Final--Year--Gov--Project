import { getLogger } from '../../config/logger.js';
import { dashboardsService } from '../../modules/dashboards/dashboards.service.js';

/**
 * Refresh shared (non-personalized) dashboard snapshots. Personalized dashboards (public,
 * inspector-per-user, decree-upload per uploader) are computed on request because they vary by user id.
 *
 * Run every 5 minutes via a repeatable BullMQ job (see `worker.js`).
 *
 * @param {{ id: string | undefined, name: string, data: { roles?: string[] } }} job
 */
export async function dashboardsSnapshotHandler(job) {
  const log = getLogger();
  const roles = job.data?.roles ?? ['system_admin', 'inspector_admin'];

  for (const role of roles) {
    try {
      if (role === 'system_admin') {
        await dashboardsService.getSystemAdminDashboard();
      } else if (role === 'decree_upload') {
        // Per-uploader metrics require JWT `sub` — see GET /dashboards/decree-upload.
        log.debug('dashboards.snapshot.skip_decree_upload_personalized');
      } else if (role === 'inspector_admin') {
        await dashboardsService.getInspectorAdminDashboard();
      } else {
        log.warn({ role }, 'dashboards.snapshot.unknown_role');
      }
    } catch (err) {
      log.warn({ err, role }, 'dashboards.snapshot.compute_failed');
    }
  }
}
