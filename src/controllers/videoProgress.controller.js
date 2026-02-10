import VideoProgress from "../models/VideoProgress.js";
import ClassVideo from "../models/ClassVideo.js";
import ProgressTracking from "../models/ProgressTracking.js";

export const updateVideoProgress = async (req, res, next) => {
  try {
    const { videoId } = req.params;
    const { currentTime, watchedSeconds, totalDuration } = req.body;
    const studentId = req.user.id;

    console.log('updateVideoProgress called:', {
      videoId,
      studentId,
      currentTime,
      watchedSeconds,
      totalDuration
    });

    // Verificar que el video existe y el usuario puede accederlo
    const video = await ClassVideo.findById(videoId);
    if (!video) {
      const error = new Error("Video not found");
      error.status = 404;
      throw error;
    }

    if (!video.canAccess(req.user)) {
      const error = new Error("Access denied to this video");
      error.status = 403;
      throw error;
    }

    // Buscar o crear registro de progreso
    let videoProgress = await VideoProgress.findOne({
      studentId,
      videoId
    });

    if (!videoProgress) {
      // Crear nuevo registro de progreso
      const duration = totalDuration || (video.duration ? video.duration * 60 : 0);
      console.log('Creating new video progress:', {
        studentId,
        videoId,
        totalDuration: duration,
        videoTitle: video.title
      });

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

    // Actualizar progreso
    if (watchedSeconds && watchedSeconds > 0) {
      videoProgress.watchTime += watchedSeconds;
      console.log('Updated watchTime:', videoProgress.watchTime);
    }

    // Actualizar o crear sesión de visualización (por si se envió progreso sin haber llamado /start)
    if (videoProgress.viewingSessions.length > 0) {
      const lastSession = videoProgress.viewingSessions[videoProgress.viewingSessions.length - 1];
      lastSession.endTime = new Date();
      lastSession.lastPosition = currentTime != null ? Number(currentTime) : lastSession.lastPosition;
      if (watchedSeconds) {
        lastSession.watchedSeconds = (lastSession.watchedSeconds || 0) + watchedSeconds;
      }
    } else {
      videoProgress.viewingSessions.push({
        startTime: new Date(),
        endTime: new Date(),
        watchedSeconds: watchedSeconds || 0,
        lastPosition: currentTime != null ? Number(currentTime) : 0
      });
      videoProgress.totalSessions = videoProgress.viewingSessions.length;
    }

    videoProgress.lastWatchedAt = new Date();
    
    // Guardar cambios (esto activará el middleware pre-save)
    await videoProgress.save();

    console.log('Video progress saved:', {
      progressPercentage: videoProgress.progressPercentage,
      isCompleted: videoProgress.isCompleted,
      watchTime: videoProgress.watchTime,
      status: videoProgress.status
    });

    // Si el video se completó por primera vez, actualizar ProgressTracking
    if (videoProgress.isCompleted && videoProgress.completedAt) {
      await updateProgressTrackingFromVideo(studentId, video, videoProgress);
    }

    res.json({
      success: true,
      message: "Video progress updated successfully",
      data: {
        progressPercentage: videoProgress.progressPercentage,
        isCompleted: videoProgress.isCompleted,
        watchTime: videoProgress.watchTime,
        status: videoProgress.status
      }
    });
  } catch (error) {
    console.error('Error in updateVideoProgress:', error);
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
      const error = new Error("Student ID is required");
      error.status = 400;
      throw error;
    }

    // Verificar permisos
    if (req.user.role === 'student' && req.user.id !== studentId) {
      const error = new Error("Access denied");
      error.status = 403;
      throw error;
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
      const error = new Error("Student ID is required");
      error.status = 400;
      throw error;
    }

    // Verificar permisos
    if (req.user.role === 'student' && req.user.id !== studentId) {
      const error = new Error("Access denied");
      error.status = 403;
      throw error;
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
      const error = new Error("Student ID is required");
      error.status = 400;
      throw error;
    }

    // Verificar permisos
    if (req.user.role === 'student' && req.user.id !== studentId) {
      const error = new Error("Access denied");
      error.status = 403;
      throw error;
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

    console.log('startVideoSession called:', { videoId, studentId });

    // Verificar que el video existe y el usuario puede accederlo
    const video = await ClassVideo.findById(videoId);
    if (!video) {
      const error = new Error("Video not found");
      error.status = 404;
      throw error;
    }

    if (!video.canAccess(req.user)) {
      const error = new Error("Access denied to this video");
      error.status = 403;
      throw error;
    }

    // Buscar o crear registro de progreso
    let videoProgress = await VideoProgress.findOne({
      studentId,
      videoId
    });

    if (!videoProgress) {
      // Crear nuevo registro de progreso
      const duration = video.duration ? video.duration * 60 : 0; // convertir minutos a segundos
      console.log('Creating new video progress for session:', {
        studentId,
        videoId,
        totalDuration: duration,
        videoTitle: video.title
      });

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

    console.log('Video session started:', {
      sessionId: newSession._id,
      currentProgress: videoProgress.progressPercentage,
      totalSessions: videoProgress.totalSessions
    });

    res.json({
      success: true,
      message: "Video session started",
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
    console.error('Error in startVideoSession:', error);
    next(error);
  }
};

export const getVideoProgressDashboard = async (req, res, next) => {
  try {
    const studentId = req.user.role === 'student' ? req.user.id : req.query.studentId;
    
    if (!studentId) {
      const error = new Error("Student ID is required");
      error.status = 400;
      throw error;
    }

    // Verificar permisos
    if (req.user.role === 'student' && req.user.id !== studentId) {
      const error = new Error("Access denied");
      error.status = 403;
      throw error;
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
    
    console.log(`Progress tracking updated for student ${studentId} in subject ${video.subject}`);
  } catch (error) {
    console.error('Error updating progress tracking from video:', error);
    // No lanzar error para no interrumpir el flujo principal
  }
};