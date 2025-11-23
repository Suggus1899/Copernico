import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  // Destinatario
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Contenido
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  message: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },
  type: {
    type: String,
    enum: [
      'appointment_reminder',
      'assignment_due',
      'new_material',
      'grade_posted',
      'progress_update',
      'system_alert',
      'message_received',
      'appointment_confirmed',
      'appointment_cancelled',
      'extension_approved',
      'report_ready',
      'welcome',
      'announcement',
      'custom'
    ],
    required: true,
    index: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium',
    index: true
  },
  
  // Acción y contexto
  actionUrl: {
    type: String,
    trim: true
  },
  actionLabel: {
    type: String,
    trim: true,
    maxlength: 50
  },
  relatedAppointment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment'
  },
  relatedAssignment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Assignment'
  },
  relatedMaterial: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EducationalMaterial'
  },
  relatedReport: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Report'
  },
  relatedUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Comunicación bidireccional
  allowResponse: {
    type: Boolean,
    default: false
  },
  responseOptions: [{
    type: String,
    trim: true
  }],
  userResponse: {
    type: String,
    trim: true
  },
  respondedAt: Date,
  responseData: mongoose.Schema.Types.Mixed,
  
  // Estado de entrega
  read: {
    type: Boolean,
    default: false,
    index: true
  },
  sent: {
    type: Boolean,
    default: false,
    index: true
  },
  delivered: {
    type: Boolean,
    default: false
  },
  deliveryMethod: [{
    type: String,
    enum: ['in_app', 'email', 'push', 'sms'],
    default: 'in_app'
  }],
  deliveryLog: [{
    method: String,
    sentAt: Date,
    status: {
      type: String,
      enum: ['sent', 'delivered', 'failed', 'opened']
    },
    error: String
  }],
  
  // Programación
  scheduledFor: {
    type: Date,
    index: true
  },
  expiresAt: {
    type: Date,
    index: true
  },
  sentAt: Date,
  
  // Personalización
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  templateId: {
    type: String,
    trim: true
  },
  variables: {
    type: Map,
    of: String
  },
  
  // Agrupación
  category: {
    type: String,
    enum: [
      'academic',
      'appointment', 
      'assignment',
      'system',
      'communication',
      'marketing'
    ],
    default: 'system'
  },
  groupKey: {
    type: String,
    trim: true
  },
  batchId: {
    type: String,
    trim: true
  },
  
  // Configuración de recordatorio
  isReminder: {
    type: Boolean,
    default: false
  },
  reminderFor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Notification'
  },
  reminderCount: {
    type: Number,
    default: 0
  },
  maxReminders: {
    type: Number,
    default: 3
  },
  
  // Interacción del usuario
  interactionLog: [{
    action: {
      type: String,
      enum: ['viewed', 'clicked', 'dismissed', 'archived', 'responded']
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    details: mongoose.Schema.Types.Mixed
  }],
  
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
notificationSchema.index({ userId: 1, read: 1 });
notificationSchema.index({ userId: 1, type: 1 });
notificationSchema.index({ userId: 1, scheduledFor: 1 });
notificationSchema.index({ type: 1, priority: 1 });
notificationSchema.index({ scheduledFor: 1, sent: 1 });

// Middleware para validaciones
notificationSchema.pre('save', function(next) {
  // Establecer fecha de expiración por defecto (30 días)
  if (!this.expiresAt) {
    this.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  }
  
  // Validar opciones de respuesta
  if (this.allowResponse && (!this.responseOptions || this.responseOptions.length === 0)) {
    return next(new Error('Response options are required when allowResponse is true'));
  }
  
  // Validar programación
  if (this.scheduledFor && this.scheduledFor < new Date()) {
    return next(new Error('Scheduled time must be in the future'));
  }
  
  next();
});

// Método para marcar como leída
notificationSchema.methods.markAsRead = function() {
  this.read = true;
  this.interactionLog.push({
    action: 'viewed',
    timestamp: new Date()
  });
  return this.save();
};

// Método para registrar clic
notificationSchema.methods.recordClick = function() {
  this.interactionLog.push({
    action: 'clicked',
    timestamp: new Date()
  });
  return this.save();
};

// Método para enviar respuesta
notificationSchema.methods.recordResponse = function(response, data = null) {
  this.userResponse = response;
  this.respondedAt = new Date();
  this.responseData = data;
  this.interactionLog.push({
    action: 'responded',
    timestamp: new Date(),
    details: { response, data }
  });
  return this.save();
};

// Método para registrar entrega
notificationSchema.methods.recordDelivery = function(method, status = 'sent', error = null) {
  this.deliveryLog.push({
    method,
    sentAt: new Date(),
    status,
    error
  });
  
  if (status === 'sent') {
    this.sent = true;
    this.sentAt = new Date();
  }
  
  if (status === 'delivered') {
    this.delivered = true;
  }
  
  return this.save();
};

// Método para crear recordatorio
notificationSchema.methods.createReminder = function() {
  if (this.reminderCount >= this.maxReminders) {
    return null;
  }
  
  const reminder = new this.constructor({
    ...this.toObject(),
    _id: undefined,
    isReminder: true,
    reminderFor: this._id,
    reminderCount: this.remarkCount + 1,
    scheduledFor: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 horas después
    read: false,
    sent: false,
    delivered: false,
    userResponse: null,
    respondedAt: null,
    interactionLog: [],
    deliveryLog: []
  });
  
  return reminder;
};

// Método estático para obtener notificaciones pendientes
notificationSchema.statics.getPendingNotifications = function() {
  return this.find({
    sent: false,
    $or: [
      { scheduledFor: { $exists: false } },
      { scheduledFor: { $lte: new Date() } }
    ]
  });
};

// Método estático para limpiar notificaciones expiradas
notificationSchema.statics.cleanupExpired = function() {
  return this.deleteMany({
    expiresAt: { $lt: new Date() }
  });
};

export default mongoose.model('Notification', notificationSchema);