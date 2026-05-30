import { Types } from "mongoose";
import { Feedback } from "../../models/feedback";
import {
  FeedbackStatus,
  FeedbackType,
} from "../../constants/feedback";
import type { IFeedbackDocument, FeedbackQuery } from "../../types/feedback";

const USER_PUBLIC_FIELDS = "_id email full_name avatar roles";

export class FeedbackRepository {
  async createFeedback(data: {
    userId: string;
    type: FeedbackType;
    title: string;
    description: string;
  }): Promise<IFeedbackDocument> {
    const now = new Date();
    return new Feedback({
      user_id: new Types.ObjectId(data.userId),
      type: data.type,
      title: data.title,
      description: data.description,
      status: FeedbackStatus.OPEN,
      created_at: now,
      updated_at: now,
    }).save();
  }

  async listFeedback(query: FeedbackQuery): Promise<{
    feedbacks: IFeedbackDocument[];
    total: number;
  }> {
    const filter: Record<string, unknown> = {};
    if (query.user_id && Types.ObjectId.isValid(query.user_id)) {
      filter.user_id = new Types.ObjectId(query.user_id);
    }
    if (query.type) filter.type = query.type;
    if (query.status) filter.status = query.status;

    const [feedbacks, total] = await Promise.all([
      Feedback.find(filter)
        .populate("user_id", USER_PUBLIC_FIELDS)
        .populate("resolved_by", USER_PUBLIC_FIELDS)
        .sort({ created_at: -1 })
        .skip(query.skip)
        .limit(query.limit),
      Feedback.countDocuments(filter),
    ]);

    return { feedbacks, total };
  }

  async updateStatus(input: {
    feedbackId: string;
    status: FeedbackStatus;
    adminId: string;
    adminNote?: string | null;
  }): Promise<IFeedbackDocument | null> {
    const resolved =
      input.status === FeedbackStatus.RESOLVED ||
      input.status === FeedbackStatus.REJECTED;
    return Feedback.findByIdAndUpdate(
      input.feedbackId,
      {
        status: input.status,
        admin_note: input.adminNote ?? null,
        resolved_by: resolved ? new Types.ObjectId(input.adminId) : null,
        resolved_at: resolved ? new Date() : null,
        updated_at: new Date(),
      },
      { new: true }
    )
      .populate("user_id", USER_PUBLIC_FIELDS)
      .populate("resolved_by", USER_PUBLIC_FIELDS);
  }
}

export const feedbackRepository = new FeedbackRepository();
