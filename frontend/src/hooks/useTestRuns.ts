import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import type { TestRun, TestRunCase } from '@/types';

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

export const useTestRunHistory = (runId: string) => {
  return useQuery({
    queryKey: ['testRunHistory', runId],
    queryFn: () => api.testRuns.getHistory(runId),
    enabled: !!runId,
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

export const useUpdateTestRun = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<TestRun> }) => 
      api.testRuns.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['testRuns'] });
    },
  });
};

export const useDeleteTestRun = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => api.testRuns.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['testRuns'] });
    },
  });
};

export const useUpdateTestRunCase = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ runId, testCaseId, data }: { runId: string; testCaseId: string; data: Partial<TestRunCase> }) => 
      api.testRuns.updateTestCase(runId, testCaseId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['testRuns'] });
      queryClient.invalidateQueries({ queryKey: ['testRunHistory'] });
    },
  });
};
