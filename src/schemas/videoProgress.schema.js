import { z } from 'zod';
import { objectId } from './common.js';

const videoIdParams = z.object({ videoId: objectId });

// Tutores y administradores pueden consultar el progreso de un estudiante concreto.
const studentQuery = z.object({ studentId: objectId.optional() });

export const videoIdParamSchema = z.object({
  params: videoIdParams
});

export const updateVideoProgressSchema = z.object({
  params: videoIdParams,
  body: z.object({
    // Posición actual del reproductor, en segundos.
    currentTime: z.number().min(0).max(86400),
    // Segundos reproducidos desde el último envío (incremental, no acumulado).
    watchedSeconds: z.number().min(0).max(3600).optional(),
    // Duración del vídeo informada por el reproductor, en segundos.
    totalDuration: z.number().positive().max(86400).optional()
  })
});

export const getStudentVideoStatsSchema = z.object({
  query: studentQuery
});

export const getVideoProgressDashboardSchema = z.object({
  query: studentQuery
});

export const getStudentProgressBySubjectSchema = z.object({
  params: z.object({
    subject: z.string().trim().min(1).max(100)
  }),
  query: studentQuery
});

export const getMostWatchedVideosSchema = z.object({
  query: studentQuery.extend({
    limit: z.coerce.number().int().min(1).max(50).default(10)
  })
});
