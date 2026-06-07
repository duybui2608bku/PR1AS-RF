import { Request, Response } from "express";
import { z } from "zod";

import { EMAIL_CAMPAIGN_MESSAGES, EmailCampaignAudience, EmailCampaignStatus, EmailSendLogStatus } from "../../constants/email-campaign";
import { emailCampaignService } from "../../services/email-campaign/email-campaign.service";
import { R, validateWithSchema, getPagination } from "../../utils";
import { AuthRequest } from "../../middleware/auth";
import { AppError } from "../../utils/AppError";

const createCampaignSchema = z.object({
  name: z.string().min(1).max(200),
  subject: z.string().min(1).max(500),
  html_content: z.string().min(1),
  audience: z.nativeEnum(EmailCampaignAudience),
  scheduled_at: z.coerce.date().optional().nullable(),
});

const updateCampaignSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  subject: z.string().min(1).max(500).optional(),
  html_content: z.string().min(1).optional(),
  audience: z.nativeEnum(EmailCampaignAudience).optional(),
  scheduled_at: z.coerce.date().optional().nullable(),
});

const listCampaignsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.nativeEnum(EmailCampaignStatus).optional(),
  audience: z.nativeEnum(EmailCampaignAudience).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

const listSendLogsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  status: z.nativeEnum(EmailSendLogStatus).optional(),
});

export class EmailCampaignController {
  async createCampaign(req: Request, res: Response): Promise<void> {
    const input = validateWithSchema(createCampaignSchema, req.body, "Invalid campaign data");
    const userId = (req as AuthRequest).user?.sub;
    if (!userId) throw AppError.unauthorized();
    const campaign = await emailCampaignService.createCampaign(userId, input);
    res.status(201);
    R.success(res, campaign, EMAIL_CAMPAIGN_MESSAGES.CREATED, req);
  }

  async getCampaign(req: Request, res: Response): Promise<void> {
    const campaign = await emailCampaignService.getCampaign(req.params.id);
    R.success(res, campaign, EMAIL_CAMPAIGN_MESSAGES.CAMPAIGNS_FETCHED, req);
  }

  async listCampaigns(req: Request, res: Response): Promise<void> {
    const query = validateWithSchema(listCampaignsSchema, req.query, "Invalid query");
    const pagination = getPagination(query.page, query.limit);
    const result = await emailCampaignService.listCampaigns({
      ...pagination,
      status: query.status,
      audience: query.audience,
      from: query.from,
      to: query.to,
    });
    R.success(res, result, EMAIL_CAMPAIGN_MESSAGES.CAMPAIGNS_FETCHED, req);
  }

  async updateCampaign(req: Request, res: Response): Promise<void> {
    const input = validateWithSchema(updateCampaignSchema, req.body, "Invalid campaign data");
    const campaign = await emailCampaignService.updateCampaign(req.params.id, input);
    R.success(res, campaign, EMAIL_CAMPAIGN_MESSAGES.UPDATED, req);
  }

  async deleteCampaign(req: Request, res: Response): Promise<void> {
    await emailCampaignService.deleteCampaign(req.params.id);
    R.success(res, null, EMAIL_CAMPAIGN_MESSAGES.DELETED, req);
  }

  async sendCampaign(req: Request, res: Response): Promise<void> {
    const campaign = await emailCampaignService.sendCampaign(req.params.id);
    res.status(202);
    R.success(res, campaign, EMAIL_CAMPAIGN_MESSAGES.SEND_STARTED, req);
  }

  async cancelCampaign(req: Request, res: Response): Promise<void> {
    const campaign = await emailCampaignService.cancelCampaign(req.params.id);
    R.success(res, campaign, "Campaign cancelled successfully", req);
  }

  async listSendLogs(req: Request, res: Response): Promise<void> {
    const query = validateWithSchema(listSendLogsSchema, req.query, "Invalid query");
    const pagination = getPagination(query.page, query.limit);
    const result = await emailCampaignService.listSendLogs({
      ...pagination,
      campaign_id: req.params.id,
      status: query.status,
    });
    R.success(res, result, EMAIL_CAMPAIGN_MESSAGES.LOGS_FETCHED, req);
  }
}

export const emailCampaignController = new EmailCampaignController();
