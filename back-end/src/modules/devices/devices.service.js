import mongoose from 'mongoose';
import { DeviceTokenModel } from '../../../database/models/device-token.model.js';
import { NotFoundError } from '../../core/errors/app-error.js';

/**
 * Device token registration / unregistration service.
 *
 * Idempotent by `(userId, token)`: re-registering the same token from the same user updates
 * `platform`, `provider`, `lastSeenAt`, and metadata.
 */
export class DevicesService {
  /**
   * @param {string} userId
   * @param {{
   *   platform: 'ios' | 'android' | 'web',
   *   provider: 'expo' | 'fcm' | 'apns',
   *   token: string,
   *   deviceName?: string,
   *   appVersion?: string,
   *   locale?: string,
   * }} input
   */
  async register(userId, input) {
    const uid = new mongoose.Types.ObjectId(userId);
    const res = await DeviceTokenModel.findOneAndUpdate(
      { userId: uid, token: input.token, isDeleted: false },
      {
        $set: {
          userId: uid,
          platform: input.platform,
          provider: input.provider,
          token: input.token,
          deviceName: input.deviceName ?? null,
          appVersion: input.appVersion ?? null,
          locale: input.locale ?? null,
          lastSeenAt: new Date(),
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ).lean();

    return {
      id: String(res._id),
      platform: res.platform,
      provider: res.provider,
      lastSeenAt: res.lastSeenAt,
    };
  }

  /**
   * @param {string} userId
   * @param {string} deviceTokenId
   */
  async unregister(userId, deviceTokenId) {
    if (!mongoose.Types.ObjectId.isValid(deviceTokenId)) {
      throw new NotFoundError('Device token not found');
    }
    const res = await DeviceTokenModel.updateOne(
      {
        _id: new mongoose.Types.ObjectId(deviceTokenId),
        userId: new mongoose.Types.ObjectId(userId),
        isDeleted: false,
      },
      { $set: { isDeleted: true, deletedAt: new Date() } },
    );
    if (res.modifiedCount === 0) {
      throw new NotFoundError('Device token not found');
    }
    return { ok: true };
  }

  /**
   * @param {string} userId
   */
  async listForUser(userId) {
    const rows = await DeviceTokenModel.find({
      userId: new mongoose.Types.ObjectId(userId),
      isDeleted: false,
    })
      .select({ token: 0 })
      .sort({ lastSeenAt: -1 })
      .lean();
    return rows.map((r) => ({
      id: String(r._id),
      platform: r.platform,
      provider: r.provider,
      deviceName: r.deviceName,
      appVersion: r.appVersion,
      locale: r.locale,
      lastSeenAt: r.lastSeenAt,
    }));
  }

  /**
   * Soft-delete every push credential for this user (logout / token rotation).
   *
   * @param {string} userId
   */
  async unregisterAllForUser(userId) {
    await DeviceTokenModel.updateMany(
      { userId: new mongoose.Types.ObjectId(userId), isDeleted: false },
      { $set: { isDeleted: true, deletedAt: new Date() } },
    );
    return { ok: true };
  }
}

export const devicesService = new DevicesService();
