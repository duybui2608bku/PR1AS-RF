import { Response } from "express";
import { feedbackService } from "../../services/feedback";
import {
  createFeedbackSchema,
  feedbackQuerySchema,
  updateFeedbackStatusSchema,
} from "../../validations/feedback";
import { AuthRequest } from "../../middleware/auth";
import { COMMON_MESSAGES } from "../../constants/messages";
import { FEEDBACK_MESSAGES } from "../../constants/feedback";
import { R, extractUserIdFromRequest, validateWithSchema } from "../../utils";

export class FeedbackController {
  async createFeedback(req: AuthRequest, res: Response): Promise<void> {
    const userId = extractUserIdFromRequest(req);
    const input = validateWithSchema(
      createFeedbackSchema,
      req.body,
      COMMON_MESSAGES.BAD_REQUEST
    );
    const feedback = await feedbackService.createFeedback(userId, input);
    R.created(res, feedback, FEEDBACK_MESSAGES.FEEDBACK_CREATED, req);
  }

  async listMyFeedback(req: AuthRequest, res: Response): Promise<void> {
    const userId = extractUserIdFromRequest(req);
    const query = validateWithSchema(
      feedbackQuerySchema,
      req.query,
      COMMON_MESSAGES.BAD_REQUEST
    );
    const feedbacks = await feedbackService.listMyFeedback(userId, query);
    R.success(res, feedbacks, FEEDBACK_MESSAGES.FEEDBACKS_FETCHED, req);
  }

  async listFeedback(req: AuthRequest, res: Response): Promise<void> {
    const query = validateWithSchema(
      feedbackQuerySchema,
      req.query,
      COMMON_MESSAGES.BAD_REQUEST
    );
    const feedbacks = await feedbackService.listFeedback(query);
    R.success(res, feedbacks, FEEDBACK_MESSAGES.FEEDBACKS_FETCHED, req);
  }

  async updateStatus(req: AuthRequest, res: Response): Promise<void> {
    const adminId = extractUserIdFromRequest(req);
    const input = validateWithSchema(
      updateFeedbackStatusSchema,
      req.body,
      COMMON_MESSAGES.BAD_REQUEST
    );
    const feedback = await feedbackService.updateStatus({
      feedbackId: req.params.id,
      status: input.status,
      adminId,
      adminNote: input.admin_note,
    });
    R.success(res, feedback, FEEDBACK_MESSAGES.FEEDBACK_UPDATED, req);
  }
}

export const feedbackController = new FeedbackController();
