import { timingSafeEqual } from 'node:crypto';
import mongoose from 'mongoose';
import { UserModel as User } from '../../../../database/models/user.model.js';
import { RoleKey } from '../../../modules/shared/enums/roles.js';
import {
  AppError,
  BadRequestError,
  ConflictError,
  UnauthorizedError,
} from '../../../core/errors/app-error.js';
import { HttpStatus } from '../../../core/errors/http-status.js';
import { userRepository } from '../../../../database/repositories/user.repository.js';
import { getEnv } from '../../../config/env.js';
import { getLogger } from '../../../config/logger.js';
import {
  generateEmailVerificationPlainToken,
  hashEmailVerificationToken,
} from '../../../lib/email-verification-token.js';
import {
  generatePasswordResetPlainToken,
  hashPasswordResetToken,
} from '../../../lib/password-reset-token.js';
import {
  isOutboundEmailConfigured,
  sendSmtpMail,
} from '../../../services/email/smtp-mailer.service.js';
import {
  comparePassword,
  generateToken,
  hashPassword,
  issueRefreshToken,
  revokeAllUserTokens,
  revokeRefreshToken,
  revokeRefreshTokenByPlain,
  verifyRefreshToken,
} from '../../../lib/auth.js';
import { deptUploadSettingsRepository } from '../../../../database/repositories/dept-upload-settings.repository.js';

/**
 * Base URL for deep links in transactional email (verify / password reset).
 * Prefer `EMAIL_VERIFICATION_APP_URL`, then `APP_PUBLIC_BASE_URL`.
 */
function transactionalEmailAppBaseUrl() {
  const env = getEnv();
  const primary = env.EMAIL_VERIFICATION_APP_URL?.replace(/\/$/, '') ?? '';
  if (primary) return primary;
  return env.APP_PUBLIC_BASE_URL?.replace(/\/$/, '') ?? '';
}

function accountActive(doc) {
  if (!doc) return false;
  if (doc.isDeleted) return false;
  if (doc.status !== 'active') return false;
  if (doc.deactivatedAt) return false;
  return true;
}

function isLoginEligible(doc) {
  if (!doc?.passwordHash) return false;
  return accountActive(doc);
}

function publicUserShape(doc) {
  const pl = doc.preferredLanguage;
  const preferredLanguage = pl === 'en' || pl === 'ps' || pl === 'fa' ? pl : 'en';
  return {
    id: String(doc._id),
    email: doc.email ?? '',
    role: doc.roleKey,
    emailVerified: Boolean(doc.emailVerifiedAt),
    preferredLanguage,
  };
}

/**
 * Issues a fresh access + refresh pair for a user. When `familyId` is passed, the refresh
 * row joins the existing family (rotation); otherwise a new family is created (new session).
 *
 * @param {{ _id: unknown; email?: string; roleKey?: string }} userDoc
 * @param {string | null | undefined} deviceInfo
 * @param {{ familyId?: string | null }} [options]
 */
async function tokenPair(userDoc, deviceInfo, options = {}) {
  const sub = String(userDoc._id);
  const email = userDoc.email ?? '';
  const roleKey = userDoc.roleKey;
  const claims = { sub, email, roleKey };

  let accessExpiresIn;
  if (roleKey === RoleKey.DECREE_UPLOAD_DEPARTMENT) {
    try {
      const settingsDoc = await deptUploadSettingsRepository.findSingletonLean();
      const system =
        settingsDoc.system && typeof settingsDoc.system === 'object' ? settingsDoc.system : {};
      const raw =
        typeof system.sessionTimeoutMinutes === 'number' ? system.sessionTimeoutMinutes : 30;
      const minutes = Math.min(120, Math.max(15, raw));
      accessExpiresIn = `${minutes * 60}s`;
    } catch {
      accessExpiresIn = undefined;
    }
  }

  const accessToken = generateToken(claims, accessExpiresIn);
  const issued = await issueRefreshToken(sub, deviceInfo, { familyId: options.familyId ?? null });
  return { accessToken, refreshToken: issued.plain, refreshTokenFamilyId: issued.familyId };
}

/**
 * Returns how many ms of lock remain, or `0` when the account is not locked.
 * @param {{ lockedUntil?: Date | null }} doc
 */
function accountLockRemainingMs(doc) {
  const until = doc?.lockedUntil;
  if (!until) return 0;
  const ms = new Date(until).getTime() - Date.now();
  return ms > 0 ? ms : 0;
}

/**
 * Persist a failed login attempt and, when the rolling counter exceeds the policy,
 * lock the account for a cooldown window. Idempotent + race-safe via `$inc`.
 *
 * @param {import('mongoose').Types.ObjectId | string} userId
 */
async function recordLoginFailure(userId) {
  const env = getEnv();
  const windowStart = new Date(Date.now() - env.LOGIN_FAIL_WINDOW_SECONDS * 1000);

  // Reset the counter if the last failure is outside the window.
  await User.updateOne(
    { _id: userId, lastFailedLoginAt: { $lt: windowStart } },
    { $set: { failedLoginAttempts: 0 } },
  );

  const updated = await User.findOneAndUpdate(
    { _id: userId },
    { $inc: { failedLoginAttempts: 1 }, $set: { lastFailedLoginAt: new Date() } },
    { new: true, projection: { failedLoginAttempts: 1, lockedUntil: 1 } },
  ).lean();

  if (updated && updated.failedLoginAttempts >= env.LOGIN_MAX_FAILS) {
    const lockedUntil = new Date(Date.now() + env.LOGIN_LOCK_SECONDS * 1000);
    await User.updateOne(
      { _id: userId },
      { $set: { lockedUntil, failedLoginAttempts: 0 } },
    );
  }
}

/**
 * Reset failed-login counters after a successful authentication.
 * @param {import('mongoose').Types.ObjectId | string} userId
 */
async function resetLoginFailures(userId) {
  await User.updateOne(
    { _id: userId, $or: [{ failedLoginAttempts: { $gt: 0 } }, { lockedUntil: { $ne: null } }] },
    { $set: { failedLoginAttempts: 0, lockedUntil: null, lastFailedLoginAt: null } },
  );
}

export class AuthService {
  /**
   * @param {{
   *   email: string,
   *   password: string,
   *   displayName?: string,
   *   preferredLanguage?: 'en' | 'ps' | 'fa',
   *   deviceInfo?: string
   * }} input
   */
  async register(input) {
    const email = input.email.trim().toLowerCase();
    const displayName = input.displayName?.trim() || email.split('@')[0] || 'User';
    const passwordHash = await hashPassword(input.password);
    const preferredLanguage =
      input.preferredLanguage === 'en' || input.preferredLanguage === 'ps' || input.preferredLanguage === 'fa'
        ? input.preferredLanguage
        : 'en';

    try {
      const doc = await User.create({
        email,
        displayName,
        passwordHash,
        roleKey: RoleKey.PUBLIC_USER,
        status: 'active',
        authProvider: 'password',
        preferredLanguage,
      });
      const user = publicUserShape(doc);
      const { accessToken, refreshToken } = await tokenPair(doc, input.deviceInfo);

      /** @type {{ delivered: boolean, reason?: 'smtp_not_configured' | 'send_failed' }} */
      let verificationEmail = { delivered: false };

      if (!isOutboundEmailConfigured()) {
        verificationEmail = { delivered: false, reason: 'smtp_not_configured' };
      } else if (!doc.emailVerifiedAt) {
        try {
          const r = await this.deliverPublicUserVerificationEmail({
            _id: doc._id,
            email: doc.email,
            displayName: doc.displayName,
          });
          verificationEmail = { delivered: r.delivered };
        } catch (err) {
          getLogger().error({ err, email }, 'auth.register.verification_email_failed');
          verificationEmail = { delivered: false, reason: 'send_failed' };
        }
      } else {
        verificationEmail = { delivered: false };
      }

      const verificationEmailDelivered = verificationEmail.delivered;

      return { accessToken, refreshToken, user, verificationEmailDelivered, verificationEmail };
    } catch (err) {
      if (err && typeof err === 'object' && 'code' in err && err.code === 11000) {
        throw new ConflictError('Email or phone already registered');
      }
      throw err;
    }
  }

  /** @param {{ email: string, password: string, deviceInfo?: string }} input */
  async login(input) {
    const doc = await userRepository.findByEmailForPasswordAuth(input.email);
    if (!doc || !isLoginEligible(doc)) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Account lockout gate — present the same 401 shape to avoid leaking lock state to attackers.
    if (accountLockRemainingMs(doc) > 0) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const ok = await comparePassword(input.password, doc.passwordHash);
    if (!ok) {
      await recordLoginFailure(doc._id).catch((err) =>
        getLogger().warn({ err, userId: String(doc._id) }, 'auth.login.failure_counter_error'),
      );
      throw new UnauthorizedError('Invalid email or password');
    }

    // Success → reset counters.
    await resetLoginFailures(doc._id).catch(() => undefined);

    const user = publicUserShape(doc);
    const { accessToken, refreshToken } = await tokenPair(doc, input.deviceInfo);
    return { accessToken, refreshToken, user };
  }

  /** @param {string} userId */
  async getMe(userId) {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new UnauthorizedError('Invalid session');
    }
    const doc = await User.findById(userId)
      .select('_id email roleKey emailVerifiedAt preferredLanguage isDeleted status deactivatedAt')
      .lean();
    if (!doc || doc.isDeleted || doc.status !== 'active' || doc.deactivatedAt) {
      throw new UnauthorizedError('Account not available');
    }
    return { user: publicUserShape(doc) };
  }

  /** @param {{ refreshToken: string, deviceInfo?: string }} input */
  async refresh(input) {
    let user;
    let refreshTokenId;
    let priorDeviceInfo = /** @type {string | null | undefined} */ (null);
    let familyId = /** @type {string | null} */ (null);
    try {
      const verified = await verifyRefreshToken(input.refreshToken);
      user = verified.user;
      refreshTokenId = verified.refreshTokenId;
      priorDeviceInfo = verified.deviceInfo;
      familyId = verified.familyId ?? null;
    } catch {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    await revokeRefreshToken(refreshTokenId, { reason: 'rotated' });

    const nextDevice = input.deviceInfo ?? priorDeviceInfo ?? undefined;
    const { accessToken, refreshToken } = await tokenPair(user, nextDevice, { familyId });
    return { accessToken, refreshToken };
  }

  /** @param {{ refreshToken: string }} input */
  async logout(input) {
    await revokeRefreshTokenByPlain(input.refreshToken);
    return { ok: true };
  }

  /** @param {string} userId */
  async logoutAll(userId) {
    await revokeAllUserTokens(userId);
    return { ok: true };
  }

  /**
   * Updates the authenticated user (email, password, displayName, preferredLanguage). Returns fresh tokens when email or password changes so the JWT stays in sync.
   * @param {string} userId
   * @param {{ email?: string, password?: string, displayName?: string, preferredLanguage?: 'en' | 'ps' | 'fa' }} body
   */
  async updateMe(userId, body) {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new UnauthorizedError('Invalid session');
    }

    const doc = await User.findById(userId).select('+passwordHash');
    if (!doc || doc.isDeleted || doc.status !== 'active' || doc.deactivatedAt) {
      throw new UnauthorizedError('Account not available');
    }

    if (body.email !== undefined) {
      const email = body.email.trim().toLowerCase();
      const clash = await User.findOne({
        email,
        _id: { $ne: doc._id },
        isDeleted: { $ne: true },
      })
        .select('_id')
        .lean();
      if (clash) {
        throw new ConflictError('That email is already in use');
      }
      doc.email = email;
    }

    if (body.displayName !== undefined) {
      doc.displayName = body.displayName.trim();
    }

    if (body.preferredLanguage !== undefined) {
      doc.preferredLanguage = body.preferredLanguage;
    }

    if (body.password !== undefined) {
      doc.passwordHash = await hashPassword(body.password);
      doc.authProvider = 'password';
      await revokeAllUserTokens(userId);
    }

    await doc.save();

    const lean = await userRepository.findByIdLean(String(doc._id));
    if (!lean) {
      throw new UnauthorizedError('Account not available');
    }
    const user = publicUserShape(lean);
    const { accessToken, refreshToken } = await tokenPair(lean, undefined);
    return { user, accessToken, refreshToken };
  }

  /**
   * Persists a fresh verification token and sends email (SMTP must be configured).
   * @param {{ _id: unknown, email: string, displayName?: string | null }} doc
   * @returns {Promise<{ delivered: boolean }>}
   */
  async deliverPublicUserVerificationEmail(doc) {
    if (!isOutboundEmailConfigured()) {
      return { delivered: false };
    }

    const email = String(doc.email).trim().toLowerCase();
    const env = getEnv();
    const plainToken = generateEmailVerificationPlainToken();
    const tokenHash = hashEmailVerificationToken(plainToken);
    const expiresAt = new Date(Date.now() + env.EMAIL_VERIFICATION_TOKEN_TTL_SECONDS * 1000);

    await User.updateOne(
      { _id: doc._id },
      {
        $set: {
          emailVerificationTokenHash: tokenHash,
          emailVerificationTokenExpiresAt: expiresAt,
        },
      },
    );

    const appUrl = transactionalEmailAppBaseUrl();
    const displayName = typeof doc.displayName === 'string' ? doc.displayName : 'there';
    const link =
      appUrl.length > 0
        ? `${appUrl}?purpose=verify-email&email=${encodeURIComponent(email)}&token=${encodeURIComponent(plainToken)}&userId=${encodeURIComponent(String(doc._id))}`
        : null;

    const subject = 'Verify your email';
    const textLines = [
      `Hello ${displayName},`,
      '',
      'Use the verification code below to confirm your email address:',
      plainToken,
      '',
      link ? `Or open this link (expires soon): ${link}` : '',
      '',
      'If you did not request this, you can ignore this message.',
    ];
    const text = textLines.filter(Boolean).join('\n');

    const html = `
      <p>Hello ${escapeHtml(displayName)},</p>
      <p>Your verification code:</p>
      <p style="font-size:18px;font-weight:600;letter-spacing:2px;">${escapeHtml(plainToken)}</p>
      ${
        link
          ? `<p><a href="${escapeHtml(link)}">Confirm email address</a></p>
             <p style="color:#666;font-size:12px;">This link expires soon.</p>`
          : ''
      }
      <p style="color:#666;font-size:12px;">If you did not request this email, you can ignore it.</p>
    `.trim();

    // Send immediately so mail works without a separate BullMQ worker (Redis-only API setups).
    await sendSmtpMail({ to: email, subject, text, html });
    return { delivered: true };
  }

  /**
   * Sends a verification email if SMTP is configured and a matching active account exists.
   * Always returns the same envelope to avoid email enumeration.
   * @param {{ email: string }} input
   */
  async requestEmailVerification(input) {
    if (!isOutboundEmailConfigured()) {
      throw new AppError('Outbound email is not configured', {
        statusCode: HttpStatus.SERVICE_UNAVAILABLE,
        code: 'EMAIL_NOT_CONFIGURED',
      });
    }

    const email = input.email.trim().toLowerCase();
    const doc = await User.findOne({
      email,
      roleKey: RoleKey.PUBLIC_USER,
      isDeleted: { $ne: true },
      deactivatedAt: null,
      status: { $ne: 'suspended' },
    })
      .select('_id email displayName emailVerifiedAt')
      .lean();

    const noop = {
      ok: true,
      message: 'If an account exists for this address, verification instructions were sent.',
      delivered: false,
    };

    if (!doc?.email || doc.emailVerifiedAt) {
      return noop;
    }

    await this.deliverPublicUserVerificationEmail(doc);
    return {
      ok: true,
      message: 'If an account exists for this address, verification instructions were sent.',
      delivered: true,
    };
  }

  /**
   * @param {{ email: string, token: string }} input
   */
  async confirmEmailVerification(input) {
    const email = input.email.trim().toLowerCase();
    const token = input.token.trim();
    if (!token) {
      throw new BadRequestError('Invalid or expired verification code');
    }

    const doc = await User.findOne({
      email,
      roleKey: RoleKey.PUBLIC_USER,
      isDeleted: { $ne: true },
    })
      .select('+emailVerificationTokenHash emailVerificationTokenExpiresAt emailVerifiedAt deactivatedAt status')
      .exec();

    if (!doc || doc.deactivatedAt || doc.status === 'suspended') {
      throw new BadRequestError('Invalid or expired verification code');
    }

    if (doc.emailVerifiedAt) {
      return { ok: true, emailVerified: true };
    }

    const expiresAt = doc.emailVerificationTokenExpiresAt;
    const storedHash = doc.emailVerificationTokenHash;
    if (!storedHash || !expiresAt || expiresAt.getTime() < Date.now()) {
      throw new BadRequestError('Invalid or expired verification code');
    }

    const candidateHash = hashEmailVerificationToken(token);
    const a = Buffer.from(storedHash, 'utf8');
    const b = Buffer.from(candidateHash, 'utf8');
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      throw new BadRequestError('Invalid or expired verification code');
    }

    doc.emailVerifiedAt = new Date();
    doc.emailVerificationTokenHash = null;
    doc.emailVerificationTokenExpiresAt = null;
    await doc.save();

    return { ok: true, emailVerified: true };
  }

  /**
   * Sends a password-reset email for any active directory account with this email
   * (public users, inspectors, admins, etc.). Supports first-time setup when the user
   * was provisioned without a password (e.g. system-admin staff create).
   * @param {{ email: string }} input
   */
  async requestPasswordReset(input) {
    if (!isOutboundEmailConfigured()) {
      throw new AppError('Outbound email is not configured', {
        statusCode: HttpStatus.SERVICE_UNAVAILABLE,
        code: 'EMAIL_NOT_CONFIGURED',
      });
    }

    const email = input.email.trim().toLowerCase();
    const noop = {
      ok: true,
      message: 'If an account exists with that email, you will receive a reset link.',
      delivered: false,
    };

    const doc = await User.findOne({
      email,
      isDeleted: { $ne: true },
      deactivatedAt: null,
      status: { $ne: 'suspended' },
    })
      .select('+passwordHash _id displayName email')
      .lean();

    if (!doc?.email) {
      return noop;
    }

    const env = getEnv();
    const plainToken = generatePasswordResetPlainToken();
    const tokenHash = hashPasswordResetToken(plainToken);
    const expiresAt = new Date(Date.now() + env.PASSWORD_RESET_TOKEN_TTL_SECONDS * 1000);

    await User.updateOne(
      { _id: doc._id },
      {
        $set: {
          passwordResetTokenHash: tokenHash,
          passwordResetTokenExpiresAt: expiresAt,
        },
      },
    );

    const appUrl = transactionalEmailAppBaseUrl();
    const displayName = typeof doc.displayName === 'string' ? doc.displayName : 'there';
    const uid = encodeURIComponent(String(doc._id));
    const link =
      appUrl.length > 0
        ? `${appUrl}?purpose=password-reset&email=${encodeURIComponent(email)}&token=${encodeURIComponent(plainToken)}&userId=${uid}`
        : null;

    const subject = 'Reset your password';
    const textLines = [
      `Hello ${displayName},`,
      '',
      'Use the code below to reset your password (it expires soon):',
      plainToken,
      '',
      link ? `Or open this link: ${link}` : '',
      '',
      'If you did not request a password reset, ignore this email.',
    ];
    const text = textLines.filter(Boolean).join('\n');

    const html = `
      <p>Hello ${escapeHtml(displayName)},</p>
      <p>Your password reset code:</p>
      <p style="font-size:18px;font-weight:600;letter-spacing:2px;">${escapeHtml(plainToken)}</p>
      ${
        link
          ? `<p><a href="${escapeHtml(link)}">Reset password</a></p>
             <p style="color:#666;font-size:12px;">This link expires soon.</p>`
          : ''
      }
      <p style="color:#666;font-size:12px;">If you did not request this, you can ignore this email.</p>
    `.trim();

    await sendSmtpMail({ to: email, subject, text, html });
    return {
      ok: true,
      message: 'If an account exists with that email, you will receive a reset link.',
      delivered: true,
    };
  }

  /**
   * @param {{ email: string, token: string, newPassword: string }} input
   */
  async completePasswordReset(input) {
    const email = input.email.trim().toLowerCase();
    const token = input.token.trim();
    if (!token) {
      throw new BadRequestError('Invalid or expired reset link');
    }

    const doc = await User.findOne({
      email,
      isDeleted: { $ne: true },
    })
      .select('+passwordHash +passwordResetTokenHash passwordResetTokenExpiresAt deactivatedAt status')
      .exec();

    if (!doc || doc.deactivatedAt || doc.status === 'suspended') {
      throw new BadRequestError('Invalid or expired reset link');
    }

    const expiresAt = doc.passwordResetTokenExpiresAt;
    const storedHash = doc.passwordResetTokenHash;
    if (!storedHash || !expiresAt || expiresAt.getTime() < Date.now()) {
      throw new BadRequestError('Invalid or expired reset link');
    }

    const candidateHash = hashPasswordResetToken(token);
    const a = Buffer.from(storedHash, 'utf8');
    const b = Buffer.from(candidateHash, 'utf8');
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      throw new BadRequestError('Invalid or expired reset link');
    }

    const wasPasswordless = !doc.passwordHash;
    doc.passwordHash = await hashPassword(input.newPassword);
    doc.passwordResetTokenHash = null;
    doc.passwordResetTokenExpiresAt = null;
    doc.authProvider = 'password';
    if (wasPasswordless && doc.status === 'pending') {
      doc.status = 'active';
    }
    await revokeAllUserTokens(String(doc._id));
    await doc.save();

    return { ok: true };
  }
}

/**
 * @param {string} s
 */
function escapeHtml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export const authService = new AuthService();
