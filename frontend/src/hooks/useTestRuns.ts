import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { testRunsService } from '@/services/modules/test-runs.service';
import type { TestRun, TestRunCase } from '@/types';
import { toast } from 'sonner';

// ── Queries ──────────────────────────────────────────────────────────────────

export const useTestRuns = (projectId?: string) =>
  useQuery({
    queryKey: ['testRuns', { projectId }],
    queryFn: () => api.testRuns.list(projectId),
    enabled: !!projectId,
  });

export const useTestRun = (id: string) =>
  useQuery({
    queryKey: ['testRuns', id],
    queryFn: () => api.testRuns.get(id),
    enabled: !!id,
  });

export const useTestRunHistory = (runId: string) =>
  useQuery({
    queryKey: ['testRunHistory', runId],
    queryFn: () => api.testRuns.getHistory(runId),
    enabled: !!runId,
  });

export const useExecutionProgress = (runId: string | undefined, enabled = false) =>
  useQuery({
    queryKey: ['testRuns', runId, 'execution-progress'],
    queryFn: () => testRunsService.getExecutionProgress(runId!),
    enabled: !!runId && enabled,
    refetchInterval: 2000, // Poll every 2s while executing
  });

export const useTestRunReport = (runId: string | undefined) =>
  useQuery({
    queryKey: ['testRunReport', runId],
    queryFn: () => testRunsService.getReport(runId!),
    enabled: !!runId,
  });

export const useSuiteAutomationSummary = (suiteId: string | undefined) =>
  useQuery({
    queryKey: ['suiteAutomationSummary', suiteId],
    queryFn: () => testRunsService.getSuiteAutomationSummary(suiteId!),
    enabled: !!suiteId,
  });

// ── Mutations ────────────────────────────────────────────────────────────────

export const useCreateTestRun = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, any>) => api.testRuns.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['testRuns'] }),
  });
};

export const useUpdateTestRun = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<TestRun> }) => api.testRuns.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['testRuns'] }),
  });
};

export const useDeleteTestRun = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.testRuns.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['testRuns'] }),
  });
};

export const useUpdateTestRunCase = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ runId, testCaseId, data }: { runId: string; testCaseId: string; data: Partial<TestRunCase> }) =>
      api.testRuns.updateTestCase(runId, testCaseId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['testRuns'] });
      qc.invalidateQueries({ queryKey: ['testRunHistory'] });
    },
  });
};

// ── Execution mutations ──────────────────────────────────────────────────────

export const useExecuteTestRun = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (runId: string) => testRunsService.execute(runId),
    onSuccess: (result, runId) => {
      qc.invalidateQueries({ queryKey: ['testRuns', runId] });
      toast.success(`Started execution of ${result.started} automated test cases`);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to start execution'),
  });
};

export const useCancelTestRunExecution = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (runId: string) => testRunsService.cancelExecution(runId),
    onSuccess: (_, runId) => {
      qc.invalidateQueries({ queryKey: ['testRuns', runId] });
      toast.info('Execution cancelled');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to cancel execution'),
  });
};
