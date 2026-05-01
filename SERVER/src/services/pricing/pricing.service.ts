import { HTTP_STATUS } from "../../constants/httpStatus";
import {
  DEFAULT_PRICING_PLAN_FEATURES,
  PRICING_PLAN_MONTHLY_PRICE,
  PricingPlanCode,
  PricingPlanFeatures,
} from "../../constants/pricing";
import { AppError } from "../../utils/AppError";
import { PricingPackage, UserSubscriptionHistory } from "../../models/pricing";
import { PRICING_MESSAGES } from "../../constants/messages";
import {
  IPricingPackageDocument,
  PricingMeResponse,
  SubscriptionEventStatus,
  SubscriptionEventType,
  SubscriptionSource,
  UpgradePricingInput,
} from "../../types/pricing";
import { userRepository } from "../../repositories/auth/user.repository";
import { hasMinPlan } from "../../utils";
import {
  walletBalanceRepository,
  walletRepository,
} from "../../repositories/wallet";
import { TransactionStatus, TransactionType } from "../../constants/wallet";

interface CreatePricingPlanInput {
  package_code: PricingPlanCode;
  display_name: string;
  is_active?: boolean;
  features: PricingPlanFeatures;
}

interface UpdatePricingPlanInput {
  display_name?: string;
  is_active?: boolean;
  features?: PricingPlanFeatures;
}

class PricingService {
  private getDefaultPlanDisplayName(code: PricingPlanCode): string {
    switch (code) {
      case PricingPlanCode.STANDARD:
        return "Standard";
      case PricingPlanCode.GOLD:
        return "Gold";
      case PricingPlanCode.DIAMOND:
        return "Diamond";
      default:
        return code;
    }
  }

  private sanitizeFeaturePair(
    enabled: boolean,
    limit: number | null | undefined
  ): number | null {
    if (!enabled) {
      return null;
    }
    if (limit === undefined) {
      return null;
    }
    return limit;
  }

  private normalizeFeatures(
    features: PricingPlanFeatures
  ): PricingPlanFeatures {
    return {
      ...features,
      messaging_max_recipients: this.sanitizeFeaturePair(
        features.messaging_enabled,
        features.messaging_max_recipients
      ),
      create_job_limit: this.sanitizeFeaturePair(
        features.create_job_enabled,
        features.create_job_limit
      ),
      boost_profile_monthly_limit: this.sanitizeFeaturePair(
        features.boost_profile_enabled,
        features.boost_profile_monthly_limit
      ),
    };
  }

  private getPackagePriceByMonths(
    planCode: PricingPlanCode,
    durationMonths: number
  ): number {
    return PRICING_PLAN_MONTHLY_PRICE[planCode] * durationMonths;
  }

  private addMonths(baseDate: Date, months: number): Date {
    const next = new Date(baseDate);
    next.setMonth(next.getMonth() + months);
    return next;
  }

  async ensureUserPlanActive(userId: string): Promise<void> {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw AppError.notFound(PRICING_MESSAGES.PRICING_USER_NOT_FOUND);
    }

    const now = new Date();
    if (
      user.pricing_plan_code !== PricingPlanCode.STANDARD &&
      user.pricing_expires_at &&
      user.pricing_expires_at < now
    ) {
      await userRepository.updatePricingInfo(userId, {
        pricing_plan_code: PricingPlanCode.STANDARD,
        pricing_started_at: null,
        pricing_expires_at: null,
      });

      await UserSubscriptionHistory.create({
        user_id: userId,
        from_plan_code: user.pricing_plan_code,
        to_plan_code: PricingPlanCode.STANDARD,
        event_type: SubscriptionEventType.EXPIRED_DOWNGRADE,
        status: SubscriptionEventStatus.SUCCESS,
        source: SubscriptionSource.SYSTEM,
        amount: 0,
        started_at: null,
        expires_at: null,
        metadata: {
          reason: "expired",
          previous_expires_at: user.pricing_expires_at,
        },
      });
    }
  }

  async getMyPricing(userId: string): Promise<PricingMeResponse> {
    await this.ensureUserPlanActive(userId);
    const user = await userRepository.findById(userId);
    if (!user) {
      throw AppError.notFound(PRICING_MESSAGES.PRICING_USER_NOT_FOUND);
    }

    const pkg = await PricingPackage.findOne({
      package_code: user.pricing_plan_code,
      is_active: true,
    });
    const fallbackPackage = pkg
      ? pkg
      : await PricingPackage.findOne({
          package_code: PricingPlanCode.STANDARD,
        });

    if (!fallbackPackage) {
      throw AppError.notFound(PRICING_MESSAGES.PRICING_PACKAGE_NOT_FOUND);
    }

    return {
      plan_code: user.pricing_plan_code,
      started_at: user.pricing_started_at,
      expires_at: user.pricing_expires_at,
      is_expired:
        Boolean(user.pricing_expires_at) &&
        (user.pricing_expires_at as Date) < new Date(),
      package: fallbackPackage.toJSON(),
    };
  }

  async upgradePricing(
    userId: string,
    payload: UpgradePricingInput
  ): Promise<PricingMeResponse> {
    await this.ensureUserPlanActive(userId);

    const user = await userRepository.findById(userId);
    if (!user) {
      throw AppError.notFound(PRICING_MESSAGES.PRICING_USER_NOT_FOUND);
    }

    if (payload.target_plan_code === PricingPlanCode.STANDARD) {
      throw AppError.badRequest(PRICING_MESSAGES.PRICING_INVALID_TARGET_PLAN);
    }

    if (
      hasMinPlan(user.pricing_plan_code, payload.target_plan_code) &&
      user.pricing_plan_code !== PricingPlanCode.STANDARD
    ) {
      throw AppError.badRequest(
        PRICING_MESSAGES.PRICING_PLAN_ALREADY_ACTIVE_OR_HIGHER
      );
    }

    const targetPackage = await PricingPackage.findOne({
      package_code: payload.target_plan_code,
      is_active: true,
    });
    if (!targetPackage) {
      throw AppError.badRequest(PRICING_MESSAGES.PRICING_PACKAGE_NOT_AVAILABLE);
    }

    if (payload.idempotency_key) {
      const existingEvent = await UserSubscriptionHistory.findOne({
        user_id: userId,
        idempotency_key: payload.idempotency_key,
        status: SubscriptionEventStatus.SUCCESS,
      });
      if (existingEvent) {
        return this.getMyPricing(userId);
      }
    }

    const amount = this.getPackagePriceByMonths(
      payload.target_plan_code,
      payload.duration_months
    );
    const currentBalance = await walletRepository.calculateUserBalance(userId);
    if (currentBalance < amount) {
      throw AppError.badRequest(PRICING_MESSAGES.PRICING_INSUFFICIENT_BALANCE);
    }

    const startedAt = new Date();
    const expiresAt = this.addMonths(startedAt, payload.duration_months);

    const paymentTransaction = await walletRepository.create({
      user_id: userId,
      type: TransactionType.PAYMENT,
      amount,
      status: TransactionStatus.SUCCESS,
      description: `Upgrade plan to ${payload.target_plan_code} (${payload.duration_months} month(s))`,
    });
    await walletBalanceRepository.createOrUpdate(
      userId,
      currentBalance - amount
    );

    try {
      const updatedUser = await userRepository.updatePricingInfo(userId, {
        pricing_plan_code: payload.target_plan_code,
        pricing_started_at: startedAt,
        pricing_expires_at: expiresAt,
      });

      if (!updatedUser) {
        throw AppError.notFound(PRICING_MESSAGES.PRICING_USER_NOT_FOUND);
      }

      await UserSubscriptionHistory.create({
        user_id: userId,
        from_plan_code: user.pricing_plan_code,
        to_plan_code: payload.target_plan_code,
        event_type: SubscriptionEventType.UPGRADE,
        status: SubscriptionEventStatus.SUCCESS,
        source: SubscriptionSource.WALLET,
        amount,
        started_at: startedAt,
        expires_at: expiresAt,
        idempotency_key: payload.idempotency_key || null,
        metadata: {
          duration_months: payload.duration_months,
          wallet_transaction_id: paymentTransaction._id.toString(),
        },
      });
    } catch (error) {
      await walletRepository.create({
        user_id: userId,
        type: TransactionType.REFUND,
        amount,
        status: TransactionStatus.SUCCESS,
        description: `Refund for failed pricing upgrade to ${payload.target_plan_code}`,
      });
      await walletBalanceRepository.createOrUpdate(userId, currentBalance);
      throw error;
    }

    return this.getMyPricing(userId);
  }

  async ensureDefaultPackages(): Promise<void> {
    const existingCount = await PricingPackage.countDocuments({
      package_code: { $in: Object.values(PricingPlanCode) },
    });

    if (existingCount === Object.values(PricingPlanCode).length) {
      return;
    }

    await Promise.all(
      Object.values(PricingPlanCode).map(async (code) => {
        await PricingPackage.findOneAndUpdate(
          { package_code: code },
          {
            $setOnInsert: {
              package_code: code,
              display_name: this.getDefaultPlanDisplayName(code),
              is_active: true,
              features: DEFAULT_PRICING_PLAN_FEATURES[code],
            },
          },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
      })
    );
  }

  async getPublicPackages(): Promise<IPricingPackageDocument[]> {
    await this.ensureDefaultPackages();
    return PricingPackage.find({ is_active: true }).sort({ created_at: 1 });
  }

  async getAllPackages(): Promise<IPricingPackageDocument[]> {
    await this.ensureDefaultPackages();
    return PricingPackage.find().sort({ created_at: 1 });
  }

  async getPackageById(id: string): Promise<IPricingPackageDocument> {
    const pkg = await PricingPackage.findById(id);
    if (!pkg) {
      throw new AppError(
        PRICING_MESSAGES.PRICING_PACKAGE_NOT_FOUND,
        HTTP_STATUS.NOT_FOUND
      );
    }
    return pkg;
  }

  async createPackage(
    payload: CreatePricingPlanInput
  ): Promise<IPricingPackageDocument> {
    const existing = await PricingPackage.findOne({
      package_code: payload.package_code,
    });
    if (existing) {
      throw new AppError(
        PRICING_MESSAGES.PRICING_PACKAGE_EXISTS,
        HTTP_STATUS.CONFLICT
      );
    }

    return PricingPackage.create({
      package_code: payload.package_code,
      display_name: payload.display_name,
      is_active: payload.is_active ?? true,
      features: this.normalizeFeatures(payload.features),
    });
  }

  async updatePackage(
    id: string,
    payload: UpdatePricingPlanInput
  ): Promise<IPricingPackageDocument> {
    const pkg = await this.getPackageById(id);
    const nextFeatures = payload.features
      ? this.normalizeFeatures(payload.features)
      : pkg.features;

    const updated = await PricingPackage.findByIdAndUpdate(
      id,
      {
        ...(payload.display_name !== undefined && {
          display_name: payload.display_name,
        }),
        ...(payload.is_active !== undefined && {
          is_active: payload.is_active,
        }),
        features: nextFeatures,
        updated_at: new Date(),
      },
      { new: true }
    );
    if (!updated) {
      throw new AppError(
        PRICING_MESSAGES.PRICING_PACKAGE_NOT_FOUND,
        HTTP_STATUS.NOT_FOUND
      );
    }

    return updated;
  }

  async deletePackage(id: string): Promise<void> {
    const deleted = await PricingPackage.findByIdAndDelete(id);
    if (!deleted) {
      throw new AppError(
        PRICING_MESSAGES.PRICING_PACKAGE_NOT_FOUND,
        HTTP_STATUS.NOT_FOUND
      );
    }
  }
}

export const pricingService = new PricingService();
