import { asyncHandler, HttpStatus, sendPaginatedList, sendSuccess } from '../shared/http/index.js';
import { notificationsService } from './notifications.service.js';
import { getNotificationRecipient } from './middleware/notification-recipient.middleware.js';

export class NotificationsController {
  /**
   * @param {import('./notifications.service.js').NotificationsService} [service]
   */
  constructor(service = notificationsService) {
    this.service = service;
  }

  list = asyncHandler(async (req, res) => {
    const query = req.validated.query;
    const recipient = getNotificationRecipient(req);
    const result = await this.service.list(query, recipient);
    return sendPaginatedList(res, result);
  });

  create = asyncHandler(async (req, res) => {
    const body = req.validated.body;
    const created = await this.service.create(body);
    return sendSuccess(res, created, {
      statusCode: HttpStatus.CREATED,
      message: 'Notification created',
    });
  });

  markRead = asyncHandler(async (req, res) => {
    const recipient = getNotificationRecipient(req);
    const updated = await this.service.markRead(req.validated.params.id, recipient);
    return sendSuccess(res, updated, { message: 'Notification marked read' });
  });

  markAllRead = asyncHandler(async (req, res) => {
    const recipient = getNotificationRecipient(req);
    const result = await this.service.markAllRead(recipient);
    return sendSuccess(res, result, { message: 'All notifications marked read' });
  });

  remove = asyncHandler(async (req, res) => {
    const recipient = getNotificationRecipient(req);
    const result = await this.service.remove(req.validated.params.id, recipient);
    return sendSuccess(res, result, { message: 'Notification removed' });
  });

  badgeCount = asyncHandler(async (req, res) => {
    const recipient = getNotificationRecipient(req);
    const data = await this.service.badgeCount(recipient);
    return sendSuccess(res, data);
  });
}

export const notificationsController = new NotificationsController();
