import { Request, Response } from "express";
import { legalService } from "../../services/legal";
import {
  legalPageParamSchema,
  updateLegalSchema,
} from "../../validations/legal";
import { AuthRequest } from "../../middleware/auth";
import { COMMON_MESSAGES } from "../../constants/messages";
import { LEGAL_MESSAGES } from "../../constants/legal";
import { R, extractUserIdFromRequest, validateWithSchema } from "../../utils";

export class LegalController {
  async getContent(req: Request, res: Response): Promise<void> {
    const { page } = validateWithSchema(
      legalPageParamSchema,
      req.params,
      COMMON_MESSAGES.BAD_REQUEST
    );
    const content = await legalService.get(page);
    R.success(res, content, LEGAL_MESSAGES.FETCHED, req);
  }

  async updateContent(req: AuthRequest, res: Response): Promise<void> {
    const adminId = extractUserIdFromRequest(req);
    const { page } = validateWithSchema(
      legalPageParamSchema,
      req.params,
      COMMON_MESSAGES.BAD_REQUEST
    );
    const patch = validateWithSchema(
      updateLegalSchema,
      req.body,
      COMMON_MESSAGES.BAD_REQUEST
    );
    const content = await legalService.update(page, patch, adminId);
    R.success(res, content, LEGAL_MESSAGES.UPDATED, req);
  }

  async resetContent(req: AuthRequest, res: Response): Promise<void> {
    const adminId = extractUserIdFromRequest(req);
    const { page } = validateWithSchema(
      legalPageParamSchema,
      req.params,
      COMMON_MESSAGES.BAD_REQUEST
    );
    const content = await legalService.reset(page, adminId);
    R.success(res, content, LEGAL_MESSAGES.RESET, req);
  }
}

export const legalController = new LegalController();
