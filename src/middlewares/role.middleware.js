import mongoose from 'mongoose';
import { AppError } from '../utils/AppError.js';

/** Permite el acceso solo a usuarios autenticados cuyo rol esté en `roles`. */
export const requireRole = (roles = []) => (req, res, next) => {
  if (!req.user) return next(new AppError(401, 'UNAUTHENTICATED', 'Debes iniciar sesión'));
  if (!Array.isArray(roles) || roles.length === 0) return next();
  if (!roles.includes(req.user.role)) {
    return next(new AppError(403, 'FORBIDDEN', 'No tienes permisos para esta acción'));
  }
  return next();
};

/**
 * Permite el acceso al propietario del recurso (`ownerField`) o a un admin.
 * Deja el documento en `req.resource`.
 */
export const requireOwnership = (Model, idParam = 'id', ownerField = 'tutor') => {
  if (!Model || !Model.findById) {
    throw new Error('requireOwnership: provide a valid Mongoose Model as first argument');
  }

  return async (req, res, next) => {
    try {
      const resourceId = req.params[idParam];
      if (!resourceId || !mongoose.isValidObjectId(resourceId)) {
        throw new AppError(400, 'INVALID_ID', 'Identificador inválido');
      }

      const doc = await Model.findById(resourceId).select(ownerField).lean();
      if (!doc) throw new AppError(404, 'NOT_FOUND', 'Recurso no encontrado');

      const ownerValue = ownerField.split('.').reduce((acc, k) => acc && acc[k], doc);
      const isOwner = Boolean(ownerValue) && String(ownerValue) === String(req.user?._id);
      if (!isOwner && req.user?.role !== 'admin') {
        throw new AppError(403, 'FORBIDDEN', 'No tienes permisos para este recurso');
      }

      req.resource = doc;
      return next();
    } catch (err) {
      return next(err);
    }
  };
};

export default { requireRole, requireOwnership };