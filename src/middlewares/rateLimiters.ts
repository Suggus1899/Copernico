import type { RequestHandler } from 'express';
import rateLimit from 'express-rate-limit';
import { AppError } from '../utils/AppError.js';

const limiterHandler = (message: string): RequestHandler => (req, res, next) =>
  next(new AppError(429, 'RATE_LIMITED', message));

/**
 * Limitadores en memoria por IP. Son suficientes para una instancia; con
 * varias réplicas deben moverse a un almacén compartido (ver DEPLOY.md).
 */
const createLimiter = ({ windowMs, limit, message, skipSuccessfulRequests = false }: { windowMs: number; limit: number; message: string; skipSuccessfulRequests?: boolean }) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skipSuccessfulRequests,
    handler: limiterHandler(message),
  });

const FIFTEEN_MINUTES = 15 * 60 * 1000;
const ONE_HOUR = 60 * 60 * 1000;

/** Inicio de sesión: solo cuenta los intentos fallidos. */
export const signinLimiter = createLimiter({
  windowMs: FIFTEEN_MINUTES,
  limit: 20,
  skipSuccessfulRequests: true,
  message: 'Demasiados intentos de inicio de sesión. Inténtalo de nuevo más tarde.',
});

export const signupLimiter = createLimiter({
  windowMs: ONE_HOUR,
  limit: 10,
  message: 'Demasiados registros desde esta dirección. Inténtalo más tarde.',
});

/** Cambios sensibles que requieren la contraseña actual. */
export const sensitiveActionLimiter = createLimiter({
  windowMs: FIFTEEN_MINUTES,
  limit: 10,
  message: 'Demasiadas solicitudes de cambio sensible. Inténtalo más tarde.',
});

/** Techo global generoso para toda la API. */
export const globalLimiter = createLimiter({
  windowMs: FIFTEEN_MINUTES,
  limit: 1000,
  message: 'Demasiadas peticiones. Inténtalo más tarde.',
});
