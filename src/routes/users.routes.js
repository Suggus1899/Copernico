import { Router } from 'express';
import { 
  getUsers, 
  createUser, 
  getUserById, 
  updateUser, 
  deleteUser,
  getUserProfile,
  updateUserProfile,
  getAvailableEducators
} from '../controllers/user.controller.js';
import {
  uploadAvatar,
  getUserAvatar,
  deleteUserAvatar,
  listDocuments,
  uploadDocuments,
  updateDocument,
  deleteDocument,
  downloadDocument,
} from '../controllers/userFiles.controller.js';
import { avatarUpload, documentsUpload } from '../middlewares/upload.middleware.js';
import { schemaValidator } from '../middlewares/schemaValidator.js';
import { createUserSchema, updateProfileSchema as updateUserSchema } from '../schemas/user.schema.js';
import { updateUserDocumentSchema } from '../schemas/userFile.schema.js';
import { requireRole, requireOwnership } from '../middlewares/role.middleware.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';
import { validateObjectIdParam } from '../utils/validators.js';
import User from '../models/User.js';

const router = Router();

// Aplicar autenticación a todas las rutas
router.use(authenticateToken);

// Perfil del usuario autenticado
router.get('/profile', getUserProfile);
router.put('/profile', schemaValidator(updateUserSchema), updateUserProfile);

// Avatar: subida/borrado del propio usuario y lectura de cualquier usuario autenticado (URL firmada)
router.post('/profile/avatar', avatarUpload, uploadAvatar);
router.delete('/profile/avatar', deleteUserAvatar);
router.get('/:id/avatar', validateObjectIdParam('id'), getUserAvatar);

// Documentos privados del usuario autenticado
router.get('/profile/documents', listDocuments);
router.post('/profile/documents', documentsUpload, uploadDocuments);
router.get('/profile/documents/:docId/download', validateObjectIdParam('docId'), downloadDocument);
router.patch('/profile/documents/:docId', validateObjectIdParam('docId'), schemaValidator(updateUserDocumentSchema), updateDocument);
router.delete('/profile/documents/:docId', validateObjectIdParam('docId'), deleteDocument);

// Rutas específicas para estudiantes - obtener educadores disponibles
router.get('/available-educators', requireRole(['student']), getAvailableEducators);

// Rutas administrativas
router.get('/', requireRole(['admin', 'tutor', 'student']), getUsers);
router.get('/:id', validateObjectIdParam('id'), requireRole(['admin', 'tutor']), getUserById);

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

export default router;