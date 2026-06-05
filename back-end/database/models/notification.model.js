import mongoose from 'mongoose';
import { ROLE_KEYS } from '../../src/modules/shared/enums/roles.js';
import { NOTIFICATION_CHANNELS } from '../../src/modules/shared/enums/notification-channel.js';
import { NOTIFICATION_READ_STATUS_KEYS } from '../../src/modules/shared/enums/notification-read-status.js';
import { standardDomainPlugin } from './plugins/standard-domain.plugin.js';

const { Schema } = mongoose;

const roleKeyValidator = {
  validator(v) {
    if (v == null) return true;
    return ROLE_KEYS.includes(v);
  },
};

const notificationSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    body: { type: String, required: true, trim: true, maxlength: 4000 },
    channel: { type: String, enum: [...NOTIFICATION_CHANNELS], default: 'in_app', index: true },

    recipientRoleKey: { type: String, default: null, index: true, validate: roleKeyValidator },
    recipientUserId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },

    readStatus: {
      type: String,
      enum: [...NOTIFICATION_READ_STATUS_KEYS],
      default: 'unread',
      index: true,
    },
    readAt: { type: Date, default: null, index: true },
    deletedAt: { type: Date, default: null, index: true },

    metadata: { type: Schema.Types.Mixed, default: undefined },

    createdByUserId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    updatedByUserId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  },
  { timestamps: true, collection: 'notifications' },
);

notificationSchema.plugin(standardDomainPlugin);

notificationSchema.index({ createdAt: -1 });
notificationSchema.index({ recipientRoleKey: 1, readStatus: 1, createdAt: -1 });
notificationSchema.index({ recipientUserId: 1, readStatus: 1, createdAt: -1 });
notificationSchema.index({ readStatus: 1, deletedAt: 1, createdAt: -1 });
notificationSchema.index({ tenantId: 1, recipientUserId: 1, isDeleted: 1, readStatus: 1 });

export const NotificationModel =
  mongoose.models.Notification ?? mongoose.model('Notification', notificationSchema);
