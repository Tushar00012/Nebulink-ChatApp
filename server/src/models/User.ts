import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  phone: string;
  name: string;
  userCode: string;
  avatarUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    phone: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    userCode: { type: String, required: true, unique: true, index: true, uppercase: true },
    avatarUrl: { type: String },
  },
  { timestamps: true }
);

export const User = mongoose.model<IUser>('User', userSchema);
