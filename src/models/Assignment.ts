import mongoose from 'mongoose';

const assignmentSchema = new mongoose.Schema({
  // Relaciones
  materialId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EducationalMaterial',
    required: true,
    index: true
  },
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  appointmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment'
  },
  
  // Información de la tarea
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  instructions: {
    type: String,
    trim: true,
    maxlength: 2000
  },
  dueDate: {
    type: Date,
    required: true,
    index: true
  },
  maxPoints: {
    type: Number,
    required: true,
    min: 0
  },
  
  // Entrega del estudiante
  submission: {
    submittedAt: Date,
    fileUrl: {
      type: String,
      trim: true
    },
    textSubmission: {
      type: String,
      trim: true,
      maxlength: 5000
    },
    externalLink: {
      type: String,
      trim: true
    },
    comments: {
      type: String,
      trim: true,
      maxlength: 1000
    },
    lateSubmission: {
      type: Boolean,
      default: false
    },
    submissionAttempts: {
      type: Number,
      default: 0,
      min: 0
    },
    files: [{
      filename: String,
      fileUrl: String,
      fileSize: Number,
      uploadedAt: {
        type: Date,
        default: Date.now
      }
    }]
  },
  
  // Calificación y feedback
  grading: {
    gradedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    grade: {
      type: Number,
      min: 0
    },
    feedback: {
      type: String,
      trim: true,
      maxlength: 2000
    },
    detailedFeedback: {
      clarity: {
        type: Number,
        min: 0,
        max: 10
      },
      accuracy: {
        type: Number,
        min: 0,
        max: 10
      },
      completeness: {
        type: Number,
        min: 0,
        max: 10
      },
      creativity: {
        type: Number,
        min: 0,
        max: 10
      },
      comments: {
        type: String,
        trim: true
      }
    },
    gradedAt: Date,
    rubrics: [{
      criterion: String,
      maxScore: Number,
      score: Number,
      comments: String
    }]
  },
  
  // Comentarios y discusión
  comments: [{
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    comment: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000
    },
    isPrivate: {
      type: Boolean,
      default: false
    },
    attachments: [{
      filename: String,
      fileUrl: String,
      fileSize: Number
    }],
    createdAt: {
      type: Date,
      default: Date.now
    },
    updatedAt: Date
  }],
  
  // Estado
  status: {
    type: String,
    enum: ['assigned', 'submitted', 'graded', 'late', 'missing', 'returned', 'resubmitted'],
    default: 'assigned',
    index: true
  },
  
  // Extensiones y modificaciones
  extensions: [{
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    requestedAt: {
      type: Date,
      default: Date.now
    },
    reason: String,
    approved: {
      type: Boolean,
      default: false
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    approvedAt: Date,
    newDueDate: Date
  }],
  
  // Metadatos
  estimatedTime: {
    type: Number, // minutos
    min: 0
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium'
  },
  tags: [{
    type: String,
    trim: true
  }],
  
  // Auditoría
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Índices compuestos para optimización
assignmentSchema.index({ studentId: 1, status: 1 });
assignmentSchema.index({ materialId: 1, dueDate: 1 });
assignmentSchema.index({ assignedBy: 1, status: 1 });
assignmentSchema.index({ dueDate: 1, status: 1 });

// Middleware para validaciones
assignmentSchema.pre('save', function(next) {
  // Validar que la fecha de entrega sea en el futuro
  if (this.dueDate && this.dueDate <= new Date()) {
    return next(new Error('Due date must be in the future'));
  }
  
  // Validar que la calificación no exceda los puntos máximos
  if (this.grading?.grade && this.grading.grade > this.maxPoints) {
    return next(new Error('Grade cannot exceed maximum points'));
  }
  
  // Actualizar estado basado en fechas y entregas
  if (this.submission?.submittedAt) {
    this.status = this.submission!.lateSubmission ? 'late' : 'submitted';
  } else if (this.dueDate && this.dueDate < new Date()) {
    this.status = 'missing';
  }
  
  next();
});

// Método para enviar tarea
assignmentSchema.methods.submitAssignment = function(this: AssignmentDocument, submissionData: Partial<NonNullable<AssignmentRecord['submission']>>): Promise<AssignmentDocument> {
  this.submission = {
    ...submissionData,
    submittedAt: new Date(),
    lateSubmission: new Date() > this.dueDate,
    submissionAttempts: (this.submission?.submissionAttempts || 0) + 1
  } as NonNullable<AssignmentRecord['submission']>;
  
  this.status = this.submission!.lateSubmission ? 'late' : 'submitted';
  return this.save();
};

// Método para calificar tarea
assignmentSchema.methods.gradeAssignment = function(this: AssignmentDocument, graderId: string | mongoose.Types.ObjectId, gradeData: Partial<NonNullable<AssignmentRecord['grading']>>): Promise<AssignmentDocument> {
  this.grading = {
    ...gradeData,
    gradedBy: graderId,
    gradedAt: new Date()
  } as NonNullable<AssignmentRecord['grading']>;
  
  this.status = 'graded';
  return this.save();
};

// Método para agregar comentario
assignmentSchema.methods.addComment = function(this: AssignmentDocument, authorId: string | mongoose.Types.ObjectId, comment: string, isPrivate: boolean = false): Promise<AssignmentDocument> {
  this.comments.push({
    authorId,
    comment,
    isPrivate,
    createdAt: new Date()
  });
  return this.save();
};

// Método para solicitar extensión
assignmentSchema.methods.requestExtension = function(this: AssignmentDocument, userId: string | mongoose.Types.ObjectId, reason: string, newDueDate: Date): Promise<AssignmentDocument> {
  this.extensions.push({
    requestedBy: userId,
    reason,
    newDueDate,
    requestedAt: new Date()
  });
  return this.save();
};

// Método estático para obtener tareas pendientes de un estudiante
assignmentSchema.statics.getPendingAssignments = function(studentId) {
  return this.find({
    studentId,
    status: { $in: ['assigned', 'returned'] },
    dueDate: { $gt: new Date() }
  }).populate('materialId', 'title subject type')
    .populate('assignedBy', 'personalInfo')
    .sort({ dueDate: 1 });
};


export type AssignmentRecord = mongoose.InferSchemaType<typeof assignmentSchema>;
export type AssignmentDocument = mongoose.HydratedDocument<AssignmentRecord, AssignmentMethods>;
export interface AssignmentMethods {
  submitAssignment(submissionData: Partial<NonNullable<AssignmentRecord['submission']>>): Promise<AssignmentDocument>;
  gradeAssignment(graderId: string | mongoose.Types.ObjectId, gradeData: Partial<NonNullable<AssignmentRecord['grading']>>): Promise<AssignmentDocument>;
  addComment(authorId: string | mongoose.Types.ObjectId, comment: string, isPrivate?: boolean): Promise<AssignmentDocument>;
  requestExtension(userId: string | mongoose.Types.ObjectId, reason: string, newDueDate: Date): Promise<AssignmentDocument>;
}
export interface AssignmentModel extends mongoose.Model<AssignmentRecord, {}, AssignmentMethods> {
  getPendingAssignments(studentId: string | mongoose.Types.ObjectId): mongoose.Query<AssignmentDocument[], AssignmentDocument>;
}
export default mongoose.model<AssignmentRecord, AssignmentModel>('Assignment', assignmentSchema);