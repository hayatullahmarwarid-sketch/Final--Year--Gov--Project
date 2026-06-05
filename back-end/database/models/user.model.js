import mongoose from 'mongoose';
import { ROLE_KEYS } from '../../src/modules/shared/enums/roles.js';
import { USER_ACCOUNT_STATUS_KEYS } from '../../src/modules/shared/enums/user-account-status.js';
import { standardDomainPlugin } from './plugins/standard-domain.plugin.js';

const { Schema } = mongoose;

const userSchema = new Schema(
  {
    /** Reserved for future IdP linkage (OIDC `sub`, SAML nameId, etc.). */
    externalAuthSubject: { type: String, trim: true, default: null, index: true, sparse: true },
    /** Reserved: oauth / ldap / phone_otp / password. */
    authProvider: { type: String, trim: true, default: null },

    /** Local password auth (bcrypt). Sparse: IdP-only users may omit. */
    passwordHash: { type: String, default: null, select: false },

    email: { type: String, trim: true, lowercase: true, default: null },
    /** Set when the user completes email verification via `/auth/email-verification/confirm`. */
    emailVerifiedAt: { type: Date, default: null, index: true },
    /** HMAC-SHA256 of the opaque verification token (never store the plain token). */
    emailVerificationTokenHash: { type: String, default: null, select: false },
    emailVerificationTokenExpiresAt: { type: Date, default: null },

    /** Password reset (forgot password) — HMAC of opaque token, not the plain value. */
    passwordResetTokenHash: { type: String, default: null, select: false },
    passwordResetTokenExpiresAt: { type: Date, default: null },

    /**
     * Login failure tracking (Phase 1). `failedLoginAttempts` is reset on successful login.
     * When `lockedUntil` is in the future, `/auth/login` returns 401 without revealing the exact reason.
     */
    failedLoginAttempts: { type: Number, default: 0 },
    lastFailedLoginAt: { type: Date, default: null },
    lockedUntil: { type: Date, default: null, index: true, sparse: true },

    /**
     * 2FA seam (Phase 1). Fields are reserved; full TOTP flow is a follow-up phase.
     * `totpSecret` is AES-GCM encrypted at rest when present (see `src/lib/totp.js` in a later phase).
     */
    totpSecret: { type: String, default: null, select: false },
    totpEnabledAt: { type: Date, default: null },
    totpRecoveryCodes: { type: [String], default: undefined, select: false },

    phoneE164: { type: String, trim: true, default: null },
    displayName: { type: String, trim: true, required: true },
    preferredLocale: { type: String, trim: true, default: 'ps' },
    /** Mobile / API locale: English, Pashto, or Dari (stored as `fa`). */
    preferredLanguage: {
      type: String,
      trim: true,
      lowercase: true,
      enum: ['en', 'ps', 'fa'],
      default: 'en',
    },

    /**
     * **Authoritative** persona for backend authorization and routing — always prefer this over `roleId`.
     * `roleId` is an optional materialized reference to `roles` for joins/admin UIs.
     */
    roleKey: { type: String, required: true, enum: [...ROLE_KEYS], index: true },
    roleId: { type: Schema.Types.ObjectId, ref: 'Role', default: null, index: true },

    status: {
      type: String,
      enum: [...USER_ACCOUNT_STATUS_KEYS],
      default: 'pending',
      index: true,
    },

    /** Account suspension / deactivation (distinct from soft-delete). */
    deactivatedAt: { type: Date, default: null, index: true },

    profile: { type: Schema.Types.Mixed, default: undefined },

    createdByUserId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    updatedByUserId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  },
  { timestamps: true, collection: 'users' },
);

userSchema.plugin(standardDomainPlugin);

/** Partial unique: multiple docs may omit `email` / `phoneE164`; explicit `null` must not collide in the index. */
userSchema.index(
  { email: 1 },
  { unique: true, partialFilterExpression: { email: { $type: 'string' } } },
);
userSchema.index(
  { phoneE164: 1 },
  { unique: true, partialFilterExpression: { phoneE164: { $type: 'string' } } },
);
userSchema.index({ roleKey: 1, status: 1, updatedAt: -1 });
userSchema.index({ tenantId: 1, roleKey: 1, isDeleted: 1, status: 1 });
userSchema.index({ displayName: 'text' });

export const UserModel = mongoose.models.User ?? mongoose.model('User', userSchema);
