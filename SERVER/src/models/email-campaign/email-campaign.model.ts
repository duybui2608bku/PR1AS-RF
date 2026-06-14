import mongoose, { Schema } from "mongoose";
import {
  DEFAULT_CAMPAIGN_LOCALE,
  EMAIL_CAMPAIGN_LOCALES,
  EmailCampaignAudience,
  EmailCampaignStatus,
} from "../../constants/email-campaign";
import { modelsName } from "../models.name";
import { IEmailCampaignDocument } from "../../types/email-campaign";

// Per-locale subject / body. Stored as a plain sub-document so each language
// is an optional field; only the campaign's default_locale is guaranteed.
const localizedSubjectSchema = new Schema(
  {
    vi: { type: String, trim: true, maxlength: 500, default: "" },
    en: { type: String, trim: true, maxlength: 500, default: "" },
    zh: { type: String, trim: true, maxlength: 500, default: "" },
  },
  { _id: false }
);

const localizedHtmlSchema = new Schema(
  {
    vi: { type: String, default: "" },
    en: { type: String, default: "" },
    zh: { type: String, default: "" },
  },
  { _id: false }
);

const emailCampaignSchema = new Schema<IEmailCampaignDocument>(
  {
    name: { type: String, required: true, trim: true, maxlength: 200 },
    subject: { type: localizedSubjectSchema, required: true },
    html_content: { type: localizedHtmlSchema, required: true },
    default_locale: {
      type: String,
      enum: EMAIL_CAMPAIGN_LOCALES,
      default: DEFAULT_CAMPAIGN_LOCALE,
      required: true,
    },
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
