import { z } from 'zod';

export const updateVideoProgressSchema = z.object({
  body: z.object({
    currentTime: z.number().min(0, 'Current time must be positive'),
    watchedSeconds: z.number().min(0, 'Watched seconds must be positive').optional(),
    totalDuration: z.number().min(0, 'Total duration must be positive').optional()
  })
});

export const startVideoSessionSchema = z.object({
  params: z.object({
    videoId: z.string().min(1, 'Video ID is required')
  })
});

export const getVideoProgressSchema = z.object({
  params: z.object({
    videoId: z.string().min(1, 'Video ID is required')
  })
});

export const getStudentProgressBySubjectSchema = z.object({
  params: z.object({
    subject: z.string().min(1, 'Subject is required')
  }),
  query: z.object({
    studentId: z.string().optional()
  })
});

export const getStudentVideoStatsSchema = z.object({
  query: z.object({
    studentId: z.string().optional()
  })
});

export const getMostWatchedVideosSchema = z.object({
  query: z.object({
    studentId: z.string().optional(),
    limit: z.string().regex(/^\d+$/).transform(Number).optional()
  })
});