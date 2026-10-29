import { Types } from 'mongoose';
import type { AuthenticatedUser } from '../types/auth.js';
import Appointment, { MESSAGING_APPOINTMENT_STATUSES } from '../models/Appointment.js';
import Course from '../models/Course.js';
import { AppError } from './AppError.js';

export async function assertStudentAccess(user: AuthenticatedUser, studentId: string) {
  if (!Types.ObjectId.isValid(studentId)) throw new AppError(400, 'INVALID_ID', 'Identificador de estudiante inválido');
  if (user.role === 'admin' || (user.role === 'student' && user.id === studentId)) return;
  if (user.role === 'tutor') {
    const [course, appointment] = await Promise.all([
      Course.exists({ instructor: user._id, 'enrolledStudents.student': studentId }),
      Appointment.exists({ tutorId: user._id, studentId, status: { $in: MESSAGING_APPOINTMENT_STATUSES } }),
    ]);
    if (course || appointment) return;
  }
  throw new AppError(403, 'FORBIDDEN', 'No tienes acceso al progreso de este estudiante');
}

export async function relatedStudentIds(tutorId: Types.ObjectId) {
  const [courses, appointments] = await Promise.all([
    Course.distinct('enrolledStudents.student', { instructor: tutorId }),
    Appointment.distinct('studentId', { tutorId, status: { $in: MESSAGING_APPOINTMENT_STATUSES } }),
  ]);
  return [...courses, ...appointments];
}
