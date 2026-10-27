import { AppError } from '../utils/AppError.js';
import VideoProgress from "../models/VideoProgress.js";
import ClassVideo from "../models/ClassVideo.js";
import ProgressTracking from "../models/ProgressTracking.js";

export const updateVideoProgress = async (req, res, next) => {
  try {
    const { videoId } = req.params;
    const { currentTime, watchedSeconds, totalDuration } = req.body;
    const studentId = req.user.id;

    const video = await ClassVideo.findById(videoId);
    if (!video || !video.canAccess(req.user)) {
      throw new AppError(404, 'NOT_FOUND', 'Vídeo no encontrado');
    }

    let videoProgress = await VideoProgress.findOne({ studentId, videoId });
    if (!videoProgress) {
      videoProgress = new VideoProgress({
        studentId,
        videoId,
        totalDuration: totalDuration ?? (video.duration ? video.duration * 60 : 0),
        videoTitle: video.title,
        videoSubject: video.subject,
        videoTopic: video.topic,
        uploadedBy: video.uploadedBy,
        watchTime: 0
      });
    } else if (totalDuration) {
      // La duración la informa el reproductor de YouTube; se conserva la última conocida.
      videoProgress.totalDuration = totalDuration;
    }

    const wasCompleted = videoProgress.isCompleted;

    if (watchedSeconds) {
      videoProgress.watchTime += watchedSeconds;
    }

    // Actualiza la última sesión, o abre una si el progreso llega sin /start.
    const lastSession = videoProgress.viewingSessions[videoProgress.viewingSessions.length - 1];
    if (lastSession) {
      lastSession.endTime = new Date();
      lastSession.lastPosition = currentTime;
      lastSession.watchedSeconds = (lastSession.watchedSeconds || 0) + (watchedSeconds || 0);
    } else {
      videoProgress.viewingSessions.push({
        startTime: new Date(),
        endTime: new Date(),
        watchedSeconds: watchedSeconds || 0,
        lastPosition: currentTime
      });
    }
    videoProgress.totalSessions = videoProgress.viewingSessions.length;
    videoProgress.lastWatchedAt = new Date();

    // El middleware pre-save recalcula porcentaje y estado.
    await videoProgress.save();

    // ProgressTracking solo se actualiza la primera vez que el vídeo se completa.
    if (!wasCompleted && videoProgress.isCompleted) {
      await updateProgressTrackingFromVideo(studentId, video, videoProgress);
    }

    res.json({
      success: true,
      message: 'Progreso de vídeo actualizado',
      data: {
        progressPercentage: videoProgress.progressPercentage,
        isCompleted: videoProgress.isCompleted,
        watchTime: videoProgress.watchTime,
        status: videoProgress.status
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getVideoProgress = async (req, res, next) => {
  try {
    const { videoId } = req.params;
    const studentId = req.user.id;

    const videoProgress = await VideoProgress.findOne({
      studentId,
      videoId
    }).populate('videoId', 'title subject topic duration');

    if (!videoProgress) {
      return res.json({
        success: true,
        data: {
          progressPercentage: 0,
          isCompleted: false,
          watchTime: 0,
          status: 'not_started'
        }
      });
    }

    res.json({
      success: true,
      data: videoProgress
    });
  } catch (error) {
    next(error);
  }
};

export const getStudentVideoStats = async (req, res, next) => {
  try {
    const studentId = req.user.role === 'student' ? req.user.id : req.query.studentId;
    
    if (!studentId) {
      throw new AppError(400, 'BAD_REQUEST', "Se requiere el identificador del estudiante");
    }

    // Verificar permisos
    if (req.user.role === 'student' && req.user.id !== studentId) {
      throw new AppError(403, 'FORBIDDEN', "Acceso denegado");
    }

    const stats = await VideoProgress.getStudentVideoStats(studentId);
    
    // Obtener estadísticas generales
    const totalProgress = await VideoProgress.find({ studentId });
    const overallStats = {
      totalVideosWatched: totalProgress.length,
      totalCompletedVideos: totalProgress.filter(p => p.isCompleted).length,
      totalWatchTimeHours: Math.round(totalProgress.reduce((sum, p) => sum + p.watchTime, 0) / 3600 * 100) / 100,
      averageCompletionRate: totalProgress.length > 0 
        ? Math.round(totalProgress.reduce((sum, p) => sum + p.progressPercentage, 0) / totalProgress.length * 10) / 10
        : 0
    };

    res.json({
      success: true,
      data: {
        bySubject: stats,
        overall: overallStats
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getStudentProgressBySubject = async (req, res, next) => {
  try {
    const { subject } = req.params;
    const studentId = req.user.role === 'student' ? req.user.id : req.query.studentId;
    
    if (!studentId) {
      throw new AppError(400, 'BAD_REQUEST', "Se requiere el identificador del estudiante");
    }

    // Verificar permisos
    if (req.user.role === 'student' && req.user.id !== studentId) {
      throw new AppError(403, 'FORBIDDEN', "Acceso denegado");
    }

    const progress = await VideoProgress.getStudentProgressBySubject(studentId, subject);

    res.json({
      success: true,
      data: progress
    });
  } catch (error) {
    next(error);
  }
};

export const getMostWatchedVideos = async (req, res, next) => {
  try {
    const { limit = 10 } = req.query;
    const studentId = req.user.role === 'student' ? req.user.id : req.query.studentId;
    
    if (!studentId) {
      throw new AppError(400, 'BAD_REQUEST', "Se requiere el identificador del estudiante");
    }

    // Verificar permisos
    if (req.user.role === 'student' && req.user.id !== studentId) {
      throw new AppError(403, 'FORBIDDEN', "Acceso denegado");
    }

    const mostWatched = await VideoProgress.getMostWatchedVideos(studentId, parseInt(limit));

    res.json({
      success: true,
      data: mostWatched
    });
  } catch (error) {
    next(error);
  }
};

export const startVideoSession = async (req, res, next) => {
  try {
    const { videoId } = req.params;
    const studentId = req.user.id;


    // Verificar que el video existe y el usuario puede accederlo
    const video = await ClassVideo.findById(videoId);
    if (!video) {
      throw new AppError(404, 'NOT_FOUND', "Vídeo no encontrado");
    }

    if (!video.canAccess(req.user)) {
      throw new AppError(403, 'FORBIDDEN', "No puedes acceder a este vídeo");
    }

    // Buscar o crear registro de progreso
    let videoProgress = await VideoProgress.findOne({
      studentId,
      videoId
    });

    if (!videoProgress) {
      // Crear nuevo registro de progreso
      const duration = video.duration ? video.duration * 60 : 0; // convertir minutos a segundos

      videoProgress = new VideoProgress({
        studentId,
        videoId,
        totalDuration: duration,
        videoTitle: video.title,
        videoSubject: video.subject,
        videoTopic: video.topic,
        uploadedBy: video.uploadedBy,
        watchTime: 0
      });
    }

    // Agregar nueva sesión de visualización
    const newSession = {
      startTime: new Date(),
      endTime: new Date(),
      watchedSeconds: 0,
      lastPosition: 0
    };

    videoProgress.viewingSessions.push(newSession);
    videoProgress.totalSessions = videoProgress.viewingSessions.length;
    videoProgress.lastWatchedAt = new Date();

    await videoProgress.save();


    res.json({
      success: true,
      message: "Sesión de vídeo iniciada",
      data: {
        sessionId: newSession._id,
        currentProgress: videoProgress.progressPercentage,
        lastPosition: videoProgress.viewingSessions.length > 1 
          ? videoProgress.viewingSessions[videoProgress.viewingSessions.length - 2].lastPosition 
          : 0,
        totalDuration: videoProgress.totalDuration
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getVideoProgressDashboard = async (req, res, next) => {
  try {
    const studentId = req.user.role === 'student' ? req.user.id : req.query.studentId;
    
    if (!studentId) {
      throw new AppError(400, 'BAD_REQUEST', "Se requiere el identificador del estudiante");
    }

    // Verificar permisos
    if (req.user.role === 'student' && req.user.id !== studentId) {
      throw new AppError(403, 'FORBIDDEN', "Acceso denegado");
    }

    // Obtener estadísticas por materia
    const subjectStats = await VideoProgress.getStudentVideoStats(studentId);
    
    // Obtener videos más vistos
    const mostWatched = await VideoProgress.getMostWatchedVideos(studentId, 5);
    
    // Obtener progreso reciente
    const recentProgress = await VideoProgress.find({ studentId })
      .populate('videoId', 'title subject topic')
      .sort({ lastWatchedAt: -1 })
      .limit(10);

    // Obtener videos completados recientemente
    const recentlyCompleted = await VideoProgress.find({ 
      studentId, 
      isCompleted: true 
    })
      .populate('videoId', 'title subject topic')
      .sort({ completedAt: -1 })
      .limit(5);

    res.json({
      success: true,
      data: {
        subjectStats,
        mostWatched,
        recentProgress,
        recentlyCompleted
      }
    });
  } catch (error) {
    next(error);
  }
};

// Función auxiliar para actualizar ProgressTracking cuando se completa un video
const updateProgressTrackingFromVideo = async (studentId, video, videoProgress) => {
  try {
    // Buscar un registro de progreso existente para la materia
    let progressTracking = await ProgressTracking.findOne({
      studentId,
      subject: video.subject
    }).sort({ createdAt: -1 });

    if (!progressTracking) {
      // Crear un nuevo registro de progreso si no existe
      progressTracking = new ProgressTracking({
        studentId,
        trackedBy: video.uploadedBy,
        subject: video.subject,
        metrics: {
          completionRate: 0,
          understandingLevel: 3
        },
        observations: `Progreso automático basado en visualización de videos`,
        competencyLevel: 'beginner',
        trackingPeriod: {
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 días
        },
        createdBy: video.uploadedBy,
        updatedBy: video.uploadedBy
      });
    }

    // Calcular nueva tasa de finalización basada en videos completados
    const completedVideos = await VideoProgress.countDocuments({
      studentId,
      videoSubject: video.subject,
      isCompleted: true
    });

    const totalVideos = await VideoProgress.countDocuments({
      studentId,
      videoSubject: video.subject
    });

    const completionRate = totalVideos > 0 ? Math.round((completedVideos / totalVideos) * 100) : 0;

    // Actualizar métricas
    progressTracking.metrics.completionRate = completionRate;
    
    // Actualizar nivel de comprensión basado en la tasa de finalización
    if (completionRate >= 90) {
      progressTracking.metrics.understandingLevel = 5;
      progressTracking.competencyLevel = 'advanced';
    } else if (completionRate >= 70) {
      progressTracking.metrics.understandingLevel = 4;
      progressTracking.competencyLevel = 'intermediate';
    } else if (completionRate >= 50) {
      progressTracking.metrics.understandingLevel = 3;
      progressTracking.competencyLevel = 'intermediate';
    } else {
      progressTracking.metrics.understandingLevel = 2;
      progressTracking.competencyLevel = 'beginner';
    }

    // Agregar entrada al historial
    await progressTracking.addProgressHistory(
      {
        completionRate: completionRate,
        understandingLevel: progressTracking.metrics.understandingLevel
      },
      `Video completado: "${video.title}" - Progreso de videos en ${video.subject}: ${completionRate}%`,
      video.uploadedBy
    );

    await progressTracking.save();
    
  } catch (error) {
    // Fallo no crítico: el progreso del vídeo ya está guardado y no debe convertir
    // la respuesta en un error. Queda pendiente un logger estructurado (ver informe).
  }
};