import mongoose from 'mongoose';

/**
 * Valida si un string es un ObjectId válido de MongoDB
 * @param {string} id - ID a validar
 * @returns {boolean} - true si es válido, false si no
 */
export const isValidObjectId = (id) => {
  if (!id) return false;
  return mongoose.isValidObjectId(id);
};

/**
 * Valida un ObjectId y lanza error si es inválido
 * @param {string} id - ID a validar
 * @param {string} fieldName - Nombre del campo para el mensaje de error
 * @throws {Error} - Si el ID no es válido
 */
export const validateObjectId = (id, fieldName = 'ID') => {
  if (!isValidObjectId(id)) {
    const error = new Error(`${fieldName} inválido`);
    error.status = 400;
    throw error;
  }
  return true;
};

/**
 * Middleware para validar ObjectId en parámetros de ruta
 * @param {string} paramName - Nombre del parámetro a validar (default: 'id')
 * @returns {Function} - Middleware de Express
 */
export const validateObjectIdParam = (paramName = 'id') => {
  return (req, res, next) => {
    const id = req.params[paramName];
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        error: `${paramName} inválido`
      });
    }
    next();
  };
};

