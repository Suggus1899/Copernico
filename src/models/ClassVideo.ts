import mongoose from 'mongoose';
import { YOUTUBE_ID_PATTERN, youTubeThumbnailUrl } from '../utils/youtube.js';

export const CLASS_VIDEO_VISIBILITY = ['private', 'students', 'public'];
export const CLASS_VIDEO_STATUS = ['published', 'archived'];

const userRef = { type: mongoose.Schema.Types.ObjectId, ref: 'User' };

/**
 * Vídeo de clase alojado en YouTube. Solo se guarda el identificador del vídeo;
 * la reproducción se hace con el reproductor embebido de YouTube.
 */
const classVideoSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 200 },
  description: { type: String, trim: true, maxlength: 1000 },

  subject: { type: String, required: true, trim: true, index: true },
  topic: { type: String, trim: true },
  grade: { type: String, trim: true },
  duration: { type: Number, min: 0 }, // minutos

  youtubeId: { type: String, required: true, trim: true, match: YOUTUBE_ID_PATTERN },

  uploadedBy: { ...userRef, required: true, index: true },

  visibility: { type: String, enum: CLASS_VIDEO_VISIBILITY, default: 'students' },
  allowedStudents: [userRef],

  views: { type: Number, default: 0, min: 0 },
  likes: { type: Number, default: 0, min: 0 },
  likedBy: [userRef],

  status: { type: String, enum: CLASS_VIDEO_STATUS, default: 'published', index: true },

  tags: [{ type: String, trim: true }],

  updatedBy: userRef
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

classVideoSchema.virtual('thumbnailUrl').get(function thumbnailUrl() {
  return youTubeThumbnailUrl(this.youtubeId);
});

// Índices para optimización
classVideoSchema.index({ subject: 1, status: 1 });
classVideoSchema.index({ uploadedBy: 1, status: 1 });
classVideoSchema.index({ tags: 1 });
classVideoSchema.index({ createdAt: -1 });

classVideoSchema.pre('save', function(next) {
  if (this.tags?.length) {
    this.tags = this.tags.map((tag) => tag.toLowerCase().trim());
  }
  next();
});

/** Alterna el like del usuario. `likes` siempre refleja `likedBy`. */
classVideoSchema.methods.toggleLike = function(this: ClassVideoDocument, userId: mongoose.Types.ObjectId): Promise<ClassVideoDocument> {
  const key = String(userId);
  const index = this.likedBy.findIndex((id) => String(id) === key);

  if (index > -1) this.likedBy.splice(index, 1);
  else this.likedBy.push(userId);

  this.likes = this.likedBy.length;
  return this.save();
};

/**
 * Reglas de acceso: admin y propietario siempre; el resto solo si el vídeo está
 * publicado y su visibilidad o la lista `allowedStudents` lo permiten.
 */
classVideoSchema.methods.canAccess = function(this: ClassVideoDocument, user: { id: string; role: string } | null): boolean {
  if (!user) return false;
  if (user.role === 'admin') return true;

  const userId = String(user.id);
  if (String(this.uploadedBy?._id ?? this.uploadedBy) === userId) return true;
  if (this.status !== 'published') return false;

  if (this.allowedStudents.some((id) => String(id?._id ?? id) === userId)) return true;
  if (this.visibility === 'public') return true;
  if (this.visibility === 'students') return user.role === 'student' || user.role === 'tutor';
  return false;
};


export type ClassVideoRecord = mongoose.InferSchemaType<typeof classVideoSchema>;
export type ClassVideoDocument = mongoose.HydratedDocument<ClassVideoRecord, ClassVideoMethods>;
export interface ClassVideoMethods {
  toggleLike(userId: mongoose.Types.ObjectId): Promise<ClassVideoDocument>;
  canAccess(user: { id: string; role: string } | null): boolean;
}
export default mongoose.model<ClassVideoRecord, mongoose.Model<ClassVideoRecord, {}, ClassVideoMethods>>('ClassVideo', classVideoSchema);
