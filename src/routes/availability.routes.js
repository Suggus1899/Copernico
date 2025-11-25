import { Router } from 'express';
import { 
  getAvailabilitySlots,
  getAvailabilitySlotById,
  createAvailabilitySlot,
  updateAvailabilitySlot,
  deleteAvailabilitySlot,
  getMyAvailabilitySlots,
  getAvailableSlotsForSubject,
  bulkUpdateAvailabilityStatus
} from '../controllers/availability.controller.js';
import { schemaValidator } from '../middlewares/schemaValidator.js';
import { createAvailabilitySchema, updateAvailabilitySchema } from '../schemas/availability.schema.js';
import { requireRole, requireOwnership } from '../middlewares/role.middleware.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';
import AvailabilitySlot from '../models/AvailabilitySlot.js';

const router = Router();

// Aplicar autenticación a todas las rutas
router.use(authenticateToken);

// Obtener slots disponibles por materia (público para usuarios autenticados)
router.get('/available', getAvailableSlotsForSubject);

// Obtener mis slots (para tutores/asesores)
router.get('/my-slots', requireRole(['tutor', 'advisor']), getMyAvailabilitySlots);

// CRUD principal
router.get('/', requireRole(['admin', 'tutor', 'advisor']), getAvailabilitySlots);
router.get('/:id', requireRole(['admin', 'tutor', 'advisor']), getAvailabilitySlotById);

// Crear slot - solo tutores/asesores pueden crear sus propios slots
router.post('/', 
  requireRole(['tutor', 'advisor']),
  schemaValidator(createAvailabilitySchema),
  createAvailabilitySlot
);

// Actualizar slot - solo el dueño o admin
router.put('/:id', 
  requireOwnership(AvailabilitySlot, 'id', 'userId'),
  schemaValidator(updateAvailabilitySchema),
  updateAvailabilitySlot
);

// Eliminar slot - solo el dueño o admin
router.delete('/:id', 
  requireOwnership(AvailabilitySlot, 'id', 'userId'),
  deleteAvailabilitySlot
);

// Bulk operations - solo admin
router.patch('/bulk/status', 
  requireRole(['admin']),
  bulkUpdateAvailabilityStatus
);

export default router;