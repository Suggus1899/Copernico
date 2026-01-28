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
    isFavorite: {
      type: Boolean,
      default: false
    },
    date: {
      type: Date,
      default: Date.now
    },
    sharedWith: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    visibility: {
      type: String,
      enum: ['private', 'shared', 'public'],
      default: 'private'
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

export default mongoose.model("Note", noteSchema);
