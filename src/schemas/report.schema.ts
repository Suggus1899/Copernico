import { z } from 'zod';

export const createReportSchema = z.object({
  body: z.object({
    title: z.string().min(1, 'Title is required').max(200, 'Title too long').optional(),
    type: z.enum([
      'student_progress', 
      'tutor_performance', 
      'advisor_impact', 
      'system_usage',
      'academic_analytics',
      'attendance_summary',
      'assignment_completion',
      'financial_report',
      'custom_report'
    ]),
    description: z.string().max(1000).optional(),
    forUser: z.string().optional(),
    forRole: z.enum(['student', 'tutor', 'advisor', 'admin', 'all']).default('admin'),
    period: z.object({
      startDate: z.string().datetime('Invalid start date'),
      endDate: z.string().datetime('Invalid end date'),
      timeframe: z.enum(['daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'custom']).default('monthly')
    }),
    filters: z.object({
      subjects: z.array(z.string()).default([]),
      users: z.array(z.string()).default([]),
      dateRange: z.object({
        start: z.string().datetime().optional(),
        end: z.string().datetime().optional()
      }).optional(),
      status: z.array(z.string()).default([])
    }).optional(),
    visualization: z.object({
      type: z.enum(['table', 'chart', 'graph', 'summary', 'detailed']).default('summary'),
      charts: z.array(z.object({
        chartType: z.enum(['bar', 'line', 'pie', 'radar', 'scatter']),
        title: z.string(),
        data: z.any().optional(),
        options: z.any().optional()
      })).default([])
    }).optional(),
    isRecurring: z.boolean().default(false),
    recurrence: z.object({
      frequency: z.enum(['daily', 'weekly', 'monthly', 'quarterly', 'yearly']).optional(),
      endDate: z.string().datetime().optional()
    }).optional(),
    delivery: z.object({
      method: z.enum(['email', 'download', 'both', 'none']).default('download'),
      recipients: z.array(z.string()).default([])
    }).optional(),
    accessLevel: z.enum(['public', 'restricted', 'private', 'confidential']).default('restricted'),
    allowedUsers: z.array(z.string()).default([]),
    tags: z.array(z.string()).default([])
  }).refine((data) => {
    // Validar que la fecha de fin sea después de la fecha de inicio
    const startDate = new Date(data.period.startDate);
    const endDate = new Date(data.period.endDate);
    return endDate > startDate;
  }, {
    message: "End date must be after start date",
    path: ["period.endDate"]
  }).refine((data) => {
    // Validar recurrencia
    if (data.isRecurring && !data.recurrence?.frequency) {
      return false;
    }
    return true;
  }, {
    message: "Recurring reports must have a frequency",
    path: ["recurrence.frequency"]
  })
});

export const updateReportSchema = z.object({
  body: z.object({
    title: z.string().min(1).max(200).optional(),
    description: z.string().max(1000).optional(),
    status: z.enum(['pending', 'generating', 'generated', 'delivered', 'failed', 'archived']).optional(),
    visualization: z.object({
      type: z.enum(['table', 'chart', 'graph', 'summary', 'detailed']).optional(),
      charts: z.array(z.object({
        chartType: z.enum(['bar', 'line', 'pie', 'radar', 'scatter']),
        title: z.string(),
        data: z.any().optional(),
        options: z.any().optional()
      })).optional()
    }).optional(),
    recommendations: z.array(z.string().max(500)).optional(),
    conclusions: z.string().max(2000).optional(),
    insights: z.array(z.string().max(300)).optional(),
    delivery: z.object({
      method: z.enum(['email', 'download', 'both', 'none']).optional(),
      recipients: z.array(z.string()).optional(),
      deliveryStatus: z.enum(['pending', 'sent', 'failed', 'opened']).optional()
    }).optional(),
    accessLevel: z.enum(['public', 'restricted', 'private', 'confidential']).optional(),
    allowedUsers: z.array(z.string()).optional(),
    tags: z.array(z.string()).optional()
  })
});

export const generateReportSchema = z.object({
  body: z.object({
    forceRegenerate: z.boolean().default(false)
  })
});

export const deliverReportSchema = z.object({
  body: z.object({
    method: z.enum(['email', 'download', 'both']).default('download'),
    recipients: z.array(z.string()).optional(),
    message: z.string().max(1000).optional()
  })
});