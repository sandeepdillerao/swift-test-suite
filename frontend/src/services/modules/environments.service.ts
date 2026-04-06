import { httpClient } from '../http-client';
import type { ProjectEnvironment } from '@/types';

export const environmentsService = {
  list: (projectId: string) =>
    httpClient.get<ProjectEnvironment[]>(`/projects/${projectId}/environments`).then((r) => r.data),

  get: (projectId: string, id: string) =>
    httpClient.get<ProjectEnvironment>(`/projects/${projectId}/environments/${id}`).then((r) => r.data),

  create: (projectId: string, data: Partial<ProjectEnvironment>) =>
    httpClient.post<ProjectEnvironment>(`/projects/${projectId}/environments`, data).then((r) => r.data),

  update: (projectId: string, id: string, data: Partial<ProjectEnvironment>) =>
    httpClient.patch<ProjectEnvironment>(`/projects/${projectId}/environments/${id}`, data).then((r) => r.data),

  delete: (projectId: string, id: string) =>
    httpClient.delete(`/projects/${projectId}/environments/${id}`).then((r) => r.data),
};
