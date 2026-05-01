import { api, extractData } from "../axios";
import type { ApiResponse } from "../axios";
import { ApiEndpoint, buildEndpoint } from "../constants/api-endpoints";

export type PricingPlanCode = "standard" | "gold" | "diamond";

export interface PricingPlanFeatures {
  messaging_enabled: boolean;
  messaging_max_recipients: number | null;
  create_job_enabled: boolean;
  create_job_limit: number | null;
  boost_profile_enabled: boolean;
  boost_profile_monthly_limit: number | null;
  ads_enabled: boolean;
}

export interface PricingPackage {
  id: string;
  package_code: PricingPlanCode;
  display_name: string;
  is_active: boolean;
  features: PricingPlanFeatures;
  created_at: string;
  updated_at: string;
}

export interface PricingMeResponse {
  plan_code: PricingPlanCode;
  started_at: string | null;
  expires_at: string | null;
  is_expired: boolean;
  package: PricingPackage;
}

export interface CreatePricingPackageRequest {
  package_code: PricingPlanCode;
  display_name: string;
  is_active?: boolean;
  features: PricingPlanFeatures;
}

export interface UpdatePricingPackageRequest {
  display_name?: string;
  is_active?: boolean;
  features?: Partial<PricingPlanFeatures>;
}

export interface UpgradePricingRequest {
  target_plan_code: PricingPlanCode;
  duration_months: number;
  idempotency_key?: string;
}

export const pricingApi = {
  getPublicPackages: async (): Promise<PricingPackage[]> => {
    const response = await api.get<ApiResponse<PricingPackage[]>>(
      ApiEndpoint.PRICING_PACKAGES
    );
    return extractData(response);
  },

  getAdminPackages: async (): Promise<PricingPackage[]> => {
    const response = await api.get<ApiResponse<PricingPackage[]>>(
      ApiEndpoint.ADMIN_PRICING_PACKAGES
    );
    return extractData(response);
  },

  getMyPricing: async (): Promise<PricingMeResponse> => {
    const response = await api.get<ApiResponse<PricingMeResponse>>(
      ApiEndpoint.PRICING_ME
    );
    return extractData(response);
  },

  upgradePricing: async (
    payload: UpgradePricingRequest
  ): Promise<PricingMeResponse> => {
    const response = await api.post<ApiResponse<PricingMeResponse>>(
      ApiEndpoint.PRICING_UPGRADE,
      payload
    );
    return extractData(response);
  },

  createPackage: async (
    payload: CreatePricingPackageRequest
  ): Promise<PricingPackage> => {
    const response = await api.post<ApiResponse<PricingPackage>>(
      ApiEndpoint.ADMIN_PRICING_PACKAGES,
      payload
    );
    return extractData(response);
  },

  updatePackage: async (
    id: string,
    payload: UpdatePricingPackageRequest
  ): Promise<PricingPackage> => {
    const response = await api.patch<ApiResponse<PricingPackage>>(
      buildEndpoint(ApiEndpoint.ADMIN_PRICING_PACKAGE_BY_ID, { id }),
      payload
    );
    return extractData(response);
  },

  deletePackage: async (id: string): Promise<void> => {
    await api.delete<ApiResponse<null>>(
      buildEndpoint(ApiEndpoint.ADMIN_PRICING_PACKAGE_BY_ID, { id })
    );
  },
};
