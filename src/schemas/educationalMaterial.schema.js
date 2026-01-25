import { z } from 'zod';

export const createEducationalMaterialSchema = z.object({
  body: z.object({
    title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
    description: z.string().max(1000, 'Description too long').optional(),
    type: z.enum(['document', 'image']),
    subject: z.string().min(1, 'Subject is required'),
    topic: z.string().optional(),
    difficulty: z.enum(['beginner', 'intermediate', 'advanced']).default('intermediate'),
    tags: z.union([z.array(z.string()), z.string()]).default([]),
    visibility: z.enum(['private', 'students', 'public']).default('students'),
    allowedStudents: z.array(z.string()).default([]),
    allowedGroups: z.array(z.string()).default([]),
    targetStudentId: z.string().optional(),
    fileSize: z.number().min(0).optional(),
    originalFileName: z.string().optional(),
    mimeType: z.string().optional()
  })
});

export const updateEducationalMaterialSchema = z.object({
  body: z.object({
    title: z.string().min(1).max(200).optional(),
    description: z.string().max(1000).optional(),
    type: z.enum(['document', 'image']).optional(),
    subject: z.string().optional(),
    topic: z.string().optional(),
    difficulty: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
    tags: z.array(z.string()).optional(),
    fileUrl: z.string().url().optional().or(z.literal('')),
    fileSize: z.number().min(0).optional(),
    thumbnail: z.string().url().optional().or(z.literal('')),
    externalLink: z.string().url().optional().or(z.literal('')),
    content: z.string().optional(),
    visibility: z.enum(['private', 'students', 'public']).optional(),
    allowedStudents: z.array(z.string()).optional(),
    allowedGroups: z.array(z.string()).optional(),
    isAssignment: z.boolean().optional(),
    assignmentDetails: z.object({
      dueDate: z.string().datetime().optional(),
      maxPoints: z.number().min(0).optional(),
      instructions: z.string().max(2000).optional(),
      evaluationCriteria: z.array(z.string()).optional(),
      allowedFormats: z.array(z.enum(['pdf', 'doc', 'docx', 'txt', 'image', 'video', 'link'])).optional(),
      maxFileSize: z.number().min(0).optional(),
      submissionLimit: z.number().min(1).optional()
    }).optional(),
    status: z.enum(['draft', 'published', 'archived', 'under_review']).optional(),
    language: z.string().optional(),
    estimatedStudyTime: z.number().min(0).optional(),
    prerequisites: z.array(z.string()).optional()
  })
});

export const rateMaterialSchema = z.object({
  body: z.object({
    rating: z.number().min(1).max(5, 'Rating must be between 1 and 5'),
    comment: z.string().max(500).optional()
  })
});

export const shareMaterialSchema = z.object({
  body: z.object({
    students: z.array(z.string()).optional(),
    groups: z.array(z.string()).optional(),
    visibility: z.enum(['private', 'students', 'public']).optional()
  })
});
