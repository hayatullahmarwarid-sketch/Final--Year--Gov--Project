import mongoose from 'mongoose';
import { NotificationPreferenceModel } from '../models/notification-preference.model.js';
import { BaseRepository } from './base.repository.js';

export class NotificationPreferenceRepository extends BaseRepository {
  constructor() {
    super(NotificationPreferenceModel);
  }

  /**
   * @param {string[]} userIds
   */
  async findMapByUserIds(userIds) {
    const oids = userIds
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .map((id) => new mongoose.Types.ObjectId(id));
    if (oids.length === 0) return new Map();
    const rows = await this.model.find({ userId: { $in: oids } }).lean().exec();
    /** @type {Map<string, Record<string, unknown>>} */
    const map = new Map();
    for (const r of rows) {
      map.set(String(r.userId), r);
    }
    return map;
  }

  /**
   * @param {string} userId
   * @param {Partial<{ pushEnabled: boolean, newUploads: boolean, statusChanges: boolean, systemAlerts: boolean }>} patch
   */
  async upsertByUserId(userId, patch) {
    const uid = new mongoose.Types.ObjectId(userId);
    return this.model.findOneAndUpdate(
      { userId: uid },
      { $set: { ...patch, userId: uid } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ).lean();
  }

  /**
   * @param {string} userId
   */
  async findByUserIdLean(userId) {
    if (!mongoose.Types.ObjectId.isValid(userId)) return null;
    return this.model.findOne({ userId: new mongoose.Types.ObjectId(userId) }).lean();
  }
}

export const notificationPreferenceRepository = new NotificationPreferenceRepository();
