import { Response } from "express";
import { reactionService } from "../../services/reaction/reaction.service";
import {
  getReactionSummaryQuerySchema,
  removeReactionSchema,
  upsertReactionSchema,
} from "../../validations/reaction/reaction.validation";
import { COMMON_MESSAGES, REACTION_MESSAGES } from "../../constants/messages";
import { AuthRequest } from "../../middleware/auth";
import { R, extractUserIdFromRequest, validateWithSchema } from "../../utils";

export class ReactionController {
  async upsert(req: AuthRequest, res: Response): Promise<void> {
    const userId = extractUserIdFromRequest(req);
    const data = validateWithSchema(
      upsertReactionSchema,
      req.body,
      COMMON_MESSAGES.BAD_REQUEST
    );
    const summary = await reactionService.upsert(userId, data);
    R.success(res, summary, REACTION_MESSAGES.REACTION_UPSERTED, req);
  }

  async remove(req: AuthRequest, res: Response): Promise<void> {
    const userId = extractUserIdFromRequest(req);
    const data = validateWithSchema(
      removeReactionSchema,
      req.body,
      COMMON_MESSAGES.BAD_REQUEST
    );
    const summary = await reactionService.remove(
      userId,
      data.target_type,
      data.target_id
    );
    R.success(res, summary, REACTION_MESSAGES.REACTION_REMOVED, req);
  }

  async summary(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user?.sub ?? null;
    const data = validateWithSchema(
      getReactionSummaryQuerySchema,
      req.query,
      COMMON_MESSAGES.BAD_REQUEST
    );
    const summary = await reactionService.getSummary(
      userId,
      data.target_type,
      data.target_id
    );
    R.success(res, summary, REACTION_MESSAGES.REACTION_SUMMARY_FETCHED, req);
  }
}

export const reactionController = new ReactionController();
