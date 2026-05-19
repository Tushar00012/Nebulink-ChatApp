import mongoose, { Document, Schema } from 'mongoose';

export interface IOtpSession extends Document {
  phone: string;
  codeHash: string;
  expiresAt: Date;
}

const otpSessionSchema = new Schema<IOtpSession>({
  phone: { type: String, required: true, index: true },
  codeHash: { type: String, required: true },
  expiresAt: { type: Date, required: true },
});

otpSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const OtpSession = mongoose.model<IOtpSession>('OtpSession', otpSessionSchema);
