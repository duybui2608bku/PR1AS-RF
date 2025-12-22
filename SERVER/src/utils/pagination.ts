/**
 * Interface cho pagination metadata
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

/**
 * Interface cho paginated response
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
}

/**
 * Helper để tính toán và format response phân trang
 */
export class PaginationHelper {
  /**
   * Tính toán pagination metadata từ total records
   * 
   * @param page - Trang hiện tại (bắt đầu từ 1)
   * @param limit - Số lượng items mỗi trang
   * @param total - Tổng số records
   * @returns PaginationMeta object
   * 
   * @example
   * const meta = PaginationHelper.calculateMeta(1, 10, 25);
   * // { page: 1, limit: 10, total: 25, totalPages: 3, hasNextPage: true, hasPrevPage: false }
   */
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

  /**
   * Format response phân trang chuẩn
   * 
   * @param data - Mảng dữ liệu
   * @param page - Trang hiện tại
   * @param limit - Số lượng items mỗi trang
   * @param total - Tổng số records
   * @returns PaginatedResponse object
   * 
   * @example
   * const response = PaginationHelper.formatResponse(users, 1, 10, 25);
   * // {
   * //   data: [...users],
   * //   pagination: { page: 1, limit: 10, total: 25, totalPages: 3, hasNextPage: true, hasPrevPage: false }
   * // }
   */
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

  /**
   * Format response phân trang từ pagination info và total
   * 
   * @param data - Mảng dữ liệu
   * @param pagination - Object chứa page, limit, skip (từ middleware)
   * @param total - Tổng số records
   * @returns PaginatedResponse object
   * 
   * @example
   * // Trong controller:
   * const { page, limit } = req.pagination!;
   * const { users, total } = await userService.getAllUsers(query);
   * return PaginationHelper.format(data, req.pagination!, total);
   */
  static format<T>(
    data: T[],
    pagination: { page: number; limit: number; skip: number },
    total: number
  ): PaginatedResponse<T> {
    return this.formatResponse(data, pagination.page, pagination.limit, total);
  }
}

