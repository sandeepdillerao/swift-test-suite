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
    onSuccess: (updatedTestCase, { id, data }) => {
      queryClient.invalidateQueries({ queryKey: ['testCases'] });

      // Auto-sync status to Jira subtask if linked and status changed
      if (data.status && updatedTestCase?.jiraSubtaskId) {
        api.integrations.syncJiraStatus(id, data.status).catch(() => {
          // Silent — non-blocking, sync errors don't affect the update
        });
      }
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
