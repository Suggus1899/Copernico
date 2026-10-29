import type { UserSummary } from '../types/auth';

export function getAppointmentTutor(appointment: { tutorId: UserSummary | string | null }) {
  const tutor = typeof appointment.tutorId === 'string' ? null : appointment.tutorId;
  return {
    id: typeof appointment.tutorId === 'string' ? appointment.tutorId : tutor?._id,
    name: tutor?.personalInfo
      ? `${tutor.personalInfo.firstName || ''} ${tutor.personalInfo.lastName || ''}`.trim()
      : tutor?.email || 'Tutor',
    role: tutor?.role || 'tutor',
  };
}

export function getStudentStatus(student: { stats?: { lastAppointmentDate: string | null } }) {
  if (!student.stats?.lastAppointmentDate) return 'inactive';
  const days = (Date.now() - new Date(student.stats.lastAppointmentDate).getTime()) / 86400000;
  return days <= 30 ? 'active' : 'inactive';
}
