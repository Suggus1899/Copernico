import { Router } from 'express';
import { 
  getUsers, 
  createUser, 
  getUserById, 
  updateUser, 
  deleteUser,
  getUserProfile,
  updateUserProfile,
  deleteMe
} from '../controllers/user.controller.js';
import { schemaValidator } from '../middlewares/schemaValidator.js';
// IMPORTAR LOS NOMBRES CORRECTOS que sí existen:
import { registerSchema as createUserSchema, updateProfileSchema as updateUserSchema, updatePreferencesSchema } from '../schemas/user.schema.js';
import { requireRole, requireOwnership } from '../middlewares/role.middleware.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';
import { logActivity } from '../middlewares/activity.middleware.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { uploadAvatar, getMyActivity } from '../controllers/user.controller.js';
import { validateObjectIdParam } from '../utils/validators.js';
import User from '../models/User.js';

const router = Router();

// Aplicar autenticación a todas las rutas
router.use(authenticateToken);

// Perfil del usuario autenticado
router.get('/profile', getUserProfile);
router.put('/profile', schemaValidator(updateUserSchema), logActivity('user.update_profile'), updateUserProfile);
router.put('/profile/preferences', schemaValidator(updatePreferencesSchema), logActivity('user.update_preferences'), updateUserProfile);

// Upload avatar (multipart/form-data, field: avatar)
const avatarsDir = path.join(process.cwd(), 'uploads', 'avatars');
fs.mkdirSync(avatarsDir, { recursive: true });
const avatarStorage = multer.diskStorage({
  destination: function (req, file, cb) { cb(null, avatarsDir); },
  filename: function (req, file, cb) {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    cb(null, `${base}-${unique}${ext}`);
  }
});
const avatarUpload = multer({ 
  storage: avatarStorage, 
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg','image/png','image/webp'];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error('Tipo de archivo no permitido. Usa JPG, PNG o WEBP'));
    }
    cb(null, true);
  }
});
router.post('/profile/avatar', avatarUpload.single('avatar'), logActivity('user.upload_avatar'), uploadAvatar);

// My activity logs
router.get('/profile/activity', getMyActivity);

// Documents upload for tutor/advisor
const docsDir = path.join(process.cwd(), 'uploads', 'documents');
fs.mkdirSync(docsDir, { recursive: true });
const docsStorage = multer.diskStorage({
  destination: function (req, file, cb) { cb(null, docsDir); },
  filename: function (req, file, cb) {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    cb(null, `${base}-${unique}${ext}`);
  }
});
const docsUpload = multer({
  storage: docsStorage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['application/pdf','image/jpeg','image/png','image/webp'];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error('Documento no permitido. Usa PDF o imágenes (JPG, PNG, WEBP)'));
    }
    cb(null, true);
  }
});
import { uploadDocuments, getMyDocuments, deleteDocument, renameDocument, updateDocumentTags } from '../controllers/user.controller.js';
router.post('/profile/documents', docsUpload.array('documents', 10), logActivity('user.upload_documents'), uploadDocuments);
router.get('/profile/documents', getMyDocuments);
router.delete('/profile/documents', logActivity('user.delete_document'), deleteDocument);
router.patch('/profile/documents/rename', logActivity('user.rename_document'), renameDocument);
router.patch('/profile/documents/tags', logActivity('user.update_document_tags'), updateDocumentTags);

// Rutas administrativas
router.get('/', requireRole(['admin', 'tutor', 'advisor']), getUsers);
router.get('/:id', validateObjectIdParam('id'), requireRole(['admin', 'tutor', 'advisor']), getUserById);

// Solo admin puede crear usuarios
router.post('/', requireRole(['admin']), schemaValidator(createUserSchema), createUser);

// Usuario puede actualizar su propio perfil, admin puede actualizar cualquier usuario
router.put('/:id', 
  validateObjectIdParam('id'),
  requireOwnership(User, 'id', '_id'),
  schemaValidator(updateUserSchema), 
  updateUser
);

// Eliminar usuario - solo admin
router.delete('/:id', validateObjectIdParam('id'), requireRole(['admin']), deleteUser);

// Eliminar la propia cuenta (soft delete)
router.delete('/me', logActivity('user.delete_me'), deleteMe);

export default router;