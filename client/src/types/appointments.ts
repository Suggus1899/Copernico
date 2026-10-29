import type { UserSummary } from './auth';
export type AppointmentStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'rejected';
export interface CourseSummary { _id: string; title: string; category?: string; level?: string }
export interface Appointment {
  _id: string;
  studentId: UserSummary | null;
  tutorId: UserSummary | null;
  courseId: CourseSummary | null;
  startsAt: string; endsAt: string; durationMinutes: number;
  status: AppointmentStatus;
  appointmentType?: string; topic?: string; internalNotes?: string; cancellationReason?: string; rejectionReason?: string;
  createdAt: string; updatedAt: string;
}
