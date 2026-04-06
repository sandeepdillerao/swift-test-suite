import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import type { ProjectEnvironment } from '@/types';
import { toast } from 'sonner';

const keys = {
  list: (projectId: string) => ['environments', projectId] as const,
  detail: (projectId: string, id: string) => ['environments', projectId, id] as const,
};

export function useEnvironments(projectId: string | undefined) {
  return useQuery({
    queryKey: keys.list(projectId!),
    queryFn: () => api.environments.list(projectId!),
    enabled: !!projectId,
  });
}

export function useEnvironment(projectId: string | undefined, id: string | undefined) {
  return useQuery({
    queryKey: keys.detail(projectId!, id!),
    queryFn: () => api.environments.get(projectId!, id!),
    enabled: !!projectId && !!id,
  });
}

export function useCreateEnvironment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, data }: { projectId: string; data: Partial<ProjectEnvironment> }) =>
      api.environments.create(projectId, data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: keys.list(vars.projectId) });
      toast.success('Environment created');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to create environment'),
  });
}

export function useUpdateEnvironment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, id, data }: { projectId: string; id: string; data: Partial<ProjectEnvironment> }) =>
      api.environments.update(projectId, id, data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: keys.list(vars.projectId) });
      toast.success('Environment updated');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to update environment'),
  });
}

export function useDeleteEnvironment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, id }: { projectId: string; id: string }) =>
      api.environments.delete(projectId, id),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: keys.list(vars.projectId) });
      toast.success('Environment deleted');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to delete environment'),
  });
}
