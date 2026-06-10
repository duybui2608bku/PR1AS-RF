import mongoose from "mongoose";
import { WorkerBoost } from "../../models/boost/worker-boost.model";
import { BoostStatus, BoostType, BOOST_TIER } from "../../constants/boost";
import { IWorkerBoostDocument, WorkerBoostInfo } from "../../types/boost/boost.types";

class WorkerBoostRepository {
  async findActiveByUser(userId: string): Promise<IWorkerBoostDocument | null> {
    return WorkerBoost.findOne({
      user_id: new mongoose.Types.ObjectId(userId),
      status: BoostStatus.ACTIVE,
      expires_at: { $gt: new Date() },
    });
  }

  async create(
    userId: string,
    boostType: BoostType,
    costPoints: number,
    expiresAt: Date,
    session?: mongoose.ClientSession
  ): Promise<IWorkerBoostDocument> {
    const now = new Date();
    const [doc] = await WorkerBoost.create(
      [
        {
          user_id: new mongoose.Types.ObjectId(userId),
          boost_type: boostType,
          tier: BOOST_TIER[boostType],
          cost_points: costPoints,
          started_at: now,
          expires_at: expiresAt,
          status: BoostStatus.ACTIVE,
        },
      ],
      { session }
    );
    return doc;
  }

  /**
   * Returns the current active boost for each of the provided worker IDs.
   * Used by the search layer to inject boost tier into sort ordering.
   */
  async findActiveBoostsForWorkers(workerIds: string[]): Promise<WorkerBoostInfo[]> {
    if (!workerIds.length) return [];
    const now = new Date();
    const docs = await WorkerBoost.find({
      user_id: { $in: workerIds.map((id) => new mongoose.Types.ObjectId(id)) },
      status: BoostStatus.ACTIVE,
      expires_at: { $gt: now },
    }).select("user_id tier expires_at");

    return docs.map((d) => ({
      user_id: d.user_id.toString(),
      tier: d.tier,
      expires_at: d.expires_at,
    }));
  }

  /** Cron: mark expired boosts */
  async expireOverdue(): Promise<number> {
    const result = await WorkerBoost.updateMany(
      { status: BoostStatus.ACTIVE, expires_at: { $lte: new Date() } },
      { $set: { status: BoostStatus.EXPIRED } }
    );
    return result.modifiedCount;
  }
}

export const workerBoostRepository = new WorkerBoostRepository();
