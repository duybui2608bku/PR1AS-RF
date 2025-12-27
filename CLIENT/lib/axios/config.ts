import axios, { AxiosError, AxiosRequestConfig, InternalAxiosRequestConfig } from "axios";
import { showErrorNotification, getErrorType, ErrorType } from "../utils/error-handler";

/**
 * Extended Axios Request Config với metadata tùy chỉnh
 */
export interface ExtendedAxiosRequestConfig extends InternalAxiosRequestConfig {
  skipErrorNotification?: boolean;
  _retry?: boolean;
}

/**
 * API Response Interface - Khớp với server response format
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  statusCode: number;
  message?: string;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: { field: string; message: string }[];
    stack?: string;
  };
}

/**
 * Axios Error với ApiResponse
 */
export interface ApiError extends AxiosError<ApiResponse> {
  response?: {
    data: ApiResponse;
    status: number;
    statusText: string;
    headers: unknown;
    config: InternalAxiosRequestConfig;
  };
}

/**
 * Base URL cho API
 */
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3052/api";

/**
 * Tạo axios instance với cấu hình mặc định
 */
export const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, // Để gửi cookies nếu cần
});

/**
 * Request Interceptor - Thêm token vào header
 */
axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Lấy token từ localStorage hoặc cookie
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

/**
 * Response Interceptor - Xử lý response và errors
 */
axiosInstance.interceptors.response.use(
  (response) => {
    // Server trả về data trong response.data.data hoặc response.data
    return response;
  },
  async (error: ApiError) => {
    const originalRequest = error.config as ExtendedAxiosRequestConfig;

    // Xử lý lỗi 401 Unauthorized - Token hết hạn hoặc không hợp lệ
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      // Xóa token và redirect về trang login
      if (typeof window !== "undefined") {
        localStorage.removeItem("token");
        // Dispatch custom event để store có thể lắng nghe và logout
        window.dispatchEvent(new CustomEvent("auth:logout"));
        // Có thể thêm logic refresh token ở đây nếu cần
        window.location.href = "/login";
      }

      return Promise.reject(error);
    }

    // Hiển thị notification cho các lỗi khác (trừ 401 đã xử lý ở trên)
    // Chỉ hiển thị notification khi có response và không có flag skipErrorNotification
    if (error.response && typeof window !== "undefined") {
      const errorType = getErrorType(error.response.status);
      
      // Hiển thị notification cho các lỗi cần thông báo
      if (
        errorType !== ErrorType.UNAUTHORIZED &&
        !originalRequest.skipErrorNotification
      ) {
        showErrorNotification(error);
      }
    } else if (!error.response && typeof window !== "undefined") {
      // Xử lý network errors (chỉ khi không có flag skip)
      // Network errors thường xảy ra khi server không chạy hoặc không thể kết nối
      if (!originalRequest.skipErrorNotification) {
        // Chỉ hiển thị notification một lần để tránh spam
        const errorKey = `network-error-${originalRequest.url}`;
        const lastErrorTime = sessionStorage.getItem(errorKey);
        const now = Date.now();
        
        // Chỉ hiển thị notification nếu chưa hiển thị trong 5 giây gần đây
        if (!lastErrorTime || now - parseInt(lastErrorTime) > 5000) {
          sessionStorage.setItem(errorKey, now.toString());
          showErrorNotification(error);
        }
      }
    }

    // Trả về error với format chuẩn
    return Promise.reject(error);
  }
);

/**
 * Helper function để extract data từ ApiResponse
 */
export const extractData = <T>(response: { data: ApiResponse<T> }): T => {
  if (response.data.success && response.data.data) {
    return response.data.data;
  }
  throw new Error(response.data.error?.message || "Invalid response format");
};

export default axiosInstance;

