import mongoose from 'mongoose';

export const requireRole = (roles = []) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthenticated' });
  if (!Array.isArray(roles) || roles.length === 0) return next();
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Forbidden - insufficient role' });
  }
  return next();
};

export const requireOwnership = (Model, idParam = 'id', ownerField = 'tutor') => {
  if (!Model || !Model.findById) {
    throw new Error('requireOwnership: provide a valid Mongoose Model as first argument');
  }

  
  return async (req, res, next) => {
    try {
      const resourceId = req.params[idParam];
      if (!resourceId || !mongoose.isValidObjectId(resourceId)) {
        return res.status(400).json({ message: 'Invalid resource id' });
      }

      const doc = await Model.findById(resourceId).select(ownerField).lean();
      if (!doc) return res.status(404).json({ message: 'Resource not found' });

      const ownerValue = ownerField.split('.').reduce((acc, k) => acc && acc[k], doc);
      if (!ownerValue) return res.status(403).json({ message: 'Forbidden' });

      const ownerIdStr = String(ownerValue);
      const userIdStr = String(req.user && (req.user._id || req.user.id));

      if (userIdStr === ownerIdStr || req.user.role === 'admin') {
        req.resource = doc; 
        return next();
      }

      return res.status(403).json({ message: 'Forbidden' });
    } catch (err) {
      return next(err);
    }
  };
};

export const requireOwnershipOrRole = (Model, idParam = 'id', ownerField = 'tutor', roles = []) => {
  const ownership = requireOwnership(Model, idParam, ownerField);
  const roleCheck = requireRole(roles);
  return (req, res, next) => {
    ownership(req, res, (err) => {
      if (!err && req.resource) return next();
      roleCheck(req, res, next);
    });
  };
};

// Exportación por defecto para compatibilidad con código existente
export default { 
  requireRole, 
  requireOwnership, 
  requireOwnershipOrRole 
};