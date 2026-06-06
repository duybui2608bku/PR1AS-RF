import { Types } from "mongoose";
import { EmailCampaign, EmailSendLog } from "../../models/email-campaign";
import {
  EmailCampaignAudience,
  EmailCampaignStatus,
  EmailSendLogStatus,
} from "../../constants/email-campaign";
import type {
  IEmailCampaignDocument,
  IEmailSendLogDocument,
  EmailCampaignQuery,
  EmailSendLogQuery,
  CreateCampaignInput,
  UpdateCampaignInput,
} from "../../types/email-campaign";
import { User } from "../../models/auth";
import { UserRole } from "../../types";

const CREATOR_FIELDS = "_id email full_name avatar";

export class EmailCampaignRepository {
  async create(
    input: CreateCampaignInput & { createdBy: string }
  ): Promise<IEmailCampaignDocument> {
    const now = new Date();
    return new EmailCampaign({
      name: input.name,
      subject: input.subject,
      html_content: input.html_content,
      audience: input.audience,
      status: input.scheduled_at
        ? EmailCampaignStatus.SCHEDULED
        : EmailCampaignStatus.DRAFT,
      scheduled_at: input.scheduled_at ?? null,
      created_by: new Types.ObjectId(input.createdBy),
      total_recipients: 0,
      sent_count: 0,
      failed_count: 0,
      created_at: now,
      updated_at: now,
    }).save();
  }

  async findById(id: string): Promise<IEmailCampaignDocument | null> {
    return EmailCampaign.findById(id).populate(
      "created_by",
      CREATOR_FIELDS
    );
  }

  async update(
    id: string,
    input: UpdateCampaignInput
  ): Promise<IEmailCampaignDocument | null> {
    const patch: Record<string, unknown> = { updated_at: new Date() };
    if (input.name !== undefined) patch.name = input.name;
    if (input.subject !== undefined) patch.subject = input.subject;
    if (input.html_content !== undefined)
      patch.html_content = input.html_content;
    if (input.audience !== undefined) patch.audience = input.audience;
    if (input.scheduled_at !== undefined) {
      patch.scheduled_at = input.scheduled_at;
      patch.status = input.scheduled_at
        ? EmailCampaignStatus.SCHEDULED
        : EmailCampaignStatus.DRAFT;
    }
    return EmailCampaign.findByIdAndUpdate(id, patch, { new: true }).populate(
      "created_by",
      CREATOR_FIELDS
    );
  }

  async delete(id: string): Promise<boolean> {
    const result = await EmailCampaign.findByIdAndDelete(id);
    return result !== null;
  }

  async list(query: EmailCampaignQuery): Promise<{
    campaigns: IEmailCampaignDocument[];
    total: number;
  }> {
    const filter: Record<string, unknown> = {};
    if (query.status) filter.status = query.status;
    if (query.audience) filter.audience = query.audience;

    const [campaigns, total] = await Promise.all([
      EmailCampaign.find(filter)
        .populate("created_by", CREATOR_FIELDS)
        .sort({ created_at: -1 })
        .skip(query.skip)
        .limit(query.limit),
      EmailCampaign.countDocuments(filter),
    ]);

    return { campaigns, total };
  }

  async updateStatus(
    id: string,
    status: EmailCampaignStatus,
    extra?: {
      sent_at?: Date;
      total_recipients?: number;
      sent_count?: number;
      failed_count?: number;
    }
  ): Promise<IEmailCampaignDocument | null> {
    return EmailCampaign.findByIdAndUpdate(
      id,
      { status, updated_at: new Date(), ...extra },
      { new: true }
    );
  }

  async incrementCounts(
    id: string,
    sent: number,
    failed: number
  ): Promise<void> {
    await EmailCampaign.findByIdAndUpdate(id, {
      $inc: { sent_count: sent, failed_count: failed },
      updated_at: new Date(),
    });
  }

  async getRecipientEmails(audience: EmailCampaignAudience): Promise<
    Array<{ _id: Types.ObjectId; email: string }>
  > {
    const filter: Record<string, unknown> = {
      deleted_at: null,
      verify_email: true,
    };

    if (audience === EmailCampaignAudience.CLIENTS) {
      filter.roles = { $in: [UserRole.CLIENT] };
    } else if (audience === EmailCampaignAudience.WORKERS) {
      filter.roles = { $in: [UserRole.WORKER] };
    }

    return User.find(filter).select("_id email").lean();
  }

  async createSendLogs(
    logs: Array<{
      campaign_id: Types.ObjectId;
      recipient_id: Types.ObjectId | null;
      recipient_email: string;
    }>
  ): Promise<void> {
    const now = new Date();
    await EmailSendLog.insertMany(
      logs.map((log) => ({
        ...log,
        status: EmailSendLogStatus.PENDING,
        sent_at: null,
        error_message: null,
        created_at: now,
      }))
    );
  }

  async updateSendLog(
    id: Types.ObjectId,
    status: EmailSendLogStatus,
    extra?: { sent_at?: Date; error_message?: string }
  ): Promise<void> {
    await EmailSendLog.findByIdAndUpdate(id, { status, ...extra });
  }

  async listSendLogs(query: EmailSendLogQuery): Promise<{
    logs: IEmailSendLogDocument[];
    total: number;
  }> {
    const filter: Record<string, unknown> = {
      campaign_id: new Types.ObjectId(query.campaign_id),
    };
    if (query.status) filter.status = query.status;

    const [logs, total] = await Promise.all([
      EmailSendLog.find(filter)
        .populate("recipient_id", CREATOR_FIELDS)
        .sort({ created_at: -1 })
        .skip(query.skip)
        .limit(query.limit),
      EmailSendLog.countDocuments(filter),
    ]);

    return { logs, total };
  }

  async findScheduledDue(): Promise<IEmailCampaignDocument[]> {
    return EmailCampaign.find({
      status: EmailCampaignStatus.SCHEDULED,
      scheduled_at: { $lte: new Date() },
    });
  }

  async getPendingLogsForCampaign(
    campaignId: string
  ): Promise<IEmailSendLogDocument[]> {
    return EmailSendLog.find({
      campaign_id: new Types.ObjectId(campaignId),
      status: EmailSendLogStatus.PENDING,
    });
  }
}

export const emailCampaignRepository = new EmailCampaignRepository();
