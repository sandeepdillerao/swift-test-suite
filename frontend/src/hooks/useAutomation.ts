import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import type { AutomationScript } from '@/types';

export const useAutomationScripts = (testCaseId?: string) => {
  return useQuery({
    queryKey: ['automationScripts', testCaseId],
    queryFn: () => api.automation.getByTestCase(testCaseId!),
    enabled: !!testCaseId,
    refetchInterval: (query) => {
      // Poll every 3s while any script is running, stop when none are
      const scripts = query.state.data as AutomationScript[] | undefined;
      const hasRunning = scripts?.some((s) => s.status === 'running');
      return hasRunning ? 3000 : false;
    },
  });
};

export const useAutomationScript = (id?: string) => {
  return useQuery({
    queryKey: ['automationScripts', 'detail', id],
    queryFn: () => api.automation.get(id!),
    enabled: !!id,
  });
};

// ─── Codegen Recording Hooks ──────────────────────────────────────────────

export const useStartCodegen = () => {
  return useMutation({
    mutationFn: (data: { testCaseId: string; projectId: string; targetUrl?: string; browserType?: string }) =>
      api.automation.startCodegen(data),
  });
};

export const useCodegenStatus = (sessionId?: string) => {
  return useQuery({
    queryKey: ['codegenSession', sessionId],
    queryFn: () => api.automation.getCodegenStatus(sessionId!),
    enabled: !!sessionId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === 'recording' ? 2000 : false;
    },
  });
};

export const useStopCodegen = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) => api.automation.stopCodegen(sessionId),
    onSuccess: (_, sessionId) => {
      queryClient.invalidateQueries({ queryKey: ['codegenSession', sessionId] });
    },
  });
};

export const useCompleteCodegen = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) => api.automation.completeCodegen(sessionId),
    onSuccess: (script) => {
      queryClient.invalidateQueries({ queryKey: ['automationScripts', script.testCaseId] });
    },
  });
};

// ─── Script Generation Hooks ──────────────────────────────────────────────

export const useGenerateScript = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { testCaseId: string; projectId: string; targetUrl?: string; browserType?: string; codegenScript?: string }) =>
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automationScripts'] });
      queryClient.invalidateQueries({ queryKey: ['scriptExecutions'] });
      queryClient.invalidateQueries({ queryKey: ['testCases'] });
    },
  });
};

export const useCancelExecution = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (executionId: string) => api.automation.cancelExecution(executionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automationScripts'] });
      queryClient.invalidateQueries({ queryKey: ['scriptExecutions'] });
    },
  });
};

export const useScriptExecutions = (scriptId?: string, limit = 20) => {
  return useQuery({
    queryKey: ['scriptExecutions', scriptId, limit],
    queryFn: () => api.automation.getExecutions(scriptId!, limit),
    enabled: !!scriptId,
    refetchInterval: (query) => {
      // Only poll while there's a running execution
      const execs = query.state.data;
      const hasRunning = execs?.some((e) => e.status === 'running' || e.status === 'queued');
      return hasRunning ? 3000 : false;
    },
  });
};

export const useScriptExecution = (executionId?: string) => {
  return useQuery({
    queryKey: ['scriptExecution', executionId],
    queryFn: () => api.automation.getExecution(executionId!),
    enabled: !!executionId,
  });
};

export const useTestCaseExecutions = (testCaseId?: string, limit = 20) => {
  return useQuery({
    queryKey: ['scriptExecutions', 'testCase', testCaseId, limit],
    queryFn: () => api.automation.getExecutionsByTestCase(testCaseId!, limit),
    enabled: !!testCaseId,
    refetchInterval: (query) => {
      const execs = query.state.data;
      const hasRunning = execs?.some((e) => e.status === 'running' || e.status === 'queued');
      return hasRunning ? 3000 : false;
    },
  });
};
