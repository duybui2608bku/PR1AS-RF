import { Request, Response } from "express";
import { aboutService } from "../../services/about";
import { updateAboutSchema } from "../../validations/about";
import { AuthRequest } from "../../middleware/auth";
import { COMMON_MESSAGES } from "../../constants/messages";
import { ABOUT_MESSAGES } from "../../constants/about";
import { R, extractUserIdFromRequest, validateWithSchema } from "../../utils";

export class AboutController {
  async getContent(req: Request, res: Response): Promise<void> {
    const content = await aboutService.get();
    R.success(res, content, ABOUT_MESSAGES.FETCHED, req);
  }

  async updateContent(req: AuthRequest, res: Response): Promise<void> {
    const adminId = extractUserIdFromRequest(req);
    const patch = validateWithSchema(
      updateAboutSchema,
      req.body,
      COMMON_MESSAGES.BAD_REQUEST
    );
    const content = await aboutService.update(patch, adminId);
    R.success(res, content, ABOUT_MESSAGES.UPDATED, req);
  }

  async resetContent(req: AuthRequest, res: Response): Promise<void> {
    const adminId = extractUserIdFromRequest(req);
    const content = await aboutService.reset(adminId);
    R.success(res, content, ABOUT_MESSAGES.RESET, req);
  }
}

export const aboutController = new AboutController();
