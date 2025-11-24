import { Router } from 'express';
import { 
  getAppointments,
  getAppointmentById,
  createAppointment,
  updateAppointment,
  cancelAppointment,
  addInternalNote,
  rateAppointment,
  getUpcomingAppointments
} from '../controllers/appointment.controller.js';
import { schemaValidator } from '../middlewares/schemaValidator.js';
import { 
  createAppointmentSchema, 
  updateAppointmentSchema, 
  addInternalNoteSchema, 
  rateAppointmentSchema 
} from '../schemas/appointment.schema.js';
import { requireRole, requireOwnership } from '../middlewares/role.middleware.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';
import Appointment from '../models/Appointment.js';

const router = Router();

// Aplicar autenticación a todas las rutas
router.use(authenticateToken);

// Obtener citas próximas del usuario
router.get('/upcoming', getUpcomingAppointments);

// Obtener todas las citas (filtradas por usuario según rol)
router.get('/', getAppointments);

// Obtener cita específica
router.get('/:id', getAppointmentById);

// Crear cita - estudiantes pueden crear sus propias citas
router.post('/', 
  requireRole(['student', 'admin']),
  schemaValidator(createAppointmentSchema),
  createAppointment
);

// Actualizar cita - solo admin, el profesional asignado, o el estudiante dueño
router.put('/:id', 
  requireRole(['student', 'tutor', 'advisor', 'admin']),
  schemaValidator(updateAppointmentSchema),
  updateAppointment
);

// Cancelar cita
router.patch('/:id/cancel', 
  requireRole(['student', 'tutor', 'advisor', 'admin']),
  cancelAppointment
);

// Agregar nota interna - solo profesionales y admin
router.post('/:id/notes', 
  requireRole(['tutor', 'advisor', 'admin']),
  schemaValidator(addInternalNoteSchema),
  addInternalNote
);

// Calificar cita - estudiante califica al profesional, profesional califica al estudiante
router.post('/:id/rate', 
  requireRole(['student', 'tutor', 'advisor']),
  schemaValidator(rateAppointmentSchema),
  rateAppointment
);

export default router;