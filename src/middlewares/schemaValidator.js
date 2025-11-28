export const schemaValidator = (schema) => async (req, res, next) => {
  try {
    await schema.parseAsync(req);
    next();
  } catch (error) {
    // Log error en desarrollo
    if (process.env.NODE_ENV === 'development') {
      console.error('Validation error:', error.errors);
    }
    
    return res.status(400).json({ 
      success: false,
      errors: error.errors?.map(err => err.message) || [error.message || 'Error de validación']
    });
  }
};
