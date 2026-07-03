import mongoose, { Types } from "mongoose";
import dayjs from "dayjs";
import { randomInt } from "crypto";
import { PricingPlanCode } from "../../constants/pricing";
import { VOUCHER_MESSAGES } from "../../constants/messages";
import { AppError } from "../../utils/AppError";
import { hasMinPlan } from "../../utils";
import { logger } from "../../utils/logger";
import {
  getPagination,
  PaginationHelper,
  PaginatedResponse,
} from "../../utils/pagination";
import { Voucher, VoucherRedemption } from "../../models/voucher";
import { PricingPackage, UserSubscriptionHistory } from "../../models/pricing";
import {
  CreateVouchersInput,
  IVoucherDocument,
  ListVouchersQuery,
  UpdateVoucherInput,
} from "../../types/voucher";
import {
  PricingMeResponse,
  SubscriptionEventStatus,
  SubscriptionEventType,
  SubscriptionSource,
} from "../../types/pricing";
import { userRepository } from "../../repositories/auth/user.repository";
import { pricingService } from "../pricing";
import { pointService } from "../boost/point.service";
import { PointReason } from "../../constants/boost";
import { boostConfigRepository } from "../../repositories/boost/boost-config.repository";

// Unambiguous charset: no 0/O/1/I to keep codes easy to read out and retype.
const CODE_CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 8;
const CODE_PREFIX = "PR1AS-";
const MAX_GENERATION_ATTEMPTS = 10;

const escapeRegex = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

class VoucherService {
  private generateCode(): string {
    let suffix = "";
    for (let i = 0; i < CODE_LENGTH; i += 1) {
      suffix += CODE_CHARSET[randomInt(CODE_CHARSET.length)];
    }
    return `${CODE_PREFIX}${suffix}`;
  }

  private isDuplicateKeyError(err: unknown): boolean {
    if (typeof err !== "object" || err === null) return false;
    return (err as { code?: number }).code === 11000;
  }

  private addMonths(baseDate: Date, months: number): Date {
    // Same clamping behavior as pricing purchases (Jan 31 + 1 month → Feb 28/29).
    return dayjs(baseDate).add(months, "month").toDate();
  }

  async createVouchers(
    adminId: string,
    payload: CreateVouchersInput
  ): Promise<IVoucherDocument[]> {
    const now = new Date();
    if (payload.expires_at && payload.expires_at <= now) {
      throw AppError.badRequest(VOUCHER_MESSAGES.VOUCHER_EXPIRED);
    }

    const codes: string[] = [];
    if (payload.code) {
      const customCode = payload.code.toUpperCase();
      const existing = await Voucher.findOne({ code: customCode });
      if (existing) {
        throw AppError.conflict(VOUCHER_MESSAGES.VOUCHER_CODE_EXISTS);
      }
      codes.push(customCode);
    } else {
      const batch = new Set<string>();
      while (batch.size < payload.quantity) {
        let candidate = "";
        let attempts = 0;
        do {
          candidate = this.generateCode();
          attempts += 1;
          if (attempts > MAX_GENERATION_ATTEMPTS) {
            throw AppError.conflict(VOUCHER_MESSAGES.VOUCHER_CODE_EXISTS);
          }
        } while (
          batch.has(candidate) ||
          (await Voucher.exists({ code: candidate })) !== null
        );
        batch.add(candidate);
      }
      codes.push(...batch);
    }

    try {
      return await Voucher.insertMany(
        codes.map((code) => ({
          code,
          plan_code: payload.plan_code,
          duration_months: payload.duration_months,
          max_uses: payload.max_uses,
          used_count: 0,
          expires_at: payload.expires_at ?? null,
          is_active: true,
          note: payload.note ?? null,
          created_by: new Types.ObjectId(adminId),
        }))
      );
    } catch (error) {
      // Lost a race against a concurrent create on the unique code index.
      if (this.isDuplicateKeyError(error)) {
        throw AppError.conflict(VOUCHER_MESSAGES.VOUCHER_CODE_EXISTS);
      }
      throw error;
    }
  }

  async listVouchers(
    query: ListVouchersQuery
  ): Promise<PaginatedResponse<IVoucherDocument>> {
    const pagination = getPagination(query.page, query.limit);
    const filter: Record<string, unknown> = {};
    if (query.search) {
      filter.code = { $regex: escapeRegex(query.search), $options: "i" };
    }
    if (query.plan_code) {
      filter.plan_code = query.plan_code;
    }
    if (query.is_active !== undefined) {
      filter.is_active = query.is_active;
    }

    const [vouchers, total] = await Promise.all([
      Voucher.find(filter)
        .sort({ created_at: -1 })
        .skip(pagination.skip)
        .limit(pagination.limit),
      Voucher.countDocuments(filter),
    ]);

    return PaginationHelper.format(vouchers, pagination, total);
  }

  async getVoucherById(id: string): Promise<IVoucherDocument> {
    const voucher = await Voucher.findById(id);
    if (!voucher) {
      throw AppError.notFound(VOUCHER_MESSAGES.VOUCHER_NOT_FOUND);
    }
    return voucher;
  }

  async updateVoucher(
    id: string,
    payload: UpdateVoucherInput
  ): Promise<IVoucherDocument> {
    const voucher = await this.getVoucherById(id);

    if (
      payload.max_uses !== undefined &&
      payload.max_uses < voucher.used_count
    ) {
      throw AppError.badRequest(VOUCHER_MESSAGES.VOUCHER_MAX_USES_BELOW_USED);
    }

    const updated = await Voucher.findByIdAndUpdate(
      id,
      {
        ...(payload.is_active !== undefined && {
          is_active: payload.is_active,
        }),
        ...(payload.note !== undefined && { note: payload.note }),
        ...(payload.expires_at !== undefined && {
          expires_at: payload.expires_at,
        }),
        ...(payload.max_uses !== undefined && { max_uses: payload.max_uses }),
        updated_at: new Date(),
      },
      { new: true }
    );
    if (!updated) {
      throw AppError.notFound(VOUCHER_MESSAGES.VOUCHER_NOT_FOUND);
    }
    return updated;
  }

  async deleteVoucher(id: string): Promise<void> {
    const voucher = await this.getVoucherById(id);
    if (voucher.used_count > 0) {
      throw AppError.conflict(VOUCHER_MESSAGES.VOUCHER_DELETE_HAS_REDEMPTIONS);
    }
    await Voucher.findByIdAndDelete(id);
  }

  async redeemVoucher(
    userId: string,
    rawCode: string
  ): Promise<PricingMeResponse> {
    const code = rawCode.trim().toUpperCase();
    await pricingService.ensureUserPlanActive(userId);

    const user = await userRepository.findById(userId);
    if (!user) {
      throw AppError.notFound(VOUCHER_MESSAGES.VOUCHER_NOT_FOUND);
    }

    const voucher = await Voucher.findOne({ code });
    if (!voucher) {
      throw AppError.notFound(VOUCHER_MESSAGES.VOUCHER_NOT_FOUND);
    }

    const now = new Date();
    // Friendly pre-checks; the transaction below re-validates atomically.
    if (!voucher.is_active) {
      throw AppError.badRequest(VOUCHER_MESSAGES.VOUCHER_INACTIVE);
    }
    if (voucher.expires_at && voucher.expires_at <= now) {
      throw AppError.badRequest(VOUCHER_MESSAGES.VOUCHER_EXPIRED);
    }
    if (voucher.used_count >= voucher.max_uses) {
      throw AppError.badRequest(VOUCHER_MESSAGES.VOUCHER_EXHAUSTED);
    }

    const alreadyRedeemed = await VoucherRedemption.findOne({
      voucher_id: voucher._id,
      user_id: userId,
    });
    if (alreadyRedeemed) {
      throw AppError.conflict(VOUCHER_MESSAGES.VOUCHER_ALREADY_REDEEMED);
    }

    const currentPlanCode =
      user.meta_data?.pricing_plan_code ?? PricingPlanCode.STANDARD;
    const currentStartedAt = user.meta_data?.pricing_started_at ?? null;
    const currentExpiresAt = user.meta_data?.pricing_expires_at ?? null;

    // Same plan rules as paid purchases: renewing the current paid plan stacks
    // months on top of the remaining time; a higher plan starts fresh and
    // forfeits the remainder; a lower plan than the active one is rejected.
    const isRenewal = currentPlanCode === voucher.plan_code;
    const isDowngradeAttempt =
      hasMinPlan(currentPlanCode, voucher.plan_code) &&
      currentPlanCode !== voucher.plan_code &&
      currentPlanCode !== PricingPlanCode.STANDARD;
    if (isDowngradeAttempt) {
      throw AppError.badRequest(VOUCHER_MESSAGES.VOUCHER_PLAN_DOWNGRADE);
    }

    let startedAt: Date;
    let expiresAt: Date;
    if (isRenewal && currentExpiresAt && currentExpiresAt > now) {
      startedAt = currentStartedAt ?? now;
      expiresAt = this.addMonths(currentExpiresAt, voucher.duration_months);
    } else {
      startedAt = now;
      expiresAt = this.addMonths(now, voucher.duration_months);
    }

    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        // Atomic consumption: only succeeds while the voucher is still
        // active, unexpired and below its usage cap — concurrent redeemers
        // cannot push used_count past max_uses.
        const consumed = await Voucher.findOneAndUpdate(
          {
            _id: voucher._id,
            is_active: true,
            $expr: { $lt: ["$used_count", "$max_uses"] },
            $or: [{ expires_at: null }, { expires_at: { $gt: now } }],
          },
          { $inc: { used_count: 1 }, $set: { updated_at: now } },
          { new: true, session }
        );
        if (!consumed) {
          throw AppError.badRequest(VOUCHER_MESSAGES.VOUCHER_NOT_AVAILABLE);
        }

        await VoucherRedemption.create(
          [
            {
              voucher_id: voucher._id,
              user_id: userId,
              code: voucher.code,
              plan_code: voucher.plan_code,
              duration_months: voucher.duration_months,
            },
          ],
          { session }
        );

        const updatedUser = await userRepository.updatePricingInfo(
          userId,
          {
            pricing_plan_code: voucher.plan_code,
            pricing_started_at: startedAt,
            pricing_expires_at: expiresAt,
          },
          session
        );
        if (!updatedUser) {
          throw AppError.notFound(VOUCHER_MESSAGES.VOUCHER_NOT_FOUND);
        }

        await UserSubscriptionHistory.create(
          [
            {
              user_id: userId,
              from_plan_code: currentPlanCode,
              to_plan_code: voucher.plan_code,
              event_type: isRenewal
                ? SubscriptionEventType.RENEWAL
                : SubscriptionEventType.UPGRADE,
              status: SubscriptionEventStatus.SUCCESS,
              source: SubscriptionSource.VOUCHER,
              amount: 0,
              started_at: startedAt,
              expires_at: expiresAt,
              idempotency_key: `voucher:${voucher._id.toString()}`,
              metadata: {
                voucher_id: voucher._id.toString(),
                voucher_code: voucher.code,
                duration_months: voucher.duration_months,
                ...(isRenewal && { previous_expires_at: currentExpiresAt }),
              },
            },
          ],
          { session }
        );
      });
    } catch (error) {
      // The unique (voucher_id, user_id) redemption index — or the sparse
      // (user_id, idempotency_key) history index — tripped on a concurrent
      // duplicate redeem. Report it as already redeemed instead of a 500.
      if (this.isDuplicateKeyError(error)) {
        throw AppError.conflict(VOUCHER_MESSAGES.VOUCHER_ALREADY_REDEEMED);
      }
      throw error;
    } finally {
      await session.endSession();
    }

    // Award the plan's boost-point allowance exactly like a paid purchase
    // (outside the transaction — a point failure must not undo the grant).
    try {
      const grantedPackage = await PricingPackage.findOne({
        package_code: voucher.plan_code,
      });
      const config = await boostConfigRepository.get();
      const monthlyBoostLimit =
        grantedPackage?.features.boost_profile_enabled &&
        grantedPackage.features.boost_profile_monthly_limit
          ? grantedPackage.features.boost_profile_monthly_limit
          : 0;
      const allowancePoints =
        monthlyBoostLimit *
        config.featured_boost_cost *
        voucher.duration_months;
      const flatBonus =
        voucher.plan_code === PricingPlanCode.DIAMOND
          ? config.diamond_package_points
          : voucher.plan_code === PricingPlanCode.GOLD
            ? config.gold_package_points
            : 0;
      const delta = allowancePoints + flatBonus;
      if (delta > 0) {
        const pointReason =
          voucher.plan_code === PricingPlanCode.DIAMOND
            ? PointReason.DIAMOND_PACKAGE
            : PointReason.GOLD_PACKAGE;
        await pointService.award(userId, delta, pointReason);
      }
    } catch (pointErr) {
      logger.warn(
        `Failed to award boost points for voucher redeem, user ${userId}: ${String(pointErr)}`
      );
    }

    return pricingService.getMyPricing(userId);
  }
}

export const voucherService = new VoucherService();
