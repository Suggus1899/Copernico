import EducationalMaterial from "../models/EducationalMaterial.js";
import User from "../models/User.js";
import multer from 'multer';
import path from 'path';

// Configuración de multer para subida de archivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    console.log('Multer: Configurando destino para archivo');
    cb(null, 'uploads/materials/');
  },
  filename: (req, file, cb) => {
    console.log('Multer: Generando nombre para archivo:', file.originalname);
    // Generar nombre único para evitar conflictos
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const filename = 'material-' + uniqueSuffix + path.extname(file.originalname);
    console.log('Multer: Nombre generado:', filename);
    cb(null, filename);
  }
});

const fileFilter = (req, file, cb) => {
  console.log('Multer: Validando tipo de archivo:', file.mimetype);
  // Permitir solo documentos e imágenes
  const allowedMimes = [
    // Documentos
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    // Imágenes
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp'
  ];

  if (allowedMimes.includes(file.mimetype)) {
    console.log('Multer: Tipo de archivo permitido');
    cb(null, true);
  } else {
    console.log('Multer: Tipo de archivo NO permitido:', file.mimetype);
    cb(new Error(`Tipo de archivo no permitido: ${file.mimetype}. Solo se permiten documentos (PDF, Word, TXT) e imágenes (JPG, PNG, GIF, WebP).`), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB máximo para materiales
  }
});

// Middleware para subida de archivos
export const uploadMaterialFile = (req, res, next) => {
  console.log('=== MULTER MIDDLEWARE INICIADO ===');
  console.log('Content-Type:', req.headers['content-type']);
  
  const uploadSingle = upload.single('file');
  
  uploadSingle(req, res, (err) => {
    if (err) {
      console.error('=== ERROR EN MULTER ===');
      console.error('Error:', err.message);
      console.error('Code:', err.code);
      
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            error: 'El archivo es demasiado grande. Máximo 50MB permitido.'
          });
        }
        return res.status(400).json({
          success: false,
          error: `Error de subida: ${err.message}`
        });
      }
      
      return res.status(400).json({
        success: false,
        error: err.message
      });
    }
    
    console.log('=== MULTER COMPLETADO EXITOSAMENTE ===');
    console.log('Archivo procesado:', req.file ? req.file.filename : 'No file');
    next();
  });
};

export const getEducationalMaterials = async (req, res, next) => {
  try {
    const { 
      subject, 
      type, 
      difficulty, 
      tags,
      isAssignment,
      status = 'published',
      createdBy,
      visibility,
      page = 1, 
      limit = 20 
    } = req.query;
    
    const filter = { status };
    
    // Filtros básicos
    if (subject) filter.subject = new RegExp(subject, 'i');
    if (type) filter.type = type;
    if (difficulty) filter.difficulty = difficulty;
    if (isAssignment !== undefined) filter.isAssignment = isAssignment === 'true';
    if (createdBy) filter.createdBy = createdBy;
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
        { createdBy: req.user.id },
        { allowedStudents: req.user.id },
        { 
          allowedGroups: { 
            $in: req.user.studentProfile?.enrolledCourses || [] 
          } 
        }
      ];
    } else if (['tutor', 'advisor'].includes(req.user.role)) {
      filter.$or = [
        { visibility: { $in: ['public', 'students'] } },
        { createdBy: req.user.id }
      ];
    }

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { createdAt: -1 }
    };

    const materials = await EducationalMaterial.find(filter)
      .populate('createdBy', 'personalInfo email tutorProfile advisorProfile')
      .populate('allowedStudents', 'personalInfo email')
      .populate('ratings.userId', 'personalInfo')
      .populate('updatedBy', 'personalInfo')
      .populate('reviewedBy', 'personalInfo')
      .limit(options.limit * 1)
      .skip((options.page - 1) * options.limit)
      .sort(options.sort);

    const total = await EducationalMaterial.countDocuments(filter);

    res.json({
      success: true,
      data: materials,
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

export const getEducationalMaterialById = async (req, res, next) => {
  try {
    const material = await EducationalMaterial.findById(req.params.id)
      .populate('createdBy', 'personalInfo email tutorProfile advisorProfile')
      .populate('allowedStudents', 'personalInfo email')
      .populate('ratings.userId', 'personalInfo')
      .populate('updatedBy', 'personalInfo')
      .populate('reviewedBy', 'personalInfo');

    if (!material) {
      const error = new Error("Educational material not found");
      error.status = 404;
      throw error;
    }

    // Verificar permisos de acceso
    if (!material.canAccess(req.user)) {
      const error = new Error("Access denied to this educational material");
      error.status = 403;
      throw error;
    }

    // Incrementar vistas
    await material.incrementViews();

    res.json({
      success: true,
      data: material
    });
  } catch (error) {
    next(error);
  }
};

export const createEducationalMaterial = async (req, res, next) => {
  try {
    console.log('=== CREAR MATERIAL EDUCATIVO - INICIO ===');
    console.log('Body recibido:', req.body);
    console.log('Archivo recibido:', req.file ? {
      filename: req.file.filename,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      path: req.file.path
    } : 'No file');
    console.log('Usuario:', req.user?.id, req.user?.role);
    
    // Verificar permisos básicos
    if (!['tutor', 'advisor', 'admin'].includes(req.user.role)) {
      console.log('Error: Usuario sin permisos');
      return res.status(403).json({
        success: false,
        error: "Only tutors, advisors and admins can create educational materials"
      });
    }

    // Verificar campos básicos
    if (!req.body.title || !req.body.subject) {
      console.log('Error: Faltan campos requeridos');
      console.log('Title:', req.body.title);
      console.log('Subject:', req.body.subject);
      return res.status(400).json({
        success: false,
        error: "Title and subject are required"
      });
    }

    // Verificar que hay archivo
    if (!req.file) {
      console.log('Error: No se recibió archivo');
      return res.status(400).json({
        success: false,
        error: "File is required"
      });
    }

    // Crear objeto básico con valores seguros
    const materialData = {
      title: req.body.title.trim(),
      subject: req.body.subject.trim(),
      type: req.body.type || 'document',
      difficulty: req.body.difficulty || 'intermediate',
      status: 'published',
      visibility: 'students', // Fixed: should be 'students' not 'student'
      createdBy: req.user.id,
      tags: []
    };

    // Agregar campos opcionales solo si existen
    if (req.body.description && req.body.description.trim()) {
      materialData.description = req.body.description.trim();
    }
    
    if (req.body.topic && req.body.topic.trim()) {
      materialData.topic = req.body.topic.trim();
    }

    // Procesar archivo
    materialData.fileUrl = `/uploads/materials/${req.file.filename}`;
    materialData.fileSize = req.file.size;
    materialData.originalFileName = req.file.originalname;
    materialData.mimeType = req.file.mimetype;

    // Procesar estudiante destinatario
    if (req.body.targetStudentId && req.body.targetStudentId.trim()) {
      materialData.targetStudentId = req.body.targetStudentId.trim();
      materialData.allowedStudents = [req.body.targetStudentId.trim()];
    }

    // Procesar tags de manera segura
    if (req.body.tags) {
      try {
        let tagsArray = [];
        if (typeof req.body.tags === 'string') {
          if (req.body.tags.startsWith('[')) {
            // Es JSON
            tagsArray = JSON.parse(req.body.tags);
          } else {
            // Es string separado por comas
            tagsArray = req.body.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
          }
        } else if (Array.isArray(req.body.tags)) {
          tagsArray = req.body.tags;
        }
        materialData.tags = tagsArray;
      } catch (e) {
        console.log('Error procesando tags, usando array vacío:', e.message);
        materialData.tags = [];
      }
    }

    console.log('Datos finales a guardar:', materialData);

    // Crear y guardar el material
    const newMaterial = new EducationalMaterial(materialData);
    const materialSaved = await newMaterial.save();
    
    console.log('Material guardado exitosamente con ID:', materialSaved._id);

    // Respuesta exitosa
    res.status(201).json({
      success: true,
      message: "Educational material created successfully",
      data: {
        _id: materialSaved._id,
        title: materialSaved.title,
        type: materialSaved.type,
        subject: materialSaved.subject,
        fileUrl: materialSaved.fileUrl
      }
    });

  } catch (error) {
    console.error('=== ERROR EN CREAR MATERIAL ===');
    console.error('Mensaje:', error.message);
    console.error('Stack:', error.stack);
    
    // Manejar errores de validación de Mongoose
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: validationErrors
      });
    }
    
    // Error genérico
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

export const updateEducationalMaterial = async (req, res, next) => {
  try {
    const material = await EducationalMaterial.findById(req.params.id);
    
    if (!material) {
      const error = new Error("Educational material not found");
      error.status = 404;
      throw error;
    }

    // Verificar permisos - solo creador o admin puede editar
    if (material.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
      const error = new Error("Not authorized to update this material");
      error.status = 403;
      throw error;
    }

    const updateData = { 
      ...req.body,
      updatedBy: req.user.id 
    };

    const updatedMaterial = await EducationalMaterial.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    )
    .populate('createdBy', 'personalInfo email tutorProfile advisorProfile')
    .populate('allowedStudents', 'personalInfo email')
    .populate('updatedBy', 'personalInfo');

    res.json({
      success: true,
      message: "Educational material updated successfully",
      data: updatedMaterial
    });
  } catch (error) {
    next(error);
  }
};

export const deleteEducationalMaterial = async (req, res, next) => {
  try {
    const material = await EducationalMaterial.findById(req.params.id);
    
    if (!material) {
      const error = new Error("Educational material not found");
      error.status = 404;
      throw error;
    }

    // Verificar permisos - solo creador o admin puede eliminar
    if (material.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
      const error = new Error("Not authorized to delete this material");
      error.status = 403;
      throw error;
    }

    await EducationalMaterial.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: "Educational material deleted successfully"
    });
  } catch (error) {
    next(error);
  }
};

export const rateEducationalMaterial = async (req, res, next) => {
  try {
    const { rating, comment } = req.body;
    const material = await EducationalMaterial.findById(req.params.id);

    if (!material) {
      const error = new Error("Educational material not found");
      error.status = 404;
      throw error;
    }

    // Verificar que el usuario puede acceder al material
    if (!material.canAccess(req.user)) {
      const error = new Error("Access denied to this educational material");
      error.status = 403;
      throw error;
    }

    // Verificar que el usuario no sea el creador
    if (material.createdBy.toString() === req.user.id) {
      const error = new Error("Cannot rate your own educational material");
      error.status = 400;
      throw error;
    }

    await material.addRating(req.user.id, rating, comment);

    const updatedMaterial = await EducationalMaterial.findById(req.params.id)
      .populate('ratings.userId', 'personalInfo');

    res.json({
      success: true,
      message: "Material rated successfully",
      data: updatedMaterial.ratings
    });
  } catch (error) {
    next(error);
  }
};

export const incrementDownloads = async (req, res, next) => {
  try {
    const material = await EducationalMaterial.findById(req.params.id);

    if (!material) {
      const error = new Error("Educational material not found");
      error.status = 404;
      throw error;
    }

    // Verificar que el usuario puede acceder al material
    if (!material.canAccess(req.user)) {
      const error = new Error("Access denied to this educational material");
      error.status = 403;
      throw error;
    }

    await material.incrementDownloads();

    res.json({
      success: true,
      message: "Download count incremented",
      downloads: material.downloads + 1
    });
  } catch (error) {
    next(error);
  }
};

export const shareEducationalMaterial = async (req, res, next) => {
  try {
    const { students, groups, visibility } = req.body;
    const material = await EducationalMaterial.findById(req.params.id);

    if (!material) {
      const error = new Error("Educational material not found");
      error.status = 404;
      throw error;
    }

    // Verificar permisos - solo creador o admin puede compartir
    if (material.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
      const error = new Error("Not authorized to share this material");
      error.status = 403;
      throw error;
    }

    const updateData = {
      updatedBy: req.user.id
    };

    if (students !== undefined) {
      updateData.allowedStudents = students;
    }

    if (groups !== undefined) {
      updateData.allowedGroups = groups;
    }

    if (visibility !== undefined) {
      updateData.visibility = visibility;
    }

    const updatedMaterial = await EducationalMaterial.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    )
    .populate('createdBy', 'personalInfo email')
    .populate('allowedStudents', 'personalInfo email');

    res.json({
      success: true,
      message: "Material sharing settings updated successfully",
      data: updatedMaterial
    });
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

    res.json({
      success: true,
      data: materials
    });
  } catch (error) {
    next(error);
  }
};

export const changeMaterialStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const material = await EducationalMaterial.findById(req.params.id);

    if (!material) {
      const error = new Error("Educational material not found");
      error.status = 404;
      throw error;
    }

    // Solo admin o el creador pueden cambiar el estado
    if (material.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
      const error = new Error("Not authorized to change status of this material");
      error.status = 403;
      throw error;
    }

    // Si es revisión, registrar quién revisó
    const updateData = {
      status,
      updatedBy: req.user.id
    };

    if (status === 'published' && req.user.role === 'admin') {
      updateData.reviewedBy = req.user.id;
      updateData.reviewedAt = new Date();
    }

    const updatedMaterial = await EducationalMaterial.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    )
    .populate('createdBy', 'personalInfo email')
    .populate('reviewedBy', 'personalInfo');

    res.json({
      success: true,
      message: `Material status updated to ${status}`,
      data: updatedMaterial
    });
  } catch (error) {
    next(error);
  }
};

export const getPopularMaterials = async (req, res, next) => {
  try {
    const { subject, type, limit = 10 } = req.query;
    
    const filter = { 
      status: 'published',
      visibility: { $in: ['public', 'students'] }
    };
    
    if (subject) filter.subject = new RegExp(subject, 'i');
    if (type) filter.type = type;

    // Filtrar por acceso del usuario
    if (req.user.role === 'student') {
      filter.$or = [
        { visibility: 'public' },
        { visibility: 'students' },
        { allowedStudents: req.user.id },
        { 
          allowedGroups: { 
            $in: req.user.studentProfile?.enrolledCourses || [] 
          } 
        }
      ];
    }

    const materials = await EducationalMaterial.find(filter)
      .populate('createdBy', 'personalInfo email tutorProfile advisorProfile')
      .sort({ views: -1, averageRating: -1 })
      .limit(parseInt(limit));

    res.json({
      success: true,
      data: materials
    });
  } catch (error) {
    next(error);
  }
};
