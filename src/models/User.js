import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  password: { type: String, required: true, select: false },
  role: { type: String, enum: ['student','tutor','advisor','admin'], default: 'student', index: true },
  status: { type: String, enum: ['active','inactive','suspended','deleted'], default: 'active', index: true },
  personalInfo: {
    firstName: String,
    lastName: String,
    avatar: String,
    phone: String,
    bio: String
  },
  academicProfile: { institution: String, department: String, title: String, experienceYears: Number, skills: [String] },
  tutorProfile: { specialties: [String], teachingMethods: [String], maxStudents: Number, available: Boolean, hourlyRate: Number, rating: Number, totalSessions: Number },
  advisorProfile: { specializationAreas: [String], appointmentDuration: Number, available: Boolean, rating: Number },
  studentProfile: { studentId: String, career: String, semester: Number, averageGrade: Number, enrolledCourses: [String] },
  communicationSettings: { allowNotifications: { type: Boolean, default: true }, emailNotifications: { type: Boolean, default: true }, notificationPreferences: [String] },
  emailVerified: { type: Boolean, default: false },
  verificationToken: String,
  verificationExpires: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  lastLogin: Date,
  loginAttempts: { type: Number, default: 0 },
  lockedUntil: Date,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  deletedAt: Date
}, { timestamps: true });

// Normalize email and hash password
UserSchema.pre('save', async function(next) {
  if (this.isModified('email') && this.email) {
    this.email = this.email.trim().toLowerCase();
  }
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(SALT_ROUNDS);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

UserSchema.methods.comparePassword = function(candidate) {
  return bcrypt.compare(candidate, this.password);
};

export default mongoose.model('User', UserSchema);