import mongoose from 'mongoose';

const progressTrackingSchema = new mongoose.Schema({
  // Relaciones
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  trackedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  appointmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment'
  },
  subject: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  
  // Datos de progreso cuantitativos
  metrics: {
    assignmentGrades: {
      type: Number,
      min: 0,
      max: 100
    },
    examScores: {
      type: Number,
      min: 0,
      max: 100
    },
    participation: {
      type: Number,
      min: 0,
      max: 100
    },
    understandingLevel: {
      type: Number,
      min: 1,
      max: 5
    },
    completionRate: {
      type: Number,
      min: 0,
      max: 100
    },
    attendance: {
      type: Number,
      min: 0,
      max: 100
    },
    homeworkCompletion: {
      type: Number,
      min: 0,
      max: 100
    },
    quizScores: [{
      quizName: String,
      score: Number,
      maxScore: Number,
      date: Date
    }]
  },
  
  // Evaluación cualitativa
  observations: {
    type: String,
    trim: true,
    maxlength: 2000
  },
  strengths: [{
    type: String,
    trim: true
  }],
  areasForImprovement: [{
    type: String,
    trim: true
  }],
  learningStyle: {
    type: String,
    enum: ['visual', 'auditory', 'kinesthetic', 'reading_writing', 'mixed'],
    default: 'mixed'
  },
  
  // Recomendaciones y plan de acción
  recommendations: [{
    type: String,
    trim: true,
    maxlength: 500
  }],
  actionPlan: {
    studySchedule: String,
    resources: [String],
    practiceExercises: [String],
    goalsTimeline: String
  },
  
  // Objetivos y metas
  goals: {
    shortTerm: {
      description: String,
      deadline: Date,
      status: {
        type: String,
        enum: ['not_started', 'in_progress', 'completed', 'behind_schedule'],
        default: 'not_started'
      }
    },
    longTerm: {
      description: String,
      deadline: Date,
      status: {
        type: String,
        enum: ['not_started', 'in_progress', 'completed', 'behind_schedule'],
        default: 'not_started'
      }
    },
    customGoals: [{
      description: String,
      deadline: Date,
      priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        default: 'medium'
      },
      status: {
        type: String,
        enum: ['not_started', 'in_progress', 'completed', 'behind_schedule'],
        default: 'not_started'
      },
      progress: {
        type: Number,
        min: 0,
        max: 100,
        default: 0
      }
    }]
  },
  
  // Nivel de competencia
  competencyLevel: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced', 'expert'],
    default: 'beginner'
  },
  confidenceLevel: {
    type: Number,
    min: 1,
    max: 5,
    default: 3
  },
  skillAreas: [{
    area: String,
    level: {
      type: String,
      enum: ['novice', 'competent', 'proficient', 'expert'],
      default: 'novice'
    },
    notes: String
  }],
  
  // Progreso histórico
  progressHistory: [{
    date: {
      type: Date,
      default: Date.now
    },
    metricsSnapshot: {
      assignmentGrades: Number,
      examScores: Number,
      participation: Number,
      understandingLevel: Number
    },
    notes: String,
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  
  // Indicadores de progreso
  improvementAreas: [{
    area: String,
    currentLevel: Number,
    targetLevel: Number,
    progress: Number,
    strategies: [String]
  }],
  
  // Metadatos
  trackingPeriod: {
    startDate: {
      type: Date,
      required: true
    },
    endDate: {
      type: Date,
      required: true
    }
  },
  isBaseline: {
    type: Boolean,
    default: false
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
progressTrackingSchema.index({ studentId: 1, subject: 1 });
progressTrackingSchema.index({ trackedBy: 1, createdAt: -1 });
progressTrackingSchema.index({ subject: 1, competencyLevel: 1 });

// Middleware para validaciones
progressTrackingSchema.pre('save', function(next) {
  // Validar que la fecha de fin sea después de la fecha de inicio
  if (this.trackingPeriod.endDate <= this.trackingPeriod.startDate) {
    return next(new Error('End date must be after start date'));
  }
  
  // Calcular promedio automático si hay métricas
  if (this.metrics.assignmentGrades || this.metrics.examScores || this.metrics.participation) {
    const metrics = [];
    if (this.metrics.assignmentGrades) metrics.push(this.metrics.assignmentGrades);
    if (this.metrics.examScores) metrics.push(this.metrics.examScores);
    if (this.metrics.participation) metrics.push(this.metrics.participation);
    
    if (metrics.length > 0) {
      const average = metrics.reduce((sum, metric) => sum + metric, 0) / metrics.length;
      this.metrics.understandingLevel = Math.round(average / 20); // Convertir a escala 1-5
    }
  }
  
  next();
});

// Método para agregar entrada al historial
progressTrackingSchema.methods.addProgressHistory = function(metricsSnapshot, notes, recordedBy) {
  this.progressHistory.push({
    date: new Date(),
    metricsSnapshot,
    notes,
    recordedBy
  });
  return this.save();
};

// Método para actualizar nivel de competencia basado en métricas
progressTrackingSchema.methods.updateCompetencyLevel = function() {
  const avgScore = (this.metrics.assignmentGrades + this.metrics.examScores) / 2;
  
  if (avgScore >= 90) {
    this.competencyLevel = 'expert';
  } else if (avgScore >= 75) {
    this.competencyLevel = 'advanced';
  } else if (avgScore >= 60) {
    this.competencyLevel = 'intermediate';
  } else {
    this.competencyLevel = 'beginner';
  }
  
  return this.save();
};

// Método para calcular progreso general
progressTrackingSchema.methods.calculateOverallProgress = function() {
  const metrics = [
    this.metrics.assignmentGrades || 0,
    this.metrics.examScores || 0,
    this.metrics.participation || 0,
    this.metrics.completionRate || 0
  ];
  
  const validMetrics = metrics.filter(metric => metric > 0);
  return validMetrics.length > 0 
    ? validMetrics.reduce((sum, metric) => sum + metric, 0) / validMetrics.length 
    : 0;
};

// Método estático para obtener progreso de un estudiante en una materia
progressTrackingSchema.statics.getStudentProgress = function(studentId, subject) {
  return this.findOne({
    studentId,
    subject
  }).sort({ createdAt: -1 });
};

export default mongoose.model('ProgressTracking', progressTrackingSchema);