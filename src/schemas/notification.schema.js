import { z } from 'zod';

export const createNotificationSchema = z.object({
  body: z.object({
    userId: z.string().min(1, 'User ID is required'),
    title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
    message: z.string().min(1, 'Message is required').max(1000, 'Message too long'),
    type: z.enum([
      'appointment_reminder',
      'assignment_due',
      'new_material',
      'grade_posted',
      'progress_update',
      'system_alert',
      'message_received',
      'appointment_confirmed',
      'appointment_cancelled',
      'extension_approved',
      'report_ready',
      'welcome',
      'announcement',
      'custom'
    ]),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
    actionUrl: z.string().url().optional().or(z.literal('')),
    actionLabel: z.string().max(50).optional(),
    relatedAppointment: z.string().optional(),
    relatedAssignment: z.string().optional(),
    relatedMaterial: z.string().optional(),
    relatedReport: z.string().optional(),
    relatedUser: z.string().optional(),
    allowResponse: z.boolean().default(false),
    responseOptions: z.array(z.string()).default([]),
    deliveryMethod: z.array(z.enum(['in_app', 'email', 'push', 'sms'])).default(['in_app']),
    scheduledFor: z.string().datetime().optional(),
    expiresAt: z.string().datetime().optional(),
    metadata: z.any().optional(),
    templateId: z.string().optional(),
    variables: z.record(z.string()).optional(),
    category: z.enum([
      'academic',
      'appointment', 
      'assignment',
      'system',
      'communication',
      'marketing'
    ]).default('system'),
    groupKey: z.string().optional(),
    batchId: z.string().optional()
  }).refine((data) => {
    if (data.allowResponse && data.responseOptions.length === 0) {
      return false;
    }
    return true;
  }, {
    message: "Response options are required when allowResponse is true",
    path: ["responseOptions"]
  }).refine((data) => {
    if (data.scheduledFor) {
      const scheduled = new Date(data.scheduledFor);
      return scheduled > new Date();
    }
    return true;
  }, {
    message: "Scheduled time must be in the future",
    path: ["scheduledFor"]
  })
});

export const updateNotificationSchema = z.object({
  body: z.object({
    read: z.boolean().optional(),
    userResponse: z.string().optional(),
    deliveryMethod: z.array(z.enum(['in_app', 'email', 'push', 'sms'])).optional()
  })
});

export const bulkUpdateNotificationsSchema = z.object({
  body: z.object({
    notificationIds: z.array(z.string()).min(1, 'At least one notification ID is required'),
    read: z.boolean().optional(),
    archived: z.boolean().optional()
  })
});

export const createBulkNotificationsSchema = z.object({
  body: z.object({
    users: z.array(z.string()).min(1, 'At least one user ID is required'),
    title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
    message: z.string().min(1, 'Message is required').max(1000, 'Message too long'),
    type: z.enum([
      'appointment_reminder',
      'assignment_due',
      'new_material',
      'grade_posted',
      'progress_update',
      'system_alert',
      'announcement',
      'custom'
    ]),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
    category: z.enum([
      'academic',
      'appointment', 
      'assignment',
      'system',
      'communication',
      'marketing'
    ]).default('system'),
    deliveryMethod: z.array(z.enum(['in_app', 'email', 'push', 'sms'])).default(['in_app']),
    batchId: z.string().optional()
  })
});

export const responseToNotificationSchema = z.object({
  body: z.object({
    response: z.string().min(1, 'Response is required'),
    data: z.any().optional()
  })
});
