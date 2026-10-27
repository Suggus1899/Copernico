import { Router } from 'express';
import {
  createClassVideo,
  deleteClassVideo,
  getClassVideoById,
  getClassVideos,
  getMyClassVideos,
  getPopularClassVideos,
  toggleLikeVideo,
  updateClassVideo
} from '../controllers/classVideo.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';
import { requireRole } from '../middlewares/role.middleware.js';
import { schemaValidator } from '../middlewares/schemaValidator.js';
import {
  createClassVideoSchema,
  listClassVideosSchema,
  myClassVideosSchema,
  popularClassVideosSchema,
  updateClassVideoSchema,
  videoIdParamSchema
} from '../schemas/classVideo.schema.js';

const router = Router();
const TEACHERS = ['tutor', 'admin'];

router.use(authenticateToken);

// Las rutas fijas (/popular, /my/videos) van antes de /:id.
router.get('/', schemaValidator(listClassVideosSchema), getClassVideos);
router.get('/popular', schemaValidator(popularClassVideosSchema), getPopularClassVideos);
router.get('/my/videos', requireRole(TEACHERS), schemaValidator(myClassVideosSchema), getMyClassVideos);
router.get('/:id', schemaValidator(videoIdParamSchema), getClassVideoById);

router.post('/', requireRole(TEACHERS), schemaValidator(createClassVideoSchema), createClassVideo);
router.put('/:id', requireRole(TEACHERS), schemaValidator(updateClassVideoSchema), updateClassVideo);
router.delete('/:id', requireRole(TEACHERS), schemaValidator(videoIdParamSchema), deleteClassVideo);

router.post('/:id/like', schemaValidator(videoIdParamSchema), toggleLikeVideo);

export default router;
