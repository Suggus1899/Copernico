import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  text: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000
  },
  read: {
    type: Boolean,
    default: false,
    index: true
  },
  readAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Índice compuesto para consultas por conversación
messageSchema.index({ sender: 1, receiver: 1, createdAt: 1 });
messageSchema.index({ receiver: 1, read: 1 });


export type MessageRecord = mongoose.InferSchemaType<typeof messageSchema>;
export type MessageDocument = mongoose.HydratedDocument<MessageRecord, MessageMethods>;
export interface MessageMethods {
}
export default mongoose.model<MessageRecord, mongoose.Model<MessageRecord, {}, MessageMethods>>('Message', messageSchema);

