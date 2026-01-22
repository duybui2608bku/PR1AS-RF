"use client";

import { api, extractData } from "../axios/index";
import type { ApiResponse } from "../axios";
import type { CreateReviewInput, Review } from "../types/review";
import { ApiEndpoint, buildEndpoint } from "../constants/api-endpoints";

export const reviewApi = {
  createReview: async (data: CreateReviewInput): Promise<Review> => {
    const response = await api.post<ApiResponse<Review>>(
      ApiEndpoint.REVIEWS,
      data
    );
    return extractData(response);
  },

  getReviewById: async (reviewId: string): Promise<Review> => {
    const response = await api.get<ApiResponse<Review>>(
      buildEndpoint(ApiEndpoint.REVIEWS_BY_ID, { id: reviewId })
    );
    return extractData(response);
  },
};
