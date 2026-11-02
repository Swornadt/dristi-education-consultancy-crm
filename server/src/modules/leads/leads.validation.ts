import { z } from 'zod';

export const createLeadSchema = z.object({
  body: z.object({
    fullName: z.string().min(1).max(255),
    email: z.string().email().max(255).optional(),
    phone: z.string().max(50).optional(),
    source: z.enum(['walk_in', 'website', 'facebook', 'instagram', 'referral', 'event', 'phone', 'other']).optional(),
    destinationCountryId: z.number().int().positive().optional(),
    desiredIntake: z.object({
      term: z.enum(['spring', 'summer', 'fall', 'winter']),
      year: z.number().int().min(2000).max(2100)
    }).optional(),
    testStatus: z.enum(['not_taken', 'preparing', 'booked', 'completed']).optional(),
    notes: z.string().max(5000).optional(),
    assignedTo: z.number().int().positive().optional(),
  }).refine(data => data.email || data.phone, {
    message: "At least one of email or phone is required",
    path: ["email"]
  })
});

export const updateLeadSchema = z.object({
  body: z.object({
    fullName: z.string().min(1).max(255).optional(),
    email: z.string().email().max(255).optional(),
    phone: z.string().max(50).optional(),
    source: z.enum(['walk_in', 'website', 'facebook', 'instagram', 'referral', 'event', 'phone', 'other']).optional(),
    destinationCountryId: z.number().int().positive().optional(),
    desiredIntake: z.object({
      term: z.enum(['spring', 'summer', 'fall', 'winter']),
      year: z.number().int().min(2000).max(2100)
    }).optional(),
    testStatus: z.enum(['not_taken', 'preparing', 'booked', 'completed']).optional(),
    notes: z.string().max(5000).optional(),
    assignedTo: z.number().int().positive().optional(),
  })
});

export const updateStatusSchema = z.object({
  body: z.object({
    status: z.enum(['new', 'contacted', 'counseling_scheduled', 'converted', 'lost']),
    lostReason: z.string().max(500).optional()
  }).refine(data => data.status !== 'lost' || !!data.lostReason, {
    message: "lostReason is required when status is lost",
    path: ["lostReason"]
  })
});

export const assignLeadSchema = z.object({
  body: z.object({
    assignedTo: z.number().int().positive()
  })
});

export const createActivitySchema = z.object({
  body: z.object({
    type: z.enum(['call', 'note', 'meeting', 'email']),
    content: z.string().min(1).max(5000),
    occurredAt: z.string().datetime().optional()
  })
});