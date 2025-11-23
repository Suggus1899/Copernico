import mongoose from 'mongoose';

const appointmentSchema = new mongoose.Schema({
  // Participantes
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  professionalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  appointmentType: {
    type: String,
    enum: ['tutoring', 'advising'],
    required: true
  },
  
  // Información de la cita
  subject: {
    type: String,
    required: true,
    trim: true
  },
  topic: {
    type: String,
    trim: true
  },
  scheduledDate: {
    type: Date,
    required: true,
    index: true
  },
  duration: {
    type: Number, // minutos
    required: true,
    min: 15,
    max: 240
  },
  location: {
    type: String,
    enum: ['presencial', 'virtual'],
    default: 'virtual'
  },
  meetingLink: {
    type: String,
    trim: true
  },
  
  // Para sesiones grupales
  isGroupSession: {
    type: Boolean,
    default: false
  },
  groupParticipants: [{
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'cancelled'],
      default: 'pending'
    },
    joinedAt: Date
  }],
  maxGroupSize: {
    type: Number,
    default: 1,
    min: 1
  },
  
  // Estado y seguimiento
  status: {
    type: String,
    enum: ['scheduled', 'confirmed', 'in-progress', 'completed', 'cancelled', 'no-show'],
    default: 'scheduled',
    index: true
  },
  cancellationReason: {
    type: String,
    trim: true
  },
  cancelledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Comunicación interna
  internalNotes: [{
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    note: {
      type: String,
      required: true,
      trim: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Evaluación y feedback
  studentRating: {
    type: Number,
    min: 1,
    max: 5
  },
  studentFeedback: {
    type: String,
    trim: true
  },
  professionalRating: {
    type: Number,
    min: 1,
    max: 5
  },
  professionalNotes: {
    type: String,
    trim: true
  },
  
  // Referencia al slot de disponibilidad (opcional)
  availabilitySlotId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AvailabilitySlot'
  },
  
  // Auditoría
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  completedAt: Date
}, {
  timestamps: true
});

// Índices compuestos para optimización
appointmentSchema.index({ studentId: 1, status: 1 });
appointmentSchema.index({ professionalId: 1, status: 1 });
appointmentSchema.index({ scheduledDate: 1, status: 1 });
appointmentSchema.index({ appointmentType: 1, subject: 1 });

// Middleware para validaciones
appointmentSchema.pre('save', function(next) {
  // Si es sesión grupal, validar participantes
  if (this.isGroupSession && this.groupParticipants.length > this.maxGroupSize) {
    return next(new Error('Number of participants exceeds maximum group size'));
  }
  
  // Validar que la fecha programada sea en el futuro
  if (this.scheduledDate && this.scheduledDate <= new Date()) {
    return next(new Error('Scheduled date must be in the future'));
  }
  
  next();
});

// Método para agregar nota interna
appointmentSchema.methods.addInternalNote = function(authorId, note) {
  this.internalNotes.push({
    authorId,
    note,
    createdAt: new Date()
  });
  return this.save();
};

// Método para calificar la sesión
appointmentSchema.methods.rateSession = function(raterRole, rating, feedback = '') {
  if (raterRole === 'student') {
    this.studentRating = rating;
    this.studentFeedback = feedback;
  } else if (['tutor', 'advisor'].includes(raterRole)) {
    this.professionalRating = rating;
    this.professionalNotes = feedback;
  }
  return this.save();
};

export default mongoose.model('Appointment', appointmentSchema);