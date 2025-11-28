/**
 * Maneja errores comunes de MongoDB
 * @param {Error} error - Error de MongoDB
 * @returns {Object} - Objeto con status y mensaje
 */
export const handleMongoError = (error) => {
  // Error de duplicado (código 11000)
  if (error.code === 11000) {
    const field = Object.keys(error.keyPattern || {})[0] || 'campo';
    return {
      status: 409,
      message: `El ${field} ya está en uso`
    };
  }

  // Error de validación de Mongoose
  if (error.name === 'ValidationError') {
    const messages = Object.values(error.errors).map(err => err.message);
    return {
      status: 400,
      message: messages.join(', ')
    };
  }

  // Error de Cast (ObjectId inválido)
  if (error.name === 'CastError') {
    return {
      status: 400,
      message: 'ID inválido'
    };
  }

  // Error por defecto
  return {
    status: 500,
    message: error.message || 'Error interno del servidor'
  };
};

