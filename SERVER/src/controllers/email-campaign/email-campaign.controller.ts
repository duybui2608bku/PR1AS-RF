import { Request, Response } from "express";
import { z } from "zod";

import {
  EMAIL_CAMPAIGN_MESSAGES,
  EMAIL_CAMPAIGN_LOCALES,
  EmailCampaignAudience,
  EmailCampaignStatus,
  EmailSendLogStatus,
} from "../../constants/email-campaign";
import { emailCampaignService } from "../../services/email-campaign/email-campaign.service";
import { R, validateWithSchema, getPagination } from "../../utils";
import { AuthRequest } from "../../middleware/auth";
import { AppError } from "../../utils/AppError";

const localeEnum = z.enum(EMAIL_CAMPAIGN_LOCALES);

// Subject / body per locale: every language is optional here, but the
// campaign's default locale must carry content (enforced by the refinements
// below) so there is always a fallback at delivery time.
const localizedSubjectSchema = z.object({
  vi: z.string().max(500).optional(),
  en: z.string().max(500).optional(),
  zh: z.string().max(500).optional(),
});

const localizedHtmlSchema = z.object({
  vi: z.string().optional(),
  en: z.string().optional(),
  zh: z.string().optional(),
});

const nonEmpty = (value?: string): boolean => Boolean(value && value.trim());

const createCampaignSchema = z
  .object({
    name: z.string().min(1).max(200),
    subject: localizedSubjectSchema,
    html_content: localizedHtmlSchema,
    default_locale: localeEnum,
    audience: z.nativeEnum(EmailCampaignAudience),
    scheduled_at: z.coerce.date().optional().nullable(),
  })
  .refine((data) => nonEmpty(data.subject[data.default_locale]), {
    message: "Subject for the default language is required",
    path: ["subject"],
  })
  .refine((data) => nonEmpty(data.html_content[data.default_locale]), {
    message: "Content for the default language is required",
    path: ["html_content"],
  });

const updateCampaignSchema = z
  .object({
    name: z.string().min(1).max(200).optional(),
    subject: localizedSubjectSchema.optional(),
    html_content: localizedHtmlSchema.optional(),
    default_locale: localeEnum.optional(),
    audience: z.nativeEnum(EmailCampaignAudience).optional(),
    scheduled_at: z.coerce.date().optional().nullable(),
  })
  .refine(
    (data) =>
      !data.default_locale ||
      !data.subject ||
      nonEmpty(data.subject[data.default_locale]),
    {
      message: "Subject for the default language is required",
      path: ["subject"],
    }
  )
  .refine(
    (data) =>
      !data.default_locale ||
      !data.html_content ||
      nonEmpty(data.html_content[data.default_locale]),
    {
      message: "Content for the default language is required",
      path: ["html_content"],
    }
  );

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
    const input = validateWithSchema(
      createCampaignSchema,
      req.body,
      "Invalid campaign data"
    );
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
    const query = validateWithSchema(
      listCampaignsSchema,
      req.query,
      "Invalid query"
    );
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
    const input = validateWithSchema(
      updateCampaignSchema,
      req.body,
      "Invalid campaign data"
    );
    const campaign = await emailCampaignService.updateCampaign(
      req.params.id,
      input
    );
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
    const query = validateWithSchema(
      listSendLogsSchema,
      req.query,
      "Invalid query"
    );
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
