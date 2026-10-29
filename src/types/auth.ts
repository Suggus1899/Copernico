import type { UserRecord } from '../models/User.js';
import type { Types } from 'mongoose';
export type AuthenticatedUser = Pick<UserRecord, 'email' | 'role' | 'status' | 'emailVerified' | 'personalInfo' | 'academicProfile' | 'tutorProfile' | 'studentProfile'> & { id: string; _id: Types.ObjectId };
export type SessionPrincipal = Pick<UserRecord, 'role' | 'sessionVersion'> & { _id: unknown };
