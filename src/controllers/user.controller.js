import User from "../models/User.js";
import Appointment from "../models/Appointment.js";
import { validateObjectId } from "../utils/validators.js";
import multer from 'multer';
import path from 'path';
import fs from 'fs';

export const getUsers = async (req, res, next) => {
  try {
    const { role, status, page = 1, limit = 10 } = req.query;
    const filter = { status: { $ne: 'deleted' } };
    
    // Si es un estudiante, aplicar restricciones de seguridad
    if (req.user.role === 'student') {
      // Los estudiantes solo pueden ver tutores y asesores activos
      if (role && ['tutor', 'advisor'].includes(role)) {
        // Si se especifica un rol válido, usarlo
        filter.role = role;
      } else if (!role) {
        // Si no se especifica rol, mostrar ambos
        filter.role = { $in: ['tutor', 'advisor'] };
      } else {
        // Si se especifica un rol inválido, no mostrar nada
        filter.role = { $in: [] };
      }
      filter.status = 'active';
    } else {
      // Para otros roles (admin, etc.), aplicar filtros normalmente
      if (role) filter.role = role;
      if (status) filter.status = status;
    }

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { createdAt: -1 }
    };

    // Seleccionar campos apropiados según el rol del usuario
    let selectFields = '-password -verificationToken -passwordResetToken';
    if (req.user.role === 'student') {
      // Los estudiantes solo ven información básica de tutores/asesores
      selectFields = 'personalInfo role tutorProfile advisorProfile email createdAt updatedAt';
    }

    // Obtener usuarios iniciales
    let users = await User.find(filter)
      .select(selectFields) 
      .limit(options.limit * 1)
      .skip((options.page - 1) * options.limit)
      .sort(options.sort);

    // Si es un estudiante, filtrar tutores/asesores que ya tienen citas confirmadas
    if (req.user.role === 'student') {
      console.log('🔍 Filtrando tutores/asesores con citas confirmadas para estudiante:', req.user.id);
      
      // Buscar citas confirmadas o completadas del estudiante
      const existingAppointments = await Appointment.find({
        studentId: req.user.id,
        status: { $in: ['confirmed', 'completed', 'scheduled'] }
      }).select('professionalId');

      // Extraer IDs de tutores/asesores que ya tienen citas con el estudiante
      const professionalIdsWithAppointments = existingAppointments.map(apt => apt.professionalId.toString());
      
      console.log('📅 Tutores/asesores con citas existentes:', professionalIdsWithAppointments.length);
      
      // Filtrar usuarios para excluir aquellos con citas confirmadas
      users = users.filter(user => {
        const hasExistingAppointment = professionalIdsWithAppointments.includes(user._id.toString());
        if (hasExistingAppointment) {
          console.log(`❌ Excluyendo ${user.personalInfo?.firstName} ${user.personalInfo?.lastName} - ya tiene citas confirmadas`);
        }
        return !hasExistingAppointment;
      });

      console.log('✅ Tutores/asesores disponibles después del filtro:', users.length);
    }

    const total = await User.countDocuments(filter);

    res.json({
      success: true,
      data: users,
      pagination: {
        page: options.page,
        limit: options.limit,
        total,
        pages: Math.ceil(total / options.limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getUserById = async (req, res, next) => {
  try {
    // Validar ObjectId
    validateObjectId(req.params.id, 'User ID');

    const user = await User.findById(req.params.id)
      .select('-password -verificationToken -passwordResetToken');
    
    if (!user || user.status === 'deleted') {
      const error = new Error("User not found");
      error.status = 404;
      throw error;
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    // Manejar errores de MongoDB
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        error: 'ID inválido'
      });
    }
    next(error);
  }
};

export const createUser = async (req, res, next) => {
  try {
    const userData = req.body;

    // Verificar si el usuario ya existe por email
    const userFound = await User.findOne({ 
      email: userData.email,
      status: { $ne: 'deleted' }
    });

    if (userFound) {
      const error = new Error("The user already exists");
      error.status = 409;
      throw error;
    }

    // Agregar información de auditoría
    if (req.user) {
      userData.createdBy = req.user.id;
      userData.updatedBy = req.user.id;
    }

    // Crear nuevo usuario
    const newUser = new User(userData);
    const userSaved = await newUser.save();
    
    // Excluir campos sensibles en la respuesta
    const userResponse = userSaved.toObject();
    delete userResponse.password;
    delete userResponse.verificationToken;
    delete userResponse.passwordResetToken;

    res.status(201).json({
      success: true,
      message: "User created successfully",
      data: userResponse
    });
  } catch (error) {
    next(error);
  }
};

export const updateUser = async (req, res, next) => {
  try {
    const updateData = { ...req.body };
    
    // Agregar información de auditoría
    if (req.user) {
      updateData.updatedBy = req.user.id;
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password -verificationToken -passwordResetToken');

    if (!user || user.status === 'deleted') {
      const error = new Error("User not found");
      error.status = 404;
      throw error;
    }

    res.json({
      success: true,
      message: "User updated successfully",
      data: user
    });
  } catch (error) {
    next(error);
  }
};

export const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Soft delete - marcar como deleted y agregar deletedAt
    const userDeleted = await User.findByIdAndUpdate(
      id,
      { 
        status: 'deleted',
        deletedAt: new Date(),
        updatedBy: req.user?.id 
      },
      { new: true }
    ).select('-password -verificationToken -passwordResetToken');

    if (!userDeleted) {
      const error = new Error("User not found");
      error.status = 404;
      throw error;
    }

    res.json({
      success: true,
      message: "User deleted successfully",
      data: userDeleted
    });
  } catch (error) {
    next(error);
  }
};

export const getUserProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id)
      .select('-password -verificationToken -passwordResetToken');
    
    if (!user || user.status === 'deleted') {
      const error = new Error("User not found");
      error.status = 404;
      throw error;
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

export const updateUserProfile = async (req, res, next) => {
  try {
    // Prevenir que usuarios normales cambien ciertos campos
    const allowedFields = [
      'personalInfo', 'academicProfile', 'studentProfile', 
      'tutorProfile', 'advisorProfile', 'communicationSettings'
    ];
    
    const updateData = {};
    allowedFields.forEach(field => {
      if (req.body[field]) {
        updateData[field] = req.body[field];
      }
    });

    // Agregar información de auditoría
    updateData.updatedBy = req.user.id;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password -verificationToken -passwordResetToken');

    res.json({
      success: true,
      message: "Profile updated successfully",
      data: user
    });
  } catch (error) {
    next(error);
  }
};

export const changeUserStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['active', 'inactive', 'suspended'].includes(status)) {
      const error = new Error("Invalid status");
      error.status = 400;
      throw error;
    }

    const user = await User.findByIdAndUpdate(
      id,
      { 
        status,
        updatedBy: req.user?.id 
      },
      { new: true }
    ).select('-password -verificationToken -passwordResetToken');

    if (!user) {
      const error = new Error("User not found");
      error.status = 404;
      throw error;
    }

    res.json({
      success: true,
      message: `User ${status} successfully`,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

// Configuración de multer para subida de avatares
const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = 'uploads/avatars/';
    // Crear directorio si no existe
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Generar nombre único para evitar conflictos
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'avatar-' + req.user.id + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const avatarFileFilter = (req, file, cb) => {
  // Permitir solo imágenes
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Solo se permiten archivos de imagen (JPG, PNG, GIF, WEBP)'), false);
  }
};

export const uploadAvatar = multer({
  storage: avatarStorage,
  fileFilter: avatarFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB máximo
  }
}).single('avatar');

export const updateUserAvatar = async (req, res, next) => {
  try {
    if (!req.file) {
      const error = new Error("No se proporcionó ningún archivo de imagen");
      error.status = 400;
      throw error;
    }

    // Obtener el usuario actual para eliminar el avatar anterior si existe
    const currentUser = await User.findById(req.user.id);
    
    // Eliminar avatar anterior si existe
    if (currentUser.personalInfo?.avatar) {
      const oldAvatarPath = currentUser.personalInfo.avatar.replace(
        process.env.BACKEND_URL || 'http://localhost:4002', 
        ''
      );
      const fullOldPath = path.join(process.cwd(), oldAvatarPath);
      
      if (fs.existsSync(fullOldPath)) {
        try {
          fs.unlinkSync(fullOldPath);
        } catch (error) {
          console.warn('No se pudo eliminar el avatar anterior:', error.message);
        }
      }
    }

    // Construir URL del nuevo avatar
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:4002';
    const avatarUrl = `${backendUrl}/uploads/avatars/${req.file.filename}`;

    // Actualizar el usuario con la nueva URL del avatar
    const updateData = {
      'personalInfo.avatar': avatarUrl,
      updatedBy: req.user.id
    };

    const user = await User.findByIdAndUpdate(
      req.user.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password -verificationToken -passwordResetToken');

    res.json({
      success: true,
      message: "Avatar actualizado exitosamente",
      data: {
        avatar: avatarUrl,
        user: user
      }
    });
  } catch (error) {
    // Si hay error, eliminar el archivo subido
    if (req.file && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        console.warn('No se pudo eliminar el archivo temporal:', unlinkError.message);
      }
    }
    next(error);
  }
};

export const deleteUserAvatar = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user.personalInfo?.avatar) {
      const error = new Error("El usuario no tiene avatar para eliminar");
      error.status = 404;
      throw error;
    }

    // Eliminar archivo del sistema de archivos
    const avatarPath = user.personalInfo.avatar.replace(
      process.env.BACKEND_URL || 'http://localhost:4002', 
      ''
    );
    const fullPath = path.join(process.cwd(), avatarPath);
    
    if (fs.existsSync(fullPath)) {
      try {
        fs.unlinkSync(fullPath);
      } catch (error) {
        console.warn('No se pudo eliminar el archivo del avatar:', error.message);
      }
    }

    // Actualizar usuario para remover la URL del avatar
    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { 
        $unset: { 'personalInfo.avatar': 1 },
        updatedBy: req.user.id
      },
      { new: true, runValidators: true }
    ).select('-password -verificationToken -passwordResetToken');

    res.json({
      success: true,
      message: "Avatar eliminado exitosamente",
      data: updatedUser
    });
  } catch (error) {
    next(error);
  }
};
// Endpoint específico para obtener tutores y asesores disponibles (sin citas confirmadas con el estudiante)
export const getAvailableEducators = async (req, res, next) => {
  try {
    const { role, page = 1, limit = 50 } = req.query;
    
    // Solo estudiantes pueden usar este endpoint
    if (req.user.role !== 'student') {
      const error = new Error("Solo los estudiantes pueden acceder a este endpoint");
      error.status = 403;
      throw error;
    }

    console.log('🔍 Obteniendo educadores disponibles para estudiante:', req.user.id);
    console.log('📋 Filtros - Rol:', role, 'Página:', page, 'Límite:', limit);

    // Filtro base para tutores y asesores activos
    const filter = { 
      status: 'active',
      role: role && ['tutor', 'advisor'].includes(role) ? role : { $in: ['tutor', 'advisor'] }
    };

    // Buscar citas confirmadas, completadas o programadas del estudiante
    const existingAppointments = await Appointment.find({
      studentId: req.user.id,
      status: { $in: ['confirmed', 'completed', 'scheduled'] }
    }).select('professionalId');

    // Extraer IDs de tutores/asesores que ya tienen citas con el estudiante
    const professionalIdsWithAppointments = existingAppointments.map(apt => apt.professionalId.toString());
    
    console.log('📅 Educadores con citas existentes:', professionalIdsWithAppointments.length);
    
    // Excluir educadores que ya tienen citas con el estudiante
    if (professionalIdsWithAppointments.length > 0) {
      filter._id = { $nin: professionalIdsWithAppointments };
    }

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { createdAt: -1 }
    };

    // Obtener educadores disponibles
    const educators = await User.find(filter)
      .select('personalInfo role tutorProfile advisorProfile academicProfile email createdAt updatedAt')
      .limit(options.limit * 1)
      .skip((options.page - 1) * options.limit)
      .sort(options.sort);

    const total = await User.countDocuments(filter);

    console.log('✅ Educadores disponibles encontrados:', educators.length);
    console.log('📊 Total en base de datos (después del filtro):', total);

    res.json({
      success: true,
      data: educators,
      pagination: {
        page: options.page,
        limit: options.limit,
        total,
        pages: Math.ceil(total / options.limit)
      },
      meta: {
        excludedEducators: professionalIdsWithAppointments.length,
        availableEducators: educators.length,
        requestedRole: role || 'all'
      }
    });
  } catch (error) {
    console.error('❌ Error obteniendo educadores disponibles:', error);
    next(error);
  }
};

// Endpoint para verificar si un estudiante tiene citas activas con un educador específico
export const checkEducatorAvailability = async (req, res, next) => {
  try {
    const { educatorId } = req.params;
    
    // Solo estudiantes pueden usar este endpoint
    if (req.user.role !== 'student') {
      const error = new Error("Solo los estudiantes pueden verificar disponibilidad");
      error.status = 403;
      throw error;
    }

    // Validar ObjectId
    validateObjectId(educatorId, 'Educator ID');

    // Verificar si el educador existe y es tutor o asesor
    const educator = await User.findById(educatorId).select('role personalInfo');
    if (!educator || !['tutor', 'advisor'].includes(educator.role)) {
      const error = new Error("Educador no encontrado o rol inválido");
      error.status = 404;
      throw error;
    }

    // Buscar citas activas entre el estudiante y el educador
    const activeAppointments = await Appointment.find({
      studentId: req.user.id,
      professionalId: educatorId,
      status: { $in: ['confirmed', 'completed', 'scheduled'] }
    }).select('status scheduledDate subject');

    const isAvailable = activeAppointments.length === 0;

    res.json({
      success: true,
      data: {
        educatorId,
        educatorName: `${educator.personalInfo?.firstName} ${educator.personalInfo?.lastName}`,
        educatorRole: educator.role,
        isAvailable,
        activeAppointments: activeAppointments.length,
        appointments: activeAppointments
      }
    });
  } catch (error) {
    next(error);
  }
};