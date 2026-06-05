import mongoose from 'mongoose';
import { standardDomainPlugin } from './plugins/standard-domain.plugin.js';

const { Schema } = mongoose;

/**
 * Delivery audit trail for outbound push batches (Expo / FCM).
 */
const notificationLogSchema = new Schema(
  {
    notificationId: { type: Schema.Types.ObjectId, ref: 'Notification', default: null, index: true },
    jobName: { type: String, trim: true, default: null, maxlength: 120 },
    provider: { type: String, enum: ['expo', 'fcm'], required: true, index: true },
    attempted: { type: Number, default: 0 },
    deliveredOk: { type: Number, default: 0 },
    failed: { type: Number, default: 0 },
    stalePruned: { type: Number, default: 0 },
    errorSample: { type: String, trim: true, default: null, maxlength: 2000 },
    metadata: { type: Schema.Types.Mixed, default: undefined },
  },
  { timestamps: true, collection: 'notification_logs' },
);

notificationLogSchema.plugin(standardDomainPlugin);

notificationLogSchema.index({ createdAt: -1 });

export const NotificationLogModel =
  mongoose.models.NotificationLog ?? mongoose.model('NotificationLog', notificationLogSchema);
