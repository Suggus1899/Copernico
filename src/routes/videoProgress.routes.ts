import { Router } from 'express';
import {
  updateVideoProgress,
  getVideoProgress,
  getStudentVideoStats,
  getStudentProgressBySubject,
  getMostWatchedVideos,
  startVideoSession,
  getVideoProgressDashboard
} from '../controllers/videoProgress.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';
import { requireRole } from '../middlewares/role.middleware.js';
import { schemaValidator } from '../middlewares/schemaValidator.js';
import {
  videoIdParamSchema,
  updateVideoProgressSchema,
  getStudentVideoStatsSchema,
  getVideoProgressDashboardSchema,
  getStudentProgressBySubjectSchema,
  getMostWatchedVideosSchema
} from '../schemas/videoProgress.schema.js';

const router = Router();

// Aplicar autenticación a todas las rutas
router.use(authenticateToken);

// Rutas para estudiantes (y para tutores/admin sobre sus propios datos)
router.post('/videos/:videoId/start', schemaValidator(videoIdParamSchema), startVideoSession);
router.post('/videos/:videoId/progress', schemaValidator(updateVideoProgressSchema), updateVideoProgress);
router.get('/videos/:videoId/progress', schemaValidator(videoIdParamSchema), getVideoProgress);
router.get('/my-stats', requireRole(['student']), schemaValidator(getStudentVideoStatsSchema), getStudentVideoStats);
router.get('/my-dashboard', requireRole(['student']), schemaValidator(getVideoProgressDashboardSchema), getVideoProgressDashboard);
router.get('/my-most-watched', requireRole(['student']), schemaValidator(getMostWatchedVideosSchema), getMostWatchedVideos);

// Rutas para tutores/admin
router.get('/student-stats', requireRole(['tutor', 'admin']), schemaValidator(getStudentVideoStatsSchema), getStudentVideoStats);
router.get('/student-dashboard', requireRole(['tutor', 'admin']), schemaValidator(getVideoProgressDashboardSchema), getVideoProgressDashboard);
router.get('/student-most-watched', requireRole(['tutor', 'admin']), schemaValidator(getMostWatchedVideosSchema), getMostWatchedVideos);
router.get('/subject/:subject/progress', schemaValidator(getStudentProgressBySubjectSchema), getStudentProgressBySubject);

export default router;
