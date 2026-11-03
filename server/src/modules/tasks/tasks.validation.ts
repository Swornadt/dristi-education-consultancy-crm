import {z} from 'zod';
export const createTaskSchema = z.object({
  body:z.object({
    title:z.string().min(1).max(255),
    description:z.string().max(5000).optional(),
    dueAt:z.string().datetime(),
    leadId:z.number().int().positive().optional(),
    studentId:z.number().int().positive().optional(),
    assignedTo:z.number().int().positive().optional(),
  }).refine(data=>data.leadId || data.studentId,{message:"At least one of leadId or studentId is required",
    path:["LeadId"]
  })
});
export const updateTaskSchema = z.object({
  body:z.object({
    title:z.string().min(1).max(255).optional(),
    description:z.string().max(5000).optional(),
    dueAt:z.string().datetime().optional(),
    assignedTo:z.number().int().positive().optional(),
  })
});