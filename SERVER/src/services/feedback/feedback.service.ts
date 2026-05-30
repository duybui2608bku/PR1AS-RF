import { feedbackRepository } from "../../repositories/feedback";
import {
  FEEDBACK_MESSAGES,
  FeedbackStatus,
  FeedbackType,
} from "../../constants/feedback";
import type { FeedbackQuery } from "../../types/feedback";
import { AppError } from "../../utils/AppError";
import { PaginationHelper } from "../../utils";

export class FeedbackService {
  async createFeedback(
    userId: string,
    input: { type: FeedbackType; title: string; description: string }
  ) {
    return feedbackRepository.createFeedback({
      userId,
      type: input.type,
      title: input.title,
      description: input.description,
    });
  }

  async listFeedback(query: FeedbackQuery) {
    const { feedbacks, total } = await feedbackRepository.listFeedback(query);
    return PaginationHelper.formatResponse(
      feedbacks,
      query.page,
      query.limit,
      total
    );
  }

  async listMyFeedback(userId: string, query: FeedbackQuery) {
    return this.listFeedback({ ...query, user_id: userId });
  }

  async updateStatus(input: {
    feedbackId: string;
    status: FeedbackStatus;
    adminId: string;
    adminNote?: string | null;
  }) {
    const feedback = await feedbackRepository.updateStatus(input);
    if (!feedback) {
      throw AppError.notFound(FEEDBACK_MESSAGES.FEEDBACK_NOT_FOUND);
    }
    return feedback;
  }
}

export const feedbackService = new FeedbackService();
