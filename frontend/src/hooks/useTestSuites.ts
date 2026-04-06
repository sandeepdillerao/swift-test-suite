import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import type { TestSuite } from '@/types';

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

export const useCreateTestSuite = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<TestSuite>) => api.testSuites.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['testSuites'] }),
  });
};

export const useUpdateTestSuite = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<TestSuite> }) =>
      api.testSuites.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['testSuites'] }),
  });
};

export const useDeleteTestSuite = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.testSuites.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['testSuites'] }),
  });
};
