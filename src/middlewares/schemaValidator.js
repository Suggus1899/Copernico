/**
 * Valida `body`, `query` y `params` con un esquema zod de la forma
 * `z.object({ body?, query?, params? })`. Los valores parseados (con
 * transformaciones y sin claves desconocidas) reemplazan a los originales.
 * Los errores se delegan al errorHandler (422 VALIDATION_ERROR).
 */
export const schemaValidator = (schema) => async (req, res, next) => {
  try {
    const parsed = await schema.parseAsync({
      body: req.body,
      query: req.query,
      params: req.params,
    });
    if (parsed.body !== undefined) req.body = parsed.body;
    if (parsed.query !== undefined) req.query = parsed.query;
    if (parsed.params !== undefined) req.params = parsed.params;
    return next();
  } catch (error) {
    return next(error);
  }
};
