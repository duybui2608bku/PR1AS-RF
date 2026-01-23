"use client";

import { api, extractData } from "../axios/index";
import type { ApiResponse } from "../axios";
import type {
  Escrow,
  EscrowQuery,
  EscrowListResponse,
} from "../types/escrow";
import { ApiEndpoint } from "../constants/api-endpoints";

export const escrowApi = {
  getMyEscrows: async (query?: EscrowQuery): Promise<EscrowListResponse> => {
    const cleanQuery: Record<string, string> = {};
    if (query) {
      Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          cleanQuery[key] = String(value);
        }
      });
    }
    const queryString = new URLSearchParams(cleanQuery).toString();
    const response = await api.get<ApiResponse<EscrowListResponse>>(
      `${ApiEndpoint.ESCROWS_MY}${queryString ? `?${queryString}` : ""}`
    );
    return extractData(response);
  },

  getEscrowById: async (escrowId: string): Promise<Escrow> => {
    const response = await api.get<ApiResponse<Escrow>>(
      ApiEndpoint.ESCROWS_BY_ID.replace(":id", escrowId)
    );
    return extractData(response);
  },
};
