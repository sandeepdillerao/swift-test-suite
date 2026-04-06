import { httpClient } from '../http-client';
import type { User } from '@/types';

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface ListUsersParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  search?: string;
  role?: User['role'];
  isActive?: boolean;
}

export interface InviteUserPayload {
  email: string;
  role: User['role'];
  firstName?: string;
  lastName?: string;
}

export interface AcceptInvitePayload {
  token: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface UpdateProfilePayload {
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  settings?: Record<string, unknown>;
}

export const usersService = {
  list: (params?: ListUsersParams) =>
    httpClient
      .get<PaginatedResponse<User>>('/users', { params })
      .then((r) => r.data),

  get: (id: string) =>
    httpClient.get<User>(`/users/${id}`).then((r) => r.data),

  updateProfile: (payload: UpdateProfilePayload) =>
    httpClient.patch<User>('/users/profile', payload).then((r) => r.data),

  changePassword: (currentPassword: string, newPassword: string) =>
    httpClient
      .post<{ message: string }>('/users/change-password', { currentPassword, newPassword })
      .then((r) => r.data),

  invite: (payload: InviteUserPayload) =>
    httpClient.post<User>('/users/invite', payload).then((r) => r.data),

  acceptInvite: (payload: AcceptInvitePayload) =>
    httpClient
      .post<{ message: string }>('/users/accept-invite', payload)
      .then((r) => r.data),

  activate: (id: string) =>
    httpClient.post<User>(`/users/${id}/activate`).then((r) => r.data),

  deactivate: (id: string) =>
    httpClient.post<User>(`/users/${id}/deactivate`).then((r) => r.data),

  updateRole: (id: string, role: User['role']) =>
    httpClient.patch<User>(`/users/${id}/role`, { role }).then((r) => r.data),

  delete: (id: string) =>
    httpClient.delete(`/users/${id}`).then((r) => r.data),
};
