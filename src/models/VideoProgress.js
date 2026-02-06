import mongoose from 'mongoose';

const videoProgressSchema = new mongoose.Schema({
  // Relaciones
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  videoId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ClassVideo',
    required: true,
    index: true
  },
  
  // Progreso de visualización
  watchTime: {
    type: Number, // tiempo visto en segundos
    default: 0,
    min: 0
  },
  totalDuration: {
    type: Number, // duración total del video en segundos
    required: true,
    min: 0
  },
  progressPercentage: {
    type: Number, // porcentaje completado (0-100)
    default: 0,
    min: 0,
    max: 100
  },
  
  // Estado de visualización
  status: {
    type: String,
    enum: ['not_started', 'in_progress', 'completed', 'paused'],
    default: 'not_started'
  },
  isCompleted: {
    type: Boolean,
    default: false
  },
  completedAt: {
    type: Date
  },
  
  // Sesiones de visualización
  viewingSessions: [{
    startTime: {
      type: Date,
      default: Date.now
    },
    endTime: Date,
    watchedSeconds: {
      type: Number,
      default: 0
    },
    lastPosition: {
      type: Number, // posición en segundos donde se pausó
      default: 0
    }
  }],
  
  // Estadísticas
  totalSessions: {
    type: Number,
    default: 0
  },
  averageSessionDuration: {
    type: Number,
    default: 0
  },
  lastWatchedAt: {
    type: Date,
    default: Date.now
  },
  
  // Metadatos del video (para consultas rápidas)
  videoTitle: String,
  videoSubject: String,
  videoTopic: String,
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Índices compuestos para optimización
videoProgressSchema.index({ studentId: 1, videoId: 1 }, { unique: true });
videoProgressSchema.index({ studentId: 1, videoSubject: 1 });
videoProgressSchema.index({ studentId: 1, isCompleted: 1 });
videoProgressSchema.index({ videoId: 1, isCompleted: 1 });

// Middleware para calcular progreso automáticamente
videoProgressSchema.pre('save', function(next) {
  // Calcular porcentaje de progreso
  if (this.totalDuration > 0) {
    this.progressPercentage = Math.min(100, Math.round((this.watchTime / this.totalDuration) * 100));
  }
  
  // Determinar si está completado (consideramos completado si vio más del 90%)
  if (this.progressPercentage >= 90 && !this.isCompleted) {
    this.isCompleted = true;
    this.completedAt = new Date();
    this.status = 'completed';
  } else if (this.progressPercentage > 0 && this.progressPercentage < 90) {
    this.status = 'in_progress';
  } else if (this.progressPercentage === 0) {
    this.status = 'not_started';
  }
  
  // Calcular duración promedio de sesiones
  if (this.viewingSessions.length > 0) {
    const totalSessionTime = this.viewingSessions.reduce((sum, session) => {
      return sum + (session.watchedSeconds || 0);
    }, 0);
    this.averageSessionDuration = Math.round(totalSessionTime / this.viewingSessions.length);
  }
  
  console.log('VideoProgress pre-save:', {
    watchTime: this.watchTime,
    totalDuration: this.totalDuration,
    progressPercentage: this.progressPercentage,
    status: this.status,
    isCompleted: this.isCompleted
  });
  
  next();
});

// Método para agregar una nueva sesión de visualización
videoProgressSchema.methods.addViewingSession = function(watchedSeconds, lastPosition) {
  const session = {
    startTime: new Date(),
    endTime: new Date(),
    watchedSeconds: watchedSeconds || 0,
    lastPosition: lastPosition || 0
  };
  
  this.viewingSessions.push(session);
  this.totalSessions = this.viewingSessions.length;
  this.watchTime += watchedSeconds || 0;
  this.lastWatchedAt = new Date();
  
  return this.save();
};

// Método para actualizar el progreso de visualización
videoProgressSchema.methods.updateProgress = function(currentTime, watchedSeconds) {
  // Actualizar tiempo total visto
  if (watchedSeconds) {
    this.watchTime += watchedSeconds;
  }
  
  // Actualizar última sesión si existe
  if (this.viewingSessions.length > 0) {
    const lastSession = this.viewingSessions[this.viewingSessions.length - 1];
    lastSession.endTime = new Date();
    lastSession.lastPosition = currentTime || 0;
    if (watchedSeconds) {
      lastSession.watchedSeconds += watchedSeconds;
    }
  }
  
  this.lastWatchedAt = new Date();
  return this.save();
};

// Método estático para obtener progreso de un estudiante en una materia
videoProgressSchema.statics.getStudentProgressBySubject = function(studentId, subject) {
  return this.find({
    studentId,
    videoSubject: subject
  }).populate('videoId', 'title subject topic duration');
};

// Método estático para obtener estadísticas de progreso de un estudiante
videoProgressSchema.statics.getStudentVideoStats = function(studentId) {
  return this.aggregate([
    { $match: { studentId: new mongoose.Types.ObjectId(studentId) } },
    {
      $group: {
        _id: '$videoSubject',
        totalVideos: { $sum: 1 },
        completedVideos: { 
          $sum: { $cond: [{ $eq: ['$isCompleted', true] }, 1, 0] } 
        },
        totalWatchTime: { $sum: '$watchTime' },
        averageProgress: { $avg: '$progressPercentage' },
        lastWatched: { $max: '$lastWatchedAt' }
      }
    },
    {
      $project: {
        subject: '$_id',
        totalVideos: 1,
        completedVideos: 1,
        completionRate: {
          $round: [
            { $multiply: [{ $divide: ['$completedVideos', '$totalVideos'] }, 100] },
            1
          ]
        },
        totalWatchTimeHours: {
          $round: [{ $divide: ['$totalWatchTime', 3600] }, 2]
        },
        averageProgress: { $round: ['$averageProgress', 1] },
        lastWatched: 1,
        _id: 0
      }
    },
    { $sort: { completionRate: -1 } }
  ]);
};

// Método estático para obtener videos más vistos por un estudiante
videoProgressSchema.statics.getMostWatchedVideos = function(studentId, limit = 10) {
  return this.find({ studentId })
    .populate('videoId', 'title subject topic duration views likes')
    .populate('uploadedBy', 'personalInfo')
    .sort({ watchTime: -1, progressPercentage: -1 })
    .limit(limit);
};

export default mongoose.model('VideoProgress', videoProgressSchema);