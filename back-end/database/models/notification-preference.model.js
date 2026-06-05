import mongoose from 'mongoose';
import { standardDomainPlugin } from './plugins/standard-domain.plugin.js';

const { Schema } = mongoose;

/**
 * Per-user push notification channel preferences (mobile + web).
 * Missing rows are treated as default-enabled for backwards compatibility.
 */
const notificationPreferenceSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    pushEnabled: { type: Boolean, default: true },
    /** New decree submitted / awaiting review (staff routing). */
    newUploads: { type: Boolean, default: true },
    /** Publication, archival, uploader-facing updates, public catalog updates. */
    statusChanges: { type: Boolean, default: true },
    /** System-wide broadcasts / maintenance / admin alerts. */
    systemAlerts: { type: Boolean, default: true },
  },
  { timestamps: true, collection: 'notification_preferences' },
);

notificationPreferenceSchema.plugin(standardDomainPlugin);

export const NotificationPreferenceModel =
  mongoose.models.NotificationPreference ??
  mongoose.model('NotificationPreference', notificationPreferenceSchema);
