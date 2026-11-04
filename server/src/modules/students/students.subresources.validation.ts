import { z } from 'zod';

export const createEducationSchema = z.object({
  body: z.object({
    level: z.string().min(1).max(100),
    institution: z.string().min(1).max(255),
    fieldOfStudy: z.string().max(255).optional(),
    startYear: z.number().int().min(1900).max(2100).optional(),
    endYear: z.number().int().min(1900).max(2100).optional(),
    grade: z.string().max(100).optional(),
  }).refine(data => !data.startYear || !data.endYear || data.endYear >= data.startYear, {
    message: "endYear must be greater than or equal to startYear",
    path: ["endYear"]
  })
});

export const updateEducationSchema = z.object({
  body: z.object({
    level: z.string().min(1).max(100).optional(),
    institution: z.string().min(1).max(255).optional(),
    fieldOfStudy: z.string().max(255).optional(),
    startYear: z.number().int().min(1900).max(2100).optional(),
    endYear: z.number().int().min(1900).max(2100).optional(),
    grade: z.string().max(100).optional(),
  }).refine(data => !data.startYear || !data.endYear || data.endYear >= data.startYear, {
    message: "endYear must be greater than or equal to startYear",
    path: ["endYear"]
  })
});

export const createTestScoreSchema = z.object({
  body: z.object({
    testName: z.enum(['IELTS', 'TOEFL', 'PTE', 'Duolingo', 'SAT', 'ACT', 'GRE', 'GMAT', 'Other']),
    overallScore: z.number().min(0).optional(),
    sectionScores: z.record(z.string(), z.number()).optional(),
    testDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD').optional(),
  })
});

export const updateTestScoreSchema = z.object({
  body: createTestScoreSchema.shape.body.partial()
});

export const addChecklistItemSchema = z.object({
  body: z.object({
    documentTypeId: z.number().int().positive()
  })
});

export const updateChecklistItemSchema = z.object({
  body: z.object({
    status: z.enum(['pending', 'received', 'verified']).optional(),
    remarks: z.string().max(1000).optional(),
  })
});