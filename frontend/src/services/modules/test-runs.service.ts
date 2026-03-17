import { httpClient } from '../http-client';
import type { TestRun, TestRunCase, TestRunHistory } from '@/types';

export const testRunsService = {
  list: (params?: { projectId?: string }) =>
    httpClient
      .get<{ data: TestRun[] } | TestRun[]>('/test-runs', { params })
      .then((r) => {
        const payload = r.data as any;
        return (Array.isArray(payload) ? payload : payload.data) as TestRun[];
      }),

  get: (id: string) =>
    httpClient.get<TestRun>(`/test-runs/${id}`).then((r) => r.data),

  create: (data: Partial<TestRun>) =>
    httpClient.post<TestRun>('/test-runs', data).then((r) => r.data),

  update: (id: string, data: Partial<TestRun>) =>
    httpClient.patch<TestRun>(`/test-runs/${id}`, data).then((r) => r.data),

  delete: (id: string) =>
    httpClient.delete(`/test-runs/${id}`).then((r) => r.data),

  getHistory: (runId: string) =>
    httpClient
      .get<TestRunHistory[]>(`/test-runs/${runId}/history`)
      .then((r) => r.data),

  updateTestCase: (runId: string, testCaseId: string, data: Partial<TestRunCase>) =>
    httpClient
      .patch<TestRunCase>(`/test-runs/${runId}/cases/${testCaseId}`, data)
      .then((r) => r.data),
};
