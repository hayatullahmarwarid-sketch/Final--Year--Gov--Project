import mongoose from 'mongoose';
import { standardDomainPlugin } from './plugins/standard-domain.plugin.js';

const { Schema } = mongoose;

/**
 * Per-device push notification credential. One row per (userId, token).
 *
 * `provider` identifies which transport the `token` is valid for:
 *   - `expo`  → Expo Push Service (recommended for this app — works on iOS + Android)
 *   - `fcm`   → Firebase Cloud Messaging (reserved seam)
 *   - `apns`  → Apple Push Notification service (reserved seam)
 *
 * Tokens are opaque; we never decode them. We DO rotate `lastSeenAt` on every registration so
 * stale tokens can be pruned by retention.
 */
const deviceTokenSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    platform: { type: String, enum: ['ios', 'android', 'web'], required: true, index: true },
    provider: { type: String, enum: ['expo', 'fcm', 'apns'], required: true, index: true },
    token: { type: String, required: true, trim: true, maxlength: 4096 },
    deviceName: { type: String, trim: true, default: null, maxlength: 200 },
    appVersion: { type: String, trim: true, default: null, maxlength: 64 },
    locale: { type: String, trim: true, lowercase: true, default: null, maxlength: 16 },
    lastSeenAt: { type: Date, default: () => new Date(), index: true },
    lastErrorCode: { type: String, trim: true, default: null, maxlength: 64 },
    lastErrorAt: { type: Date, default: null },
  },
  { timestamps: true, collection: 'device_tokens' },
);

deviceTokenSchema.plugin(standardDomainPlugin);

deviceTokenSchema.index(
  { userId: 1, token: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } },
);
deviceTokenSchema.index({ userId: 1, provider: 1, isDeleted: 1, lastSeenAt: -1 });

export const DeviceTokenModel =
  mongoose.models.DeviceToken ?? mongoose.model('DeviceToken', deviceTokenSchema);
