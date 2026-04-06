import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import type { Release } from '@/types';

export const useReleases = (projectId?: string) => {
  return useQuery({
    queryKey: ['releases', { projectId }],
    queryFn: () => api.releases.list(projectId),
    enabled: !!projectId,
  });
};

export const useRelease = (id: string) => {
  return useQuery({
    queryKey: ['releases', id],
    queryFn: () => api.releases.get(id),
    enabled: !!id,
  });
};

export const useCreateRelease = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: Partial<Release>) => api.releases.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['releases'] });
    },
  });
};

export const useUpdateRelease = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Release> }) => 
      api.releases.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['releases'] });
    },
  });
};

export const useDeleteRelease = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => api.releases.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['releases'] });
    },
  });
};
