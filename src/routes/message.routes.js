import { Router } from 'express';
import {
  createMessage,
  getConversations,
  getConversationWithUser,
  markConversationAsRead
} from '../controllers/message.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';
import { schemaValidator } from '../middlewares/schemaValidator.js';
import {
  createMessageSchema,
  getConversationSchema,
  markAsReadSchema
} from '../schemas/message.schema.js';

const router = Router();

router.use(authenticateToken);

// Lista de conversaciones del usuario autenticado
router.get('/conversations', getConversations);

// Historial de mensajes con un usuario concreto
router.get('/:otherUserId', schemaValidator(getConversationSchema), getConversationWithUser);

// Enviar mensaje
router.post('/', schemaValidator(createMessageSchema), createMessage);

// Marcar conversación como leída
router.patch('/:otherUserId/read', schemaValidator(markAsReadSchema), markConversationAsRead);

export default router;

