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

const router = Router();

// Middleware de autenticación básico
const requireAuth = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      success: false,
      message: 'Authentication required. Please login.' 
    });
  }
  next();
};

// Aplicar autenticación a todas las rutas
router.use(requireAuth);

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

// Rutas para administración (tutores/asesores/admin)
router.post('/', requireRole(['tutor', 'advisor', 'admin']), schemaValidator(createNotificationSchema), createNotification);
router.post('/bulk', requireRole(['tutor', 'advisor', 'admin']), schemaValidator(createBulkNotificationsSchema), createBulkNotifications);

export default router;