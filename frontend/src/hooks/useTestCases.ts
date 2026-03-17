import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import type { TestCase } from '@/types';

export const useTestCases = (projectId?: string, suiteId?: string) => {
  return useQuery({
    queryKey: ['testCases', { projectId, suiteId }],
    queryFn: () => api.testCases.list(projectId, suiteId),
    enabled: !!projectId || !!suiteId,
  });
};

export const useTestCase = (id: string) => {
  return useQuery({
    queryKey: ['testCases', id],
    queryFn: () => api.testCases.get(id),
    enabled: !!id,
  });
};

export const useCreateTestCase = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: Partial<TestCase>) => api.testCases.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['testCases'] });
    },
  });
};

export const useUpdateTestCase = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<TestCase> }) => 
      api.testCases.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['testCases'] });
    },
  });
};

export const useDeleteTestCase = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => api.testCases.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['testCases'] });
    },
  });
};
