import { z } from 'zod';

export const unifiedSearchQuerySchema = z
  .object({
    q: z.string().trim().min(1).max(200),
    type: z.enum(['all', 'decrees', 'exams']).optional().default('all'),
    limit: z.coerce.number().int().min(1).max(50).optional().default(20),
  })
  .strict();
