import mongoose from 'mongoose';
import { AppError } from './AppError.js';

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
 * @throws {AppError} - Si el ID no es válido (400 INVALID_ID)
 */
export const validateObjectId = (id, fieldName = 'ID') => {
  if (!isValidObjectId(id)) {
    throw new AppError(400, 'INVALID_ID', `${fieldName} inválido`);
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
    if (!isValidObjectId(req.params[paramName])) {
      return next(new AppError(400, 'INVALID_ID', `${paramName} inválido`));
    }
    return next();
  };
};

