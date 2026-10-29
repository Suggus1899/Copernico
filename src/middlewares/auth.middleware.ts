import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError.js';
import { SESSION_COOKIE, verifySessionToken } from '../utils/session.js';
import User from '../models/User.js';

const SESSION_INVALID = () =>
  new AppError(401, 'SESSION_INVALID', 'Tu sesión no es válida o ha expirado. Inicia sesión nuevamente.');

/**
 * Valida la cookie de sesión y carga el usuario actual en req.user.
 * La sesión sigue vigente solo si la versión (sv) coincide con la del usuario.
 */
export const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.cookies?.[SESSION_COOKIE];
    if (!token) {
      throw new AppError(401, 'UNAUTHENTICATED', 'Debes iniciar sesión para continuar.');
    }

    let claims;
    try {
      claims = verifySessionToken(token);
    } catch {
      throw SESSION_INVALID();
    }

    const user = await User.findById(claims.sub);
    if (!user || user.sessionVersion !== claims.sv) {
      throw SESSION_INVALID();
    }
    if (user.status !== 'active') {
      throw new AppError(403, 'ACCOUNT_UNAVAILABLE', 'Tu cuenta no está disponible. Contacta al administrador.');
    }

    req.user = {
      id: user._id.toString(),
      _id: user._id,
      email: user.email,
      role: user.role,
      status: user.status,
      emailVerified: user.emailVerified,
      personalInfo: user.personalInfo,
      academicProfile: user.academicProfile,
      tutorProfile: user.tutorProfile,
      studentProfile: user.studentProfile,
    };
    next();
  } catch (error) {
    next(error);
  }
};
