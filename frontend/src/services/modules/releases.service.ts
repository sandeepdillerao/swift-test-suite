import { httpClient } from '../http-client';
import type { Release } from '@/types';

export const releasesService = {
  list: (params?: { projectId?: string }) =>
    httpClient
      .get<Release[]>('/releases', { params })
      .then((r) => r.data),

  get: (id: string) =>
    httpClient.get<Release>(`/releases/${id}`).then((r) => r.data),

  create: (data: Partial<Release>) =>
    httpClient.post<Release>('/releases', data).then((r) => r.data),

  update: (id: string, data: Partial<Release>) =>
    httpClient.patch<Release>(`/releases/${id}`, data).then((r) => r.data),

  delete: (id: string) =>
    httpClient.delete(`/releases/${id}`).then((r) => r.data),
};
