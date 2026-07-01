import { Request, Response } from "express";
import { contactService } from "../../services/contact";
import { updateContactSchema } from "../../validations/contact";
import { AuthRequest } from "../../middleware/auth";
import { COMMON_MESSAGES } from "../../constants/messages";
import { CONTACT_MESSAGES } from "../../constants/contact";
import { R, extractUserIdFromRequest, validateWithSchema } from "../../utils";

export class ContactController {
  async getContent(req: Request, res: Response): Promise<void> {
    const content = await contactService.get();
    R.success(res, content, CONTACT_MESSAGES.FETCHED, req);
  }

  async updateContent(req: AuthRequest, res: Response): Promise<void> {
    const adminId = extractUserIdFromRequest(req);
    const patch = validateWithSchema(
      updateContactSchema,
      req.body,
      COMMON_MESSAGES.BAD_REQUEST
    );
    const content = await contactService.update(patch, adminId);
    R.success(res, content, CONTACT_MESSAGES.UPDATED, req);
  }

  async resetContent(req: AuthRequest, res: Response): Promise<void> {
    const adminId = extractUserIdFromRequest(req);
    const content = await contactService.reset(adminId);
    R.success(res, content, CONTACT_MESSAGES.RESET, req);
  }
}

export const contactController = new ContactController();
