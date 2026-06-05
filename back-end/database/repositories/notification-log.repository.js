import { NotificationLogModel } from '../models/notification-log.model.js';
import { BaseRepository } from './base.repository.js';

export class NotificationLogRepository extends BaseRepository {
  constructor() {
    super(NotificationLogModel);
  }
}

export const notificationLogRepository = new NotificationLogRepository();
