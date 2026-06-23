import { Document, Types } from "mongoose";
import {
  EmailCampaignAudience,
  EmailCampaignLocale,
  EmailCampaignStatus,
  EmailSendLogStatus,
} from "../constants/email-campaign";

/**
 * Subject / body authored per supported locale. The campaign's
 * `default_locale` entry is always required; the others are optional and
 * fall back to the default at delivery time.
 */
export interface LocalizedEmailContent {
  vi?: string;
  en?: string;
  zh?: string;
  ko?: string;
}

export interface IEmailCampaign {
  name: string;
  subject: LocalizedEmailContent;
  html_content: LocalizedEmailContent;
  default_locale: EmailCampaignLocale;
  audience: EmailCampaignAudience;
  status: EmailCampaignStatus;
  scheduled_at: Date | null;
  sent_at: Date | null;
  created_by: Types.ObjectId;
  total_recipients: number;
  sent_count: number;
  failed_count: number;
  created_at: Date;
  updated_at: Date;
}

export interface IEmailCampaignDocument extends IEmailCampaign, Document {}

export interface IEmailSendLog {
  campaign_id: Types.ObjectId;
  recipient_id: Types.ObjectId | null;
  recipient_email: string;
  /** Locale the email was actually rendered in for this recipient. */
  locale: EmailCampaignLocale;
  status: EmailSendLogStatus;
  sent_at: Date | null;
  error_message: string | null;
  created_at: Date;
}

export interface IEmailSendLogDocument extends IEmailSendLog, Document {}

export interface EmailCampaignQuery {
  page: number;
  limit: number;
  skip: number;
  status?: EmailCampaignStatus;
  audience?: EmailCampaignAudience;
  from?: Date;
  to?: Date;
}

export interface EmailSendLogQuery {
  page: number;
  limit: number;
  skip: number;
  campaign_id: string;
  status?: EmailSendLogStatus;
}

export interface CreateCampaignInput {
  name: string;
  subject: LocalizedEmailContent;
  html_content: LocalizedEmailContent;
  default_locale: EmailCampaignLocale;
  audience: EmailCampaignAudience;
  scheduled_at?: Date | null;
}

export interface UpdateCampaignInput {
  name?: string;
  subject?: LocalizedEmailContent;
  html_content?: LocalizedEmailContent;
  default_locale?: EmailCampaignLocale;
  audience?: EmailCampaignAudience;
  scheduled_at?: Date | null;
}
