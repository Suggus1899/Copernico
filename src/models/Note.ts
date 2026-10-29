import mongoose from "mongoose";

const noteSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200
    },
    content: {
      type: String,
      required: true,
      trim: true
    },
    subject: {
      type: String,
      trim: true,
      maxlength: 100
    },
    tags: [{
      type: String,
      trim: true,
      lowercase: true
    }],
    author: {
      type: String,
      required: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true
    },
    sharedWith: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      permission: {
        type: String,
        enum: ['read', 'write'],
        default: 'read'
      },
      sharedAt: {
        type: Date,
        default: Date.now
      }
    }],
    isFavorite: {
      type: Boolean,
      default: false
    },
    date: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Índices para optimización
noteSchema.index({ userId: 1, createdAt: -1 });
noteSchema.index({ subject: 1 });
noteSchema.index({ tags: 1 });
noteSchema.index({ "sharedWith.user": 1 });

export type NoteRecord = mongoose.InferSchemaType<typeof noteSchema>;
export type NoteDocument = mongoose.HydratedDocument<NoteRecord>;
export default mongoose.model("Note", noteSchema);
