"use client";

import { api, extractData } from "../axios/index";
import type { ApiResponse } from "../axios";
import { ApiEndpoint, buildEndpoint } from "../constants/api-endpoints";

export interface Service {
  id: string;
  code: string;
  name: string;
  description?: string;
  category?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface GetServicesQuery {
  category?: string;
  page?: number;
  limit?: number;
}

export const serviceApi = {
  getServices: async (query?: GetServicesQuery): Promise<Service[]> => {
    const response = await api.get<ApiResponse<Service[]>>(
      ApiEndpoint.SERVICES,
      { params: query }
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

