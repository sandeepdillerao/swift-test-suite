import { httpClient } from '../http-client';
import type { User } from '@/types';

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface RegisterPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  organizationName?: string;
  inviteToken?: string;
}

export const authService = {
  login: (email: string, password: string) =>
    httpClient
      .post<LoginResponse>('/auth/login', { email, password })
      .then((r) => r.data),

  register: (payload: RegisterPayload) =>
    httpClient
      .post<{ message: string }>('/auth/register', payload)
      .then((r) => r.data),

  logout: (refreshToken: string) =>
    httpClient
      .post<{ message: string }>('/auth/logout', { refreshToken })
      .then((r) => r.data),

  logoutAll: () =>
    httpClient
      .post<{ message: string }>('/auth/logout-all')
      .then((r) => r.data),

  refresh: (refreshToken: string) =>
    httpClient
      .post<{ accessToken: string; refreshToken: string }>('/auth/refresh', { refreshToken })
      .then((r) => r.data),

  me: () =>
    httpClient.get<User>('/auth/me').then((r) => r.data),

  forgotPassword: (email: string) =>
    httpClient
      .post<{ message: string }>('/auth/forgot-password', { email })
      .then((r) => r.data),

  resetPassword: (token: string, newPassword: string) =>
    httpClient
      .post<{ message: string }>('/auth/reset-password', { token, newPassword })
      .then((r) => r.data),

  verifyEmail: (token: string) =>
    httpClient
      .post<{ message: string }>('/auth/verify-email', { token })
      .then((r) => r.data),
};
