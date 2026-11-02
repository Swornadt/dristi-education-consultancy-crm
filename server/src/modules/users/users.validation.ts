import { z } from 'zod';

export const createUserSchema = z.object({
  body: z.object({
    fullName: z.string().min(1),
    email: z.string().email(),
    password: z.string().min(6),
    roleId: z.number().int().positive(),
  }),
});

export const updateUserSchema = z.object({
  body: z.object({
    fullName: z.string().min(1).optional(),
    roleId: z.number().int().positive().optional(),
    isActive: z.boolean().optional(),
    password: z.string().min(6).optional(),
  }),
});

export const overridesSchema = z.object({
  body: z.object({
    overrides: z.array(
      z.object({
        module: z.string(),
        action: z.string(),
        effect: z.string(),
        scope: z.string().optional(),
      })
    ),
  }),
});