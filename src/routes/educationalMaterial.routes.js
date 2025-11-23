import { Router } from 'express';
import { 
  getEducationalMaterials,
  getEducationalMaterialById,
  createEducationalMaterial,
  updateEducationalMaterial,
  deleteEducationalMaterial,
  rateEducationalMaterial,
  incrementDownloads,
  shareEducationalMaterial,
  getMyEducationalMaterials,
  changeMaterialStatus,
  getPopularMaterials
} from '../controllers/educationalMaterial.controller.js';
import { schemaValidator } from '../middlewares/schemaValidator.js';
import { 
  createEducationalMaterialSchema, 
  updateEducationalMaterialSchema, 
  rateMaterialSchema,
  shareMaterialSchema 
} from '../schemas/educationalMaterial.schema.js';
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

// Rutas públicas (para usuarios autenticados)
router.get('/', getEducationalMaterials);
router.get('/popular', getPopularMaterials);
router.get('/:id', getEducationalMaterialById);
router.patch('/:id/download', incrementDownloads);

// Rutas para creadores (tutores, asesores, admin)
router.get('/my/materials', requireRole(['tutor', 'advisor', 'admin']), getMyEducationalMaterials);
router.post('/', requireRole(['tutor', 'advisor', 'admin']), schemaValidator(createEducationalMaterialSchema), createEducationalMaterial);
router.put('/:id', requireRole(['tutor', 'advisor', 'admin']), schemaValidator(updateEducationalMaterialSchema), updateEducationalMaterial);
router.delete('/:id', requireRole(['tutor', 'advisor', 'admin']), deleteEducationalMaterial);
router.patch('/:id/share', requireRole(['tutor', 'advisor', 'admin']), schemaValidator(shareMaterialSchema), shareEducationalMaterial);
router.patch('/:id/status', requireRole(['tutor', 'advisor', 'admin']), changeMaterialStatus);

// Rutas de interacción
router.post('/:id/rate', schemaValidator(rateMaterialSchema), rateEducationalMaterial);

export default router;