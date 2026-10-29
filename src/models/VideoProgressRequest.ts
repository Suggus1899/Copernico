import mongoose from 'mongoose';

const videoProgressRequestSchema = new mongoose.Schema({
  requestId: { type: String, required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  videoId: { type: mongoose.Schema.Types.ObjectId, ref: 'ClassVideo', required: true },
  payloadHash: { type: String, required: true },
  result: {
    progressPercentage: { type: Number, required: true },
    isCompleted: { type: Boolean, required: true },
    watchTime: { type: Number, required: true },
    status: { type: String, enum: ['not_started', 'in_progress', 'completed', 'paused'], required: true },
  },
  expiresAt: { type: Date, required: true },
}, { timestamps: true });

videoProgressRequestSchema.index({ requestId: 1 }, { unique: true });
videoProgressRequestSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type VideoProgressRequestRecord = mongoose.InferSchemaType<typeof videoProgressRequestSchema>;
export type VideoProgressRequestResult = VideoProgressRequestRecord['result'];

export default mongoose.model<VideoProgressRequestRecord>('VideoProgressRequest', videoProgressRequestSchema);
