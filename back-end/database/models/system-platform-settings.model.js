import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * Singleton-style platform document (`docKey: global`) for portal configuration,
 * feature flags, and maintenance controls. Nested objects are intentionally `Mixed`
 * at the leaf bucket level where future keys must be accepted without migrations.
 */
const systemPlatformSettingsSchema = new Schema(
  {
    /** Stable logical key; enables future multi-tenant or environment-specific rows. */
    docKey: { type: String, required: true, trim: true, default: 'global', unique: true, index: true },

    /** Bump when the shape meaningfully changes for admin clients. */
    schemaVersion: { type: Number, default: 1, min: 1 },

    /** Public portal presentation + localization defaults. */
    portal: { type: Schema.Types.Mixed, default: {} },

    /** Security posture knobs (password policy tiers, session TTL hints, etc.). */
    security: { type: Schema.Types.Mixed, default: {} },

    /** Third-party integrations metadata (non-secret). */
    integrations: { type: Schema.Types.Mixed, default: {} },

    /** Feature availability for phased rollouts. */
    features: { type: Schema.Types.Mixed, default: {} },

    maintenance: {
      enabled: { type: Boolean, default: false, index: true },
      message: { type: String, trim: true, default: null },
      scheduledUntil: { type: Date, default: null },
      /** Boolean feature flags (read-only API, disable logins, etc.). */
      flags: { type: Schema.Types.Mixed, default: {} },
    },

    /** Forward-compatible escape hatch for new top-level groups without migrations. */
    extensions: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true, collection: 'system_platform_settings' },
);

export const SystemPlatformSettingsModel =
  mongoose.models.SystemPlatformSettings ??
  mongoose.model('SystemPlatformSettings', systemPlatformSettingsSchema);
