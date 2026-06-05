import { Router } from 'express';
import { validateRequest } from '../shared/http/index.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { notificationsController } from './notifications.controller.js';
import { notificationPreferencesController } from './notification-preferences.controller.js';
import { patchNotificationPreferencesBodySchema } from './notification-preferences.validation.js';
import {
  createNotificationBodySchema,
  listNotificationsQuerySchema,
  notificationIdParamSchema,
} from './notifications.validation.js';
import { notificationRecipientMiddleware } from './middleware/notification-recipient.middleware.js';

export const notificationsRouter = Router();

notificationsRouter.use(notificationRecipientMiddleware());

const notificationPreferencesRouter = Router();
notificationPreferencesRouter.use(authenticate());
notificationPreferencesRouter.get('/', notificationPreferencesController.getMine);
notificationPreferencesRouter.patch(
  '/',
  validateRequest({ body: patchNotificationPreferencesBodySchema }),
  notificationPreferencesController.patchMine,
);
notificationsRouter.use('/preferences', notificationPreferencesRouter);

notificationsRouter.get('/badge-count', notificationsController.badgeCount);

notificationsRouter.post('/read-all', notificationsController.markAllRead);

notificationsRouter.get(
  '/',
  validateRequest({ query: listNotificationsQuerySchema }),
  notificationsController.list,
);

notificationsRouter.post(
  '/',
  validateRequest({ body: createNotificationBodySchema }),
  notificationsController.create,
);

notificationsRouter.post(
  '/:id/read',
  validateRequest({ params: notificationIdParamSchema }),
  notificationsController.markRead,
);

notificationsRouter.delete(
  '/:id',
  validateRequest({ params: notificationIdParamSchema }),
  notificationsController.remove,
);
