import { httpClient } from '../http-client';
import type { TestSuite } from '@/types';

export const testSuitesService = {
  list: (projectId: string) =>
    httpClient
      .get<TestSuite[]>('/test-suites', { params: { projectId } })
      .then((r) => r.data),

  get: (id: string) =>
    httpClient.get<TestSuite>(`/test-suites/${id}`).then((r) => r.data),

  create: (data: Partial<TestSuite>) =>
    httpClient.post<TestSuite>('/test-suites', data).then((r) => r.data),

  update: (id: string, data: Partial<TestSuite>) =>
    httpClient.patch<TestSuite>(`/test-suites/${id}`, data).then((r) => r.data),

  delete: (id: string) =>
    httpClient.delete(`/test-suites/${id}`).then((r) => r.data),
};
