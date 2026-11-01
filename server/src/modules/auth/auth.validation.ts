import {z} from 'zod';
export const loginSchema = z.object({
  body:z.object({
    email:z.string().email(),
    password:z.string().min(1),
  }),
});
export const changePasswordSchema = z.object({
  body:z.object({
    currentPassword:z.string().min(1),
    newPassword:z.string().min(6,'Password must be atleast 6 characters'),
  }),
});