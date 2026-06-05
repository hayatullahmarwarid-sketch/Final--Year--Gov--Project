import { z } from 'zod';
import {
  strongPasswordSchema as sharedStrongPasswordSchema,
  isPasswordAcceptableAgainstEmail,
} from '../../../modules/shared/validation/password.schema.js';

const deviceInfoSchema = z.string().trim().max(500).optional();

const preferredLanguageSchema = z.enum(['en', 'ps', 'fa']).optional();

/** Re-export of the shared strong-password policy for auth routes. */
export const strongPasswordSchema = sharedStrongPasswordSchema;

function refineDisplayNameOptional(nameRaw, ctx, pathKey) {
  const name = typeof nameRaw === 'string' ? nameRaw.trim() : '';
  if (!name) return;
  if (name.length < 2) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: [pathKey],
      message: 'Name must be at least 2 characters',
    });
    return;
  }
  if (!/^[\p{L}][\p{L}\s'\u2019-]*$/u.test(name)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: [pathKey],
      message: 'Name may only contain letters, spaces, apostrophes, and hyphens',
    });
  }
  if (/\p{N}/u.test(name)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: [pathKey],
      message: 'Name may not contain numbers',
    });
  }
}

export const registerBodySchema = z
  .object({
    email: z.string().trim().email(),
    password: strongPasswordSchema,
    displayName: z.string().trim().max(200).optional(),
    preferredLanguage: preferredLanguageSchema,
    deviceInfo: deviceInfoSchema,
  })
  .superRefine((data, ctx) => {
    refineDisplayNameOptional(data.displayName, ctx, 'displayName');
    if (!isPasswordAcceptableAgainstEmail(data.password, data.email)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['password'],
        message: 'Password must differ from your email',
      });
    }
  });

export const loginBodySchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
  deviceInfo: deviceInfoSchema,
});

export const refreshBodySchema = z.object({
  refreshToken: z.string().trim().min(1),
  deviceInfo: deviceInfoSchema,
});

export const logoutBodySchema = z.object({
  refreshToken: z.string().trim().min(1),
});

/** Self-service profile update (Bearer required). */
export const patchMeBodySchema = z
  .object({
    email: z.string().trim().email().max(320).optional(),
    password: strongPasswordSchema.optional(),
    displayName: z.string().trim().max(200).optional(),
    preferredLanguage: preferredLanguageSchema,
  })
  .strict()
  .refine(
    (b) =>
      b.email !== undefined ||
      b.password !== undefined ||
      b.displayName !== undefined ||
      b.preferredLanguage !== undefined,
    {
      message: 'Provide at least one of email, password, displayName, or preferredLanguage',
    },
  )
  .superRefine((data, ctx) => {
    refineDisplayNameOptional(data.displayName, ctx, 'displayName');
  });

export const emailVerificationSendBodySchema = z.object({
  email: z.string().trim().email(),
});

export const emailVerificationConfirmBodySchema = z.object({
  email: z.string().trim().email(),
  token: z.string().trim().min(1).max(500),
});

export const passwordResetRequestBodySchema = z.object({
  email: z.string().trim().email(),
});

export const passwordResetCompleteBodySchema = z
  .object({
    email: z.string().trim().email(),
    token: z.string().trim().min(1).max(500),
    newPassword: strongPasswordSchema,
  })
  .superRefine((data, ctx) => {
    if (!isPasswordAcceptableAgainstEmail(data.newPassword, data.email)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['newPassword'],
        message: 'Password must differ from your email',
      });
    }
  });
