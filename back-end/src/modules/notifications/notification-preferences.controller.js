import { asyncHandler, sendSuccess } from '../shared/http/index.js';
import { UnauthorizedError } from '../../core/errors/app-error.js';
import { notificationPreferenceRepository } from '../../../database/repositories/notification-preference.repository.js';

export class NotificationPreferencesController {
  getMine = asyncHandler(async (req, res) => {
    const userId = req.user?.id;
    if (!userId) throw new UnauthorizedError('Authentication required');
    const row = await notificationPreferenceRepository.findByUserIdLean(userId);
    return sendSuccess(res, {
      pushEnabled: row?.pushEnabled !== false,
      newUploads: row?.newUploads !== false,
      statusChanges: row?.statusChanges !== false,
      systemAlerts: row?.systemAlerts !== false,
      updatedAt: row?.updatedAt ?? null,
    });
  });

  patchMine = asyncHandler(async (req, res) => {
    const userId = req.user?.id;
    if (!userId) throw new UnauthorizedError('Authentication required');
    const updated = await notificationPreferenceRepository.upsertByUserId(userId, req.validated.body);
    return sendSuccess(res, updated, { message: 'Preferences updated' });
  });
}

export const notificationPreferencesController = new NotificationPreferencesController();
