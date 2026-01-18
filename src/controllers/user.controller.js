import User from "../models/User.js";
import { validateObjectId } from "../utils/validators.js";
import bcrypt from 'bcryptjs';
import ActivityLog from "../models/ActivityLog.js";
import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';

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

export const deleteMe = async (req, res, next) => {
  try {
    const { password } = req.body || {};

    const user = await User.findById(req.user.id).select('+password');
    if (!user || user.status === 'deleted') {
      const error = new Error("User not found");
      error.status = 404;
      throw error;
    }

    // Confirmación de contraseña
    if (!password) {
      return res.status(400).json({ success: false, error: 'La contraseña es requerida' });
    }
    const ok = await user.comparePassword(password);
    if (!ok) {
      return res.status(400).json({ success: false, error: 'La contraseña es incorrecta' });
    }

    user.status = 'deleted';
    user.deletedAt = new Date();
    await user.save({ validateBeforeSave: false });

    return res.json({ success: true, message: 'Cuenta eliminada (soft delete)'});
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

export const uploadAvatar = async (req, res, next) => {
  try {
    if (!req.user?._id) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    const file = req.file;
    if (!file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }
    // Procesar imagen: recorte/resize 256x256 cover
    const ext = path.extname(file.filename) || '.jpg';
    const base = path.basename(file.filename, ext);
    const processedName = `${base}-256x256${ext}`;
    const avatarsDir = path.join(process.cwd(), 'uploads', 'avatars');
    const processedPath = path.join(avatarsDir, processedName);
    try {
      await sharp(file.path).resize(256,256,{ fit: 'cover' }).toFile(processedPath);
      // Eliminar original para ahorrar espacio
      await fs.unlink(file.path).catch(()=>{});
    } catch (imgErr) {
      // Si falla el procesamiento, usar el archivo original
    }
    const finalFile = await fs.stat(processedPath).then(()=>processedName).catch(()=>file.filename);
    const fileUrl = `${req.protocol}://${req.get('host')}/uploads/avatars/${finalFile}`;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: { 'personalInfo.avatar': fileUrl, updatedBy: req.user._id } },
      { new: true }
    ).select('-password -verificationToken -passwordResetToken');
    return res.status(201).json({ success: true, data: { avatar: fileUrl, user } });
  } catch (error) {
    next(error);
  }
};

export const getMyActivity = async (req, res, next) => {
  try {
    const { limit = 20 } = req.query;
    const logs = await ActivityLog.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));
    res.json({ success: true, data: logs });
  } catch (error) {
    next(error);
  }
};

export const uploadDocuments = async (req, res, next) => {
  try {
    const role = req.user?.role;
    if (!['tutor','advisor'].includes(role)) {
      return res.status(403).json({ success: false, error: 'Solo tutores o asesores pueden subir documentos' });
    }
    const files = req.files || [];
    if (!files.length) {
      return res.status(400).json({ success: false, error: 'No se recibieron documentos' });
    }
    const docs = files.map(f => ({
      url: `${req.protocol}://${req.get('host')}/uploads/documents/${f.filename}`,
      name: f.originalname,
      tags: [],
      uploadedAt: new Date()
    }));
    const update = role === 'tutor'
      ? { $push: { 'tutorProfile.documents': { $each: docs } }, updatedBy: req.user._id }
      : { $push: { 'advisorProfile.documents': { $each: docs } }, updatedBy: req.user._id };
    const user = await User.findByIdAndUpdate(req.user._id, update, { new: true })
      .select('-password -verificationToken -passwordResetToken');
    return res.status(201).json({ success: true, data: { documents: docs, user } });
  } catch (error) {
    next(error);
  }
};

export const getMyDocuments = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('tutorProfile.documents advisorProfile.documents role');
    let docs = user?.role === 'tutor' ? (user.tutorProfile?.documents || []) : (user.advisorProfile?.documents || []);
    // Normalizar a objetos {url,name,tags}
    docs = docs.map(d => {
      if (typeof d === 'string') {
        const name = d.split('/').pop();
        return { url: d, name, tags: [] };
      }
      return { url: d.url, name: d.name || (d.url || '').split('/').pop(), tags: Array.isArray(d.tags) ? d.tags : [] };
    });
    res.json({ success: true, data: { role: user?.role, documents: docs } });
  } catch (error) {
    next(error);
  }
};

export const deleteDocument = async (req, res, next) => {
  try {
    const role = req.user?.role;
    if (!['tutor','advisor'].includes(role)) {
      return res.status(403).json({ success: false, error: 'Solo tutores o asesores pueden borrar documentos' });
    }
    const url = req.body?.url || req.query?.url;
    if (!url) {
      return res.status(400).json({ success: false, error: 'Falta parámetro url del documento' });
    }
    const user = await User.findById(req.user._id).select('tutorProfile.documents advisorProfile.documents');
    const docsArr = role === 'tutor' ? (user.tutorProfile?.documents || []) : (user.advisorProfile?.documents || []);
    const hasDoc = docsArr.some(d => (typeof d === 'string' ? d === url : d?.url === url));
    if (!hasDoc) {
      return res.status(404).json({ success: false, error: 'Documento no encontrado en tu perfil' });
    }
    // Intentar eliminar el archivo físico si es de nuestra carpeta
    try {
      const u = new URL(url);
      if (u.pathname.startsWith('/uploads/documents/')) {
        const filename = path.basename(u.pathname);
        const filePath = path.join(process.cwd(), 'uploads', 'documents', filename);
        await fs.unlink(filePath).catch(()=>{});
      }
    } catch (_) {}
    // Quitar referencia del perfil
    // Quitar objeto con url o string simple
    if (role === 'tutor') {
      await User.findByIdAndUpdate(req.user._id, { $pull: { 'tutorProfile.documents': { url } } });
      await User.findByIdAndUpdate(req.user._id, { $pull: { 'tutorProfile.documents': url }, updatedBy: req.user._id });
    } else {
      await User.findByIdAndUpdate(req.user._id, { $pull: { 'advisorProfile.documents': { url } } });
      await User.findByIdAndUpdate(req.user._id, { $pull: { 'advisorProfile.documents': url }, updatedBy: req.user._id });
    }
    return res.json({ success: true, message: 'Documento eliminado' });
  } catch (error) {
    next(error);
  }
};

export const renameDocument = async (req, res, next) => {
  try {
    const { url, name } = req.body || {};
    const role = req.user?.role;
    if (!url || !name) return res.status(400).json({ success: false, error: 'Faltan parámetros url y name' });
    if (!['tutor','advisor'].includes(role)) {
      return res.status(403).json({ success: false, error: 'Solo tutores o asesores pueden renombrar documentos' });
    }
    const user = await User.findById(req.user._id);
    let list = role === 'tutor' ? (user.tutorProfile?.documents || []) : (user.advisorProfile?.documents || []);
    let changed = false;
    list = list.map(d => {
      if (typeof d === 'string') {
        if (d === url) { changed = true; return { url: d, name, tags: [] }; }
        return d;
      }
      if (d?.url === url) { changed = true; return { ...d, name }; }
      return d;
    });
    if (!changed) return res.status(404).json({ success: false, error: 'Documento no encontrado' });
    if (role === 'tutor') user.tutorProfile.documents = list; else user.advisorProfile.documents = list;
    user.updatedBy = req.user._id;
    await user.save();
    res.json({ success: true, message: 'Documento renombrado' });
  } catch (error) { next(error); }
};

export const updateDocumentTags = async (req, res, next) => {
  try {
    const { url, tags } = req.body || {};
    const role = req.user?.role;
    if (!url || !Array.isArray(tags)) return res.status(400).json({ success: false, error: 'Faltan parámetros url y tags[]' });
    if (!['tutor','advisor'].includes(role)) {
      return res.status(403).json({ success: false, error: 'Solo tutores o asesores pueden editar etiquetas' });
    }
    const user = await User.findById(req.user._id);
    let list = role === 'tutor' ? (user.tutorProfile?.documents || []) : (user.advisorProfile?.documents || []);
    let changed = false;
    list = list.map(d => {
      if (typeof d === 'string') {
        if (d === url) { changed = true; return { url: d, name: d.split('/').pop(), tags: tags.filter(Boolean) }; }
        return d;
      }
      if (d?.url === url) { changed = true; return { ...d, tags: tags.filter(Boolean) }; }
      return d;
    });
    if (!changed) return res.status(404).json({ success: false, error: 'Documento no encontrado' });
    if (role === 'tutor') user.tutorProfile.documents = list; else user.advisorProfile.documents = list;
    user.updatedBy = req.user._id;
    await user.save();
    res.json({ success: true, message: 'Etiquetas actualizadas' });
  } catch (error) { next(error); }
};