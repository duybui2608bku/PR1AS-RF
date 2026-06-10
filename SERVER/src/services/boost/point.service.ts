import mongoose from "mongoose";
import { PointReason } from "../../constants/boost";
import { workerPointWalletRepository } from "../../repositories/boost/worker-point-wallet.repository";
import { pointHistoryRepository } from "../../repositories/boost/point-history.repository";
import { AppError } from "../../utils/AppError";
import { PointHistoryItem, PointWalletResponse } from "../../types/boost/boost.types";

class PointService {
  /**
   * Award points to a worker. Creates a wallet if one does not exist yet.
   * Always runs inside the provided session (or its own if none given).
   */
  async award(
    userId: string,
    delta: number,
    reason: PointReason,
    meta: { admin_note?: string; boost_id?: string; admin_id?: string } = {},
    session?: mongoose.ClientSession
  ): Promise<number> {
    await workerPointWalletRepository.findOrCreate(userId);
    const updated = await workerPointWalletRepository.atomicAdjust(userId, delta, session);
    if (!updated) {
      throw AppError.badRequest("Failed to update point balance");
    }
    await pointHistoryRepository.create(
      { userId, delta, reason, balanceAfter: updated.balance, meta },
      session
    );
    return updated.balance;
  }

  /**
   * Deduct points atomically. Throws if balance is insufficient.
   */
  async spend(
    userId: string,
    amount: number,
    reason: PointReason,
    meta: { boost_id?: string } = {},
    session?: mongoose.ClientSession
  ): Promise<number> {
    const updated = await workerPointWalletRepository.atomicAdjust(userId, -amount, session);
    if (!updated) {
      throw AppError.badRequest("Insufficient points");
    }
    await pointHistoryRepository.create(
      { userId, delta: -amount, reason, balanceAfter: updated.balance, meta },
      session
    );
    return updated.balance;
  }

  async adminAdjust(
    userId: string,
    delta: number,
    note: string,
    adminId: string
  ): Promise<PointWalletResponse> {
    await workerPointWalletRepository.findOrCreate(userId);
    const updated = await workerPointWalletRepository.atomicAdjust(userId, delta);
    if (!updated) {
      throw AppError.badRequest(
        delta < 0 ? "Insufficient points to deduct" : "Failed to adjust points"
      );
    }
    await pointHistoryRepository.create({
      userId,
      delta,
      reason: PointReason.ADMIN_ADJUST,
      balanceAfter: updated.balance,
      meta: { admin_note: note, admin_id: adminId },
    });
    return {
      balance: updated.balance,
      total_earned: updated.total_earned,
      total_spent: updated.total_spent,
      attendance_streak: updated.attendance_streak,
      last_attendance_date: updated.last_attendance_date,
    };
  }

  async getWallet(userId: string): Promise<PointWalletResponse> {
    const wallet = await workerPointWalletRepository.findOrCreate(userId);
    return {
      balance: wallet.balance,
      total_earned: wallet.total_earned,
      total_spent: wallet.total_spent,
      attendance_streak: wallet.attendance_streak,
      last_attendance_date: wallet.last_attendance_date,
    };
  }

  async getHistory(userId: string, limit = 20, offset = 0): Promise<PointHistoryItem[]> {
    const docs = await pointHistoryRepository.findByUser(userId, limit, offset);
    return docs.map((d) => ({
      id: d._id.toString(),
      delta: d.delta,
      reason: d.reason,
      balance_after: d.balance_after,
      meta: { admin_note: d.meta?.admin_note, boost_id: d.meta?.boost_id },
      created_at: d.created_at,
    }));
  }
}

export const pointService = new PointService();
