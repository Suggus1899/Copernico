import mongoose from 'mongoose';

const classVideoSchema = new mongoose.Schema({
  // Información básica del video
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

  // Información académica
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
  grade: {
    type: String,
    trim: true
  },
  duration: {
    type: Number, // duración en minutos
    min: 0
  },

  // Archivo del video
  videoUrl: {
    type: String,
    required: true,
    trim: true
  },
  thumbnailUrl: {
    type: String,
    trim: true
  },
  fileSize: {
    type: Number, // bytes
    min: 0
  },

  // Propietario
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // Visibilidad y acceso
  visibility: {
    type: String,
    enum: ['private', 'students', 'public'],
    default: 'students'
  },
  allowedStudents: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],

  // Estadísticas
  views: {
    type: Number,
    default: 0,
    min: 0
  },
  likes: {
    type: Number,
    default: 0,
    min: 0
  },
  likedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],

  // Estado
  status: {
    type: String,
    enum: ['processing', 'published', 'archived'],
    default: 'published',
    index: true
  },

  // Metadatos
  tags: [{
    type: String,
    trim: true
  }],

  // Auditoría
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Índices para optimización
classVideoSchema.index({ subject: 1, status: 1 });
classVideoSchema.index({ uploadedBy: 1, status: 1 });
classVideoSchema.index({ tags: 1 });
classVideoSchema.index({ createdAt: -1 });

// Middleware para validaciones
classVideoSchema.pre('save', function(next) {
  // Normalizar tags a minúsculas
  if (this.tags && this.tags.length > 0) {
    this.tags = this.tags.map(tag => tag.toLowerCase().trim());
  }

  next();
});

// Método para incrementar vistas
classVideoSchema.methods.incrementViews = function() {
  this.views += 1;
  return this.save();
};

// Método para manejar likes
classVideoSchema.methods.toggleLike = function(userId) {
  const userIndex = this.likedBy.indexOf(userId);

  if (userIndex > -1) {
    // Quitar like
    this.likedBy.splice(userIndex, 1);
    this.likes = Math.max(0, this.likes - 1);
  } else {
    // Agregar like
    this.likedBy.push(userId);
    this.likes += 1;
  }

  return this.save();
};

// Método para verificar si un usuario puede acceder al video
classVideoSchema.methods.canAccess = function(user) {
  if (this.visibility === 'public') return true;
  if (user.role === 'admin') return true;
  if (this.uploadedBy.toString() === user._id.toString()) return true;

  if (this.visibility === 'students') {
    if (['student', 'tutor', 'advisor'].includes(user.role)) return true;
  }

  if (this.allowedStudents.includes(user._id)) return true;

  return false;
};

export default mongoose.model('ClassVideo', classVideoSchema);
