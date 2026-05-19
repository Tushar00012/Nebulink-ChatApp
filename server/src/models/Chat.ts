import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ILastMessage {
  text: string;
  senderId: Types.ObjectId;
  createdAt: Date;
}

export interface IChat extends Document {
  type: 'direct';
  participants: Types.ObjectId[];
  participantKey: string;
  hiddenFor: Types.ObjectId[];
  lastMessage?: ILastMessage;
  lastMessageAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const lastMessageSchema = new Schema<ILastMessage>(
  {
    text: { type: String, required: true },
    senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    createdAt: { type: Date, required: true },
  },
  { _id: false }
);

const chatSchema = new Schema<IChat>(
  {
    type: { type: String, enum: ['direct'], default: 'direct' },
    participants: [{ type: Schema.Types.ObjectId, ref: 'User', required: true }],
    participantKey: { type: String, required: true, unique: true, index: true },
    hiddenFor: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    lastMessage: lastMessageSchema,
    lastMessageAt: { type: Date, index: true },
  },
  { timestamps: true }
);

chatSchema.index({ participants: 1 });

export const Chat = mongoose.model<IChat>('Chat', chatSchema);

export function getParticipantKey(userA: string, userB: string): string {
  return [userA, userB].sort().join(':');
}
