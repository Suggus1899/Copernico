import { z } from 'zod';

export const createMessageSchema = z.object({
  body: z.object({
    to: z.string().min(1, 'El usuario destino es requerido'),
    text: z.string().min(1, 'El mensaje no puede estar vacío').max(2000, 'El mensaje es demasiado largo')
  })
});

export const getConversationSchema = z.object({
  params: z.object({
    otherUserId: z.string().min(1, 'El ID del otro usuario es requerido')
  }),
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional()
  }).optional()
});

export const markAsReadSchema = z.object({
  params: z.object({
    otherUserId: z.string().min(1, 'El ID del otro usuario es requerido')
  })
});

