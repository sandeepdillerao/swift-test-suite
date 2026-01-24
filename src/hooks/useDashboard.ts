import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';

export const useDashboardStats = (projectId?: string) => {
  return useQuery({
    queryKey: ['dashboard', 'stats', { projectId }],
    queryFn: () => api.dashboard.getStats(projectId),
  });
};
