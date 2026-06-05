import mongoose from 'mongoose';

const { Schema } = mongoose;

const refreshTokenSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    /** HMAC-SHA256 of the opaque refresh token (never store the plain token). */
    token: { type: String, required: true, unique: true },
    /**
     * Refresh-token family id (Phase 1). All rotations derived from an original login share a familyId;
     * detecting reuse of a revoked token inside a family lets us revoke the whole family at once.
     * Legacy rows (no familyId) default to null.
     */
    familyId: { type: String, trim: true, default: null, index: true, sparse: true },
    /** Set when this token has been superseded by a rotated sibling in the same family. */
    replacedByTokenId: { type: Schema.Types.ObjectId, ref: 'RefreshToken', default: null },
    deviceInfo: { type: String, trim: true, default: null },
    expiresAt: { type: Date, required: true, index: true },
    revoked: { type: Boolean, default: false, index: true },
    /** Reason the token was revoked: manual logout, rotation, reuse detection, admin action. */
    revokedReason: {
      type: String,
      enum: ['rotated', 'logout', 'logout_all', 'reuse_detected', 'admin', null],
      default: null,
    },
    revokedAt: { type: Date, default: null },
  },
  { timestamps: true, collection: 'refresh_tokens' },
);

refreshTokenSchema.index({ userId: 1, revoked: 1 });
refreshTokenSchema.index({ familyId: 1, revoked: 1 });

export const RefreshTokenModel =
  mongoose.models.RefreshToken ?? mongoose.model('RefreshToken', refreshTokenSchema);
