import { Router } from 'express';
import { validateRequest } from '../shared/http/index.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { authorize } from '../../middlewares/authorize.middleware.js';
import { systemAdminController } from './system-admin.controller.js';
import {
  createStaffBodySchema,
  listAdminNotificationsQuerySchema,
  listAuditLogsQuerySchema,
  listPlatformUsersQuerySchema,
  listStaffQuerySchema,
  notificationIdParamsSchema,
  patchStaffBodySchema,
  patchSystemAdminSettingsBodySchema,
  resetStaffPortalPasswordBodySchema,
  staffIdParamsSchema,
  systemAnnounceBodySchema,
} from './system-admin.validation.js';

export const systemAdminRouter = Router();

systemAdminRouter.use(authenticate(), authorize(['system_admin']));

systemAdminRouter.get('/dashboard', systemAdminController.getDashboard);

systemAdminRouter.get('/system-summary', systemAdminController.getSystemSummary);

systemAdminRouter.get(
  '/platform-users',
  validateRequest({ query: listPlatformUsersQuerySchema }),
  systemAdminController.listPlatformUsers,
);

systemAdminRouter.get(
  '/staff',
  validateRequest({ query: listStaffQuerySchema }),
  systemAdminController.listStaff,
);

systemAdminRouter.post(
  '/staff',
  validateRequest({ body: createStaffBodySchema }),
  systemAdminController.createStaff,
);

systemAdminRouter.get(
  '/staff/:id',
  validateRequest({ params: staffIdParamsSchema }),
  systemAdminController.getStaffById,
);

systemAdminRouter.get(
  '/staff/:id/portal-password',
  validateRequest({ params: staffIdParamsSchema }),
  systemAdminController.getStaffPortalPassword,
);

systemAdminRouter.post(
  '/staff/:id/reset-portal-password',
  validateRequest({ params: staffIdParamsSchema, body: resetStaffPortalPasswordBodySchema }),
  systemAdminController.resetStaffPortalPassword,
);

systemAdminRouter.patch(
  '/staff/:id',
  validateRequest({ params: staffIdParamsSchema, body: patchStaffBodySchema }),
  systemAdminController.patchStaff,
);

systemAdminRouter.delete(
  '/staff/:id',
  validateRequest({ params: staffIdParamsSchema }),
  systemAdminController.deleteStaff,
);

systemAdminRouter.get('/settings', systemAdminController.getSettings);

systemAdminRouter.patch(
  '/settings',
  validateRequest({ body: patchSystemAdminSettingsBodySchema }),
  systemAdminController.patchSettings,
);

systemAdminRouter.get(
  '/audit-logs',
  validateRequest({ query: listAuditLogsQuerySchema }),
  systemAdminController.listAuditLogs,
);

systemAdminRouter.get(
  '/notifications',
  validateRequest({ query: listAdminNotificationsQuerySchema }),
  systemAdminController.listNotifications,
);

systemAdminRouter.patch(
  '/notifications/:id/read',
  validateRequest({ params: notificationIdParamsSchema }),
  systemAdminController.markNotificationRead,
);

systemAdminRouter.patch('/notifications/read-all', systemAdminController.markAllNotificationsRead);

systemAdminRouter.post('/backup', systemAdminController.triggerBackup);

systemAdminRouter.post(
  '/announce',
  validateRequest({ body: systemAnnounceBodySchema }),
  systemAdminController.announceSystem,
);
