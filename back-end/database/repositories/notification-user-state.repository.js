import mongoose from 'mongoose';
import { NotificationUserStateModel } from '../models/notification-user-state.model.js';

export class NotificationUserStateRepository {
  constructor() {
    this.model = NotificationUserStateModel;
  }

  /**
   * @param {string | import('mongoose').Types.ObjectId} userId
   * @param {string[]} notificationIds
   */
  async findByUserAndNotificationIds(userId, notificationIds) {
    if (!notificationIds.length) return [];
    const uid = new mongoose.Types.ObjectId(String(userId));
    const oids = notificationIds.filter((id) => mongoose.Types.ObjectId.isValid(id)).map((id) => new mongoose.Types.ObjectId(id));
    if (!oids.length) return [];
    return this.model.find({ userId: uid, notificationId: { $in: oids } }).lean();
  }

  /**
   * @param {string | import('mongoose').Types.ObjectId} userId
   */
  async listDismissedNotificationIds(userId) {
    const uid = new mongoose.Types.ObjectId(String(userId));
    const rows = await this.model.find({ userId: uid, dismissedAt: { $ne: null } }).select({ notificationId: 1 }).lean();
    return rows.map((r) => String(r.notificationId));
  }

  /**
   * @param {string | import('mongoose').Types.ObjectId} userId
   * @param {string | import('mongoose').Types.ObjectId} notificationId
   */
  async upsertRead(userId, notificationId) {
    const uid = new mongoose.Types.ObjectId(String(userId));
    const nid = new mongoose.Types.ObjectId(String(notificationId));
    const now = new Date();
    await this.model.updateOne(
      { userId: uid, notificationId: nid },
      { $set: { readAt: now }, $setOnInsert: { userId: uid, notificationId: nid } },
      { upsert: true },
    );
  }

  /**
   * @param {string | import('mongoose').Types.ObjectId} userId
   * @param {string | import('mongoose').Types.ObjectId} notificationId
   */
  async upsertDismiss(userId, notificationId) {
    const uid = new mongoose.Types.ObjectId(String(userId));
    const nid = new mongoose.Types.ObjectId(String(notificationId));
    const now = new Date();
    await this.model.updateOne(
      { userId: uid, notificationId: nid },
      { $set: { dismissedAt: now }, $setOnInsert: { userId: uid, notificationId: nid } },
      { upsert: true },
    );
  }

  /**
   * @param {string | import('mongoose').Types.ObjectId} userId
   * @param {string[]} notificationIds
   */
  async bulkUpsertRead(userId, notificationIds) {
    if (!notificationIds.length) return;
    const uid = new mongoose.Types.ObjectId(String(userId));
    const now = new Date();
    const ops = notificationIds.map((id) => ({
      updateOne: {
        filter: { userId: uid, notificationId: new mongoose.Types.ObjectId(String(id)) },
        update: { $set: { readAt: now }, $setOnInsert: { userId: uid, notificationId: new mongoose.Types.ObjectId(String(id)) } },
        upsert: true,
      },
    }));
    await this.model.bulkWrite(ops, { ordered: false });
  }
}

export const notificationUserStateRepository = new NotificationUserStateRepository();
