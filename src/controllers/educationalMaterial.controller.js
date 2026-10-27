import EducationalMaterial from '../models/EducationalMaterial.js';
import { AppError } from '../utils/AppError.js';
import { escapeRegex } from '../utils/escapeRegex.js';
import { parsePagination } from '../utils/pagination.js';
import {
  DOCUMENT_EXTENSIONS,
  IMAGE_EXTENSIONS,
  buildObjectKey,
  identifyUpload,
  toDisplayName,
} from '../utils/fileTypes.js';
import { getStorage, removeQuietly } from '../services/storage/index.js';

const idOf = (value) => String(value?._id ?? value);

const notFound = () => new AppError(404, 'NOT_FOUND', 'Material educativo no encontrado.');

const withPublicRefs = (query) =>
  query
    .populate('createdBy', 'personalInfo email tutorProfile')
    .populate('allowedStudents', 'personalInfo email')
    .populate('ratings.userId', 'personalInfo')
    .populate('updatedBy', 'personalInfo')
    .populate('reviewedBy', 'personalInfo');

// Incluye fileKey (no se devuelve: el toJSON del modelo la elimina).
const findMaterial = (id) => EducationalMaterial.findById(id).select('+fileKey');

const assertCanManage = (material, user) => {
  if (user.role !== 'admin' && idOf(material.createdBy) !== user.id) {
    throw new AppError(403, 'FORBIDDEN', 'Solo el autor o un administrador puede modificar este material.');
  }
};

const parseTags = (tags) => {
  if (typeof tags !== 'string') return [];
  return tags.split(',').map((tag) => tag.trim()).filter(Boolean);
};

export const getEducationalMaterials = async (req, res, next) => {
  try {
    const { subject, type, difficulty, tags, isAssignment, status = 'published', createdBy, visibility } = req.query;
    const { page, limit } = parsePagination(req.query, 20, 50);

    // Los estudiantes solo ven material publicado, nunca borradores.
    const filter = { status: req.user.role === 'student' ? 'published' : status };
    if (subject) filter.subject = new RegExp(escapeRegex(subject), 'i');
    if (type) filter.type = type;
    if (difficulty) filter.difficulty = difficulty;
    if (isAssignment !== undefined) filter.isAssignment = isAssignment === 'true';
    if (createdBy) filter.createdBy = createdBy;
    if (visibility) filter.visibility = visibility;
    if (tags) filter.tags = { $in: parseTags(String(tags)).map((tag) => tag.toLowerCase()) };

    if (req.user.role === 'student') {
      filter.$or = [
        { visibility: 'public' },
        { visibility: 'students' },
        { createdBy: req.user.id },
        { allowedStudents: req.user.id },
        { allowedGroups: { $in: req.user.studentProfile?.enrolledCourses || [] } },
      ];
    } else if (req.user.role === 'tutor') {
      filter.$or = [
        { createdBy: req.user.id },
        { status: 'published', visibility: { $in: ['public', 'students'] } },
      ];
    }

    const [materials, total] = await Promise.all([
      withPublicRefs(EducationalMaterial.find(filter))
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      EducationalMaterial.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: materials,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
};

export const getEducationalMaterialById = async (req, res, next) => {
  try {
    const material = await withPublicRefs(EducationalMaterial.findById(req.params.id));
    if (!material) throw notFound();
    if (!material.canAccess(req.user)) {
      throw new AppError(403, 'FORBIDDEN', 'No tienes acceso a este material.');
    }

    await material.incrementViews();
    res.json({ success: true, data: material });
  } catch (error) {
    next(error);
  }
};

export const createEducationalMaterial = async (req, res, next) => {
  try {
    const { title, subject, description, topic, tags, difficulty, targetStudentId } = req.body;
    if (!title?.trim() || !subject?.trim()) {
      throw new AppError(400, 'BAD_REQUEST', 'El título y la materia son obligatorios.');
    }
    if (!req.file) {
      throw new AppError(400, 'BAD_REQUEST', 'Debes adjuntar un archivo.');
    }

    // El tipo sale del contenido real del archivo, no del nombre ni del mimetype declarado.
    const kind = identifyUpload(req.file, DOCUMENT_EXTENSIONS);
    const storage = getStorage();
    const fileKey = buildObjectKey('materials', kind.ext, req.user.id);
    await storage.upload(fileKey, req.file.buffer, kind.mime);

    try {
      const material = await EducationalMaterial.create({
        title: title.trim(),
        subject: subject.trim(),
        description: description?.trim() || undefined,
        topic: topic?.trim() || undefined,
        type: IMAGE_EXTENSIONS.includes(kind.ext) ? 'image' : 'document',
        difficulty,
        tags: parseTags(tags).map((tag) => tag.toLowerCase()),
        status: 'published',
        visibility: 'students',
        createdBy: req.user.id,
        targetStudentId: targetStudentId?.trim() || undefined,
        allowedStudents: targetStudentId?.trim() ? [targetStudentId.trim()] : [],
        fileKey,
        fileSize: req.file.size,
        originalFileName: toDisplayName(req.file.originalname, kind.ext),
        mimeType: kind.mime,
      });
      res.status(201).json({ success: true, message: 'Material creado correctamente.', data: material });
    } catch (error) {
      await removeQuietly(storage, [fileKey]);
      throw error;
    }
  } catch (error) {
    next(error);
  }
};

export const updateEducationalMaterial = async (req, res, next) => {
  try {
    const material = await findMaterial(req.params.id);
    if (!material) throw notFound();
    assertCanManage(material, req.user);

    // El esquema zod ya descarta campos no editables (archivo, autor, tipo).
    const updated = await withPublicRefs(
      EducationalMaterial.findByIdAndUpdate(
        req.params.id,
        { ...req.body, updatedBy: req.user.id },
        { new: true, runValidators: true }
      )
    );
    res.json({ success: true, message: 'Material actualizado correctamente.', data: updated });
  } catch (error) {
    next(error);
  }
};

export const deleteEducationalMaterial = async (req, res, next) => {
  try {
    const material = await findMaterial(req.params.id);
    if (!material) throw notFound();
    assertCanManage(material, req.user);

    const { fileKey } = material;
    const storage = fileKey ? getStorage() : null;
    await material.deleteOne();
    if (storage) await removeQuietly(storage, [fileKey]);

    res.json({ success: true, message: 'Material eliminado correctamente.' });
  } catch (error) {
    next(error);
  }
};

export const downloadEducationalMaterial = async (req, res, next) => {
  try {
    const material = await EducationalMaterial.findById(req.params.id).select('+fileKey');
    if (!material) throw notFound();
    if (!material.canAccess(req.user)) {
      throw new AppError(403, 'FORBIDDEN', 'No tienes acceso a este material.');
    }
    if (!material.fileKey) {
      throw new AppError(404, 'NOT_FOUND', 'Este material no tiene un archivo descargable.');
    }

    const url = await getStorage().createSignedUrl(material.fileKey, {
      downloadName: material.originalFileName || undefined,
    });
    await material.incrementDownloads();
    res.redirect(302, url);
  } catch (error) {
    next(error);
  }
};

export const rateEducationalMaterial = async (req, res, next) => {
  try {
    const { rating, comment } = req.body;
    const material = await EducationalMaterial.findById(req.params.id);
    if (!material) throw notFound();
    if (!material.canAccess(req.user)) {
      throw new AppError(403, 'FORBIDDEN', 'No tienes acceso a este material.');
    }
    if (idOf(material.createdBy) === req.user.id) {
      throw new AppError(400, 'BAD_REQUEST', 'No puedes calificar tu propio material.');
    }

    await material.addRating(req.user.id, rating, comment);
    const updated = await EducationalMaterial.findById(req.params.id).populate('ratings.userId', 'personalInfo');

    res.json({ success: true, message: 'Material calificado correctamente.', data: updated.ratings });
  } catch (error) {
    next(error);
  }
};

export const shareEducationalMaterial = async (req, res, next) => {
  try {
    const material = await findMaterial(req.params.id);
    if (!material) throw notFound();
    assertCanManage(material, req.user);

    const { students, groups, visibility } = req.body;
    const updateData = { updatedBy: req.user.id };
    if (students !== undefined) updateData.allowedStudents = students;
    if (groups !== undefined) updateData.allowedGroups = groups;
    if (visibility !== undefined) updateData.visibility = visibility;

    const updated = await withPublicRefs(
      EducationalMaterial.findByIdAndUpdate(req.params.id, updateData, { new: true })
    );
    res.json({ success: true, message: 'Configuración de compartido actualizada.', data: updated });
  } catch (error) {
    next(error);
  }
};

export const getMyEducationalMaterials = async (req, res, next) => {
  try {
    const { status, type, isAssignment } = req.query;
    const filter = { createdBy: req.user.id };
    if (status) filter.status = status;
    if (type) filter.type = type;
    if (isAssignment !== undefined) filter.isAssignment = isAssignment === 'true';

    const materials = await EducationalMaterial.find(filter)
      .populate('allowedStudents', 'personalInfo email')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: materials });
  } catch (error) {
    next(error);
  }
};

export const changeMaterialStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const material = await findMaterial(req.params.id);
    if (!material) throw notFound();
    assertCanManage(material, req.user);

    const updateData = { status, updatedBy: req.user.id };
    if (status === 'published' && req.user.role === 'admin') {
      updateData.reviewedBy = req.user.id;
      updateData.reviewedAt = new Date();
    }

    const updated = await withPublicRefs(
      EducationalMaterial.findByIdAndUpdate(req.params.id, updateData, { new: true })
    );
    res.json({ success: true, message: `Estado del material actualizado a ${status}.`, data: updated });
  } catch (error) {
    next(error);
  }
};

export const getPopularMaterials = async (req, res, next) => {
  try {
    const { subject, type } = req.query;
    const { limit } = parsePagination(req.query, 10, 50);

    const filter = {
      status: 'published',
      visibility: { $in: ['public', 'students'] },
    };
    if (subject) filter.subject = new RegExp(escapeRegex(subject), 'i');
    if (type) filter.type = type;

    if (req.user.role === 'student') {
      filter.$or = [
        { visibility: 'public' },
        { visibility: 'students' },
        { allowedStudents: req.user.id },
        { allowedGroups: { $in: req.user.studentProfile?.enrolledCourses || [] } },
      ];
    }

    const materials = await EducationalMaterial.find(filter)
      .populate('createdBy', 'personalInfo email tutorProfile')
      .sort({ views: -1, averageRating: -1 })
      .limit(limit);

    res.json({ success: true, data: materials });
  } catch (error) {
    next(error);
  }
};
