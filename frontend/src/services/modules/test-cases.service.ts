import { httpClient } from '../http-client';
import type { TestCase } from '@/types';

export const testCasesService = {
  list: (params?: { projectId?: string; suiteId?: string }) =>
    httpClient
      .get<{ data: TestCase[] } | TestCase[]>('/test-cases', { params })
      .then((r) => {
        const payload = r.data as any;
        return (Array.isArray(payload) ? payload : payload.data) as TestCase[];
      }),

  get: (id: string) =>
    httpClient.get<TestCase>(`/test-cases/${id}`).then((r) => r.data),

  create: (data: Partial<TestCase>) =>
    httpClient.post<TestCase>('/test-cases', data).then((r) => r.data),

  update: (id: string, data: Partial<TestCase>) =>
    httpClient.patch<TestCase>(`/test-cases/${id}`, data).then((r) => r.data),

  delete: (id: string) =>
    httpClient.delete(`/test-cases/${id}`).then((r) => r.data),
};
