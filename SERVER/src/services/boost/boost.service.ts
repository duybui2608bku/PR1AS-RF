import mongoose from "mongoose";
import { BoostType, PointReason } from "../../constants/boost";
import { AppError } from "../../utils/AppError";
import { ErrorCode } from "../../types/common/error.types";
import { HTTP_STATUS } from "../../constants/httpStatus";
import { getCurrentMonthWindow } from "../../utils/date";
import { boostConfigRepository } from "../../repositories/boost/boost-config.repository";
import { workerPointWalletRepository } from "../../repositories/boost/worker-point-wallet.repository";
import { workerBoostRepository } from "../../repositories/boost/worker-boost.repository";
import { pointHistoryRepository } from "../../repositories/boost/point-history.repository";
import { ActivateBoostResponse, BoostStatusResponse } from "../../types/boost/boost.types";
import { BOOST_MESSAGES } from "../../constants/messages";
import { pricingService } from "../pricing/pricing.service";

class BoostService {
  /** Plan-feature + monthly-limit readout, shared by getStatus() (proactive
   * frontend gate) and activate() (authoritative backend gate). */
  private async getBoostPlanQuota(userId: string): Promise<{
    boostPlanEnabled: boolean;
    monthlyBoostLimit: number | null;
    currentMonthBoostCount: number;
    remainingMonthlyBoosts: number | null;
    canActivateBoost: boolean;
  }> {
    const pricingPackage = await pricingService.getActivePackageForUser(userId);
    const { boost_profile_enabled, boost_profile_monthly_limit } = pricingPackage.features;
    const { startDate, endDate } = getCurrentMonthWindow();
    const currentMonthBoostCount = await workerBoostRepository.countActivatedByUserBetween(
      userId,
      startDate,
      endDate
    );

    if (!boost_profile_enabled) {
      return {
        boostPlanEnabled: false,
        monthlyBoostLimit: boost_profile_monthly_limit ?? null,
        currentMonthBoostCount,
        remainingMonthlyBoosts: 0,
        canActivateBoost: false,
      };
    }

    if (boost_profile_monthly_limit == null) {
      return {
        boostPlanEnabled: true,
        monthlyBoostLimit: null,
        currentMonthBoostCount,
        remainingMonthlyBoosts: null,
        canActivateBoost: true,
      };
    }

    return {
      boostPlanEnabled: true,
      monthlyBoostLimit: boost_profile_monthly_limit,
      currentMonthBoostCount,
      remainingMonthlyBoosts: Math.max(boost_profile_monthly_limit - currentMonthBoostCount, 0),
      canActivateBoost: currentMonthBoostCount < boost_profile_monthly_limit,
    };
  }

  private async assertUserCanActivateBoost(userId: string): Promise<void> {
    const quota = await this.getBoostPlanQuota(userId);
    if (!quota.boostPlanEnabled) {
      throw new AppError(
        BOOST_MESSAGES.BOOST_PLAN_FEATURE_DISABLED,
        HTTP_STATUS.FORBIDDEN,
        ErrorCode.BOOST_PLAN_FEATURE_DISABLED
      );
    }
    if (!quota.canActivateBoost) {
      throw new AppError(
        BOOST_MESSAGES.BOOST_MONTHLY_LIMIT_EXCEEDED,
        HTTP_STATUS.FORBIDDEN,
        ErrorCode.BOOST_MONTHLY_LIMIT_EXCEEDED
      );
    }
  }

  async getStatus(userId: string): Promise<BoostStatusResponse> {
    const [active, quota] = await Promise.all([
      workerBoostRepository.findActiveByUser(userId),
      this.getBoostPlanQuota(userId),
    ]);
    const planFields = {
      boost_plan_enabled: quota.boostPlanEnabled,
      monthly_boost_limit: quota.monthlyBoostLimit,
      current_month_boost_count: quota.currentMonthBoostCount,
      remaining_monthly_boosts: quota.remainingMonthlyBoosts,
      can_activate_boost: quota.canActivateBoost,
    };
    if (!active) {
      return {
        is_active: false,
        boost_type: null,
        expires_at: null,
        seconds_remaining: null,
        ...planFields,
      };
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
      ...planFields,
    };
  }

  async activate(userId: string, boostType: BoostType): Promise<ActivateBoostResponse> {
    // One active boost per session — no override. Checked before the plan
    // gate so a user who already has a boost running gets that (more
    // immediately relevant) reason, matching the frontend's precedence.
    const existing = await workerBoostRepository.findActiveByUser(userId);
    if (existing) {
      throw AppError.badRequest(BOOST_MESSAGES.BOOST_ALREADY_ACTIVE);
    }

    await this.assertUserCanActivateBoost(userId);

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
