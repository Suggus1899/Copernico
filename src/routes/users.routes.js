import { Router } from 'express';
import { 
  getUsers, 
  createUser, 
  getUserById, 
  updateUser, 
  deleteUser,
  getUserProfile,
  updateUserProfile,
  uploadAvatar,
  updateUserAvatar,
  deleteUserAvatar,
  getAvailableEducators,
  checkEducatorAvailability
} from '../controllers/user.controller.js';
import { schemaValidator } from '../middlewares/schemaValidator.js';
// IMPORTAR LOS NOMBRES CORRECTOS que sí existen:
import { registerSchema as createUserSchema, updateProfileSchema as updateUserSchema } from '../schemas/user.schema.js';
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

// Rutas para avatar del usuario autenticado
router.post('/profile/avatar', uploadAvatar, updateUserAvatar);
router.delete('/profile/avatar', deleteUserAvatar);

// Rutas específicas para estudiantes - obtener educadores disponibles
router.get('/available-educators', requireRole(['student']), getAvailableEducators);
router.get('/check-availability/:educatorId', validateObjectIdParam('educatorId'), requireRole(['student']), checkEducatorAvailability);

// Rutas administrativas
router.get('/', requireRole(['admin', 'tutor', 'advisor', 'student']), getUsers);
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

export default router;