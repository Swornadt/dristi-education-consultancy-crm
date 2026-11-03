import { z } from 'zod';

export const replaceRolePermissionsSchema = z.object({
  body: z.object({
    permissions: z.array(
      z.object({
        module: z.string(),
        action: z.string(),
        scope: z.string(),
      })
    ),
  }),
});