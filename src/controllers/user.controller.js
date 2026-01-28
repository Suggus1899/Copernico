import User from "../models/User.js";
import { validateObjectId } from "../utils/validators.js";

export const getUsers = async (req, res, next) => {
  try {
    const { role, status, page = 1, limit = 10 } = req.query;
    const filter = { status: { $ne: 'deleted' } };
    
    if (role) filter.role = role;
    if (status) filter.status = status;

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { createdAt: -1 }
    };

    const users = await User.find(filter)
      .select('-password -verificationToken -passwordResetToken') 
      .limit(options.limit * 1)
      .skip((options.page - 1) * options.limit)
      .sort(options.sort);

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
      const error = new Error("El usuario con este correo electrónico ya existe");
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
      message: "Usuario creado exitosamente",
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
      const error = new Error("Usuario no encontrado");
      error.status = 404;
      throw error;
    }

    res.json({
      success: true,
      message: "Usuario actualizado exitosamente",
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
      const error = new Error("Usuario no encontrado");
      error.status = 404;
      throw error;
    }

    res.json({
      success: true,
      message: "Usuario eliminado exitosamente",
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
      const error = new Error("Usuario no encontrado");
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
      message: "Perfil actualizado exitosamente",
      data: user
    });
  } catch (error) {
    next(error);
  }
};


import fs from 'fs';
import path from 'path';

export const updateUserAvatar = async (req, res, next) => {
  try {
    // El middleware uploadAvatar debe haber guardado el archivo y puesto req.file
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No se subió ningún archivo.'
      });
    }

    const user = await User.findById(req.user.id);
    if (!user || user.status === 'deleted') {
      const error = new Error('Usuario no encontrado');
      error.status = 404;
      throw error;
    }

    // Si ya tenía avatar, eliminar el anterior
    if (user.avatar) {
      const oldAvatarPath = path.join(process.cwd(), 'uploads', 'avatars', user.avatar);
      if (fs.existsSync(oldAvatarPath)) {
        fs.unlinkSync(oldAvatarPath);
      }
    }

    // Guardar el nuevo nombre de archivo
    user.avatar = req.file.filename;
    user.updatedBy = req.user.id;
    await user.save();

    res.json({
      success: true,
      message: 'Avatar actualizado exitosamente.',
      avatar: user.avatar
    });
  } catch (error) {
    next(error);
  }
};

export const deleteUserAvatar = async (req, res, next) => {
  try {
    // Buscar usuario autenticado
    const user = await User.findById(req.user.id);
    if (!user || user.status === 'deleted') {
      const error = new Error('Usuario no encontrado');
      error.status = 404;
      throw error;
    }

    // Si no hay avatar, responder OK
    if (!user.avatar) {
      return res.status(200).json({
        success: true,
        message: 'El usuario no tiene avatar para eliminar.'
      });
    }

    // Ruta absoluta del archivo de avatar
    const avatarPath = path.join(process.cwd(), 'uploads', 'avatars', user.avatar);
    // Eliminar archivo si existe
    if (fs.existsSync(avatarPath)) {
      fs.unlinkSync(avatarPath);
    }

    // Limpiar campo avatar en la base de datos
    user.avatar = undefined;
    user.updatedBy = req.user.id;
    await user.save();

    res.json({
      success: true,
      message: 'Avatar eliminado exitosamente.'
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
      const error = new Error("Estado inválido");
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
      const error = new Error("Usuario no encontrado");
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