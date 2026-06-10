import mongoose from "mongoose";
import { PointHistory } from "../../models/boost/point-history.model";
import { PointReason } from "../../constants/boost";
import { IPointHistoryDocument } from "../../types/boost/boost.types";

interface CreatePointHistoryInput {
  userId: string;
  delta: number;
  reason: PointReason;
  balanceAfter: number;
  meta?: { admin_note?: string; boost_id?: string; admin_id?: string };
}

class PointHistoryRepository {
  async create(
    input: CreatePointHistoryInput,
    session?: mongoose.ClientSession
  ): Promise<IPointHistoryDocument> {
    const [doc] = await PointHistory.create(
      [
        {
          user_id: new mongoose.Types.ObjectId(input.userId),
          delta: input.delta,
          reason: input.reason,
          balance_after: input.balanceAfter,
          meta: input.meta ?? {},
        },
      ],
      { session }
    );
    return doc;
  }

  async findByUser(
    userId: string,
    limit = 20,
    offset = 0
  ): Promise<IPointHistoryDocument[]> {
    return PointHistory.find({ user_id: new mongoose.Types.ObjectId(userId) })
      .sort({ created_at: -1 })
      .skip(offset)
      .limit(limit);
  }
}

export const pointHistoryRepository = new PointHistoryRepository();
