import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IMessage extends Document {
  chatId: Types.ObjectId;
  senderId: Types.ObjectId;
  content: string;
  clientMessageId?: string;
  hiddenFor: Types.ObjectId[];
  deletedForEveryone: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const messageSchema = new Schema<IMessage>(
  {
    chatId: { type: Schema.Types.ObjectId, ref: 'Chat', required: true, index: true },
    senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true },
    clientMessageId: { type: String, index: true },
    hiddenFor: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    deletedForEveryone: { type: Boolean, default: false },
  },
  { timestamps: true }
);

messageSchema.index({ chatId: 1, createdAt: -1 });

export const Message = mongoose.model<IMessage>('Message', messageSchema);
