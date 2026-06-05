import { asyncHandler, sendSuccess } from '../../../modules/shared/http/index.js';
import { auditService, emailFingerprint } from '../../../services/audit/auditService.js';
import { authService } from './auth.service.js';

export const authController = {
  register: asyncHandler(async (req, res) => {
    const data = await authService.register(req.validated.body);
    await auditService.logFromRequest(req, 'user.register', {
      resourceType: 'User',
      resourceId: data.user.id,
      summary: 'User registered',
      details: {
        outcome: 'success',
        emailFingerprint: emailFingerprint(data.user.email ?? ''),
        roleKey: data.user.role,
      },
    });
    return sendSuccess(res, data, { statusCode: 201 });
  }),

  login: asyncHandler(async (req, res) => {
    const data = await authService.login(req.validated.body);
    await auditService.logFromRequest(req, 'user.login', {
      resourceType: 'User',
      resourceId: data.user.id,
      summary: 'Login success',
      details: {
        outcome: 'success',
        emailFingerprint: emailFingerprint(data.user.email ?? ''),
        roleKey: data.user.role,
      },
    });
    return sendSuccess(res, data);
  }),

  refresh: asyncHandler(async (req, res) => {
    const data = await authService.refresh(req.validated.body);
    await auditService.logFromRequest(req, 'auth.refresh', {
      resourceType: 'Session',
      resourceId: '-',
      summary: 'Access token refreshed',
      details: { outcome: 'success', rotated: true },
    });
    return sendSuccess(res, data);
  }),

  me: asyncHandler(async (req, res) => {
    const data = await authService.getMe(req.user.id);
    return sendSuccess(res, data);
  }),

  patchMe: asyncHandler(async (req, res) => {
    const data = await authService.updateMe(req.user.id, req.validated.body);
    return sendSuccess(res, data, { message: 'Profile updated' });
  }),

  logout: asyncHandler(async (req, res) => {
    const data = await authService.logout(req.validated.body);
    await auditService.logFromRequest(req, 'auth.logout', {
      resourceType: 'Session',
      resourceId: req.user?.id ?? '-',
      summary: 'Logout (single refresh token revoked)',
      details: { outcome: 'success' },
    });
    return sendSuccess(res, data, { message: 'Signed out' });
  }),

  logoutAll: asyncHandler(async (req, res) => {
    const data = await authService.logoutAll(req.user.id);
    await auditService.logFromRequest(req, 'auth.logout_all', {
      resourceType: 'User',
      resourceId: req.user.id,
      summary: 'All refresh sessions revoked',
      details: { outcome: 'success' },
    });
    return sendSuccess(res, data, { message: 'All sessions signed out' });
  }),

  requestEmailVerification: asyncHandler(async (req, res) => {
    const data = await authService.requestEmailVerification(req.validated.body);
    await auditService.logFromRequest(req, 'user.email_verification_request', {
      resourceType: 'User',
      resourceId: '-',
      summary: 'Email verification send handled',
      details: {
        outcome: 'success',
        emailFingerprint: emailFingerprint(req.validated.body.email ?? ''),
        attemptedDelivery: Boolean(data.delivered),
      },
    });
    const { delivered: _d, ...publicPayload } = data;
    return sendSuccess(res, publicPayload);
  }),

  confirmEmailVerification: asyncHandler(async (req, res) => {
    const data = await authService.confirmEmailVerification(req.validated.body);
    await auditService.logFromRequest(req, 'user.email_verification_confirm', {
      resourceType: 'User',
      resourceId: '-',
      summary: 'Email verification completed',
      details: {
        outcome: 'success',
        emailFingerprint: emailFingerprint(req.validated.body.email ?? ''),
      },
    });
    return sendSuccess(res, data);
  }),

  requestPasswordReset: asyncHandler(async (req, res) => {
    const data = await authService.requestPasswordReset(req.validated.body);
    await auditService.logFromRequest(req, 'user.password_reset_request', {
      resourceType: 'User',
      resourceId: '-',
      summary: 'Password reset send handled',
      details: {
        outcome: 'success',
        emailFingerprint: emailFingerprint(req.validated.body.email ?? ''),
        attemptedDelivery: Boolean(data.delivered),
      },
    });
    const { delivered: _d, ...publicPayload } = data;
    return sendSuccess(res, publicPayload);
  }),

  completePasswordReset: asyncHandler(async (req, res) => {
    const data = await authService.completePasswordReset(req.validated.body);
    await auditService.logFromRequest(req, 'user.password_reset_complete', {
      resourceType: 'User',
      resourceId: '-',
      summary: 'Password reset completed',
      details: {
        outcome: 'success',
        emailFingerprint: emailFingerprint(req.validated.body.email ?? ''),
      },
    });
    return sendSuccess(res, data);
  }),
};
