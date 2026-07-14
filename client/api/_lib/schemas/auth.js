import { z } from 'zod'

export const registerSchema = z.object({
  username: z.string().trim().min(1, 'Username is required'),
  email: z.string().trim().min(1, 'Email is required').email('Must be a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  profileImage: z.string().trim().optional().default(''),
})

export const loginSchema = z.object({
  email: z.string().trim().min(1, 'Email is required').email('Must be a valid email address'),
  password: z.string().min(1, 'Password is required'),
})