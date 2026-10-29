import mongoose from 'mongoose';

export const VIDEO_COMPLETION_THRESHOLD = 90;

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
  // Calcular porcentaje: usar el mayor entre tiempo visto acumulado y posición de reproducción (currentTime)
  // para que la barra refleje hasta dónde ha llegado el estudiante en el video
  if (this.totalDuration > 0) {
    const watchTimePct = (this.watchTime / this.totalDuration) * 100;
    let positionPct = 0;
    if (this.viewingSessions && this.viewingSessions.length > 0) {
      const lastSession = this.viewingSessions[this.viewingSessions.length - 1];
      if (lastSession.lastPosition != null && lastSession.lastPosition > 0) {
        positionPct = (lastSession.lastPosition / this.totalDuration) * 100;
      }
    }
    this.progressPercentage = Math.min(100, Math.round(Math.max(watchTimePct, positionPct)));
  }
  
  // Completado es permanente: retroceder en el vídeo no lo deshace
  if (!this.isCompleted && this.progressPercentage >= VIDEO_COMPLETION_THRESHOLD) {
    this.isCompleted = true;
    this.completedAt = new Date();
  }
  if (this.isCompleted) this.status = 'completed';
  else if (this.progressPercentage > 0) this.status = 'in_progress';
  else this.status = 'not_started';

  // Calcular duración promedio de sesiones
  if (this.viewingSessions.length > 0) {
    const totalSessionTime = this.viewingSessions.reduce((sum, session) => {
      return sum + (session.watchedSeconds || 0);
    }, 0);
    this.averageSessionDuration = Math.round(totalSessionTime / this.viewingSessions.length);
  }
  
  
  next();
});

// Método para agregar una nueva sesión de visualización
videoProgressSchema.methods.addViewingSession = function(this: VideoProgressDocument, watchedSeconds: number, lastPosition: number): Promise<VideoProgressDocument> {
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
videoProgressSchema.methods.updateProgress = function(this: VideoProgressDocument, currentTime: number, watchedSeconds?: number): Promise<VideoProgressDocument> {
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


export type VideoProgressRecord = mongoose.InferSchemaType<typeof videoProgressSchema>;
export type VideoProgressDocument = mongoose.HydratedDocument<VideoProgressRecord, VideoProgressMethods>;
export interface VideoProgressMethods {
  addViewingSession(watchedSeconds: number, lastPosition: number): Promise<VideoProgressDocument>;
  updateProgress(currentTime: number, watchedSeconds?: number): Promise<VideoProgressDocument>;
}
export interface VideoProgressModel extends mongoose.Model<VideoProgressRecord, {}, VideoProgressMethods> {
  getStudentProgressBySubject(studentId: string | mongoose.Types.ObjectId, subject: string): mongoose.Query<VideoProgressDocument[], VideoProgressDocument>;
  getStudentVideoStats(studentId: string | mongoose.Types.ObjectId): mongoose.Aggregate<{ subject: string; totalVideos: number; completedVideos: number; completionRate: number; totalWatchTimeHours: number; averageProgress: number; lastWatched: Date }[]>;
  getMostWatchedVideos(studentId: string | mongoose.Types.ObjectId, limit?: number): mongoose.Query<VideoProgressDocument[], VideoProgressDocument>;
}
export default mongoose.model<VideoProgressRecord, VideoProgressModel>('VideoProgress', videoProgressSchema);