import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import {
  showErrorNotification,
  getErrorType,
  ErrorType,
  HttpStatus,
} from "../utils/error-handler";

export interface ExtendedAxiosRequestConfig extends InternalAxiosRequestConfig {
  skipErrorNotification?: boolean;
  _retry?: boolean;
}

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

export type ApiError = AxiosError<ApiResponse>;

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://api.pr1as.one/api";
const REQUEST_TIMEOUT = 30000;
const NETWORK_ERROR_THROTTLE_MS = 5000;

export const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: REQUEST_TIMEOUT,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

const refreshAccessToken = async (): Promise<boolean> => {
  if (typeof window === "undefined") return false;

  const refreshToken = localStorage.getItem("refreshToken");
  if (!refreshToken) {
    return false;
  }

  try {
    const response = await axios.post<
      ApiResponse<{ token: string; refreshToken: string }>
    >(
      `${API_BASE_URL}/auth/refresh-token`,
      { refreshToken },
      {
        headers: {
          "Content-Type": "application/json",
        },
        withCredentials: true,
      },
    );

    if (response.data.success && response.data.data) {
      const { token, refreshToken: newRefreshToken } = response.data.data;

      localStorage.setItem("token", token);
      localStorage.setItem("refreshToken", newRefreshToken);

      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("auth:token-refreshed", {
            detail: { token, refreshToken: newRefreshToken },
          }),
        );
      }

      return true;
    }

    return false;
  } catch {
    if (typeof window !== "undefined") {
      localStorage.removeItem("token");
      localStorage.removeItem("refreshToken");
    }
    return false;
  }
};

axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token =
      typeof window !== "undefined" ? localStorage.getItem("token") : null;

    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  },
);

axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error: ApiError) => {
    const originalRequest = error.config as ExtendedAxiosRequestConfig;

    const isAuthLoginRoute = originalRequest.url?.includes("/auth/login");

    if (
      error.response?.status === HttpStatus.UNAUTHORIZED &&
      !originalRequest._retry &&
      !isAuthLoginRoute
    ) {
      originalRequest._retry = true;

      const refreshed = await refreshAccessToken();

      if (refreshed) {
        const newToken =
          typeof window !== "undefined" ? localStorage.getItem("token") : null;
        if (newToken && originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
        }

        return axiosInstance(originalRequest);
      } else {
        if (typeof window !== "undefined") {
          localStorage.removeItem("token");
          localStorage.removeItem("refreshToken");
          window.dispatchEvent(new CustomEvent("auth:logout"));
          window.location.href = "/auth/login";
        }
      }

      return Promise.reject(error);
    }

    if (error.response && typeof window !== "undefined") {
      const errorType = getErrorType(error.response.status);

      if (
        (errorType !== ErrorType.UNAUTHORIZED || isAuthLoginRoute) &&
        !originalRequest.skipErrorNotification
      ) {
        showErrorNotification(error, undefined, isAuthLoginRoute);
      }
    } else if (!error.response && typeof window !== "undefined") {
      if (!originalRequest.skipErrorNotification) {
        const errorKey = `network-error-${originalRequest.url}`;
        const lastErrorTime = sessionStorage.getItem(errorKey);
        const now = Date.now();

        if (
          !lastErrorTime ||
          now - parseInt(lastErrorTime) > NETWORK_ERROR_THROTTLE_MS
        ) {
          sessionStorage.setItem(errorKey, now.toString());
          showErrorNotification(error);
        }
      }
    }

    return Promise.reject(error);
  },
);

export const extractData = <T>(response: { data: ApiResponse<T> }): T => {
  if (response.data.success && response.data.data) {
    return response.data.data;
  }
  const errorMessage =
    response.data.error?.message ||
    response.data.message ||
    "Invalid response format";
  const error = new Error(errorMessage) as ApiError;
  error.response = {
    data: response.data,
    status: response.data.statusCode || 500,
    statusText: "Invalid Response",
    headers: {},
    config: {} as InternalAxiosRequestConfig,
  } as ApiError["response"];
  throw error;
};

export default axiosInstance;
