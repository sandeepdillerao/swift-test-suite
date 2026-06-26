import { httpClient } from '../http-client';
import type { TestRun, TestRunCase, TestRunHistory, ExecutionProgress, SuiteAutomationSummary } from '@/types';

export const testRunsService = {
  // ── CRUD ───────────────────────────────────────────────────────────────
  list: (params?: { projectId?: string }) =>
    httpClient
      .get<{ data: TestRun[] } | TestRun[]>('/test-runs', { params })
      .then((r) => {
        const payload = r.data as any;
        return (Array.isArray(payload) ? payload : payload.data) as TestRun[];
      }),

  get: (id: string) =>
    httpClient.get<TestRun>(`/test-runs/${id}`).then((r) => r.data),

  create: (data: Record<string, any>) =>
    httpClient.post<TestRun>('/test-runs', data).then((r) => r.data),

  update: (id: string, data: Partial<TestRun>) =>
    httpClient.patch<TestRun>(`/test-runs/${id}`, data).then((r) => r.data),

  delete: (id: string) =>
    httpClient.delete(`/test-runs/${id}`).then((r) => r.data),

  // ── History ────────────────────────────────────────────────────────────
  getHistory: (runId: string) =>
    httpClient.get<TestRunHistory[]>(`/test-runs/${runId}/history`).then((r) => r.data),

  // ── Case update ────────────────────────────────────────────────────────
  updateTestCase: (runId: string, testCaseId: string, data: Partial<TestRunCase>) =>
    httpClient.patch<TestRunCase>(`/test-runs/${runId}/cases/${testCaseId}`, data).then((r) => r.data),

  // ── Automation execution ───────────────────────────────────────────────
  execute: (runId: string) =>
    httpClient.post<{ started: number }>(`/test-runs/${runId}/execute`).then((r) => r.data),

  getExecutionProgress: (runId: string) =>
    httpClient.get<ExecutionProgress>(`/test-runs/${runId}/execution-progress`).then((r) => r.data),

  cancelExecution: (runId: string) =>
    httpClient.post(`/test-runs/${runId}/cancel-execution`).then((r) => r.data),

  // ── Report ──────────────────────────────────────────────────────────────
  getReport: (runId: string) =>
    httpClient.get<any>(`/test-runs/${runId}/report`).then((r) => r.data),

  exportCsv: async (runId: string, runName: string) => {
    const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1';
    const { default: axios } = await import('axios');
    const { getState } = await import('@/stores/authStore');
    const token = getState().accessToken;
    const response = await axios.get(`${BASE}/test-runs/${runId}/export/csv`, {
      headers: { Authorization: `Bearer ${token}` },
      responseType: 'blob',
    });
    const url = URL.createObjectURL(new Blob([response.data], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${runName.replace(/[^a-zA-Z0-9]/g, '-')}-report.csv`;
    a.click();
    URL.revokeObjectURL(url);
  },

  // ── Suite automation summary ───────────────────────────────────────────
  getSuiteAutomationSummary: (suiteId: string) =>
    httpClient.get<SuiteAutomationSummary>(`/test-runs/suite/${suiteId}/automation-summary`).then((r) => r.data),
};
