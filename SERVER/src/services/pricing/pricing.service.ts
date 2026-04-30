import { HTTP_STATUS } from "../../constants/httpStatus";
import {
  DEFAULT_PRICING_PLAN_FEATURES,
  PricingPlanCode,
  PricingPlanFeatures,
} from "../../constants/pricing";
import { AppError } from "../../utils/AppError";
import { PricingPackage } from "../../models/pricing";
import { PRICING_MESSAGES } from "../../constants/messages";
import { IPricingPackageDocument } from "../../types/pricing";

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
