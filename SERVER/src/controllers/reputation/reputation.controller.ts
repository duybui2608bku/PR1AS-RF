import { Response } from "express";
import { reputationService } from "../../services/reputation/reputation.service";
import { reputationHistoryQuerySchema } from "../../validations/reputation/reputation-history.validation";
import { AuthRequest } from "../../middleware/auth";
import { COMMON_MESSAGES } from "../../constants/messages";
import { R, extractUserIdFromRequest, validateWithSchema } from "../../utils";

export class ReputationController {
  async listHistory(req: AuthRequest, res: Response): Promise<void> {
    const userId = extractUserIdFromRequest(req);
    const query = validateWithSchema(
      reputationHistoryQuerySchema,
      req.query,
      COMMON_MESSAGES.BAD_REQUEST
    );
    const history = await reputationService.listHistory(userId, query);
    R.success(res, history, "Reputation history fetched successfully", req);
  }
}

export const reputationController = new ReputationController();
