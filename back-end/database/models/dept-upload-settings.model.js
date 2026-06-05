import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * Singleton settings document for the Decree Upload Department portal.
 *
 * This is intentionally a single document (`docKey: dept_upload`) so the mobile client
 * can read/update without needing per-department provisioning logic.
 */
const deptUploadSettingsSchema = new Schema(
  {
    docKey: { type: String, required: true, trim: true, default: 'dept_upload', unique: true, index: true },

    schemaVersion: { type: Number, default: 1, min: 1 },

    /** Department identity and contact details (used on reports/certificates). */
    department: { type: Schema.Types.Mixed, default: {} },

    /** System UI preferences for this portal (timezone is always Asia/Kabul). */
    system: { type: Schema.Types.Mixed, default: {} },

    /** Notification preferences (delivery still depends on server channels). */
    notifications: { type: Schema.Types.Mixed, default: {} },

    /** Storage / backup and cleanup preferences for the department. */
    storage: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true, collection: 'dept_upload_settings' },
);

export const DeptUploadSettingsModel =
  mongoose.models.DeptUploadSettings ?? mongoose.model('DeptUploadSettings', deptUploadSettingsSchema);

