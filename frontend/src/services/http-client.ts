import axios, {
  AxiosError,
  AxiosInstance,
  AxiosRequestConfig,
  InternalAxiosRequestConfig,
} from 'axios';
import { useAuthStore } from '@/stores/authStore';

// ─── Types ────────────────────────────────────────────────────────────────────

/** Shape the backend always returns (TransformInterceptor envelope) */
interface ApiEnvelope<T = unknown> {
  success: boolean;
  data: T;
  timestamp: string;
}

/** RFC 7807 Problem Details error shape from the backend */
export interface ApiError {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance: string;
  timestamp: string;
  path: string;
}

// ─── Refresh queue ────────────────────────────────────────────────────────────
// Prevents multiple concurrent 401s from each triggering their own refresh call.

let isRefreshing = false;
let refreshQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

function processQueue(error: unknown, token: string | null) {
  refreshQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token!);
  });
  refreshQueue = [];
}

// ─── Axios instance ───────────────────────────────────────────────────────────

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1';

export const httpClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 120_000,
});

// ─── Request interceptor — attach Bearer token ────────────────────────────────

httpClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const { accessToken } = useAuthStore.getState();
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// ─── Response interceptor ─────────────────────────────────────────────────────
// 1. Unwrap the backend envelope so callers receive `T` directly.
// 2. On 401 → attempt silent token refresh → retry original request.
// 3. On refresh failure → logout and redirect to /login.

httpClient.interceptors.response.use(
  (response) => {
    // Unwrap { success, data, timestamp } envelope
    const envelope = response.data as ApiEnvelope;
    if (envelope && typeof envelope === 'object' && 'success' in envelope) {
      response.data = envelope.data;
    }
    return response;
  },
  async (error: AxiosError<ApiError>) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      // Skip refresh loop for the refresh endpoint itself
      if (originalRequest.url?.includes('/auth/refresh')) {
        useAuthStore.getState().logout();
        window.location.href = '/login';
        return Promise.reject(error);
      }

      if (isRefreshing) {
        // Queue this request until refresh completes
        return new Promise((resolve, reject) => {
          refreshQueue.push({ resolve, reject });
        }).then((token) => {
          if (originalRequest.headers) {
            (originalRequest.headers as Record<string, string>).Authorization = `Bearer ${token}`;
          }
          return httpClient(originalRequest);
        });
      }

      isRefreshing = true;
      const { refreshToken, setTokens, logout } = useAuthStore.getState();

      try {
        const { data } = await httpClient.post<{ accessToken: string; refreshToken: string }>(
          '/auth/refresh',
          { refreshToken },
        );
        setTokens(data.accessToken, data.refreshToken);
        processQueue(null, data.accessToken);

        if (originalRequest.headers) {
          (originalRequest.headers as Record<string, string>).Authorization = `Bearer ${data.accessToken}`;
        }
        return httpClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        logout();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // Surface a clean error message from RFC 7807 detail
    const detail = error.response?.data?.detail ?? error.message;
    return Promise.reject(new Error(detail));
  },
);
