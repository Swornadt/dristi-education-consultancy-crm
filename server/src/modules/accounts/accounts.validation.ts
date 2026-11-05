import { z } from "zod";

export const createCategorySchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100),
    kind: z.enum(["income", "expense"]),
  }),
});

export const updateCategorySchema = z.object({
  body: z
    .object({
      name: z.string().min(1).max(100).optional(),
      isActive: z.boolean().optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: "At least one field must be provided",
    }),
});

const positiveAmount = z
  .number({ invalid_type_error: "amount must be a number" })
  .positive("amount must be greater than zero")
  .max(9999999999.99, "amount must not exceed 9999999999.99");

export const createEntrySchema = z.object({
  body: z.object({
    categoryId: z.number().int().positive(),
    entryDate: z.string().date("entryDate must be a date in YYYY-MM-DD format"),
    amount: positiveAmount,
    description: z.string().max(500).optional(),
    payeeName: z.string().max(200).optional(),
    periodMonth: z
      .string()
      .date("periodMonth must be a date in YYYY-MM-DD format")
      .optional(),
    referenceNo: z.string().max(100).optional(),
  }),
});

export const updateEntrySchema = z.object({
  body: z
    .object({
      categoryId: z.number().int().positive().optional(),
      entryDate: z
        .string()
        .date("entryDate must be a date in YYYY-MM-DD format")
        .optional(),
      amount: positiveAmount.optional(),
      description: z.string().max(500).optional(),
      payeeName: z.string().max(200).optional(),
      periodMonth: z
        .string()
        .date("periodMonth must be a date in YYYY-MM-DD format")
        .optional(),
      referenceNo: z.string().max(100).optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: "At least one field must be provided",
    }),
});

export const summaryQuerySchema = z.object({
  query: z.object({
    month: z
      .string()
      .regex(/^\d{4}-(?:0[1-9]|1[0-2])$/, "month must be in YYYY-MM format")
      .optional(),
  }),
});