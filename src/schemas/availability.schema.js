import { z } from 'zod';

export const createAvailabilitySchema = z.object({
  body: z.object({
    userId: z.string().min(1, 'User ID is required'),
    userRole: z.enum(['tutor', 'advisor']),
    scheduleType: z.enum(['recurring', 'specific_dates']),
    dayOfWeek: z.enum(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']).optional(),
    startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)'),
    endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)'),
    specificDate: z.string().datetime().optional(),
    recurrenceEndDate: z.string().datetime().optional(),
    sessionType: z.enum(['individual', 'group']).default('individual'),
    maxParticipants: z.number().min(1).default(1),
    duration: z.number().min(15).max(240),
    location: z.enum(['presencial', 'virtual']).default('virtual'),
    subject: z.string().min(1, 'Subject is required'),
    topic: z.string().optional()
  }).refine((data) => {
    if (data.scheduleType === 'recurring' && !data.dayOfWeek) {
      return false;
    }
    if (data.scheduleType === 'specific_dates' && !data.specificDate) {
      return false;
    }
    return true;
  }, {
    message: "dayOfWeek is required for recurring slots and specificDate for specific dates slots",
    path: ["scheduleType"]
  }).refine((data) => {
    // Validar que endTime > startTime
    const start = parseInt(data.startTime.replace(':', ''));
    const end = parseInt(data.endTime.replace(':', ''));
    return end > start;
  }, {
    message: "endTime must be greater than startTime",
    path: ["endTime"]
  })
});

export const updateAvailabilitySchema = z.object({
  body: z.object({
    scheduleType: z.enum(['recurring', 'specific_dates']).optional(),
    dayOfWeek: z.enum(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']).optional(),
    startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format').optional(),
    endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format').optional(),
    specificDate: z.string().datetime().optional(),
    recurrenceEndDate: z.string().datetime().optional(),
    sessionType: z.enum(['individual', 'group']).optional(),
    maxParticipants: z.number().min(1).optional(),
    duration: z.number().min(15).max(240).optional(),
    location: z.enum(['presencial', 'virtual']).optional(),
    subject: z.string().optional(),
    topic: z.string().optional(),
    status: z.enum(['available', 'booked', 'cancelled', 'completed']).optional()
  })
});