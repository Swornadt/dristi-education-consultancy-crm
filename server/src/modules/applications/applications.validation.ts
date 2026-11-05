import { z } from 'zod';

export const createApplicationSchema = z.object({
  body: z.object({
    studentId: z.number().int().positive(),
    programIntakeId: z.number().int().positive(),
    deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD').optional(),
    notes: z.string().max(5000).optional(),
  })
});

export const updateApplicationSchema = z.object({
  body: z.object({
    deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD').optional(),
    notes: z.string().max(5000).optional(),
  })
});

export const updateStatusSchema = z.object({
  body: z.object({
    status: z.enum(['draft', 'submitted', 'offer', 'accepted', 'rejected']),
    note: z.string().max(5000).optional(),
  })
});