import { z } from 'zod';

export const createAppointmentSchema = z.object({
  body: z.object({
    // Campos originales
    studentId: z.string().optional(),
    professionalId: z.string().optional(),
    
    // Campos alternativos del frontend
    tutorId: z.string().optional(),
    
    appointmentType: z.enum(['tutoring', 'advising', 'advisory']).optional(),
    type: z.enum(['tutoring', 'advising', 'advisory']).optional(),
    
    subject: z.string().min(1, 'Subject is required'),
    topic: z.string().optional(),
    
    // Campos de fecha flexibles
    scheduledDate: z.string().optional(),
    date: z.string().optional(),
    time: z.string().optional(),
    
    duration: z.number().min(15).max(240).default(60),
    location: z.enum(['presencial', 'virtual']).default('virtual'),
    meetingLink: z.string().url().optional().or(z.literal('')),
    isGroupSession: z.boolean().default(false),
    maxGroupSize: z.number().min(1).default(1),
    availabilitySlotId: z.string().optional(),
    message: z.string().optional(),
    status: z.enum(['pending', 'scheduled', 'confirmed', 'in-progress', 'completed', 'cancelled', 'no-show']).optional()
  }).refine((data) => {
    // Debe tener al menos uno: professionalId o tutorId
    return data.professionalId || data.tutorId;
  }, {
    message: "Professional ID or Tutor ID is required",
    path: ["professionalId"]
  }).refine((data) => {
    // Si no hay scheduledDate, debe haber date
    if (!data.scheduledDate && !data.date) {
      return false;
    }
    return true;
  }, {
    message: "Date is required",
    path: ["date"]
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