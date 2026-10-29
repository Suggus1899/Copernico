export type UserRole = 'student' | 'tutor' | 'advisor' | 'admin';
export interface PersonalInfo {
  firstName?: string; lastName?: string; username?: string; email?: string;
  phone?: string; address?: string; city?: string; province?: string;
  country?: string; postalCode?: string; avatar?: string | null;
  bio?: string; specialty?: string; degrees?: string; experience?: string; certifications?: string;
}
export interface UserSummary {
  _id: string;
  personalInfo?: PersonalInfo;
  email?: string;
  role?: UserRole;
  studentProfile?: { studentId?: string; career?: string; semester?: number; averageGrade?: number; enrolledCourses?: string[] };
}
export interface User extends UserSummary {
  email: string;
  role: UserRole;
  status: 'active' | 'inactive' | 'suspended' | 'deleted';
  createdAt: string;
  updatedAt: string;
  lastLogin?: string | null;
  academicProfile?: { institution?: string; department?: string; title?: string; experienceYears?: number; skills?: string[] };
  tutorProfile?: { specialties?: string[]; teachingMethods?: string[]; maxStudents?: number; available?: boolean; hourlyRate?: number; rating?: number; totalSessions?: number; appointmentDuration?: number; specializationAreas?: string[] };
  communicationSettings?: { allowNotifications: boolean; emailNotifications: boolean; notificationPreferences: string[] };
}
export interface SignupRequest {
  email: string; password: string; role: 'student' | 'tutor';
  personalInfo: { firstName: string; lastName: string };
  studentProfile?: { studentId: string };
  tutorProfile?: { specialties: string[] };
}

export type TutorDirectoryEntry = Pick<User, '_id' | 'email' | 'role' | 'createdAt' | 'updatedAt' | 'personalInfo' | 'academicProfile' | 'tutorProfile'>;
