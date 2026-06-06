import mongoose, { Schema } from "mongoose";
import { EmailSendLogStatus } from "../../constants/email-campaign";
import { modelsName } from "../models.name";
import { IEmailSendLogDocument } from "../../types/email-campaign";

const emailSendLogSchema = new Schema<IEmailSendLogDocument>(
  {
    campaign_id: {
      type: Schema.Types.ObjectId,
      ref: modelsName.EMAIL_CAMPAIGN,
      required: true,
      index: true,
    },
    recipient_id: {
      type: Schema.Types.ObjectId,
      ref: modelsName.USER,
      default: null,
      index: true,
    },
    recipient_email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(EmailSendLogStatus),
      default: EmailSendLogStatus.PENDING,
      index: true,
    },
    sent_at: { type: Date, default: null },
    error_message: { type: String, default: null, maxlength: 2000 },
    created_at: { type: Date, default: Date.now },
  },
  {
    timestamps: false,
    collection: modelsName.EMAIL_SEND_LOG,
    toJSON: {
      transform: (_doc, ret: Record<string, unknown>) => {
        ret.id = (ret._id as mongoose.Types.ObjectId).toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

emailSendLogSchema.index({ campaign_id: 1, status: 1 });
emailSendLogSchema.index({ campaign_id: 1, created_at: -1 });

export const EmailSendLog = mongoose.model<IEmailSendLogDocument>(
  modelsName.EMAIL_SEND_LOG,
  emailSendLogSchema
);
