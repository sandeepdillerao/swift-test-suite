import type { DashboardStats } from '@/types';
import { httpClient } from '../http-client';

export const dashboardService = {
  getStats: (params?: { projectId?: string }) =>
    httpClient
      .get<DashboardStats>('/dashboard/stats', { params })
      .then((r) => r.data),
};
