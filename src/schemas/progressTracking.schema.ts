import { z } from 'zod';

export const createProgressTrackingSchema = z.object({
  body: z.object({
    studentId: z.string().min(1, 'Student ID is required'),
    trackedBy: z.string().min(1, 'Tracker ID is required'),
    appointmentId: z.string().optional(),
    subject: z.string().min(1, 'Subject is required'),
    metrics: z.object({
      assignmentGrades: z.number().min(0).max(100).optional(),
      examScores: z.number().min(0).max(100).optional(),
      participation: z.number().min(0).max(100).optional(),
      understandingLevel: z.number().min(1).max(5).optional(),
      completionRate: z.number().min(0).max(100).optional(),
      attendance: z.number().min(0).max(100).optional(),
      homeworkCompletion: z.number().min(0).max(100).optional()
    }).optional(),
    observations: z.string().max(2000).optional(),
    strengths: z.array(z.string()).default([]),
    areasForImprovement: z.array(z.string()).default([]),
    learningStyle: z.enum(['visual', 'auditory', 'kinesthetic', 'reading_writing', 'mixed']).default('mixed'),
    recommendations: z.array(z.string().max(500)).default([]),
    actionPlan: z.object({
      studySchedule: z.string().optional(),
      resources: z.array(z.string()).default([]),
      practiceExercises: z.array(z.string()).default([]),
      goalsTimeline: z.string().optional()
    }).optional(),
    goals: z.object({
      shortTerm: z.object({
        description: z.string(),
        deadline: z.string().datetime(),
        status: z.enum(['not_started', 'in_progress', 'completed', 'behind_schedule']).default('not_started')
      }).optional(),
      longTerm: z.object({
        description: z.string(),
        deadline: z.string().datetime(),
        status: z.enum(['not_started', 'in_progress', 'completed', 'behind_schedule']).default('not_started')
      }).optional(),
      customGoals: z.array(z.object({
        description: z.string(),
        deadline: z.string().datetime(),
        priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
        status: z.enum(['not_started', 'in_progress', 'completed', 'behind_schedule']).default('not_started'),
        progress: z.number().min(0).max(100).default(0)
      })).default([])
    }).optional(),
    competencyLevel: z.enum(['beginner', 'intermediate', 'advanced', 'expert']).default('beginner'),
    confidenceLevel: z.number().min(1).max(5).default(3),
    skillAreas: z.array(z.object({
      area: z.string(),
      level: z.enum(['novice', 'competent', 'proficient', 'expert']).default('novice'),
      notes: z.string().optional()
    })).default([]),
    trackingPeriod: z.object({
      startDate: z.string().datetime('Invalid start date'),
      endDate: z.string().datetime('Invalid end date')
    }),
    isBaseline: z.boolean().default(false)
  }).refine((data) => {
    // Validar que la fecha de fin sea después de la fecha de inicio
    const startDate = new Date(data.trackingPeriod.startDate);
    const endDate = new Date(data.trackingPeriod.endDate);
    return endDate > startDate;
  }, {
    message: "End date must be after start date",
    path: ["trackingPeriod.endDate"]
  })
});

export const updateProgressTrackingSchema = z.object({
  body: z.object({
    metrics: z.object({
      assignmentGrades: z.number().min(0).max(100).optional(),
      examScores: z.number().min(0).max(100).optional(),
      participation: z.number().min(0).max(100).optional(),
      understandingLevel: z.number().min(1).max(5).optional(),
      completionRate: z.number().min(0).max(100).optional(),
      attendance: z.number().min(0).max(100).optional(),
      homeworkCompletion: z.number().min(0).max(100).optional()
    }).optional(),
    observations: z.string().max(2000).optional(),
    strengths: z.array(z.string()).optional(),
    areasForImprovement: z.array(z.string()).optional(),
    learningStyle: z.enum(['visual', 'auditory', 'kinesthetic', 'reading_writing', 'mixed']).optional(),
    recommendations: z.array(z.string().max(500)).optional(),
    actionPlan: z.object({
      studySchedule: z.string().optional(),
      resources: z.array(z.string()).optional(),
      practiceExercises: z.array(z.string()).optional(),
      goalsTimeline: z.string().optional()
    }).optional(),
    goals: z.object({
      shortTerm: z.object({
        description: z.string().optional(),
        deadline: z.string().datetime().optional(),
        status: z.enum(['not_started', 'in_progress', 'completed', 'behind_schedule']).optional()
      }).optional(),
      longTerm: z.object({
        description: z.string().optional(),
        deadline: z.string().datetime().optional(),
        status: z.enum(['not_started', 'in_progress', 'completed', 'behind_schedule']).optional()
      }).optional(),
      customGoals: z.array(z.object({
        description: z.string(),
        deadline: z.string().datetime(),
        priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
        status: z.enum(['not_started', 'in_progress', 'completed', 'behind_schedule']).optional(),
        progress: z.number().min(0).max(100).optional()
      })).optional()
    }).optional(),
    competencyLevel: z.enum(['beginner', 'intermediate', 'advanced', 'expert']).optional(),
    confidenceLevel: z.number().min(1).max(5).optional()
  })
});

export const addProgressHistorySchema = z.object({
  body: z.object({
    metricsSnapshot: z.object({
      assignmentGrades: z.number().min(0).max(100).optional(),
      examScores: z.number().min(0).max(100).optional(),
      participation: z.number().min(0).max(100).optional(),
      understandingLevel: z.number().min(1).max(5).optional()
    }),
    notes: z.string().max(1000).optional()
  })
});

export const updateGoalStatusSchema = z.object({
  body: z.object({
    goalType: z.enum(['shortTerm', 'longTerm', 'custom']),
    customGoalIndex: z.number().min(0).optional(),
    status: z.enum(['not_started', 'in_progress', 'completed', 'behind_schedule']),
    progress: z.number().min(0).max(100).optional()
  })
});