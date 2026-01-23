import ClassVideo from "../models/ClassVideo.js";
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Configuración de multer para subida de archivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === 'videoFile') {
      cb(null, 'uploads/videos/');
    } else if (file.fieldname === 'thumbnailFile') {
      cb(null, 'uploads/thumbnails/');
    }
  },
  filename: (req, file, cb) => {
    // Generar nombre único para evitar conflictos
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  if (file.fieldname === 'videoFile') {
    // Permitir solo archivos de video
    if (file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos de video'), false);
    }
  } else if (file.fieldname === 'thumbnailFile') {
    // Permitir solo imágenes
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos de imagen'), false);
    }
  } else {
    cb(new Error('Tipo de archivo no permitido'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB para videos
  }
});

// Middleware para subida múltiple
export const uploadVideoFiles = upload.fields([
  { name: 'videoFile', maxCount: 1 },
  { name: 'thumbnailFile', maxCount: 1 }
]);

export const getClassVideos = async (req, res, next) => {
  try {
    const {
      subject,
      status = 'published',
      uploadedBy,
      visibility,
      tags,
      page = 1,
      limit = 20
    } = req.query;

    const filter = { status };

    // Filtros básicos
    if (subject) filter.subject = new RegExp(subject, 'i');
    if (uploadedBy) filter.uploadedBy = uploadedBy;
    if (visibility) filter.visibility = visibility;

    // Filtro por tags
    if (tags) {
      const tagArray = tags.split(',').map(tag => tag.trim().toLowerCase());
      filter.tags = { $in: tagArray };
    }

    // Filtrar por acceso del usuario
    if (req.user.role === 'student') {
      filter.$or = [
        { visibility: 'public' },
        { visibility: 'students' },
        { uploadedBy: req.user.id },
        { allowedStudents: req.user.id }
      ];
    } else if (['tutor', 'advisor'].includes(req.user.role)) {
      filter.$or = [
        { visibility: { $in: ['public', 'students'] } },
        { uploadedBy: req.user.id }
      ];
    }

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { createdAt: -1 }
    };

    const videos = await ClassVideo.find(filter)
      .populate('uploadedBy', 'personalInfo email tutorProfile advisorProfile')
      .populate('allowedStudents', 'personalInfo email')
      .populate('likedBy', 'personalInfo')
      .populate('updatedBy', 'personalInfo')
      .limit(options.limit * 1)
      .skip((options.page - 1) * options.limit)
      .sort(options.sort);

    const total = await ClassVideo.countDocuments(filter);

    res.json({
      success: true,
      data: videos,
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

export const getClassVideoById = async (req, res, next) => {
  try {
    const video = await ClassVideo.findById(req.params.id)
      .populate('uploadedBy', 'personalInfo email tutorProfile advisorProfile')
      .populate('allowedStudents', 'personalInfo email')
      .populate('likedBy', 'personalInfo')
      .populate('updatedBy', 'personalInfo');

    if (!video) {
      const error = new Error("Class video not found");
      error.status = 404;
      throw error;
    }

    // Verificar permisos de acceso
    if (!video.canAccess(req.user)) {
      const error = new Error("Access denied to this class video");
      error.status = 403;
      throw error;
    }

    // Incrementar vistas
    await video.incrementViews();

    res.json({
      success: true,
      data: video
    });
  } catch (error) {
    next(error);
  }
};

export const createClassVideo = async (req, res, next) => {
  try {
    console.log('=== CREATE VIDEO REQUEST ===');
    console.log('User:', req.user);
    console.log('Body:', req.body);
    console.log('Files:', req.files);

    const videoData = { ...req.body };

    // Asignar uploadedBy al usuario actual
    videoData.uploadedBy = req.user.id;

    // Verificar permisos para subir videos
    if (!['tutor', 'advisor', 'admin'].includes(req.user.role)) {
      console.log('User role not allowed:', req.user.role);
      const error = new Error("Only tutors, advisors and admins can upload class videos");
      error.status = 403;
      throw error;
    }

    // Procesar archivos subidos
    if (req.files) {
      if (req.files.videoFile && req.files.videoFile[0]) {
        // Usar URL completa del backend para que el frontend pueda acceder
        const backendUrl = process.env.BACKEND_URL || 'http://localhost:4002';
        videoData.videoUrl = `${backendUrl}/uploads/videos/${req.files.videoFile[0].filename}`;
        videoData.fileSize = req.files.videoFile[0].size;
        console.log('Video file processed:', req.files.videoFile[0].filename);
      } else {
        console.log('No video file found in req.files');
      }

      if (req.files.thumbnailFile && req.files.thumbnailFile[0]) {
        // Usar URL completa del backend para thumbnails también
        const backendUrl = process.env.BACKEND_URL || 'http://localhost:4002';
        videoData.thumbnailUrl = `${backendUrl}/uploads/thumbnails/${req.files.thumbnailFile[0].filename}`;
        console.log('Thumbnail file processed:', req.files.thumbnailFile[0].filename);
      }
    } else {
      console.log('No files found in request');
    }

    // Parsear tags si vienen como string
    if (videoData.tags && typeof videoData.tags === 'string') {
      try {
        videoData.tags = JSON.parse(videoData.tags);
        console.log('Tags parsed:', videoData.tags);
      } catch (e) {
        console.log('Could not parse tags, keeping as string');
        // Si no es JSON, mantener como string y dejar que el modelo lo maneje
      }
    }

    console.log('Final videoData:', videoData);

    const newVideo = new ClassVideo(videoData);
    const videoSaved = await newVideo.save();
    console.log('Video saved to database:', videoSaved._id);

    // Populate para la respuesta
    const populatedVideo = await ClassVideo.findById(videoSaved._id)
      .populate('uploadedBy', 'personalInfo email tutorProfile advisorProfile')
      .populate('allowedStudents', 'personalInfo email');

    console.log('Video creation successful');

    res.status(201).json({
      success: true,
      message: "Class video uploaded successfully",
      data: populatedVideo
    });
  } catch (error) {
    console.error('Error in createClassVideo:', error);
    next(error);
  }
};

export const updateClassVideo = async (req, res, next) => {
  try {
    const video = await ClassVideo.findById(req.params.id);

    if (!video) {
      const error = new Error("Class video not found");
      error.status = 404;
      throw error;
    }

    // Verificar permisos - solo uploader o admin puede editar
    if (video.uploadedBy.toString() !== req.user.id && req.user.role !== 'admin') {
      const error = new Error("Not authorized to update this video");
      error.status = 403;
      throw error;
    }

    const updateData = {
      ...req.body,
      updatedBy: req.user.id
    };

    const updatedVideo = await ClassVideo.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    )
    .populate('uploadedBy', 'personalInfo email tutorProfile advisorProfile')
    .populate('allowedStudents', 'personalInfo email')
    .populate('updatedBy', 'personalInfo');

    res.json({
      success: true,
      message: "Class video updated successfully",
      data: updatedVideo
    });
  } catch (error) {
    next(error);
  }
};

export const deleteClassVideo = async (req, res, next) => {
  try {
    const video = await ClassVideo.findById(req.params.id);

    if (!video) {
      const error = new Error("Class video not found");
      error.status = 404;
      throw error;
    }

    // Verificar permisos - solo uploader o admin puede eliminar
    if (video.uploadedBy.toString() !== req.user.id && req.user.role !== 'admin') {
      const error = new Error("Not authorized to delete this video");
      error.status = 403;
      throw error;
    }

    await ClassVideo.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: "Class video deleted successfully"
    });
  } catch (error) {
    next(error);
  }
};

export const toggleLikeVideo = async (req, res, next) => {
  try {
    const video = await ClassVideo.findById(req.params.id);

    if (!video) {
      const error = new Error("Class video not found");
      error.status = 404;
      throw error;
    }

    // Verificar que el usuario puede acceder al video
    if (!video.canAccess(req.user)) {
      const error = new Error("Access denied to this class video");
      error.status = 403;
      throw error;
    }

    // Verificar que el usuario no sea el uploader
    if (video.uploadedBy.toString() === req.user.id) {
      const error = new Error("Cannot like your own video");
      error.status = 400;
      throw error;
    }

    await video.toggleLike(req.user.id);

    const updatedVideo = await ClassVideo.findById(req.params.id)
      .populate('likedBy', 'personalInfo');

    res.json({
      success: true,
      message: "Video like toggled successfully",
      data: {
        likes: updatedVideo.likes,
        likedBy: updatedVideo.likedBy,
        isLiked: updatedVideo.likedBy.some(user => user._id.toString() === req.user.id)
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getMyClassVideos = async (req, res, next) => {
  try {
    const { status } = req.query;

    const filter = { uploadedBy: req.user.id };

    if (status) filter.status = status;

    const videos = await ClassVideo.find(filter)
      .populate('allowedStudents', 'personalInfo email')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: videos
    });
  } catch (error) {
    next(error);
  }
};

export const getPopularVideos = async (req, res, next) => {
  try {
    const { subject, limit = 10 } = req.query;

    const filter = {
      status: 'published',
      visibility: { $in: ['public', 'students'] }
    };

    if (subject) filter.subject = new RegExp(subject, 'i');

    // Filtrar por acceso del usuario
    if (req.user.role === 'student') {
      filter.$or = [
        { visibility: 'public' },
        { visibility: 'students' },
        { allowedStudents: req.user.id }
      ];
    }

    const videos = await ClassVideo.find(filter)
      .populate('uploadedBy', 'personalInfo email tutorProfile advisorProfile')
      .sort({ views: -1, likes: -1 })
      .limit(parseInt(limit));

    res.json({
      success: true,
      data: videos
    });
  } catch (error) {
    next(error);
  }
};
