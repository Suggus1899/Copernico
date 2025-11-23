import { z } from 'zod';

export const createAssignmentSchema = z.object({
  body: z.object({
    materialId: z.string().min(1, 'Material ID is required'),
    studentId: z.string().min(1, 'Student ID is required'),
    title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
    instructions: z.string().max(2000, 'Instructions too long').optional(),
    dueDate: z.string().datetime('Invalid date format'),
    maxPoints: z.number().min(0, 'Max points must be positive'),
    appointmentId: z.string().optional(),
    estimatedTime: z.number().min(0).optional(),
    difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
    tags: z.array(z.string()).default([])
  }).refine((data) => {
    // Validar que la fecha de entrega sea en el futuro
    const dueDate = new Date(data.dueDate);
    return dueDate > new Date();
  }, {
    message: "Due date must be in the future",
    path: ["dueDate"]
  })
});

export const updateAssignmentSchema = z.object({
  body: z.object({
    title: z.string().min(1).max(200).optional(),
    instructions: z.string().max(2000).optional(),
    dueDate: z.string().datetime().optional(),
    maxPoints: z.number().min(0).optional(),
    estimatedTime: z.number().min(0).optional(),
    difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
    tags: z.array(z.string()).optional(),
    status: z.enum(['assigned', 'submitted', 'graded', 'late', 'missing', 'returned', 'resubmitted']).optional()
  })
});

export const submitAssignmentSchema = z.object({
  body: z.object({
    fileUrl: z.string().url().optional().or(z.literal('')),
    textSubmission: z.string().max(5000).optional(),
    externalLink: z.string().url().optional().or(z.literal('')),
    comments: z.string().max(1000).optional(),
    files: z.array(z.object({
      filename: z.string(),
      fileUrl: z.string().url(),
      fileSize: z.number().min(0)
    })).optional()
  }).refine((data) => {
    // Validar que tenga al menos un tipo de entrega
    return !!(data.fileUrl || data.textSubmission || data.externalLink || (data.files && data.files.length > 0));
  }, {
    message: "Must provide at least one submission type (file, text, link, or files)",
    path: ["fileUrl"]
  })
});

export const gradeAssignmentSchema = z.object({
  body: z.object({
    grade: z.number().min(0, 'Grade must be positive'),
    feedback: z.string().max(2000).optional(),
    detailedFeedback: z.object({
      clarity: z.number().min(0).max(10).optional(),
      accuracy: z.number().min(0).max(10).optional(),
      completeness: z.number().min(0).max(10).optional(),
      creativity: z.number().min(0).max(10).optional(),
      comments: z.string().optional()
    }).optional(),
    rubrics: z.array(z.object({
      criterion: z.string(),
      maxScore: z.number().min(0),
      score: z.number().min(0),
      comments: z.string().optional()
    })).optional()
  })
});

export const addCommentSchema = z.object({
  body: z.object({
    comment: z.string().min(1, 'Comment is required').max(1000, 'Comment too long'),
    isPrivate: z.boolean().default(false),
    attachments: z.array(z.object({
      filename: z.string(),
      fileUrl: z.string().url(),
      fileSize: z.number().min(0)
    })).optional()
  })
});

export const requestExtensionSchema = z.object({
  body: z.object({
    reason: z.string().min(1, 'Reason is required').max(500, 'Reason too long'),
    newDueDate: z.string().datetime('Invalid date format')
  }).refine((data) => {
    // Validar que la nueva fecha sea en el futuro
    const newDueDate = new Date(data.newDueDate);
    return newDueDate > new Date();
  }, {
    message: "New due date must be in the future",
    path: ["newDueDate"]
  })
});