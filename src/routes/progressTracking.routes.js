import { Router } from 'express';
import { 
  getProgressTrackings,
  getProgressTrackingById,
  createProgressTracking,
  updateProgressTracking,
  addProgressHistory,
  updateGoalStatus,
  getStudentProgress,
  getMyProgress,
  getProgressStatistics,
  createBaselineAssessment
} from '../controllers/progressTracking.controller.js';
import { schemaValidator } from '../middlewares/schemaValidator.js';
import { 
  createProgressTrackingSchema, 
  updateProgressTrackingSchema, 
  addProgressHistorySchema,
  updateGoalStatusSchema 
} from '../schemas/progressTracking.schema.js';
import { requireRole } from '../middlewares/role.middleware.js';

const router = Router();

// Middleware de autenticación básico
const requireAuth = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      success: false,
      message: 'Authentication required. Please login.' 
    });
  }
  next();
};

// Aplicar autenticación a todas las rutas
router.use(requireAuth);

// Rutas para estudiantes
router.get('/my-progress', requireRole(['student']), getMyProgress);
router.get('/student-progress', getStudentProgress);

// Rutas para tutores/asesores/admin
router.get('/', getProgressTrackings);
router.get('/statistics', getProgressStatistics);
router.get('/:id', getProgressTrackingById);
router.post('/', requireRole(['tutor', 'advisor', 'admin']), schemaValidator(createProgressTrackingSchema), createProgressTracking);
router.post('/baseline', requireRole(['tutor', 'advisor', 'admin']), createBaselineAssessment);
router.put('/:id', requireRole(['tutor', 'advisor', 'admin']), schemaValidator(updateProgressTrackingSchema), updateProgressTracking);
router.post('/:id/history', requireRole(['tutor', 'advisor', 'admin']), schemaValidator(addProgressHistorySchema), addProgressHistory);
router.patch('/:id/goals', schemaValidator(updateGoalStatusSchema), updateGoalStatus);

export default router;