import mongoose from 'mongoose';

const availabilitySlotSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  userRole: {
    type: String,
    enum: ['tutor', 'advisor'],
    required: true
  },
  
  // Configuración de disponibilidad
  scheduleType: {
    type: String,
    enum: ['recurring', 'specific_dates'],
    required: true
  },
  dayOfWeek: {
    type: String,
    enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  },
  startTime: {
    type: String, // Formato "HH:MM"
    required: true,
    match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
  },
  endTime: {
    type: String, // Formato "HH:MM"
    required: true,
    match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
  },
  
  // Para disponibilidad específica
  specificDate: Date,
  recurrenceEndDate: Date,
  
  // Configuración de sesiones
  sessionType: {
    type: String,
    enum: ['individual', 'group'],
    default: 'individual'
  },
  maxParticipants: {
    type: Number,
    default: 1,
    min: 1
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
  
  // Materia/especialidad
  subject: {
    type: String,
    required: true,
    trim: true
  },
  topic: {
    type: String,
    trim: true
  },
  
  // Estado
  status: {
    type: String,
    enum: ['available', 'booked', 'cancelled', 'completed'],
    default: 'available',
    index: true
  },
  
  // Auditoría
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Índices compuestos para optimización
availabilitySlotSchema.index({ userId: 1, status: 1 });
availabilitySlotSchema.index({ scheduleType: 1, specificDate: 1 });
availabilitySlotSchema.index({ userRole: 1, subject: 1, status: 1 });

// Validación: para recurring slots, dayOfWeek es requerido
availabilitySlotSchema.pre('save', function(next) {
  if (this.scheduleType === 'recurring' && !this.dayOfWeek) {
    return next(new Error('dayOfWeek is required for recurring slots'));
  }
  if (this.scheduleType === 'specific_dates' && !this.specificDate) {
    return next(new Error('specificDate is required for specific dates slots'));
  }
  next();
});

export default mongoose.model('AvailabilitySlot', availabilitySlotSchema);