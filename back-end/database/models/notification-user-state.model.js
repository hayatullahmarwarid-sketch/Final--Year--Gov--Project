import mongoose from 'mongoose';

const { Schema } = mongoose;

const notificationUserStateSchema = new Schema(
  {
    notificationId: {
      type: Schema.Types.ObjectId,
      ref: 'Notification',
      required: true,
      index: true,
    },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    /** Per-user read marker for shared / role-targeted rows (see notifications service). */
    readAt: { type: Date, default: null, index: true },
    /** Per-user hide from inbox (DELETE / soft-dismiss). */
    dismissedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true, collection: 'notification_user_states' },
);

notificationUserStateSchema.index({ userId: 1, notificationId: 1 }, { unique: true });
notificationUserStateSchema.index({ userId: 1, dismissedAt: 1 });

export const NotificationUserStateModel =
  mongoose.models.NotificationUserState ??
  mongoose.model('NotificationUserState', notificationUserStateSchema);
