import { Router } from 'express';
import { validateRequest } from '../../../modules/shared/http/index.js';
import { authenticate } from '../../../middlewares/auth.middleware.js';
import {
  emailSendLimiter,
  loginLimiter,
  refreshLimiter,
  registerLimiter,
} from '../../../middlewares/rate-limit.middleware.js';
import { authController } from './auth.controller.js';
import {
  emailVerificationConfirmBodySchema,
  emailVerificationSendBodySchema,
  loginBodySchema,
  logoutBodySchema,
  passwordResetCompleteBodySchema,
  passwordResetRequestBodySchema,
  patchMeBodySchema,
  refreshBodySchema,
  registerBodySchema,
} from './auth.validation.js';

export const authRouter = Router();

authRouter.post(
  '/register',
  registerLimiter(),
  validateRequest({ body: registerBodySchema }),
  authController.register,
);

authRouter.post(
  '/login',
  loginLimiter(),
  validateRequest({ body: loginBodySchema }),
  authController.login,
);

authRouter.post(
  '/refresh',
  refreshLimiter(),
  validateRequest({ body: refreshBodySchema }),
  authController.refresh,
);

authRouter.post('/logout', validateRequest({ body: logoutBodySchema }), authController.logout);

authRouter.post('/logout-all', authenticate(), authController.logoutAll);

authRouter.get('/me', authenticate(), authController.me);

authRouter.patch(
  '/me',
  authenticate(),
  validateRequest({ body: patchMeBodySchema }),
  authController.patchMe,
);

authRouter.post(
  '/email-verification/send',
  emailSendLimiter(),
  validateRequest({ body: emailVerificationSendBodySchema }),
  authController.requestEmailVerification,
);

authRouter.post(
  '/email-verification/confirm',
  validateRequest({ body: emailVerificationConfirmBodySchema }),
  authController.confirmEmailVerification,
);

authRouter.post(
  '/password-reset/request',
  emailSendLimiter(),
  validateRequest({ body: passwordResetRequestBodySchema }),
  authController.requestPasswordReset,
);

authRouter.post(
  '/forgot-password',
  emailSendLimiter(),
  validateRequest({ body: passwordResetRequestBodySchema }),
  authController.requestPasswordReset,
);

authRouter.post(
  '/password-reset/complete',
  validateRequest({ body: passwordResetCompleteBodySchema }),
  authController.completePasswordReset,
);

authRouter.post(
  '/reset-password',
  validateRequest({ body: passwordResetCompleteBodySchema }),
  authController.completePasswordReset,
);
