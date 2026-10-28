import { Router } from 'express';
import { 
  getReports,
  getReportById,
  createReport,
  generateReportData,
  deliverReport,
  getReportTemplates,
  deleteReport
} from '../controllers/report.controller.js';
import { schemaValidator } from '../middlewares/schemaValidator.js';
import { 
  createReportSchema, 
  updateReportSchema,
  generateReportSchema,
  deliverReportSchema 
} from '../schemas/report.schema.js';
import { requireRole } from '../middlewares/role.middleware.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';

const router = Router();

// Aplicar autenticación a todas las rutas
router.use(authenticateToken);

// Rutas públicas para todos los usuarios autenticados
router.get('/templates', getReportTemplates);
router.get('/', getReports);
router.get('/:id', getReportById);

// Rutas para generación y gestión de reportes
router.post('/', requireRole(['tutor', 'advisor', 'admin']), schemaValidator(createReportSchema), createReport);
router.post('/:id/generate', requireRole(['tutor', 'advisor', 'admin']), schemaValidator(generateReportSchema), generateReportData);
router.post('/:id/deliver', requireRole(['tutor', 'advisor', 'admin']), schemaValidator(deliverReportSchema), deliverReport);
router.delete('/:id', requireRole(['tutor', 'advisor', 'admin']), deleteReport);

export default router;