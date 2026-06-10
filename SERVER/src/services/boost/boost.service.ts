import mongoose from "mongoose";
import { BoostType, PointReason } from "../../constants/boost";
import { AppError } from "../../utils/AppError";
import { boostConfigRepository } from "../../repositories/boost/boost-config.repository";
import { workerPointWalletRepository } from "../../repositories/boost/worker-point-wallet.repository";
import { workerBoostRepository } from "../../repositories/boost/worker-boost.repository";
import { pointHistoryRepository } from "../../repositories/boost/point-history.repository";
import { ActivateBoostResponse, BoostStatusResponse } from "../../types/boost/boost.types";
import { BOOST_MESSAGES } from "../../constants/messages";

class BoostService {
  async getStatus(userId: string): Promise<BoostStatusResponse> {
    const active = await workerBoostRepository.findActiveByUser(userId);
    if (!active) {
      return { is_active: false, boost_type: null, expires_at: null, seconds_remaining: null };
    }
    const secondsRemaining = Math.max(
      0,
      Math.floor((active.expires_at.getTime() - Date.now()) / 1000)
    );
    return {
      is_active: true,
      boost_type: active.boost_type,
      expires_at: active.expires_at,
      seconds_remaining: secondsRemaining,
    };
  }

  async activate(userId: string, boostType: BoostType): Promise<ActivateBoostResponse> {
    // One active boost per session — no override
    const existing = await workerBoostRepository.findActiveByUser(userId);
    if (existing) {
      throw AppError.badRequest(BOOST_MESSAGES.BOOST_ALREADY_ACTIVE);
    }

    const config = await boostConfigRepository.get();
    const isBasic = boostType === BoostType.BASIC;
    const cost = isBasic ? config.basic_boost_cost : config.featured_boost_cost;
    const durationHours = isBasic
      ? config.basic_boost_duration_hours
      : config.featured_boost_duration_hours;

    const wallet = await workerPointWalletRepository.findOrCreate(userId);
    if (wallet.balance < cost) {
      throw AppError.badRequest(BOOST_MESSAGES.BOOST_INSUFFICIENT_POINTS);
    }

    const expiresAt = new Date(Date.now() + durationHours * 60 * 60 * 1000);

    const session = await mongoose.startSession();
    let boostId: string;
    let balanceAfter: number;
    try {
      await session.withTransaction(async () => {
        const deducted = await workerPointWalletRepository.atomicAdjust(userId, -cost, session);
        if (!deducted) throw AppError.badRequest(BOOST_MESSAGES.BOOST_INSUFFICIENT_POINTS);
        balanceAfter = deducted.balance;

        const boost = await workerBoostRepository.create(userId, boostType, cost, expiresAt, session);
        boostId = boost._id.toString();

        await pointHistoryRepository.create(
          {
            userId,
            delta: -cost,
            reason: PointReason.BOOST_SPEND,
            balanceAfter: deducted.balance,
            meta: { boost_id: boostId },
          },
          session
        );
      });
    } finally {
      await session.endSession();
    }

    return {
      boost_type: boostType,
      expires_at: expiresAt,
      points_spent: cost,
      balance_after: balanceAfter!,
    };
  }

  async expireOverdue(): Promise<number> {
    return workerBoostRepository.expireOverdue();
  }
}

export const boostService = new BoostService();
