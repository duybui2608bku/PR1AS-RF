import { Types } from "mongoose";
import { ReputationHistory } from "../../models/reputation-history.model";
import {
  IReputationHistoryDocument,
  ReputationHistoryQuery,
  ReputationHistoryReason,
} from "../../types/reputation/reputation-history.types";

export class ReputationHistoryRepository {
  async create(input: {
    userId: string;
    delta: number;
    previousScore: number;
    newScore: number;
    reason: ReputationHistoryReason;
  }): Promise<IReputationHistoryDocument> {
    return new ReputationHistory({
      user_id: new Types.ObjectId(input.userId),
      delta: input.delta,
      previous_score: input.previousScore,
      new_score: input.newScore,
      reason: input.reason,
      created_at: new Date(),
    }).save();
  }

  async listByUser(
    userId: string,
    query: ReputationHistoryQuery
  ): Promise<{ histories: IReputationHistoryDocument[]; total: number }> {
    const filter = { user_id: new Types.ObjectId(userId) };
    const [histories, total] = await Promise.all([
      ReputationHistory.find(filter)
        .sort({ created_at: -1 })
        .skip(query.skip)
        .limit(query.limit),
      ReputationHistory.countDocuments(filter),
    ]);

    return { histories, total };
  }
}

export const reputationHistoryRepository =
  new ReputationHistoryRepository();
