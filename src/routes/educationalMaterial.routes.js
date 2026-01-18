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
  uploadEducationalMaterialFile
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
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();

// Aplicar autenticación a todas las rutas
router.use(authenticateToken);

// Configuración de subida de archivos (multer)
const uploadsDir = path.join(process.cwd(), 'uploads', 'materials');
fs.mkdirSync(uploadsDir, { recursive: true });
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    cb(null, `${base}-${uniqueSuffix}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
});

// Rutas públicas (para usuarios autenticados)
router.get('/', getEducationalMaterials);
router.get('/popular', getPopularMaterials);
router.get('/:id', getEducationalMaterialById);
router.patch('/:id/download', incrementDownloads);

// Rutas para creadores (tutores, asesores, admin)
router.get('/my/materials', requireRole(['tutor', 'advisor', 'admin']), getMyEducationalMaterials);
router.post('/upload', requireRole(['tutor', 'advisor', 'admin']), upload.single('file'), uploadEducationalMaterialFile);
router.post('/', requireRole(['tutor', 'advisor', 'admin']), schemaValidator(createEducationalMaterialSchema), createEducationalMaterial);
router.put('/:id', requireRole(['tutor', 'advisor', 'admin']), schemaValidator(updateEducationalMaterialSchema), updateEducationalMaterial);
router.delete('/:id', requireRole(['tutor', 'advisor', 'admin']), deleteEducationalMaterial);
router.patch('/:id/share', requireRole(['tutor', 'advisor', 'admin']), schemaValidator(shareMaterialSchema), shareEducationalMaterial);
router.patch('/:id/status', requireRole(['tutor', 'advisor', 'admin']), changeMaterialStatus);

// Rutas de interacción
router.post('/:id/rate', schemaValidator(rateMaterialSchema), rateEducationalMaterial);

export default router;