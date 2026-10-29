import mongoose from 'mongoose';

/** Estados de una cita. `pending` y `confirmed` ocupan el horario del tutor. */
export const APPOINTMENT_STATUSES = ['pending', 'confirmed', 'rejected', 'cancelled', 'completed'];
export const ACTIVE_APPOINTMENT_STATUSES = ['pending', 'confirmed'];
// La mensajería entre estudiante y tutor solo se habilita con una cita confirmada o completada.
export const MESSAGING_APPOINTMENT_STATUSES = ['confirmed', 'completed'];

export const computeEndsAt = (startsAt: Date, durationMinutes: number) =>
  new Date(startsAt.getTime() + durationMinutes * 60 * 1000);

const appointmentSchema = new mongoose.Schema({
  // Participantes
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  tutorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  topic: { type: String, trim: true, maxlength: 500 },

  // Horario en UTC. endsAt se deriva de startsAt + durationMinutes.
  startsAt: { type: Date, required: true },
  endsAt: { type: Date, required: true },
  durationMinutes: { type: Number, required: true, min: 15, max: 240 },

  location: { type: String, enum: ['presencial', 'virtual'], default: 'virtual' },
  meetingLink: { type: String, trim: true, maxlength: 500 },

  status: { type: String, enum: APPOINTMENT_STATUSES, default: 'pending', required: true },
  // Quién cerró la cita sin completarla (rechazo o cancelación) y el motivo opcional.
  cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  cancellationReason: { type: String, trim: true, maxlength: 500 },
  completedAt: Date,

  // Notas internas: visibles solo para el tutor de la cita y administradores.
  internalNotes: [{
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    note: { type: String, required: true, trim: true, maxlength: 1000 },
    createdAt: { type: Date, default: Date.now }
  }],

  // Calificaciones: cada parte califica una vez y solo con la cita completada.
  studentRating: { type: Number, min: 1, max: 5 },
  studentFeedback: { type: String, trim: true, maxlength: 500 },
  tutorRating: { type: Number, min: 1, max: 5 },
  tutorFeedback: { type: String, trim: true, maxlength: 500 }
}, { timestamps: true });

appointmentSchema.index({ tutorId: 1, status: 1, startsAt: 1 });
appointmentSchema.index({ studentId: 1, startsAt: 1 });

appointmentSchema.pre('validate', function setEndsAt(next) {
  if (this.startsAt && this.durationMinutes) {
    this.endsAt = computeEndsAt(this.startsAt, this.durationMinutes);
  }
  next();
});


export type AppointmentRecord = mongoose.InferSchemaType<typeof appointmentSchema>;
export type AppointmentDocument = mongoose.HydratedDocument<AppointmentRecord, AppointmentMethods>;
export interface AppointmentMethods {
}
export default mongoose.model<AppointmentRecord, mongoose.Model<AppointmentRecord, {}, AppointmentMethods>>('Appointment', appointmentSchema);
