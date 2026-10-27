import { z } from 'zod';

export const updateEducationalMaterialSchema = z.object({
  body: z.object({
    title: z.string().min(1).max(200).optional(),
    description: z.string().max(1000).optional(),
    subject: z.string().optional(),
    topic: z.string().optional(),
    difficulty: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
    tags: z.array(z.string()).optional(),
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

export const changeMaterialStatusSchema = z.object({
  body: z.object({
    status: z.enum(['draft', 'published', 'archived', 'under_review'])
  })
});

export const shareMaterialSchema = z.object({
  body: z.object({
    students: z.array(z.string()).optional(),
    groups: z.array(z.string()).optional(),
    visibility: z.enum(['private', 'students', 'public']).optional()
  })
});
