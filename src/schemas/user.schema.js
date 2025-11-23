import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(['student','tutor','advisor']).optional(),
  personalInfo: z.object({
    firstName: z.string().optional(),
    lastName: z.string().optional()
  }).optional()
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

export const updateProfileSchema = z.object({
  personalInfo: z.object({
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    phone: z.string().optional(),
    bio: z.string().optional()
  }).optional(),
  communicationSettings: z.object({
    allowNotifications: z.boolean().optional(),
    emailNotifications: z.boolean().optional(),
    notificationPreferences: z.array(z.string()).optional()
  }).optional()
});

export const changePasswordSchema = z.object({
  oldPassword: z.string().min(1),
  newPassword: z.string().min(8)
});