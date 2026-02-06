import { Router } from 'express';
import {
  getClassVideos,
  getClassVideoById,
  createClassVideo,
  updateClassVideo,
  deleteClassVideo,
  toggleLikeVideo,
  getMyClassVideos,
  getPopularVideos,
  uploadVideoFiles
} from '../controllers/classVideo.controller.js';
import { schemaValidator } from '../middlewares/schemaValidator.js';
import {
  createClassVideoSchema,
  updateClassVideoSchema,
  toggleLikeVideoSchema
} from '../schemas/classVideo.schema.js';
import { requireRole } from '../middlewares/role.middleware.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';

const router = Router();

// Middleware de autenticación para todas las rutas
router.use(authenticateToken);

// Rutas básicas para probar conectividad
router.get('/test', (req, res) => {
  res.json({ message: 'Video routes working', user: req.user?.id });
});

// Rutas para obtener videos
router.get('/', getClassVideos);
router.get('/popular', getPopularVideos);
router.get('/my/videos', requireRole(['tutor', 'admin']), getMyClassVideos);
router.get('/:id', getClassVideoById);

// Ruta para crear video con subida de archivos
router.post('/', requireRole(['tutor', 'admin']), uploadVideoFiles, createClassVideo);

// Rutas para modificar videos
router.put('/:id', requireRole(['tutor', 'admin']), updateClassVideo);
router.delete('/:id', requireRole(['tutor', 'admin']), deleteClassVideo);

// Rutas de interacción
router.post('/:id/like', toggleLikeVideo);

export default router;
