import {z} from 'zod';

export const createCountrySchema = z.object({
  body:z.object({
    name:z.string().min(1).max(100),
    isoCode:z.string().length(2).toUpperCase().optional(),
  })
});
export const updateCountrySchema = z.object({
  body:z.object({
    name:z.string().min(1).max(100).optional(),
    isoCode:z.string().length(2).toUpperCase().optional(),
    isActive:z.boolean().optional(),
  })
});
export const createDocumentTypeSchema=z.object({
  body:z.object({
    name:z.string().min(1).max(100),
    inDefaultChecklist:z.boolean().optional(),
  })
});
export const updateDocumentTypeSchema=z.object({
  body:z.object({
    name:z.string().min(1).max(100).optional(),
    inDefaultChecklist:z.boolean().optional(),
    isActive:z.boolean().optional(),
  })
});
export const createUniversitySchema = z.object({
  body: z.object({
    countryId: z.number().int().positive(),
    name: z.string().min(1).max(255),
    city: z.string().max(100).optional(),
    website: z.string().url().max(500).optional().or(z.literal('')),
    notes: z.string().max(1000).optional(),
  })
});

export const updateUniversitySchema = z.object({
  body: z.object({
    countryId: z.number().int().positive().optional(),
    name: z.string().min(1).max(255).optional(),
    city: z.string().max(100).optional(),
    website: z.string().url().max(500).optional().or(z.literal('')),
    notes: z.string().max(1000).optional(),
    isActive: z.boolean().optional(),
  })
});
export const createProgramSchema = z.object({
  body: z.object({
    universityId: z.number().int().positive(),
    name: z.string().min(1).max(255),
    level: z.enum(['foundation', 'diploma', 'bachelor', 'master', 'phd', 'other']),
    fieldOfStudy: z.string().max(255).optional(),
    durationMonths: z.number().int().positive().optional(),
    tuitionFee: z.number().positive().optional(),
    currency: z.string().length(3).toUpperCase().optional(),
  })
});

export const updateProgramSchema = z.object({
  body: z.object({
    universityId: z.number().int().positive().optional(),
    name: z.string().min(1).max(255).optional(),
    level: z.enum(['foundation', 'diploma', 'bachelor', 'master', 'phd', 'other']).optional(),
    fieldOfStudy: z.string().max(255).optional(),
    durationMonths: z.number().int().positive().optional(),
    tuitionFee: z.number().positive().optional(),
    currency: z.string().length(3).toUpperCase().optional(),
    isActive: z.boolean().optional(),
  })
});
export const createIntakeSchema = z.object({
  body: z.object({
    programId: z.number().int().positive(),
    term: z.enum(['spring', 'summer', 'fall', 'winter']),
    year: z.number().int().min(2000).max(2100),
    applicationDeadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD').optional(),
  })
});

export const updateIntakeSchema = z.object({
  body: z.object({
    programId: z.number().int().positive().optional(),
    term: z.enum(['spring', 'summer', 'fall', 'winter']).optional(),
    year: z.number().int().min(2000).max(2100).optional(),
    applicationDeadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD').optional(),
    isActive: z.boolean().optional(),
  })
});

