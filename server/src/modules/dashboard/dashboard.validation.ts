import { z } from 'zod';

export const summaryQuerySchema = z.object({
  query: z.object({
    // Format: YYYY-MM. Defaults to the current month when omitted.
    month: z
      .string()
      .regex(/^\d{4}-(?:0[1-9]|1[0-2])$/, 'month must be in YYYY-MM format')
      .optional(),
  }),
});
