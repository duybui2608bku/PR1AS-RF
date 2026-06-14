import { Types } from "mongoose";
import { emailCampaignRepository } from "../../repositories/email-campaign/email-campaign.repository";
import {
  EMAIL_CAMPAIGN_MESSAGES,
  EmailCampaignLocale,
  EmailCampaignStatus,
  EmailSendLogStatus,
} from "../../constants/email-campaign";
import { AppError } from "../../utils/AppError";
import { PaginationHelper } from "../../utils";
import nodemailerUtils from "../../utils/nodemailer";
import { logger } from "../../utils/logger";
import type {
  EmailCampaignQuery,
  EmailSendLogQuery,
  CreateCampaignInput,
  UpdateCampaignInput,
  IEmailCampaignDocument,
  LocalizedEmailContent,
} from "../../types/email-campaign";

const BATCH_SIZE = 20;

/**
 * Returns the content authored for `locale`, falling back to the campaign's
 * default locale when that translation was left blank.
 */
function pickContent(
  field: LocalizedEmailContent,
  locale: EmailCampaignLocale,
  defaultLocale: EmailCampaignLocale
): string {
  const value = field[locale];
  if (value && value.trim() !== "") return value;
  return field[defaultLocale] ?? "";
}

export class EmailCampaignService {
  async createCampaign(createdBy: string, input: CreateCampaignInput) {
    return emailCampaignRepository.create({ ...input, createdBy });
  }

  async getCampaign(id: string) {
    const campaign = await emailCampaignRepository.findById(id);
    if (!campaign) throw AppError.notFound(EMAIL_CAMPAIGN_MESSAGES.NOT_FOUND);
    return campaign;
  }

  async listCampaigns(query: EmailCampaignQuery) {
    const { campaigns, total } = await emailCampaignRepository.list(query);
    return PaginationHelper.formatResponse(
      campaigns,
      query.page,
      query.limit,
      total
    );
  }

  async updateCampaign(id: string, input: UpdateCampaignInput) {
    const campaign = await emailCampaignRepository.findById(id);
    if (!campaign) throw AppError.notFound(EMAIL_CAMPAIGN_MESSAGES.NOT_FOUND);

    if (
      campaign.status === EmailCampaignStatus.SENDING ||
      campaign.status === EmailCampaignStatus.SENT
    ) {
      throw AppError.badRequest(EMAIL_CAMPAIGN_MESSAGES.CANNOT_EDIT);
    }

    return emailCampaignRepository.update(id, input);
  }

  async deleteCampaign(id: string) {
    const campaign = await emailCampaignRepository.findById(id);
    if (!campaign) throw AppError.notFound(EMAIL_CAMPAIGN_MESSAGES.NOT_FOUND);

    if (campaign.status === EmailCampaignStatus.SENDING) {
      throw AppError.badRequest(EMAIL_CAMPAIGN_MESSAGES.CANNOT_DELETE);
    }

    return emailCampaignRepository.delete(id);
  }

  async sendCampaign(id: string) {
    const campaign = await emailCampaignRepository.findById(id);
    if (!campaign) throw AppError.notFound(EMAIL_CAMPAIGN_MESSAGES.NOT_FOUND);

    if (
      campaign.status !== EmailCampaignStatus.DRAFT &&
      campaign.status !== EmailCampaignStatus.SCHEDULED
    ) {
      throw AppError.badRequest(EMAIL_CAMPAIGN_MESSAGES.CANNOT_SEND);
    }

    // Flip to "sending" synchronously so the admin gets immediate feedback,
    // then deliver in the background. The HTTP request returns right away.
    const updated = await emailCampaignRepository.updateStatus(
      id,
      EmailCampaignStatus.SENDING
    );

    void this.deliverCampaign(id, campaign).catch(async (error) => {
      logger.error(`Email campaign delivery failed for ${id}: ${error}`);
      await emailCampaignRepository.updateStatus(
        id,
        EmailCampaignStatus.FAILED
      );
    });

    return updated;
  }

  /**
   * Resolves recipients, writes send logs and dispatches emails in batches.
   * Runs detached from the request lifecycle (see sendCampaign).
   */
  private async deliverCampaign(
    id: string,
    campaign: IEmailCampaignDocument
  ): Promise<void> {
    const recipients = await emailCampaignRepository.getRecipientEmails(
      campaign.audience,
      campaign.default_locale
    );

    await emailCampaignRepository.updateStatus(
      id,
      EmailCampaignStatus.SENDING,
      {
        total_recipients: recipients.length,
      }
    );

    await emailCampaignRepository.createSendLogs(
      recipients.map((r) => ({
        campaign_id: campaign._id as Types.ObjectId,
        recipient_id: r._id,
        recipient_email: r.email,
        locale: r.locale,
      }))
    );

    const logs = await emailCampaignRepository.getPendingLogsForCampaign(id);

    let sentCount = 0;
    let failedCount = 0;

    for (let i = 0; i < logs.length; i += BATCH_SIZE) {
      const batch = logs.slice(i, i + BATCH_SIZE);
      await Promise.all(
        batch.map(async (log) => {
          try {
            const locale = log.locale as EmailCampaignLocale;
            await nodemailerUtils({
              email: log.recipient_email,
              subject: pickContent(
                campaign.subject,
                locale,
                campaign.default_locale
              ),
              html: pickContent(
                campaign.html_content,
                locale,
                campaign.default_locale
              ),
            });
            await emailCampaignRepository.updateSendLog(
              log._id as Types.ObjectId,
              EmailSendLogStatus.SENT,
              { sent_at: new Date() }
            );
            sentCount++;
          } catch (error) {
            const message =
              error instanceof Error ? error.message : String(error);
            await emailCampaignRepository.updateSendLog(
              log._id as Types.ObjectId,
              EmailSendLogStatus.FAILED,
              { error_message: message }
            );
            failedCount++;
            logger.warn(
              `Email send failed to ${log.recipient_email}: ${message}`
            );
          }
        })
      );
      await emailCampaignRepository.incrementCounts(id, sentCount, failedCount);
      sentCount = 0;
      failedCount = 0;
    }

    await emailCampaignRepository.updateStatus(id, EmailCampaignStatus.SENT, {
      sent_at: new Date(),
    });
  }

  async cancelCampaign(id: string) {
    const campaign = await emailCampaignRepository.findById(id);
    if (!campaign) throw AppError.notFound(EMAIL_CAMPAIGN_MESSAGES.NOT_FOUND);

    if (campaign.status !== EmailCampaignStatus.SCHEDULED) {
      throw AppError.badRequest("Only scheduled campaigns can be cancelled");
    }

    return emailCampaignRepository.updateStatus(
      id,
      EmailCampaignStatus.CANCELLED
    );
  }

  async listSendLogs(query: EmailSendLogQuery) {
    const { logs, total } = await emailCampaignRepository.listSendLogs(query);
    return PaginationHelper.formatResponse(
      logs,
      query.page,
      query.limit,
      total
    );
  }

  async processScheduledCampaigns(): Promise<void> {
    const due = await emailCampaignRepository.findScheduledDue();
    for (const campaign of due) {
      try {
        await this.sendCampaign((campaign._id as Types.ObjectId).toString());
        logger.info(`Scheduled campaign delivery started: ${campaign.name}`);
      } catch (error) {
        logger.error(
          `Scheduled campaign failed for ${campaign.name}: ${error}`
        );
        await emailCampaignRepository.updateStatus(
          (campaign._id as Types.ObjectId).toString(),
          EmailCampaignStatus.FAILED
        );
      }
    }
  }
}

export const emailCampaignService = new EmailCampaignService();
