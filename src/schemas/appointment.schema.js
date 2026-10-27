import { z } from 'zod';
import { APPOINTMENT_STATUSES } from '../models/Appointment.js';

import { objectId } from './common.js';

/** Fecha ISO 8601 con zona horaria; se devuelve como Date (UTC internamente). */
const isoDate = z
  .string()
  .datetime({ offset: true, message: 'Fecha inválida (ISO 8601 con zona horaria)' })
  .transform((value) => new Date(value));

const meetingLinkField = z.string().trim().url().max(500);
const reasonField = z.string().trim().max(500).optional();

export const createAppointmentSchema = z.object({
  body: z.object({
    tutorId: objectId,
    courseId: objectId,
    startsAt: isoDate.refine((date) => date.getTime() > Date.now(), {
      message: 'La cita debe ser en el futuro',
    }),
    durationMinutes: z.coerce.number().int().min(15).max(240).optional(),
    location: z.enum(['presencial', 'virtual']).default('virtual'),
    topic: z.string().trim().max(500).optional(),
  }),
});

export const listAppointmentsSchema = z.object({
  query: z.object({
    status: z.enum(APPOINTMENT_STATUSES).optional(),
    from: isoDate.optional(),
    to: isoDate.optional(),
    limit: z.coerce.number().int().min(1).max(100).default(50),
  }),
});

export const confirmAppointmentSchema = z.object({
  body: z.object({ meetingLink: meetingLinkField.optional() }).default({}),
});

export const closeAppointmentSchema = z.object({
  body: z.object({ reason: reasonField }).default({}),
});

export const addInternalNoteSchema = z.object({
  body: z.object({ note: z.string().trim().min(1).max(1000) }),
});

export const rateAppointmentSchema = z.object({
  body: z.object({
    rating: z.coerce.number().int().min(1).max(5),
    feedback: z.string().trim().max(500).optional(),
  }),
});
