import { z } from 'zod';

export const createClassVideoSchema = z.object({
  body: z.object({
    title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
    description: z.string().max(1000, 'Description too long').optional(),
    subject: z.string().min(1, 'Subject is required'),
    topic: z.string().optional(),
    grade: z.string().optional(),
    duration: z.number().min(0).optional(),
    thumbnailUrl: z.string().url().optional().or(z.literal('')),
    fileSize: z.number().min(0).optional(),
    visibility: z.enum(['private', 'students', 'public']).default('students'),
    allowedStudents: z.array(z.string()).default([]),
    tags: z.array(z.string()).default([])
  })
});

export const updateClassVideoSchema = z.object({
  body: z.object({
    title: z.string().min(1).max(200).optional(),
    description: z.string().max(1000).optional(),
    subject: z.string().optional(),
    topic: z.string().optional(),
    grade: z.string().optional(),
    duration: z.number().min(0).optional(),
    videoUrl: z.string().url().optional(),
    thumbnailUrl: z.string().url().optional().or(z.literal('')),
    fileSize: z.number().min(0).optional(),
    visibility: z.enum(['private', 'students', 'public']).optional(),
    allowedStudents: z.array(z.string()).optional(),
    status: z.enum(['processing', 'published', 'archived']).optional(),
    tags: z.array(z.string()).optional()
  })
});

export const toggleLikeVideoSchema = z.object({
  body: z.object({
    // No body required for toggle like
  })
});
