import type { Handler, BodyOf } from '../types/http.js';
import type { createUserSchema, updateProfileSchema } from '../schemas/user.schema.js';
import type { FilterQuery } from 'mongoose';
import type { UserRecord } from '../models/User.js';
import type { ParsedQs } from 'qs';
import { AppError } from '../utils/AppError.js';
import User from "../models/User.js";
import { validateObjectId } from "../utils/validators.js";
import { buildProfileSet } from "../utils/profileUpdate.js";
import { parsePagination } from "../utils/pagination.js";

// Directorio de tutores que aceptan citas: lo que ven estudiantes y tutores.
const tutorDirectoryFilter = () => ({
  role: 'tutor',
  status: 'active',
  'tutorProfile.available': { $ne: false },
});

// Campos del directorio: perfil profesional, sin teléfono, dirección ni otros datos personales.
const TUTOR_DIRECTORY_SELECT = [
  'role', 'email', 'createdAt', 'updatedAt',
  'personalInfo.firstName', 'personalInfo.lastName', 'personalInfo.specialty',
  'personalInfo.bio', 'personalInfo.degrees', 'personalInfo.experience',
  'personalInfo.certifications', 'personalInfo.avatar',
  'academicProfile', 'tutorProfile',
].join(' ');

const listTutorDirectory = async (query: ParsedQs, defaultLimit: number) => {
  const { page, limit } = parsePagination(query, defaultLimit, 100);
  const filter = tutorDirectoryFilter();
  const [data, total] = await Promise.all([
    User.find(filter)
      .select(TUTOR_DIRECTORY_SELECT)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    User.countDocuments(filter),
  ]);
  return { data, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
};

export const getUsers: Handler<Record<string, string>, unknown, BodyOf<typeof updateProfileSchema>> = async (req, res, next) => {
  try {
    // Admin gestiona todos los usuarios; estudiantes y tutores solo consultan el directorio.
    if (req.user!.role !== 'admin') {
      const result = await listTutorDirectory(req.query, 10);
      return res.json({ success: true, ...result });
    }

    const { role, status } = req.query;
    const { page, limit } = parsePagination(req.query, 10, 100);
    const filter: FilterQuery<UserRecord> = { status: { $ne: 'deleted' } };
    if (role) filter.role = role;
    if (status) filter.status = status;

    const [users, total] = await Promise.all([
      User.find(filter)
        .select('-password')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      User.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: users,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    next(error);
  }
};

export const getUserById: Handler<Record<string, string>, unknown, BodyOf<typeof updateProfileSchema>> = async (req, res, next) => {
  try {
    validateObjectId(req.params.id, 'User ID');

    const user = await User.findById(req.params.id).select('-password');

    if (!user || user.status === 'deleted') {
      throw new AppError(404, 'NOT_FOUND', "User not found");
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

export const createUser: Handler<Record<string, string>, unknown, BodyOf<typeof createUserSchema> & { createdBy?: string; updatedBy?: string }> = async (req, res, next) => {
  try {
    const userData = req.body;

    // Verificar si el usuario ya existe por email
    const userFound = await User.findOne({ 
      email: userData.email,
      status: { $ne: 'deleted' }
    });

    if (userFound) {
      throw new AppError(409, 'CONFLICT', "The user already exists");
    }

    // Agregar información de auditoría
    if (req.user) {
      userData.createdBy = req.user!.id;
      userData.updatedBy = req.user!.id;
    }

    // Crear nuevo usuario
    const newUser = new User(userData);
    const userSaved = await newUser.save();
    
    // Excluir campos sensibles en la respuesta
    const userResponse = userSaved.toObject();
    Reflect.deleteProperty(userResponse, 'password');

    res.status(201).json({
      success: true,
      message: "User created successfully",
      data: userResponse
    });
  } catch (error) {
    next(error);
  }
};

export const updateUser: Handler<Record<string, string>, unknown, BodyOf<typeof updateProfileSchema>> = async (req, res, next) => {
  try {
    const updateData = buildProfileSet(req.body);
    
    // Agregar información de auditoría
    if (req.user) {
      updateData.updatedBy = req.user!.id;
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!user || user.status === 'deleted') {
      throw new AppError(404, 'NOT_FOUND', "User not found");
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

export const deleteUser: Handler<Record<string, string>, unknown, BodyOf<typeof updateProfileSchema>> = async (req, res, next) => {
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
    ).select('-password');

    if (!userDeleted) {
      throw new AppError(404, 'NOT_FOUND', "User not found");
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

export const getUserProfile: Handler<Record<string, string>, unknown, BodyOf<typeof updateProfileSchema>> = async (req, res, next) => {
  try {
    const user = await User.findById(req.user!.id)
      .select('-password');
    
    if (!user || user.status === 'deleted') {
      throw new AppError(404, 'NOT_FOUND', "User not found");
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

export const updateUserProfile: Handler<Record<string, string>, unknown, BodyOf<typeof updateProfileSchema>> = async (req, res, next) => {
  try {
    // Solo secciones editables; $set por rutas puntuales no reemplaza subdocumentos completos.
    const updateData = buildProfileSet(req.body);
    updateData.updatedBy = req.user!.id;

    const user = await User.findByIdAndUpdate(
      req.user!.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      throw new AppError(404, 'NOT_FOUND', "User not found");
    }

    res.json({
      success: true,
      message: "Profile updated successfully",
      data: user
    });
  } catch (error) {
    next(error);
  }
};

// Directorio de tutores que aceptan citas, para estudiantes (la ruta exige rol student).
export const getAvailableEducators: Handler<Record<string, string>, unknown, BodyOf<typeof updateProfileSchema>> = async (req, res, next) => {
  try {
    const result = await listTutorDirectory(req.query, 50);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};
