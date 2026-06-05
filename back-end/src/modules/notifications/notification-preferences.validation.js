import { z } from 'zod';

export const patchNotificationPreferencesBodySchema = z
  .object({
    pushEnabled: z.boolean().optional(),
    newUploads: z.boolean().optional(),
    statusChanges: z.boolean().optional(),
    systemAlerts: z.boolean().optional(),
  })
  .strict();
