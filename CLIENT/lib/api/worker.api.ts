"use client";

import { api, extractData } from "../axios/index";
import type { ApiResponse } from "../axios";
import type {
  WorkerProfile,
  WorkerProfileUpdateInput,
  Service,
  WorkerServiceInput,
} from "../types/worker";
import { Gender } from "../types/worker";
import { ApiEndpoint, buildEndpoint } from "../constants/api-endpoints";

export interface ReviewStats {
  total_reviews: number;
  average_rating: number;
  rating_distribution: {
    "1": number;
    "2": number;
    "3": number;
    "4": number;
    "5": number;
  };
  average_rating_details: {
    professionalism: number;
    punctuality: number;
    communication: number;
    service_quality: number;
  };
}

export interface WorkerReviewItem {
  id: string;
  rating: number;
  comment: string;
  client: {
    id: string;
    full_name: string | null;
    avatar: string | null;
  };
  worker_reply: string | null;
  worker_replied_at: string | null;
  created_at: string;
}

export interface WorkerDetailResponse {
  user: {
    id: string;
    full_name: string | null;
    avatar: string | null;
    email: string;
  };
  worker_profile: WorkerProfile;
  services?: Array<{
    _id: string;
    service_id: string;
    service_code: string;
    pricing: Array<{
      unit: string;
      duration?: number;
      price: number;
      currency: string;
    }>;
    is_active: boolean;
  }>;
  review_stats?: ReviewStats;
  reviews?: WorkerReviewItem[];
}

export interface WorkerScheduleItem {
  booking_id: string;
  start_time: string;
  end_time: string;
  status: string;
}

export const workerProfileApi = {
  getProfile: async (): Promise<WorkerProfile> => {
    const response = await api.get<
      ApiResponse<{ user: { worker_profile: WorkerProfile | null } }>
    >(ApiEndpoint.AUTH_ME);
    const data = extractData(response);
    return (
      data.user.worker_profile || {
        gender: Gender.MALE,
        hobbies: [],
        gallery_urls: [],
      }
    );
  },

  getWorkerById: async (workerId: string): Promise<WorkerDetailResponse> => {
    const response = await api.get<ApiResponse<WorkerDetailResponse>>(
      buildEndpoint(ApiEndpoint.WORKERS_BY_ID, { id: workerId })
    );
    return extractData(response);
  },

  getWorkerSchedule: async (
    workerId: string,
    startDate: string,
    endDate: string
  ): Promise<WorkerScheduleItem[]> => {
    const response = await api.get<ApiResponse<WorkerScheduleItem[]>>(
      buildEndpoint(ApiEndpoint.WORKERS_BY_ID_SCHEDULE, { id: workerId }),
      {
        params: {
          start_date: startDate,
          end_date: endDate,
        },
      }
    );

    return extractData(response);
  },

  updateProfile: async (
    data: WorkerProfileUpdateInput
  ): Promise<WorkerProfile> => {
    const response = await api.patch<
      ApiResponse<{ worker_profile: WorkerProfile }>
    >(ApiEndpoint.AUTH_PROFILE, { worker_profile: data });
    return extractData(response).worker_profile;
  },
};

export const servicesApi = {
  getServices: async (category?: string): Promise<Service[]> => {
    const params = category ? { category } : {};
    const response = await api.get<ApiResponse<Service[]>>(
      ApiEndpoint.SERVICES,
      { params }
    );
    return extractData(response);
  },

  getServiceById: async (id: string): Promise<Service> => {
    const response = await api.get<ApiResponse<Service>>(
      buildEndpoint(ApiEndpoint.SERVICES_BY_ID, { id })
    );
    return extractData(response);
  },

  getServiceByCode: async (code: string): Promise<Service> => {
    const response = await api.get<ApiResponse<Service>>(
      buildEndpoint(ApiEndpoint.SERVICES_BY_CODE, { code })
    );
    return extractData(response);
  },
};

export interface WorkersGroupedByServiceResponse {
  service: {
    id: string;
    code: string;
    name: {
      en: string;
      vi: string;
      zh?: string | null;
      ko?: string | null;
    };
    description: {
      en: string;
      vi: string;
      zh?: string | null;
      ko?: string | null;
    };
    category: string;
  };
  workers: Array<{
    id: string;
    full_name: string | null;
    avatar: string | null;
    worker_profile: {
      title: string | null;
      introduction: string | null;
      gallery_urls: string[];
    } | null;
    pricing: Array<{
      unit: string;
      duration?: number;
      price: number;
      currency: string;
    }>;
  }>;
}

/** Query params for GET grouped-by-service (repeated keys → OR within field). */
export interface WorkerServiceSearchParams {
  q?: string[];
  category?: string[];
  /** Each entry: `province_code` or `province_code:ward_code` */
  work_area?: string[];
  /** Legacy: discrete slots (OR). Ignored by server when schedule_from + schedule_to are set. */
  schedule?: string[];
  schedule_from?: string;
  schedule_to?: string;
  /** @deprecated Prefer work_area */
  location?: string;
  /** Legacy single; server merges into work_area when work_area absent */
  province_code?: number;
  ward_code?: number;
}

/** Builds URLSearchParams for grouped worker search (GET). */
export function workerServiceSearchParamsToUrlSearchParams(
  params?: WorkerServiceSearchParams
): URLSearchParams | undefined {
  if (!params) return undefined;
  const sp = new URLSearchParams();

  for (const q of params.q ?? []) {
    const t = q.trim();
    if (t) sp.append("q", t);
  }
  for (const c of params.category ?? []) {
    const t = c.trim();
    if (t) sp.append("category", t);
  }
  for (const wa of params.work_area ?? []) {
    const t = wa.trim();
    if (t) sp.append("work_area", t);
  }
  for (const s of params.schedule ?? []) {
    const t = s.trim();
    if (t) sp.append("schedule", t);
  }
  if (params.schedule_from?.trim()) {
    sp.set("schedule_from", params.schedule_from.trim());
  }
  if (params.schedule_to?.trim()) {
    sp.set("schedule_to", params.schedule_to.trim());
  }

  return sp.toString() ? sp : undefined;
}

export function workerServiceSearchParamsToQueryString(
  params?: WorkerServiceSearchParams
): string {
  return workerServiceSearchParamsToUrlSearchParams(params)?.toString() ?? "";
}

function buildGroupedSearchParams(
  params?: WorkerServiceSearchParams
): URLSearchParams | undefined {
  return workerServiceSearchParamsToUrlSearchParams(params);
}

export const workerServicesApi = {
  getServices: async (): Promise<
    Array<{
      service_id: string;
      service_code: string;
      pricing: Array<{
        unit: string;
        duration?: number;
        price: number;
        currency: string;
      }>;
      is_active: boolean;
    }>
  > => {
    const response = await api.get<
      ApiResponse<{
        services: Array<{
          service_id: string;
          service_code: string;
          pricing: Array<{
            unit: string;
            duration?: number;
            price: number;
            currency: string;
          }>;
          is_active: boolean;
        }>;
      }>
    >(ApiEndpoint.WORKER_SERVICES);
    return extractData(response).services;
  },

  getWorkersGroupedByService: async (
    params?: WorkerServiceSearchParams
  ): Promise<
    WorkersGroupedByServiceResponse[]
  > => {
    const searchParams = buildGroupedSearchParams(params);
    const response = await api.get<
      ApiResponse<WorkersGroupedByServiceResponse[]>
    >(ApiEndpoint.WORKERS_GROUPED_BY_SERVICE, {
      params: searchParams,
    });
    return extractData(response);
  },

  searchServices: async (
    params: WorkerServiceSearchParams
  ): Promise<WorkersGroupedByServiceResponse[] | unknown[]> => {
    const searchParams = buildGroupedSearchParams(params);
    const response = await api.get<
      ApiResponse<WorkersGroupedByServiceResponse[] | unknown[]>
    >(ApiEndpoint.WORKERS_GROUPED_BY_SERVICE, {
      params: searchParams,
    });
    return extractData(response);
  },

  createOrUpdateServices: async (data: WorkerServiceInput): Promise<void> => {
    await api.post<ApiResponse<void>>(ApiEndpoint.WORKER_SERVICES, data);
  },

  updateService: async (
    serviceId: string,
    data: Partial<WorkerServiceInput["services"][0]>
  ): Promise<void> => {
    await api.patch<ApiResponse<void>>(
      buildEndpoint(ApiEndpoint.WORKER_SERVICES_BY_ID, { serviceId }),
      data
    );
  },

  deleteService: async (serviceId: string): Promise<void> => {
    await api.delete<ApiResponse<void>>(
      buildEndpoint(ApiEndpoint.WORKER_SERVICES_BY_ID, { serviceId })
    );
  },
};
