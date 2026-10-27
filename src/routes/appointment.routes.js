import { Router } from 'express';
import {
  addInternalNote,
  cancelAppointment,
  completeAppointment,
  confirmAppointment,
  createAppointment,
  getAppointmentById,
  getTutorStudents,
  getUpcomingAppointments,
  listAppointments,
  rateAppointment,
  rejectAppointment,
} from '../controllers/appointment.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';
import { requireRole } from '../middlewares/role.middleware.js';
import { schemaValidator } from '../middlewares/schemaValidator.js';
import {
  addInternalNoteSchema,
  closeAppointmentSchema,
  confirmAppointmentSchema,
  createAppointmentSchema,
  listAppointmentsSchema,
  rateAppointmentSchema,
} from '../schemas/appointment.schema.js';
import { validateObjectIdParam } from '../utils/validators.js';

const router = Router();
const validId = validateObjectIdParam('id');

// Las rutas estáticas van antes de /:id.
router.use(authenticateToken);
router.get('/', schemaValidator(listAppointmentsSchema), listAppointments);
router.get('/upcoming', getUpcomingAppointments);
router.get('/my-students', requireRole(['tutor']), getTutorStudents);
router.post('/', requireRole(['student']), schemaValidator(createAppointmentSchema), createAppointment);

router.get('/:id', validId, getAppointmentById);
router.post('/:id/confirm', requireRole(['tutor']), validId, schemaValidator(confirmAppointmentSchema), confirmAppointment);
router.post('/:id/reject', requireRole(['tutor']), validId, schemaValidator(closeAppointmentSchema), rejectAppointment);
router.post('/:id/cancel', requireRole(['student', 'tutor']), validId, schemaValidator(closeAppointmentSchema), cancelAppointment);
router.post('/:id/complete', requireRole(['tutor']), validId, completeAppointment);
router.post('/:id/notes', requireRole(['tutor', 'admin']), validId, schemaValidator(addInternalNoteSchema), addInternalNote);
router.post('/:id/rate', requireRole(['student', 'tutor']), validId, schemaValidator(rateAppointmentSchema), rateAppointment);

export default router;
