import { z } from 'zod';

// ── Categories ────────────────────────────────────────────────────────────────

export const createCategorySchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100),
    kind: z.enum(['income', 'expense']),
  }),
});

export const updateCategorySchema = z.object({
  body: z.object({
    name:     z.string().min(1).max(100).optional(),
    isActive: z.boolean().optional(),
  }).refine(data => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  }),
});

// ── Entries ───────────────────────────────────────────────────────────────────

// amount must be a positive number; income vs expense comes from the category kind.
const positiveAmount = z
  .number({ invalid_type_error: 'amount must be a number' })
  .positive('amount must be greater than zero');

export const createEntrySchema = z.object({
  body: z.object({
    categoryId:   z.number().int().positive(),
    entryDate:    z.string().date('entryDate must be a date in YYYY-MM-DD format'),
    amount:       positiveAmount,
    description:  z.string().max(500).optional(),
    payeeName:    z.string().max(200).optional(),
    // First day of the month this entry covers (e.g. 2026-11-01).
    periodMonth:  z.string().date('periodMonth must be a date in YYYY-MM-DD format').optional(),
    referenceNo:  z.string().max(100).optional(),
  }),
});

export const updateEntrySchema = z.object({
  body: z.object({
    categoryId:   z.number().int().positive().optional(),
    entryDate:    z.string().date('entryDate must be a date in YYYY-MM-DD format').optional(),
    amount:       positiveAmount.optional(),
    description:  z.string().max(500).optional(),
    payeeName:    z.string().max(200).optional(),
    periodMonth:  z.string().date('periodMonth must be a date in YYYY-MM-DD format').optional(),
    referenceNo:  z.string().max(100).optional(),
  }).refine(data => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  }),
});

// ── Summary ───────────────────────────────────────────────────────────────────

export const summaryQuerySchema = z.object({
  query: z.object({
    // Format: YYYY-MM. Defaults to the current month when omitted.
    month: z.string().regex(/^\d{4}-(?:0[1-9]|1[0-2])$/, 'month must be in YYYY-MM format').optional(),
  }),
});
