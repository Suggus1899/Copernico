import { Router } from 'express';
import { 
  getUsers, 
  createUser, 
  getUserById, 
  updateUser, 
  deleteUser,
  getUserProfile,
  updateUserProfile
} from '../controllers/user.controller.js';
import { schemaValidator } from '../middlewares/schemaValidator.js';
// IMPORTAR LOS NOMBRES CORRECTOS que sí existen:
import { registerSchema as createUserSchema, updateProfileSchema as updateUserSchema } from '../schemas/user.schema.js';
import { requireRole, requireOwnership } from '../middlewares/role.middleware.js';
import User from '../models/User.js';

const router = Router();

// Middleware de autenticación básico (REEMPLAZO de validateToken)
const requireAuth = (req, res, next) => {
  // Esto asume que otro middleware ya estableció req.user
  // Si no, necesitarás implementar la lógica de verificación de token
  if (!req.user) {
    return res.status(401).json({ 
      success: false,
      message: 'Authentication required. Please login.' 
    });
  }
  next();
};

// Aplicar autenticación básica a todas las rutas
router.use(requireAuth);

// Perfil del usuario autenticado
router.get('/profile', getUserProfile);
router.put('/profile', schemaValidator(updateUserSchema), updateUserProfile);

// Rutas administrativas
router.get('/', requireRole(['admin', 'tutor', 'advisor']), getUsers);
router.get('/:id', requireRole(['admin', 'tutor', 'advisor']), getUserById);

// Solo admin puede crear usuarios
router.post('/', requireRole(['admin']), schemaValidator(createUserSchema), createUser);

// Usuario puede actualizar su propio perfil, admin puede actualizar cualquier usuario
router.put('/:id', 
  requireOwnership(User, 'id', '_id'),
  schemaValidator(updateUserSchema), 
  updateUser
);

// Eliminar usuario - solo admin
router.delete('/:id', requireRole(['admin']), deleteUser);

export default router;