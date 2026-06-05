import { z } from 'zod';
import { objectIdString } from '../shared/validation/zod-helpers.js';

export const registerDeviceBodySchema = z
  .object({
    platform: z.enum(['ios', 'android', 'web']),
    provider: z.enum(['expo', 'fcm', 'apns']).default('expo'),
    token: z.string().trim().min(8).max(4096),
    deviceName: z.string().trim().max(200).optional(),
    appVersion: z.string().trim().max(64).optional(),
    locale: z.string().trim().toLowerCase().max(16).optional(),
  })
  .strict();

export const deviceIdParamSchema = z.object({
  id: objectIdString,
});
