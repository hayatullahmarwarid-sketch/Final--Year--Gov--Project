import mongoose from 'mongoose';
import { DeviceTokenModel } from '../../../database/models/device-token.model.js';
import { getLogger } from '../../config/logger.js';
import { ExpoPushProvider } from '../../services/push/ExpoPushProvider.js';
import { FcmPushProvider, isFcmConfigured } from '../../services/push/FcmPushProvider.js';
import { getEnv } from '../../config/env.js';
import { filterRecipientsForPushFanout } from '../../services/push/push-event-policy.service.js';
import { notificationLogRepository } from '../../../database/repositories/notification-log.repository.js';

/** @type {ExpoPushProvider | null} */
let expoSingleton = null;
/** @type {FcmPushProvider | null} */
let fcmSingleton = null;

function getExpo() {
  if (!expoSingleton) {
    const env = getEnv();
    expoSingleton = new ExpoPushProvider({ accessToken: env.EXPO_ACCESS_TOKEN });
  }
  return expoSingleton;
}

function getFcm() {
  if (!isFcmConfigured()) return null;
  if (!fcmSingleton) fcmSingleton = new FcmPushProvider();
  return fcmSingleton;
}

/**
 * Fan out a notification payload to active device tokens (Expo + FCM).
 *
 * @param {{ id?: string, name: string, data: {
 *   recipientUserIds: string[],
 *   title: string,
 *   body: string,
 *   data?: Record<string, unknown>,
 * } }} job
 */
export async function notificationsFanoutHandler(job) {
  const log = getLogger();
  const { recipientUserIds, title, body, data } = job.data ?? {};
  if (!Array.isArray(recipientUserIds) || recipientUserIds.length === 0) {
    return;
  }

  const oids = recipientUserIds
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));
  if (oids.length === 0) return;

  const eventKind =
    data && typeof data === 'object' && data.eventKind != null ? String(data.eventKind) : null;

  const filteredIds = await filterRecipientsForPushFanout(
    oids.map((x) => String(x)),
    /** @type {any} */ (eventKind),
  );

  if (filteredIds.length === 0) return;

  const filteredOids = filteredIds
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));

  const devices = await DeviceTokenModel.find({
    userId: { $in: filteredOids },
    isDeleted: false,
    provider: { $in: ['expo', 'fcm'] },
  })
    .select({ userId: 1, token: 1, provider: 1 })
    .lean();

  if (devices.length === 0) return;

  const notificationIdRaw =
    data && typeof data === 'object' && data.notificationId != null ? String(data.notificationId) : null;

  const payloadData =
    data && typeof data === 'object'
      ? /** @type {Record<string, unknown>} */ ({ ...data })
      : {};

  const expoDevices = devices.filter((d) => d.provider === 'expo');
  const fcmDevices = devices.filter((d) => d.provider === 'fcm');

  const expoProvider = getExpo();
  const fcmProvider = getFcm();

  const messagesBase = { title, body, data: payloadData };

  const processBatch = async (subset, providerInstance, providerLabel) => {
    if (!subset.length || !providerInstance) return;
    const messages = subset.map((d) => ({
      token: d.token,
      ...messagesBase,
    }));
    const results = await providerInstance.send(messages);

    const staleTokens = results.filter((r) => r.stale).map((r) => r.token);
    if (staleTokens.length > 0) {
      await DeviceTokenModel.updateMany(
        { token: { $in: staleTokens }, isDeleted: false },
        { $set: { isDeleted: true, deletedAt: new Date(), lastErrorCode: 'stale', lastErrorAt: new Date() } },
      );
      log.info({ count: staleTokens.length, provider: providerLabel }, 'push.stale_tokens_pruned');
    }

    const errors = results.filter((r) => r.status === 'error' && !r.stale);
    if (errors.length > 0) {
      log.warn({ count: errors.length, provider: providerLabel, sample: errors.slice(0, 3) }, 'push.send_errors');
    }

    await notificationLogRepository.create({
      notificationId: notificationIdRaw && mongoose.Types.ObjectId.isValid(notificationIdRaw)
        ? new mongoose.Types.ObjectId(notificationIdRaw)
        : null,
      jobName: job.name ?? 'notifications-fanout',
      provider: providerLabel,
      attempted: results.length,
      deliveredOk: results.filter((r) => r.status === 'ok').length,
      failed: errors.length,
      stalePruned: staleTokens.length,
      errorSample: errors[0]?.error ? String(errors[0].error) : null,
      metadata: { eventKind },
    });
  };

  await processBatch(expoDevices, expoProvider, 'expo');
  await processBatch(fcmDevices, fcmProvider, 'fcm');
}
