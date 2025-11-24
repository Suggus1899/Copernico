import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config.js';
import User from '../models/User.js';

export const authenticateToken = async (req, res, next) => {
  try {
    // Extraer token de los headers
    let token = null;

    // Intentar obtener del header Authorization (formato Bearer)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7); // Remover "Bearer "
    }
    // Si no está en Authorization, intentar en auth-token (compatibilidad)
    else if (req.headers['auth-token']) {
      token = req.headers['auth-token'];
    }
    // También verificar en el body o query (útil para testing, no recomendado en producción)
    else if (req.body?.token) {
      token = req.body.token;
    }
    else if (req.query?.token) {
      token = req.query.token;
    }

    // Si no hay token, retornar error
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No se proporcionó token de autenticación',
        error: 'Token requerido. Por favor, inicia sesión.'
      });
    }

    // Verificar y decodificar el token
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (jwtError) {
      // Manejar diferentes tipos de errores de JWT
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token expirado',
          error: 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.'
        });
      }
      if (jwtError.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          message: 'Token inválido',
          error: 'El token proporcionado no es válido.'
        });
      }
      throw jwtError; // Re-lanzar otros errores
    }

    // Verificar que el token tenga el _id
    if (!decoded._id) {
      return res.status(401).json({
        success: false,
        message: 'Token malformado',
        error: 'El token no contiene la información necesaria.'
      });
    }

    // Buscar el usuario en la base de datos
    const user = await User.findById(decoded._id)
      .select('-password -verificationToken -passwordResetToken');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no encontrado',
        error: 'El usuario asociado al token no existe.'
      });
    }

    // Verificar que el usuario esté activo
    if (user.status === 'deleted') {
      return res.status(401).json({
        success: false,
        message: 'Usuario eliminado',
        error: 'Esta cuenta ha sido eliminada.'
      });
    }

    if (user.status === 'suspended') {
      return res.status(403).json({
        success: false,
        message: 'Usuario suspendido',
        error: 'Tu cuenta ha sido suspendida. Contacta al administrador.'
      });
    }

    if (user.status === 'inactive') {
      return res.status(403).json({
        success: false,
        message: 'Usuario inactivo',
        error: 'Tu cuenta está inactiva. Por favor, contacta al administrador.'
      });
    }

    // Verificar si la cuenta está bloqueada por intentos fallidos
    if (user.lockedUntil && user.lockedUntil > Date.now()) {
      const minutesLeft = Math.ceil((user.lockedUntil - Date.now()) / 60000);
      return res.status(403).json({
        success: false,
        message: 'Cuenta bloqueada temporalmente',
        error: `Tu cuenta está bloqueada. Intenta nuevamente en ${minutesLeft} minuto(s).`
      });
    }

    // Agregar el usuario a la petición
    req.user = {
      id: user._id.toString(),
      _id: user._id,
      email: user.email,
      role: user.role,
      status: user.status,
      personalInfo: user.personalInfo,
      academicProfile: user.academicProfile,
      tutorProfile: user.tutorProfile,
      advisorProfile: user.advisorProfile,
      studentProfile: user.studentProfile,
      emailVerified: user.emailVerified,
      // Agregar el objeto completo del usuario por si se necesita
      user: user
    };

    // Continuar con la siguiente función
    next();
  } catch (error) {
    console.error('Error en middleware de autenticación:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: 'Ocurrió un error al verificar la autenticación.'
    });
  }
};

export const optionalAuth = async (req, res, next) => {
  try {
    let token = null;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (req.headers['auth-token']) {
      token = req.headers['auth-token'];
    }

    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded._id) {
          const user = await User.findById(decoded._id)
            .select('-password -verificationToken -passwordResetToken');
          
          if (user && user.status === 'active') {
            req.user = {
              id: user._id.toString(),
              _id: user._id,
              email: user.email,
              role: user.role,
              status: user.status,
              personalInfo: user.personalInfo,
              academicProfile: user.academicProfile,
              tutorProfile: user.tutorProfile,
              advisorProfile: user.advisorProfile,
              studentProfile: user.studentProfile,
              emailVerified: user.emailVerified,
              user: user
            };
          }
        }
      } catch (error) {
        // Si hay error con el token, simplemente continuar sin autenticar
        // No lanzar error
      }
    }
    
    next();
  } catch (error) {
    // En caso de error, continuar sin autenticar
    next();
  }
};

/**
 * NOTA: requireRole está duplicado en role.middleware.js
 * Este middleware usa el de role.middleware.js para mantener consistencia
 * Si necesitas usar requireRole, importa desde '../middlewares/role.middleware.js'
 */

export const requireOwnershipOrRole = (ownerField = 'userId', allowedRoles = ['admin']) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'No autenticado',
        error: 'Debes iniciar sesión para acceder a este recurso.'
      });
    }

    // Los administradores siempre tienen acceso
    if (allowedRoles.includes(req.user.role)) {
      return next();
    }
    req.requireOwnership = {
      field: ownerField,
      userId: req.user.id
    };

    next();
  };
};
