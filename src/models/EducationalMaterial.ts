import mongoose from 'mongoose';

// Acepta un ObjectId, un documento o un documento poblado.
const idOf = (value: unknown) => String(value && typeof value === 'object' && '_id' in value ? value._id : value);

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
    enum: ['document', 'image'],
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

  // Estudiante destinatario específico
  targetStudentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  
  // Archivo en almacenamiento privado: la clave es interna y no se devuelve en JSON
  fileKey: {
    type: String,
    trim: true,
    select: false
  },
  originalFileName: {
    type: String,
    trim: true,
    maxlength: 255
  },
  mimeType: {
    type: String,
    trim: true,
    maxlength: 100
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
  // Un material nuevo necesita un recurso (archivo, enlace o contenido).
  // Los documentos cargados sin fileKey (select:false) ya cumplían la regla.
  if (this.isNew && !this.fileKey && !this.externalLink && !this.content) {
    return next(new Error('Material must have at least one resource (file, link, or content)'));
  }
  
  // Si es assignment, validar campos requeridos
  if (this.isAssignment && this.assignmentDetails && !this.assignmentDetails.dueDate) {
    return next(new Error('Assignments must have a due date'));
  }
  
  // Normalizar tags a minúsculas
  if (this.tags && this.tags.length > 0) {
    this.tags = this.tags.map(tag => tag.toLowerCase().trim());
  }
  
  next();
});

// Método para incrementar vistas
educationalMaterialSchema.methods.incrementViews = function(this: EducationalMaterialDocument): Promise<EducationalMaterialDocument> {
  this.views += 1;
  return this.save();
};

// Método para incrementar descargas
educationalMaterialSchema.methods.incrementDownloads = function(this: EducationalMaterialDocument): Promise<EducationalMaterialDocument> {
  this.downloads += 1;
  return this.save();
};

// Método para calificar material
educationalMaterialSchema.methods.addRating = function(this: EducationalMaterialDocument, userId: string | mongoose.Types.ObjectId, rating: number, comment: string = ''): Promise<EducationalMaterialDocument> {
  // Verificar si el usuario ya calificó
  const existingRatingIndex = this.ratings.findIndex(r => r.userId!.toString() === userId.toString());
  
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
educationalMaterialSchema.methods.canAccess = function(this: EducationalMaterialDocument, user: { _id: unknown; role: string; studentProfile?: { enrolledCourses?: string[] } | null }): boolean {
  const userId = String(user._id);
  if (user.role === 'admin') return true;
  if (idOf(this.createdBy) === userId) return true;

  // Los borradores y el material en revisión solo los ve su autor (y el administrador).
  if (this.status !== 'published') return false;

  if (this.visibility === 'public') return true;
  if (this.visibility === 'students' && ['student', 'tutor'].includes(user.role)) return true;

  if (this.allowedStudents.some((student) => idOf(student) === userId)) return true;
  if (user.role === 'student' && this.allowedGroups.some(group => 
    user.studentProfile?.enrolledCourses?.includes(group))) return true;
  
  return false;
};

// La clave de almacenamiento es interna: nunca sale en las respuestas JSON.
educationalMaterialSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.fileKey;
    return ret;
  }
});


export type EducationalMaterialRecord = mongoose.InferSchemaType<typeof educationalMaterialSchema>;
export type EducationalMaterialDocument = mongoose.HydratedDocument<EducationalMaterialRecord, EducationalMaterialMethods>;
export interface EducationalMaterialMethods {
  incrementViews(): Promise<EducationalMaterialDocument>;
  incrementDownloads(): Promise<EducationalMaterialDocument>;
  addRating(userId: string | mongoose.Types.ObjectId, rating: number, comment?: string): Promise<EducationalMaterialDocument>;
  canAccess(user: { _id: unknown; role: string; studentProfile?: { enrolledCourses?: string[] } | null }): boolean;
}
export default mongoose.model<EducationalMaterialRecord, mongoose.Model<EducationalMaterialRecord, {}, EducationalMaterialMethods>>('EducationalMaterial', educationalMaterialSchema);