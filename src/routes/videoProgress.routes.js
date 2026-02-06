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

const router = Router();

// Aplicar autenticación a todas las rutas
router.use(authenticateToken);

// Ruta de prueba
router.get('/test', (req, res) => {
  res.json({ 
    message: 'Video progress routes working', 
    user: req.user?.id,
    timestamp: new Date().toISOString()
  });
});

// Rutas para estudiantes
router.post('/videos/:videoId/start', startVideoSession);
router.post('/videos/:videoId/progress', updateVideoProgress);
router.get('/videos/:videoId/progress', getVideoProgress);
router.get('/my-stats', requireRole(['student']), getStudentVideoStats);
router.get('/my-dashboard', requireRole(['student']), getVideoProgressDashboard);
router.get('/my-most-watched', requireRole(['student']), getMostWatchedVideos);

// Rutas para tutores/admin
router.get('/student-stats', requireRole(['tutor', 'admin']), getStudentVideoStats);
router.get('/student-dashboard', requireRole(['tutor', 'admin']), getVideoProgressDashboard);
router.get('/student-most-watched', requireRole(['tutor', 'admin']), getMostWatchedVideos);
router.get('/subject/:subject/progress', getStudentProgressBySubject);

export default router;