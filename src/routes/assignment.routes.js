import { Router } from 'express';
import { 
  getAssignments,
  getAssignmentById,
  createAssignment,
  updateAssignment,
  submitAssignment,
  gradeAssignment,
  addComment,
  getMyAssignments,
  getPendingAssignments,
  requestExtension,
  approveExtension,
  getAssignmentStatistics
} from '../controllers/assignment.controller.js';
import { schemaValidator } from '../middlewares/schemaValidator.js';
import { 
  createAssignmentSchema, 
  updateAssignmentSchema, 
  submitAssignmentSchema, 
  gradeAssignmentSchema, 
  addCommentSchema,
  requestExtensionSchema 
} from '../schemas/assignment.schema.js';
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
router.get('/my-assignments', requireRole(['student']), getMyAssignments);
router.get('/pending', requireRole(['student']), getPendingAssignments);
router.post('/:id/submit', requireRole(['student']), schemaValidator(submitAssignmentSchema), submitAssignment);
router.post('/:id/request-extension', requireRole(['student']), schemaValidator(requestExtensionSchema), requestExtension);
router.post('/:id/comments', schemaValidator(addCommentSchema), addComment);

// Rutas para tutores/asesores/admin
router.get('/', getAssignments);
router.get('/statistics', getAssignmentStatistics);
router.get('/:id', getAssignmentById);
router.post('/', requireRole(['tutor', 'advisor', 'admin']), schemaValidator(createAssignmentSchema), createAssignment);
router.put('/:id', requireRole(['tutor', 'advisor', 'admin']), schemaValidator(updateAssignmentSchema), updateAssignment);
router.post('/:id/grade', requireRole(['tutor', 'advisor', 'admin']), schemaValidator(gradeAssignmentSchema), gradeAssignment);
router.post('/:id/approve-extension', requireRole(['tutor', 'advisor', 'admin']), approveExtension);

export default router;