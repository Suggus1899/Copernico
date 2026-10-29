import type { Request, RequestHandler } from 'express';
import ActivityLog from '../models/ActivityLog.js';

export const logActivity = (action: string, pickMeta: (req: Request) => unknown = () => ({})): RequestHandler => {
  return async (req, res, next) => {
    try {
      // Ejecutar después de la respuesta si es posible
      const start = Date.now();
      const done = () => {
        const userId = req.user?._id || req.user?.id;
        if (!userId) return; // solo si autenticado
        const metadata = pickMeta(req) || {};
        ActivityLog.create({
          userId,
          action,
          ip: req.ip,
          userAgent: req.headers['user-agent'],
          metadata
        }).catch(() => {});
      };

      // Hook en finish para registrar tras enviar respuesta
      res.on('finish', done);
      next();
    } catch (_) {
      next();
    }
  };
};
