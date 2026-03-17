import { httpClient } from '../http-client';
import type { TestCase } from '@/types';

export const testCasesService = {
  list: (params?: { projectId?: string; suiteId?: string }) =>
    httpClient
      .get<TestCase[]>('/test-cases', { params })
      .then((r) => r.data),

  get: (id: string) =>
    httpClient.get<TestCase>(`/test-cases/${id}`).then((r) => r.data),

  create: (data: Partial<TestCase>) =>
    httpClient.post<TestCase>('/test-cases', data).then((r) => r.data),

  update: (id: string, data: Partial<TestCase>) =>
    httpClient.patch<TestCase>(`/test-cases/${id}`, data).then((r) => r.data),

  delete: (id: string) =>
    httpClient.delete(`/test-cases/${id}`).then((r) => r.data),
};
