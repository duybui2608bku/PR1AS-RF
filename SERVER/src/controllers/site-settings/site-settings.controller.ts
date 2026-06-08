import { Request, Response } from "express";
import { siteSettingsService } from "../../services/site-settings";
import { updateSiteSettingsSchema } from "../../validations/site-settings";
import { AuthRequest } from "../../middleware/auth";
import { COMMON_MESSAGES } from "../../constants/messages";
import { SITE_SETTINGS_MESSAGES } from "../../constants/site-settings";
import { R, extractUserIdFromRequest, validateWithSchema } from "../../utils";

export class SiteSettingsController {
  async getSettings(req: Request, res: Response): Promise<void> {
    const settings = await siteSettingsService.get();
    R.success(res, settings, SITE_SETTINGS_MESSAGES.FETCHED, req);
  }

  async updateSettings(req: AuthRequest, res: Response): Promise<void> {
    const adminId = extractUserIdFromRequest(req);
    const patch = validateWithSchema(
      updateSiteSettingsSchema,
      req.body,
      COMMON_MESSAGES.BAD_REQUEST
    );
    const settings = await siteSettingsService.update(patch, adminId);
    R.success(res, settings, SITE_SETTINGS_MESSAGES.UPDATED, req);
  }

  async resetSettings(req: AuthRequest, res: Response): Promise<void> {
    const adminId = extractUserIdFromRequest(req);
    const settings = await siteSettingsService.reset(adminId);
    R.success(res, settings, SITE_SETTINGS_MESSAGES.RESET, req);
  }

  async getMaintenanceStatus(req: Request, res: Response): Promise<void> {
    const status = await siteSettingsService.getMaintenanceStatus();
    R.success(res, status, SITE_SETTINGS_MESSAGES.FETCHED, req);
  }
}

export const siteSettingsController = new SiteSettingsController();
