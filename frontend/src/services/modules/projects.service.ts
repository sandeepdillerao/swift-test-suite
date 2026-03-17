import { httpClient } from '../http-client';
import type { Project } from '@/types';

export const projectsService = {
  list: () =>
    httpClient.get<Project[]>('/projects').then((r) => r.data),

  get: (id: string) =>
    httpClient.get<Project>(`/projects/${id}`).then((r) => r.data),

  create: (data: Partial<Project>) =>
    httpClient.post<Project>('/projects', data).then((r) => r.data),

  update: (id: string, data: Partial<Project>) =>
    httpClient.patch<Project>(`/projects/${id}`, data).then((r) => r.data),

  delete: (id: string) =>
    httpClient.delete(`/projects/${id}`).then((r) => r.data),
};
