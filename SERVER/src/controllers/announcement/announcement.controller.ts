import { Request, Response } from "express";
import { z } from "zod";
import {
  AnnouncementDisplayType,
  AnnouncementDisplayBehavior,
  AnnouncementTargetRole,
  AnnouncementRedirectTarget,
  ANNOUNCEMENT_MESSAGES,
} from "../../constants/announcement";
import { announcementService } from "../../services/announcement/announcement.service";
import { R, validateWithSchema, getPagination } from "../../utils";
import { AuthRequest } from "../../middleware/auth";
import { AppError } from "../../utils/AppError";

const createAnnouncementSchema = z.object({
  title: z.string().max(300).optional().default(""),
  content: z.string().min(1),
  images: z.array(z.string().url()).optional().default([]),
  display_types: z.array(z.nativeEnum(AnnouncementDisplayType)).min(1),
  display_behavior: z
    .nativeEnum(AnnouncementDisplayBehavior)
    .optional()
    .default(AnnouncementDisplayBehavior.ONCE_DEVICE),
  target_roles: z
    .array(z.nativeEnum(AnnouncementTargetRole))
    .optional()
    .default([AnnouncementTargetRole.ALL]),
  placements: z.array(z.string().min(1).max(100)).min(1),
  redirect_url: z.string().url().optional().nullable(),
  redirect_target: z
    .nativeEnum(AnnouncementRedirectTarget)
    .optional()
    .default(AnnouncementRedirectTarget.BLANK),
  allow_close: z.boolean().optional().default(true),
  is_active: z.boolean().optional().default(false),
  start_date: z.coerce.date().optional().nullable(),
  end_date: z.coerce.date().optional().nullable(),
  priority: z.number().int().optional().default(0),
});

const updateAnnouncementSchema = z.object({
  title: z.string().max(300).optional(),
  content: z.string().min(1).optional(),
  images: z.array(z.string().url()).optional(),
  display_types: z.array(z.nativeEnum(AnnouncementDisplayType)).min(1).optional(),
  display_behavior: z.nativeEnum(AnnouncementDisplayBehavior).optional(),
  target_roles: z.array(z.nativeEnum(AnnouncementTargetRole)).optional(),
  placements: z.array(z.string().min(1).max(100)).min(1).optional(),
  redirect_url: z.string().url().optional().nullable(),
  redirect_target: z.nativeEnum(AnnouncementRedirectTarget).optional(),
  allow_close: z.boolean().optional(),
  is_active: z.boolean().optional(),
  start_date: z.coerce.date().optional().nullable(),
  end_date: z.coerce.date().optional().nullable(),
  priority: z.number().int().optional(),
});

const listAnnouncementsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  placement: z.string().optional(),
  is_active: z
    .string()
    .transform((v) => v === "true")
    .pipe(z.boolean())
    .optional(),
});

export class AnnouncementController {
  async getByPlacement(req: Request, res: Response): Promise<void> {
    const placement = req.query.placement as string;
    if (!placement) throw AppError.badRequest("placement query param is required");
    const announcement = await announcementService.getActiveByPlacement(placement);
    R.success(res, announcement, ANNOUNCEMENT_MESSAGES.BY_PLACEMENT_FETCHED, req);
  }

  async list(req: Request, res: Response): Promise<void> {
    const query = validateWithSchema(listAnnouncementsSchema, req.query, "Invalid query");
    const pagination = getPagination(query.page, query.limit);
    const result = await announcementService.list({
      ...pagination,
      placement: query.placement,
      is_active: query.is_active,
    });
    R.success(res, result, ANNOUNCEMENT_MESSAGES.FETCHED, req);
  }

  async getById(req: Request, res: Response): Promise<void> {
    const announcement = await announcementService.getById(req.params.id);
    R.success(res, announcement, ANNOUNCEMENT_MESSAGES.BY_PLACEMENT_FETCHED, req);
  }

  async create(req: Request, res: Response): Promise<void> {
    const input = validateWithSchema(createAnnouncementSchema, req.body, "Invalid announcement data");
    const userId = (req as AuthRequest).user?.sub;
    if (!userId) throw AppError.unauthorized();
    const announcement = await announcementService.create(input, userId);
    res.status(201);
    R.success(res, announcement, ANNOUNCEMENT_MESSAGES.CREATED, req);
  }

  async update(req: Request, res: Response): Promise<void> {
    const input = validateWithSchema(updateAnnouncementSchema, req.body, "Invalid announcement data");
    const announcement = await announcementService.update(req.params.id, input);
    R.success(res, announcement, ANNOUNCEMENT_MESSAGES.UPDATED, req);
  }

  async delete(req: Request, res: Response): Promise<void> {
    await announcementService.delete(req.params.id);
    R.success(res, null, ANNOUNCEMENT_MESSAGES.DELETED, req);
  }
}

export const announcementController = new AnnouncementController();
