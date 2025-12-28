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

export const workerProfileApi = {
  getProfile: async (): Promise<WorkerProfile> => {
    const response = await api.get<
      ApiResponse<{ user: { worker_profile: WorkerProfile | null } }>
    >("/auth/me");
    const data = extractData(response);
    return (
      data.user.worker_profile || {
        gender: Gender.MALE,
        hobbies: [],
        gallery_urls: [],
      }
    );
  },

  updateProfile: async (
    data: WorkerProfileUpdateInput
  ): Promise<WorkerProfile> => {
    const response = await api.patch<
      ApiResponse<{ worker_profile: WorkerProfile }>
    >("/auth/profile", { worker_profile: data });
    return extractData(response).worker_profile;
  },
};

export const servicesApi = {
  getServices: async (category?: string): Promise<Service[]> => {
    const params = category ? { category } : {};
    const response = await api.get<ApiResponse<Service[]>>("/services", {
      params,
    });
    return extractData(response);
  },

  getServiceById: async (id: string): Promise<Service> => {
    const response = await api.get<ApiResponse<Service>>(`/services/${id}`);
    return extractData(response);
  },

  getServiceByCode: async (code: string): Promise<Service> => {
    const response = await api.get<ApiResponse<Service>>(
      `/services/code/${code}`
    );
    return extractData(response);
  },
};

export const workerServicesApi = {
  createOrUpdateServices: async (data: WorkerServiceInput): Promise<void> => {
    await api.post<ApiResponse<void>>("/worker/services", data);
  },

  updateService: async (
    serviceId: string,
    data: Partial<WorkerServiceInput["services"][0]>
  ): Promise<void> => {
    await api.patch<ApiResponse<void>>(`/worker/services/${serviceId}`, data);
  },

  deleteService: async (serviceId: string): Promise<void> => {
    await api.delete<ApiResponse<void>>(`/worker/services/${serviceId}`);
  },
};
