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
