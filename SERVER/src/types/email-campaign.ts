import { Document, Types } from "mongoose";
import {
  EmailCampaignAudience,
  EmailCampaignStatus,
  EmailSendLogStatus,
} from "../constants/email-campaign";

export interface IEmailCampaign {
  name: string;
  subject: string;
  html_content: string;
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
  subject: string;
  html_content: string;
  audience: EmailCampaignAudience;
  scheduled_at?: Date | null;
}

export interface UpdateCampaignInput {
  name?: string;
  subject?: string;
  html_content?: string;
  audience?: EmailCampaignAudience;
  scheduled_at?: Date | null;
}
