import { Router } from 'express';
import {
  getEducationalMaterials,
  getEducationalMaterialById,
  createEducationalMaterial,
  updateEducationalMaterial,
  deleteEducationalMaterial,
  downloadEducationalMaterial,
  rateEducationalMaterial,
  shareEducationalMaterial,
  getMyEducationalMaterials,
  changeMaterialStatus,
  getPopularMaterials,
} from '../controllers/educationalMaterial.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';
import { requireRole } from '../middlewares/role.middleware.js';
import { schemaValidator } from '../middlewares/schemaValidator.js';
import { materialUpload } from '../middlewares/upload.middleware.js';
import {
  changeMaterialStatusSchema,
  rateMaterialSchema,
  shareMaterialSchema,
  updateEducationalMaterialSchema,
} from '../schemas/educationalMaterial.schema.js';
import { validateObjectIdParam } from '../utils/validators.js';

const router = Router();
const validId = validateObjectIdParam('id');
const creatorOnly = requireRole(['tutor', 'admin']);

router.use(authenticateToken);

// Lectura: estudiantes ven sólo materiales publicados (lo aplica el controlador)
router.get('/', getEducationalMaterials);
router.get('/popular', getPopularMaterials);
router.get('/my/materials', creatorOnly, getMyEducationalMaterials);
router.get('/:id', validId, getEducationalMaterialById);
router.get('/:id/download', validId, downloadEducationalMaterial);

// Gestión: sólo tutores y administradores
router.post('/', creatorOnly, materialUpload, createEducationalMaterial);
router.put('/:id', validId, creatorOnly, schemaValidator(updateEducationalMaterialSchema), updateEducationalMaterial);
router.delete('/:id', validId, creatorOnly, deleteEducationalMaterial);
router.patch('/:id/share', validId, creatorOnly, schemaValidator(shareMaterialSchema), shareEducationalMaterial);
router.patch('/:id/status', validId, creatorOnly, schemaValidator(changeMaterialStatusSchema), changeMaterialStatus);

// Interacción
router.post('/:id/rate', validId, schemaValidator(rateMaterialSchema), rateEducationalMaterial);

export default router;
