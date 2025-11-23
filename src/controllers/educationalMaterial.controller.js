import EducationalMaterial from "../models/EducationalMaterial.js";
import User from "../models/User.js";

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
    const materialData = req.body;
    
    // Asignar createdBy al usuario actual
    materialData.createdBy = req.user.id;

    // Verificar permisos para crear materiales
    if (!['tutor', 'advisor', 'admin'].includes(req.user.role)) {
      const error = new Error("Only tutors, advisors and admins can create educational materials");
      error.status = 403;
      throw error;
    }

    const newMaterial = new EducationalMaterial(materialData);
    const materialSaved = await newMaterial.save();

    // Populate para la respuesta
    const populatedMaterial = await EducationalMaterial.findById(materialSaved._id)
      .populate('createdBy', 'personalInfo email tutorProfile advisorProfile')
      .populate('allowedStudents', 'personalInfo email');

    res.status(201).json({
      success: true,
      message: "Educational material created successfully",
      data: populatedMaterial
    });
  } catch (error) {
    next(error);
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