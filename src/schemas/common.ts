import { z } from 'zod';

/** Identificador de MongoDB: 24 caracteres hexadecimales. */
export const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Identificador no válido');
