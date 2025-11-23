import { z } from 'zod';

export const createAppointmentSchema = z.object({
  body: z.object({
    studentId: z.string().min(1, 'Student ID is required'),
    professionalId: z.string().min(1, 'Professional ID is required'),
    appointmentType: z.enum(['tutoring', 'advising']),
    subject: z.string().min(1, 'Subject is required'),
    topic: z.string().optional(),
    scheduledDate: z.string().datetime('Invalid date format'),
    duration: z.number().min(15).max(240),
    location: z.enum(['presencial', 'virtual']).default('virtual'),
    meetingLink: z.string().url().optional().or(z.literal('')),
    isGroupSession: z.boolean().default(false),
    maxGroupSize: z.number().min(1).default(1),
    availabilitySlotId: z.string().optional()
  }).refine((data) => {
    // Validar que la fecha sea en el futuro
    const scheduledDate = new Date(data.scheduledDate);
    return scheduledDate > new Date();
  }, {
    message: "Scheduled date must be in the future",
    path: ["scheduledDate"]
  })
});

export const updateAppointmentSchema = z.object({
  body: z.object({
    subject: z.string().optional(),
    topic: z.string().optional(),
    scheduledDate: z.string().datetime().optional(),
    duration: z.number().min(15).max(240).optional(),
    location: z.enum(['presencial', 'virtual']).optional(),
    meetingLink: z.string().url().optional().or(z.literal('')),
    status: z.enum(['scheduled', 'confirmed', 'in-progress', 'completed', 'cancelled', 'no-show']).optional(),
    cancellationReason: z.string().optional(),
    studentRating: z.number().min(1).max(5).optional(),
    studentFeedback: z.string().optional(),
    professionalRating: z.number().min(1).max(5).optional(),
    professionalNotes: z.string().optional()
  })
});

export const addInternalNoteSchema = z.object({
  body: z.object({
    note: z.string().min(1, 'Note is required').max(1000, 'Note too long')
  })
});

export const rateAppointmentSchema = z.object({
  body: z.object({
    rating: z.number().min(1).max(5, 'Rating must be between 1 and 5'),
    feedback: z.string().max(500).optional()
  })
});

export const addGroupParticipantSchema = z.object({
  body: z.object({
    studentId: z.string().min(1, 'Student ID is required')
  })
});