import { httpClient } from '../http-client';
import type { Organization, User } from '@/types';
import type { PaginatedResponse } from './users.service';

export interface OrgStats {
  totalUsers: number;
  activeUsers: number;
  totalProjects: number;
  totalTestCases: number;
  totalTestRuns: number;
}

export interface UpdateOrganizationPayload {
  name?: string;
  description?: string;
  logoUrl?: string;
  website?: string;
  settings?: Record<string, unknown>;
}

export const organizationsService = {
  getMy: () =>
    httpClient
      .get<Organization & { memberCount: number }>('/organizations/my')
      .then((r) => r.data),

  updateMy: (payload: UpdateOrganizationPayload) =>
    httpClient
      .patch<Organization>('/organizations/my', payload)
      .then((r) => r.data),

  getMembers: (params?: { page?: number; limit?: number; role?: User['role']; isActive?: boolean }) =>
    httpClient
      .get<PaginatedResponse<User>>('/organizations/my/members', { params })
      .then((r) => r.data),

  getStats: () =>
    httpClient.get<OrgStats>('/organizations/my/stats').then((r) => r.data),
};
