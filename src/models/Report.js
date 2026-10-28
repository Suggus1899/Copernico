import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema({
  // Información del reporte
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  type: {
    type: String,
    enum: [
      'student_progress', 
      'tutor_performance', 
      'advisor_impact', 
      'system_usage',
      'academic_analytics',
      'attendance_summary',
      'assignment_completion',
      'financial_report',
      'custom_report'
    ],
    required: true,
    index: true
  },
  description: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  
  // Generación y destinatario
  generatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  forUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  forRole: {
    type: String,
    enum: ['student', 'tutor', 'advisor', 'admin', 'all'],
    default: 'admin'
  },
  
  // Período del reporte
  period: {
    startDate: {
      type: Date,
      required: true
    },
    endDate: {
      type: Date,
      required: true
    },
    timeframe: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'custom'],
      default: 'monthly'
    }
  },
  
  // Datos del reporte (estructura flexible según tipo)
  data: {
    // Para reporte de estudiante
    academicPerformance: {
      totalSessions: Number,
      completedAssignments: Number,
      averageGrade: Number,
      gradeImprovement: Number,
      attendanceRate: Number,
      subjects: [{
        name: String,
        grade: Number,
        progress: Number,
        assignmentsCompleted: Number
      }]
    },
    
    // Para reporte de actividad
    activitySummary: {
      subjectsCovered: [String],
      hoursOfTutoring: Number,
      materialsAccessed: Number,
      assignmentsSubmitted: Number,
      activeDays: Number
    },
    
    // Para reporte de desempeño de tutor
    tutorPerformance: {
      totalStudents: Number,
      averageRating: Number,
      sessionsCompleted: Number,
      studentSatisfaction: Number,
      subjectsTaught: [String],
      studentProgress: [{
        studentId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        },
        improvement: Number,
        completionRate: Number
      }]
    },
    
    // Para reporte de uso del sistema
    systemUsage: {
      totalUsers: Number,
      activeUsers: Number,
      newRegistrations: Number,
      sessionsCreated: Number,
      materialsUploaded: Number,
      assignmentsCreated: Number,
      peakUsageTimes: [{
        hour: Number,
        activity: Number
      }],
      popularSubjects: [{
        subject: String,
        usageCount: Number
      }]
    },
    
    // Datos personalizados
    customData: mongoose.Schema.Types.Mixed,
    
    // Métricas generales
    metrics: {
      totalRecords: Number,
      dataPoints: Number,
      calculationTime: Number,
      accuracy: Number
    }
  },
  
  // Filtros aplicados
  filters: {
    subjects: [String],
    users: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    dateRange: {
      start: Date,
      end: Date
    },
    status: [String],
    customFilters: mongoose.Schema.Types.Mixed
  },
  
  // Visualización y presentación
  visualization: {
    type: {
      type: String,
      enum: ['table', 'chart', 'graph', 'summary', 'detailed'],
      default: 'summary'
    },
    charts: [{
      chartType: {
        type: String,
        enum: ['bar', 'line', 'pie', 'radar', 'scatter']
      },
      title: String,
      data: mongoose.Schema.Types.Mixed,
      options: mongoose.Schema.Types.Mixed
    }],
    tables: [{
      title: String,
      headers: [String],
      rows: [[mongoose.Schema.Types.Mixed]]
    }]
  },
  
  // Recomendaciones y conclusiones
  recommendations: [{
    type: String,
    trim: true,
    maxlength: 500
  }],
  conclusions: {
    type: String,
    trim: true,
    maxlength: 2000
  },
  insights: [{
    type: String,
    trim: true,
    maxlength: 300
  }],
  
  // Archivo generado
  fileUrl: {
    type: String,
    trim: true
  },
  fileFormat: {
    type: String,
    enum: ['pdf', 'excel', 'csv', 'json', 'html'],
    default: 'pdf'
  },
  fileSize: Number,
  
  // Configuración de recurrencia
  isRecurring: {
    type: Boolean,
    default: false
  },
  recurrence: {
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly']
    },
    nextGeneration: Date,
    endDate: Date,
    lastGenerated: Date
  },
  
  // Estado del reporte
  status: {
    type: String,
    enum: ['pending', 'generating', 'generated', 'delivered', 'failed', 'archived'],
    default: 'pending',
    index: true
  },
  generationLog: [{
    timestamp: {
      type: Date,
      default: Date.now
    },
    action: String,
    details: String,
    duration: Number // ms
  }],
  
  // Configuración de entrega
  delivery: {
    method: {
      type: String,
      enum: ['email', 'download', 'both', 'none'],
      default: 'download'
    },
    recipients: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    sentAt: Date,
    deliveryStatus: {
      type: String,
      enum: ['pending', 'sent', 'failed', 'opened'],
      default: 'pending'
    }
  },
  
  // Seguridad y acceso
  accessLevel: {
    type: String,
    enum: ['public', 'restricted', 'private', 'confidential'],
    default: 'restricted'
  },
  allowedUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  
  // Metadatos
  version: {
    type: String,
    default: '1.0'
  },
  tags: [{
    type: String,
    trim: true
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
reportSchema.index({ type: 1, status: 1 });
reportSchema.index({ generatedBy: 1, createdAt: -1 });
reportSchema.index({ forUser: 1, type: 1 });
reportSchema.index({ 'period.startDate': 1, 'period.endDate': 1 });

// Middleware para validaciones
reportSchema.pre('save', function(next) {
  // Validar que la fecha de fin sea después de la fecha de inicio
  if (this.period.endDate <= this.period.startDate) {
    return next(new Error('End date must be after start date'));
  }
  
  // Validar recurrencia
  if (this.isRecurring && !this.recurrence.frequency) {
    return next(new Error('Recurring reports must have a frequency'));
  }
  
  // Generar título si no se proporciona
  if (!this.title) {
    const dateRange = `${this.period.startDate.toISOString().split('T')[0]} to ${this.period.endDate.toISOString().split('T')[0]}`;
    this.title = `${this.type.replace('_', ' ').toUpperCase()} Report - ${dateRange}`;
  }
  
  next();
});

// Método para agregar log de generación
reportSchema.methods.addGenerationLog = function(action, details, duration = 0) {
  this.generationLog.push({
    timestamp: new Date(),
    action,
    details,
    duration
  });
  return this.save();
};

// Método para marcar como generado
reportSchema.methods.markAsGenerated = function(fileUrl = null) {
  this.status = 'generated';
  if (fileUrl) this.fileUrl = fileUrl;
  this.generatedAt = new Date();
  return this.save();
};

// Método para programar próxima generación
reportSchema.methods.scheduleNextGeneration = function() {
  if (!this.isRecurring) return this;
  
  const now = new Date();
  let nextDate = new Date(this.recurrence.nextGeneration || now);
  
  switch (this.recurrence.frequency) {
    case 'daily':
      nextDate.setDate(nextDate.getDate() + 1);
      break;
    case 'weekly':
      nextDate.setDate(nextDate.getDate() + 7);
      break;
    case 'monthly':
      nextDate.setMonth(nextDate.getMonth() + 1);
      break;
    case 'quarterly':
      nextDate.setMonth(nextDate.getMonth() + 3);
      break;
    case 'yearly':
      nextDate.setFullYear(nextDate.getFullYear() + 1);
      break;
  }
  
  // Verificar fecha de fin de recurrencia
  if (this.recurrence.endDate && nextDate > this.recurrence.endDate) {
    this.isRecurring = false;
  } else {
    this.recurrence.nextGeneration = nextDate;
  }
  
  this.recurrence.lastGenerated = now;
  return this.save();
};

// Método estático para obtener reportes pendientes de generación
reportSchema.statics.getPendingReports = function() {
  return this.find({
    $or: [
      { status: 'pending' },
      { 
        isRecurring: true,
        'recurrence.nextGeneration': { $lte: new Date() }
      }
    ]
  });
};

// Método para generar datos del reporte (placeholder para lógica específica)
reportSchema.methods.generateReportData = async function() {
  // Esta función sería implementada con lógica específica para cada tipo de reporte
  // Por ahora es un placeholder
  this.addGenerationLog('data_generation', 'Starting data collection');
  
  // Simular tiempo de generación
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  this.addGenerationLog('data_generation', 'Data collection completed');
  return this;
};

export default mongoose.model('Report', reportSchema);