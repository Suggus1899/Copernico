import type { RequestHandler } from 'express';
import type { z } from 'zod';
/**
 * Valida `body`, `query` y `params` con un esquema zod de la forma
 * `z.object({ body?, query?, params? })`. Los valores parseados (con
 * transformaciones y sin claves desconocidas) reemplazan a los originales.
 * Los errores se delegan al errorHandler (422 VALIDATION_ERROR).
 */
export const schemaValidator = <S extends z.ZodType<{ body?: unknown; query?: unknown; params?: unknown }>>(schema: S): RequestHandler => async (req, res, next) => {
  try {
    const parsed = await schema.parseAsync({
      body: req.body,
      query: req.query,
      params: req.params,
    });
    if (parsed.body !== undefined) req.body = parsed.body;
    if (parsed.query !== undefined) Object.assign(req, { query: parsed.query });
    if (parsed.params !== undefined) Object.assign(req, { params: parsed.params });
    return next();
  } catch (error) {
    return next(error);
  }
};
