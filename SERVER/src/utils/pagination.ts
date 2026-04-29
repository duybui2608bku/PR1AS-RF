import { PAGINATION_DEFAULT } from "../constants/pagination";

export const getPagination = (page?: number, limit?: number) => {
  const finalPage = page && page > 0 ? page : PAGINATION_DEFAULT.PAGE;
  const finalLimit = limit && limit > 0 ? limit : PAGINATION_DEFAULT.LIMIT;

  return {
    page: finalPage,
    limit: finalLimit,
    skip: (finalPage - 1) * finalLimit,
  };
};

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
}

export class PaginationHelper {
  static calculateMeta(
    page: number,
    limit: number,
    total: number
  ): PaginationMeta {
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return {
      page,
      limit,
      total,
      totalPages,
      hasNextPage,
      hasPrevPage,
    };
  }

  static formatResponse<T>(
    data: T[],
    page: number,
    limit: number,
    total: number
  ): PaginatedResponse<T> {
    return {
      data,
      pagination: this.calculateMeta(page, limit, total),
    };
  }

  static format<T>(
    data: T[],
    pagination: { page: number; limit: number; skip: number },
    total: number
  ): PaginatedResponse<T> {
    return this.formatResponse(data, pagination.page, pagination.limit, total);
  }
}
