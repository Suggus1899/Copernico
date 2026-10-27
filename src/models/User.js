import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { isStrongPassword, PASSWORD_POLICY_MESSAGE } from '../utils/passwordPolicy.js';

const SALT_ROUNDS = 10;

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  password: { 
    type: String, 
    required: true, 
    select: false,
    validate: {
      validator: function(v) {
        // Solo se valida el texto plano asignado; el hash generado en pre-save no pasa por aquí.
        return !this.isModified('password') || isStrongPassword(v);
      },
      message: PASSWORD_POLICY_MESSAGE
    }
  },
  role: { type: String, enum: ['student','tutor','admin'], default: 'student', index: true },
  status: { type: String, enum: ['active','inactive','suspended','deleted'], default: 'active', index: true },
  personalInfo: {
    firstName: String,
    lastName: String,
    username: String,
    email: String, // copia del email si se quiere mostrar en perfil
    address: String,
    city: String,
    country: String,
    province: String,
    postalCode: String,
    avatar: String,
    phone: String,
    bio: String,
    specialty: String,
    degrees: String,
    experience: String,
    certifications: String
  },
  academicProfile: { institution: String, department: String, title: String, experienceYears: Number, skills: [String] },
  tutorProfile: { specialties: [String], teachingMethods: [String], maxStudents: Number, available: Boolean, hourlyRate: Number, rating: Number, totalSessions: Number, appointmentDuration: Number, specializationAreas: [String], scheduleVersion: { type: Number, default: 0 } },
  studentProfile: { studentId: String, career: String, semester: Number, averageGrade: Number, enrolledCourses: [String] },
  communicationSettings: { allowNotifications: { type: Boolean, default: true }, emailNotifications: { type: Boolean, default: true }, notificationPreferences: [String] },
  emailVerified: { type: Boolean, default: false },
  lastLogin: Date,
  loginAttempts: { type: Number, default: 0 },
  lockedUntil: Date,
  // Se incrementa al cambiar contraseña o email y al desactivar: invalida sesiones anteriores.
  sessionVersion: { type: Number, default: 0 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  deletedAt: Date
}, { timestamps: true });

// Normaliza el email y hashea la contraseña cuando cambia.
UserSchema.pre('save', async function () {
  if (this.isModified('email') && this.email) {
    this.email = this.email.trim().toLowerCase();
  }
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, SALT_ROUNDS);
  }
});

UserSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

// Campos internos: nunca se devuelven al cliente.
const INTERNAL_FIELDS = ['password', 'loginAttempts', 'lockedUntil', 'sessionVersion', '__v'];
UserSchema.set('toJSON', {
  transform: (_doc, ret) => {
    for (const field of INTERNAL_FIELDS) delete ret[field];
    return ret;
  },
});

export default mongoose.model('User', UserSchema);