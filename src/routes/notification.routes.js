import { Router } from 'express';
import { 
  getNotifications,
  getNotificationById,
  createNotification,
  markAsRead,
  markAllAsRead,
  recordClick,
  respondToNotification,
  createBulkNotifications,
  getUnreadCount,
  deleteNotification,
  getNotificationStats
} from '../controllers/notification.controller.js';
import { schemaValidator } from '../middlewares/schemaValidator.js';
import { 
  createNotificationSchema, 
  updateNotificationSchema,
  bulkUpdateNotificationsSchema,
  createBulkNotificationsSchema,
  responseToNotificationSchema 
} from '../schemas/notification.schema.js';
import { requireRole } from '../middlewares/role.middleware.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';

const router = Router();

// Aplicar autenticación a todas las rutas
router.use(authenticateToken);

// Rutas para el usuario autenticado (sus propias notificaciones)
router.get('/', getNotifications);
router.get('/unread-count', getUnreadCount);
router.get('/stats', getNotificationStats);
router.get('/:id', getNotificationById);
router.patch('/:id/read', markAsRead);
router.patch('/read-all', markAllAsRead);
router.patch('/:id/click', recordClick);
router.post('/:id/respond', schemaValidator(responseToNotificationSchema), respondToNotification);
router.delete('/:id', deleteNotification);

// Rutas de administración: las notificaciones del flujo de citas se generan en el servidor
router.post('/', requireRole(['admin']), schemaValidator(createNotificationSchema), createNotification);
router.post('/bulk', requireRole(['admin']), schemaValidator(createBulkNotificationsSchema), createBulkNotifications);

export default router;