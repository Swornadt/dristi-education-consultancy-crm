import { z } from 'zod';

export const updateStudentSchema = z.object({
  body: z.object({
    fullName: z.string().min(1).max(255).optional(),
    email: z.string().email().max(255).optional(),
    phone: z.string().max(50).optional(),
    dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD').optional(),
    gender: z.string().max(50).optional(),
    nationality: z.string().max(100).optional(),
    address: z.string().max(500).optional(),
    guardianName: z.string().max(255).optional(),
    guardianPhone: z.string().max(50).optional(),
    preferredCourses: z.string().max(1000).optional(),
    notes: z.string().max(5000).optional(),
    assignedTo: z.number().int().positive().optional(),
  })
});

export const updatePreferredCountriesSchema = z.object({
  body: z.object({
    countryIds: z.array(z.number().int().positive())
  })
});