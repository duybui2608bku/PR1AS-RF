import mongoose from "mongoose";
import { WorkerPointWallet } from "../../models/boost/worker-point-wallet.model";
import { IWorkerPointWalletDocument } from "../../types/boost/boost.types";

class WorkerPointWalletRepository {
  async findOrCreate(userId: string): Promise<IWorkerPointWalletDocument> {
    const objectId = new mongoose.Types.ObjectId(userId);
    const existing = await WorkerPointWallet.findOne({ user_id: objectId });
    if (existing) return existing;
    return WorkerPointWallet.create({ user_id: objectId });
  }

  async findByUserId(userId: string): Promise<IWorkerPointWalletDocument | null> {
    return WorkerPointWallet.findOne({ user_id: new mongoose.Types.ObjectId(userId) });
  }

  /**
   * Atomically credit or debit points. Returns null if the update would bring
   * balance below zero (insufficient funds for debit).
   */
  async atomicAdjust(
    userId: string,
    delta: number,
    session?: mongoose.ClientSession
  ): Promise<IWorkerPointWalletDocument | null> {
    const filter: Record<string, unknown> = { user_id: new mongoose.Types.ObjectId(userId) };
    if (delta < 0) {
      // Guard: balance must be >= |delta| before deducting
      filter["balance"] = { $gte: Math.abs(delta) };
    }

    const totalEarnedIncrement = delta > 0 ? delta : 0;
    const totalSpentIncrement = delta < 0 ? Math.abs(delta) : 0;

    return WorkerPointWallet.findOneAndUpdate(
      filter,
      {
        $inc: {
          balance: delta,
          total_earned: totalEarnedIncrement,
          total_spent: totalSpentIncrement,
        },
        $set: { updated_at: new Date() },
      },
      { new: true, session }
    );
  }

  async updateAttendanceMeta(
    userId: string,
    streak: number,
    lastDate: Date,
    session?: mongoose.ClientSession
  ): Promise<void> {
    await WorkerPointWallet.updateOne(
      { user_id: new mongoose.Types.ObjectId(userId) },
      { $set: { attendance_streak: streak, last_attendance_date: lastDate, updated_at: new Date() } },
      { session }
    );
  }
}

export const workerPointWalletRepository = new WorkerPointWalletRepository();
