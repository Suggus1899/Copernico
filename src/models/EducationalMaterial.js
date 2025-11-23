import mongoose from 'mongoose';

const educationalMaterialSchema = new mongoose.Schema({
  // Información del material
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  type: {
    type: String,
    enum: ['document', 'presentation', 'video', 'link', 'exercise', 'worksheet', 'quiz'],
    required: true
  },
  subject: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  topic: {
    type: String,
    trim: true
  },
  difficulty: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    default: 'intermediate'
  },
  tags: [{
    type: String,
    trim: true
  }],
  
  // Archivo o recurso
  fileUrl: {
    type: String,
    trim: true
  },
  fileSize: {
    type: Number, // bytes
    min: 0
  },
  thumbnail: {
    type: String,
    trim: true
  },
  externalLink: {
    type: String,
    trim: true
  },
  content: {
    type: String, // Para contenido embebido o texto
    trim: true
  },
  
  // Propietario y permisos
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  visibility: {
    type: String,
    enum: ['private', 'students', 'public'],
    default: 'students'
  },
  allowedStudents: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  allowedGroups: [{
    type: String,
    trim: true
  }],
  
  // Para ejercicios/tareas
  isAssignment: {
    type: Boolean,
    default: false
  },
  assignmentDetails: {
    dueDate: Date,
    maxPoints: {
      type: Number,
      min: 0
    },
    instructions: {
      type: String,
      trim: true,
      maxlength: 2000
    },
    evaluationCriteria: [{
      type: String,
      trim: true
    }],
    allowedFormats: [{
      type: String,
      enum: ['pdf', 'doc', 'docx', 'txt', 'image', 'video', 'link']
    }],
    maxFileSize: Number, // bytes
    submissionLimit: {
      type: Number,
      min: 1,
      default: 1
    }
  },
  
  // Estadísticas de uso
  downloads: {
    type: Number,
    default: 0,
    min: 0
  },
  views: {
    type: Number,
    default: 0,
    min: 0
  },
  averageRating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  ratingsCount: {
    type: Number,
    default: 0,
    min: 0
  },
  ratings: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      required: true
    },
    comment: {
      type: String,
      trim: true,
      maxlength: 500
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Metadatos de recurso
  language: {
    type: String,
    default: 'es',
    maxlength: 10
  },
  estimatedStudyTime: {
    type: Number, // minutos
    min: 0
  },
  prerequisites: [{
    type: String,
    trim: true
  }],
  
  // Estado y moderación
  status: {
    type: String,
    enum: ['draft', 'published', 'archived', 'under_review'],
    default: 'published',
    index: true
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewedAt: Date,
  reviewNotes: {
    type: String,
    trim: true
  },
  
  // Auditoría
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Índices compuestos para optimización
educationalMaterialSchema.index({ subject: 1, difficulty: 1 });
educationalMaterialSchema.index({ createdBy: 1, status: 1 });
educationalMaterialSchema.index({ type: 1, isAssignment: 1 });
educationalMaterialSchema.index({ tags: 1 });
educationalMaterialSchema.index({ 'assignmentDetails.dueDate': 1 });

// Middleware para validaciones
educationalMaterialSchema.pre('save', function(next) {
  // Validar que tenga al menos un recurso (fileUrl, externalLink o content)
  if (!this.fileUrl && !this.externalLink && !this.content) {
    return next(new Error('Material must have at least one resource (file, link, or content)'));
  }
  
  // Si es assignment, validar campos requeridos
  if (this.isAssignment && !this.assignmentDetails.dueDate) {
    return next(new Error('Assignments must have a due date'));
  }
  
  // Normalizar tags a minúsculas
  if (this.tags && this.tags.length > 0) {
    this.tags = this.tags.map(tag => tag.toLowerCase().trim());
  }
  
  next();
});

// Método para incrementar vistas
educationalMaterialSchema.methods.incrementViews = function() {
  this.views += 1;
  return this.save();
};

// Método para incrementar descargas
educationalMaterialSchema.methods.incrementDownloads = function() {
  this.downloads += 1;
  return this.save();
};

// Método para calificar material
educationalMaterialSchema.methods.addRating = function(userId, rating, comment = '') {
  // Verificar si el usuario ya calificó
  const existingRatingIndex = this.ratings.findIndex(r => r.userId.toString() === userId.toString());
  
  if (existingRatingIndex > -1) {
    // Actualizar rating existente
    this.ratings[existingRatingIndex].rating = rating;
    this.ratings[existingRatingIndex].comment = comment;
    this.ratings[existingRatingIndex].createdAt = new Date();
  } else {
    // Agregar nuevo rating
    this.ratings.push({
      userId,
      rating,
      comment,
      createdAt: new Date()
    });
    this.ratingsCount += 1;
  }
  
  // Recalcular promedio
  const totalRating = this.ratings.reduce((sum, r) => sum + r.rating, 0);
  this.averageRating = totalRating / this.ratings.length;
  
  return this.save();
};

// Método para verificar si un usuario puede acceder al material
educationalMaterialSchema.methods.canAccess = function(user) {
  if (this.visibility === 'public') return true;
  if (user.role === 'admin') return true;
  if (this.createdBy.toString() === user._id.toString()) return true;
  
  if (this.visibility === 'students') {
    if (user.role === 'student') return true;
    if (['tutor', 'advisor'].includes(user.role)) return true;
  }
  
  if (this.allowedStudents.includes(user._id)) return true;
  if (user.role === 'student' && this.allowedGroups.some(group => 
    user.studentProfile?.enrolledCourses?.includes(group))) return true;
  
  return false;
};

export default mongoose.model('EducationalMaterial', educationalMaterialSchema);