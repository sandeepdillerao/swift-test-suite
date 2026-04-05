import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import type { AutomationScript } from '@/types';

export const useAutomationScripts = (testCaseId?: string) => {
  return useQuery({
    queryKey: ['automationScripts', testCaseId],
    queryFn: () => api.automation.getByTestCase(testCaseId!),
    enabled: !!testCaseId,
  });
};

export const useAutomationScript = (id?: string) => {
  return useQuery({
    queryKey: ['automationScripts', 'detail', id],
    queryFn: () => api.automation.get(id!),
    enabled: !!id,
  });
};

export const useGenerateScript = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { testCaseId: string; projectId: string; targetUrl?: string; browserType?: string }) =>
      api.automation.generate(data),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['automationScripts', vars.testCaseId] });
    },
  });
};

export const useImportCodegenScript = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { testCaseId: string; projectId: string; rawScript: string; targetUrl?: string }) =>
      api.automation.importCodegen(data),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['automationScripts', vars.testCaseId] });
    },
  });
};

export const useUpdateScript = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<AutomationScript> }) =>
      api.automation.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automationScripts'] });
    },
  });
};

export const useDeleteScript = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.automation.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automationScripts'] });
    },
  });
};

export const useExecuteScript = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ scriptId, options }: { scriptId: string; options?: { browserType?: string; targetUrl?: string; enableHealing?: boolean; headless?: boolean } }) =>
      api.automation.execute(scriptId, options),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['automationScripts'] });
      queryClient.invalidateQueries({ queryKey: ['scriptExecutions'] });
      queryClient.invalidateQueries({ queryKey: ['testCases'] });
    },
  });
};

export const useScriptExecutions = (scriptId?: string, limit = 20) => {
  return useQuery({
    queryKey: ['scriptExecutions', scriptId, limit],
    queryFn: () => api.automation.getExecutions(scriptId!, limit),
    enabled: !!scriptId,
    refetchInterval: 5000, // Poll while executions may be running
  });
};

export const useTestCaseExecutions = (testCaseId?: string, limit = 20) => {
  return useQuery({
    queryKey: ['scriptExecutions', 'testCase', testCaseId, limit],
    queryFn: () => api.automation.getExecutionsByTestCase(testCaseId!, limit),
    enabled: !!testCaseId,
    refetchInterval: 5000,
  });
};
