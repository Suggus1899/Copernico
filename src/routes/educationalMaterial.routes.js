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
  getPopularMaterials,
  uploadMaterialFile
} from '../controllers/educationalMaterial.controller.js';
import { schemaValidator } from '../middlewares/schemaValidator.js';
import { 
  createEducationalMaterialSchema, 
  updateEducationalMaterialSchema, 
  rateMaterialSchema,
  shareMaterialSchema 
} from '../schemas/educationalMaterial.schema.js';
import { requireRole } from '../middlewares/role.middleware.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';

const router = Router();

// Aplicar autenticación a todas las rutas
router.use(authenticateToken);

// Rutas públicas (para usuarios autenticados)
router.get('/', getEducationalMaterials);
router.get('/popular', getPopularMaterials);
router.get('/:id', getEducationalMaterialById);
router.patch('/:id/download', incrementDownloads);

// Rutas para creadores (tutores, asesores, admin)
router.get('/my/materials', requireRole(['tutor', 'advisor', 'admin']), getMyEducationalMaterials);

// Endpoint de prueba
router.post('/test', requireRole(['tutor', 'advisor', 'admin']), (req, res) => {
  console.log('=== TEST ENDPOINT ===');
  console.log('Body:', req.body);
  console.log('File:', req.file);
  console.log('User:', req.user?.id, req.user?.role);
  res.json({ success: true, message: 'Test endpoint working', data: { body: req.body, hasFile: !!req.file } });
});

router.post('/', requireRole(['tutor', 'advisor', 'admin']), uploadMaterialFile, createEducationalMaterial);
router.put('/:id', requireRole(['tutor', 'advisor', 'admin']), schemaValidator(updateEducationalMaterialSchema), updateEducationalMaterial);
router.delete('/:id', requireRole(['tutor', 'advisor', 'admin']), deleteEducationalMaterial);
router.patch('/:id/share', requireRole(['tutor', 'advisor', 'admin']), schemaValidator(shareMaterialSchema), shareEducationalMaterial);
router.patch('/:id/status', requireRole(['tutor', 'advisor', 'admin']), changeMaterialStatus);

// Rutas de interacción
router.post('/:id/rate', schemaValidator(rateMaterialSchema), rateEducationalMaterial);

export default router;
