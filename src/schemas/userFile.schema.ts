import { z } from 'zod';

const updateDocumentBody = z
  .object({
    name: z.string().trim().min(1, 'El nombre no puede estar vacío').max(120).optional(),
    tags: z.array(z.string().trim().min(1).max(30)).max(10).optional(),
  })
  .refine((body) => body.name !== undefined || body.tags !== undefined, {
    message: 'Indica un nombre o etiquetas para actualizar',
  });

export const updateUserDocumentSchema = z.object({ body: updateDocumentBody });
