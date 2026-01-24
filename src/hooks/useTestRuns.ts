import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import type { TestRun } from '@/types';

export const useTestRuns = (projectId?: string) => {
  return useQuery({
    queryKey: ['testRuns', { projectId }],
    queryFn: () => api.testRuns.list(projectId),
  });
};

export const useTestRun = (id: string) => {
  return useQuery({
    queryKey: ['testRuns', id],
    queryFn: () => api.testRuns.get(id),
    enabled: !!id,
  });
};

export const useCreateTestRun = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: Partial<TestRun>) => api.testRuns.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['testRuns'] });
    },
  });
};
