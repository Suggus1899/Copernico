import { createHash } from 'node:crypto';
import mongoose from 'mongoose';
import type { Handler, BodyOf } from '../types/http.js';
import { assertStudentAccess } from '../utils/studentAccess.js';
import type { ClassVideoDocument } from '../models/ClassVideo.js';
import type { VideoProgressDocument } from '../models/VideoProgress.js';
import type { VideoProgressRequestRecord, VideoProgressRequestResult } from '../models/VideoProgressRequest.js';
import type { updateVideoProgressSchema } from '../schemas/videoProgress.schema.js';
import type { ClientSession, Types } from 'mongoose';
import { AppError } from '../utils/AppError.js';
import VideoProgress from '../models/VideoProgress.js';
import VideoProgressRequest from '../models/VideoProgressRequest.js';
import ClassVideo from '../models/ClassVideo.js';
import ProgressTracking from '../models/ProgressTracking.js';

const IDEMPOTENCY_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

const isDuplicateKeyError = (error: unknown): error is { code: number } =>
  typeof error === 'object' && error !== null && 'code' in error && error.code === 11000;

const previousResult = (
  record: VideoProgressRequestRecord,
  studentId: string,
  videoId: string,
  payloadHash: string,
): VideoProgressRequestResult => {
  if (
    String(record.studentId) !== studentId ||
    String(record.videoId) !== videoId ||
    record.payloadHash !== payloadHash
  ) {
    throw new AppError(409, 'IDEMPOTENCY_KEY_REUSED', 'El identificador ya se usó con otra operación');
  }
  return record.result;
};

export const updateVideoProgress: Handler<Record<string, string>, unknown, BodyOf<typeof updateVideoProgressSchema>> = async (req, res, next) => {
  try {
    const { videoId } = req.params;
    const { currentTime, watchedSeconds, totalDuration, requestId } = req.body;
    const studentId = req.user!.id;

    const video = await ClassVideo.findById(videoId);
    if (!video || !video.canAccess(req.user!)) {
      throw new AppError(404, 'NOT_FOUND', 'Vídeo no encontrado');
    }

    const payloadHash = createHash('sha256')
      .update(JSON.stringify({ currentTime, watchedSeconds, totalDuration }))
      .digest('hex');

    const updateInTransaction = async (): Promise<VideoProgressRequestResult> => {
      const session = await mongoose.startSession();
      try {
        const result = await session.withTransaction(async () => {
          const priorRequest = await VideoProgressRequest.findOne({ requestId }).session(session).lean();
          if (priorRequest) return previousResult(priorRequest, studentId, videoId, payloadHash);

          let videoProgress = await VideoProgress.findOne({ studentId, videoId }).session(session);
          if (!videoProgress) {
            videoProgress = new VideoProgress({
              studentId,
              videoId,
              totalDuration: totalDuration ?? (video.duration ? video.duration * 60 : 0),
              videoTitle: video.title,
              videoSubject: video.subject,
              videoTopic: video.topic,
              uploadedBy: video.uploadedBy,
              watchTime: 0,
            });
          } else if (totalDuration) {
            videoProgress.totalDuration = totalDuration;
          }

          const wasCompleted = videoProgress.isCompleted;
          videoProgress.watchTime += watchedSeconds || 0;

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
              lastPosition: currentTime,
            });
          }
          videoProgress.totalSessions = videoProgress.viewingSessions.length;
          videoProgress.lastWatchedAt = new Date();

          await videoProgress.save({ session });
          if (!wasCompleted && videoProgress.isCompleted) {
            await updateProgressTrackingFromVideo(studentId, video, videoProgress, session);
          }

          const response: VideoProgressRequestResult = {
            progressPercentage: videoProgress.progressPercentage,
            isCompleted: videoProgress.isCompleted,
            watchTime: videoProgress.watchTime,
            status: videoProgress.status,
          };
          await VideoProgressRequest.create([{
            requestId,
            studentId,
            videoId,
            payloadHash,
            result: response,
            expiresAt: new Date(Date.now() + IDEMPOTENCY_RETENTION_MS),
          }], { session });
          return response;
        });
        if (!result) throw new Error('La transacción no devolvió el resultado del progreso');
        return result;
      } finally {
        await session.endSession();
      }
    };

    let result: VideoProgressRequestResult | undefined;
    for (let attempt = 0; attempt < 2 && !result; attempt += 1) {
      try {
        result = await updateInTransaction();
      } catch (error) {
        if (!isDuplicateKeyError(error) || attempt === 1) throw error;
        const committedRequest = await VideoProgressRequest.findOne({ requestId }).lean();
        if (committedRequest) result = previousResult(committedRequest, studentId, videoId, payloadHash);
      }
    }
    if (!result) throw new Error('No se pudo guardar el progreso del vídeo');

    res.json({ success: true, message: 'Progreso de vídeo actualizado', data: result });
  } catch (error) {
    next(error);
  }
};

export const getVideoProgress: Handler<Record<string, string>, unknown, BodyOf<typeof updateVideoProgressSchema>> = async (req, res, next) => {
  try {
    const { videoId } = req.params;
    const studentId = req.user!.id;

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

export const getStudentVideoStats: Handler<Record<string, string>, unknown, BodyOf<typeof updateVideoProgressSchema>> = async (req, res, next) => {
  try {
    const studentId = req.user!.role === 'student' ? req.user!.id : (req.query.studentId as string | undefined);
    
    if (!studentId) {
      throw new AppError(400, 'BAD_REQUEST', "Se requiere el identificador del estudiante");
    }

    await assertStudentAccess(req.user!, studentId);

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

export const getStudentProgressBySubject: Handler<Record<string, string>, unknown, BodyOf<typeof updateVideoProgressSchema>> = async (req, res, next) => {
  try {
    const { subject } = req.params;
    const studentId = req.user!.role === 'student' ? req.user!.id : (req.query.studentId as string | undefined);
    
    if (!studentId) {
      throw new AppError(400, 'BAD_REQUEST', "Se requiere el identificador del estudiante");
    }

    await assertStudentAccess(req.user!, studentId);

    const progress = await VideoProgress.getStudentProgressBySubject(studentId, subject);

    res.json({
      success: true,
      data: progress
    });
  } catch (error) {
    next(error);
  }
};

export const getMostWatchedVideos: Handler<Record<string, string>, unknown, BodyOf<typeof updateVideoProgressSchema>> = async (req, res, next) => {
  try {
    const { limit = 10 } = req.query;
    const studentId = req.user!.role === 'student' ? req.user!.id : (req.query.studentId as string | undefined);
    
    if (!studentId) {
      throw new AppError(400, 'BAD_REQUEST', "Se requiere el identificador del estudiante");
    }

    await assertStudentAccess(req.user!, studentId);

    const mostWatched = await VideoProgress.getMostWatchedVideos(studentId, parseInt(String(limit)));

    res.json({
      success: true,
      data: mostWatched
    });
  } catch (error) {
    next(error);
  }
};

export const startVideoSession: Handler<Record<string, string>, unknown, BodyOf<typeof updateVideoProgressSchema>> = async (req, res, next) => {
  try {
    const { videoId } = req.params;
    const studentId = req.user!.id;


    // Verificar que el video existe y el usuario puede accederlo
    const video = await ClassVideo.findById(videoId);
    if (!video) {
      throw new AppError(404, 'NOT_FOUND', "Vídeo no encontrado");
    }

    if (!video.canAccess(req.user!)) {
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
    const newSession: { _id?: Types.ObjectId; startTime: Date; endTime: Date; watchedSeconds: number; lastPosition: number } = {
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

export const getVideoProgressDashboard: Handler<Record<string, string>, unknown, BodyOf<typeof updateVideoProgressSchema>> = async (req, res, next) => {
  try {
    const studentId = req.user!.role === 'student' ? req.user!.id : (req.query.studentId as string | undefined);
    
    if (!studentId) {
      throw new AppError(400, 'BAD_REQUEST', "Se requiere el identificador del estudiante");
    }

    await assertStudentAccess(req.user!, studentId);

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
const updateProgressTrackingFromVideo = async (studentId: string, video: ClassVideoDocument, videoProgress: VideoProgressDocument, session: ClientSession) => {
    let progressTracking = await ProgressTracking.findOne({
      studentId,
      subject: video.subject
    }).sort({ createdAt: -1 }).session(session);

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
    }).session(session);

    const totalVideos = await VideoProgress.countDocuments({
      studentId,
      videoSubject: video.subject
    }).session(session);

    const completionRate = totalVideos > 0 ? Math.round((completedVideos / totalVideos) * 100) : 0;

    // Actualizar métricas
    progressTracking.metrics!.completionRate = completionRate;
    
    // Actualizar nivel de comprensión basado en la tasa de finalización
    if (completionRate >= 90) {
      progressTracking.metrics!.understandingLevel = 5;
      progressTracking.competencyLevel = 'advanced';
    } else if (completionRate >= 70) {
      progressTracking.metrics!.understandingLevel = 4;
      progressTracking.competencyLevel = 'intermediate';
    } else if (completionRate >= 50) {
      progressTracking.metrics!.understandingLevel = 3;
      progressTracking.competencyLevel = 'intermediate';
    } else {
      progressTracking.metrics!.understandingLevel = 2;
      progressTracking.competencyLevel = 'beginner';
    }

    // Agregar entrada al historial
    await progressTracking.addProgressHistory(
      {
        completionRate: completionRate,
        understandingLevel: progressTracking.metrics!.understandingLevel
      },
      `Video completado: "${video.title}" - Progreso de videos en ${video.subject}: ${completionRate}%`,
      video.uploadedBy,
      session,
    );
};
