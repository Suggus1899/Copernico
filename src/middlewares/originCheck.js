import { config } from '../config.js';
import { AppError } from '../utils/AppError.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Defensa adicional frente a CSRF para métodos que modifican estado.
 * Las cookies de sesión ya son SameSite=Lax; si el navegador envía `Origin`
 * y no está en la lista de orígenes permitidos, la petición se rechaza.
 * Las peticiones sin `Origin` (clientes no navegador, tests) no se bloquean aquí.
 */
export function originCheck(req, res, next) {
  if (SAFE_METHODS.has(req.method)) return next();
  const origin = req.get('origin');
  if (origin === undefined) return next();
  if (config.FRONTEND_ORIGINS.includes(origin)) return next();
  return next(new AppError(403, 'FORBIDDEN_ORIGIN', 'Origen no permitido.'));
}
