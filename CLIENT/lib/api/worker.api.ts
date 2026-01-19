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
      duration: number;
      price: number;
      currency: string;
    }>;
    is_active: boolean;
  }>;
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
      duration: number;
      price: number;
      currency: string;
    }>;
  }>;
}

export const workerServicesApi = {
  getServices: async (): Promise<
    Array<{
      service_id: string;
      service_code: string;
      pricing: Array<{
        unit: string;
        duration: number;
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
            duration: number;
            price: number;
            currency: string;
          }>;
          is_active: boolean;
        }>;
      }>
    >(ApiEndpoint.WORKER_SERVICES);
    return extractData(response).services;
  },

  getWorkersGroupedByService: async (): Promise<
    WorkersGroupedByServiceResponse[]
  > => {
    const response = await api.get<
      ApiResponse<WorkersGroupedByServiceResponse[]>
    >(ApiEndpoint.WORKERS_GROUPED_BY_SERVICE);
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
