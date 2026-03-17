import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';

export const useTestSuites = (projectId: string) => {
  return useQuery({
    queryKey: ['testSuites', { projectId }],
    queryFn: () => api.testSuites.list(projectId),
    enabled: !!projectId,
  });
};

export const useTestSuite = (id: string) => {
  return useQuery({
    queryKey: ['testSuites', id],
    queryFn: () => api.testSuites.get(id),
    enabled: !!id,
  });
};
