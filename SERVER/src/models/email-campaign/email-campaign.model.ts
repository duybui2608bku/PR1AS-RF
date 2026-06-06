import mongoose, { Schema } from "mongoose";
import {
  EmailCampaignAudience,
  EmailCampaignStatus,
} from "../../constants/email-campaign";
import { modelsName } from "../models.name";
import { IEmailCampaignDocument } from "../../types/email-campaign";

const emailCampaignSchema = new Schema<IEmailCampaignDocument>(
  {
    name: { type: String, required: true, trim: true, maxlength: 200 },
    subject: { type: String, required: true, trim: true, maxlength: 500 },
    html_content: { type: String, required: true },
    audience: {
      type: String,
      enum: Object.values(EmailCampaignAudience),
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(EmailCampaignStatus),
      default: EmailCampaignStatus.DRAFT,
      index: true,
    },
    scheduled_at: { type: Date, default: null, index: true },
    sent_at: { type: Date, default: null },
    created_by: {
      type: Schema.Types.ObjectId,
      ref: modelsName.USER,
      required: true,
      index: true,
    },
    total_recipients: { type: Number, default: 0 },
    sent_count: { type: Number, default: 0 },
    failed_count: { type: Number, default: 0 },
    created_at: { type: Date, default: Date.now, index: true },
    updated_at: { type: Date, default: Date.now },
  },
  {
    timestamps: false,
    collection: modelsName.EMAIL_CAMPAIGN,
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

export const EmailCampaign = mongoose.model<IEmailCampaignDocument>(
  modelsName.EMAIL_CAMPAIGN,
  emailCampaignSchema
);
