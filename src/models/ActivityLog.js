import mongoose from 'mongoose';

const activityLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true, required: true },
  action: { type: String, required: true, index: true },
  ip: { type: String },
  userAgent: { type: String },
  metadata: { type: Object },
}, { timestamps: { createdAt: true, updatedAt: false } });

export default mongoose.model('ActivityLog', activityLogSchema);
