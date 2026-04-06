import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import type { SearchJiraIssuesParams, GeneratedTestCaseItem } from '@/services/modules/integrations.service';

export const useJiraConfig = () => {
  return useQuery({
    queryKey: ['jiraConfig'],
    queryFn: () => api.integrations.getJiraConfig(),
  });
};

export const useSaveJiraConfig = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { baseUrl: string; email: string; apiToken: string; defaultProjectKey?: string; syncEnabled?: boolean }) =>
      api.integrations.saveJiraConfig(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jiraConfig'] });
    },
  });
};

export const useDisconnectJira = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.integrations.disconnectJira(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jiraConfig'] });
    },
  });
};

export const useTestJiraConnection = () => {
  return useMutation({
    mutationFn: () => api.integrations.testJiraConnection(),
  });
};

export const useVerifyJiraCredentials = () => {
  return useMutation({
    mutationFn: (data: { baseUrl: string; email: string; apiToken: string; defaultProjectKey?: string; syncEnabled?: boolean }) =>
      api.integrations.verifyJiraCredentials(data),
  });
};

export const useJiraProjects = (enabled = true) => {
  return useQuery({
    queryKey: ['jiraProjects'],
    queryFn: () => api.integrations.getJiraProjects(),
    enabled,
  });
};

export const useSearchJiraIssues = (params: SearchJiraIssuesParams, enabled = true) => {
  return useQuery({
    queryKey: ['jiraIssues', params],
    queryFn: () => api.integrations.searchJiraIssues(params),
    enabled,
  });
};

export const useLinkJiraIssue = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ testCaseId, data }: { testCaseId: string; data: { jiraIssueKey: string; createSubtask?: boolean } }) =>
      api.integrations.linkJiraIssue(testCaseId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['testCases'] });
    },
  });
};

export const useUnlinkJiraIssue = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (testCaseId: string) => api.integrations.unlinkJiraIssue(testCaseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['testCases'] });
    },
  });
};

export const useGenerateFromJira = () => {
  return useMutation({
    mutationFn: (jiraIssueKey: string) => api.integrations.generateFromJira(jiraIssueKey),
  });
};

export const useSaveGeneratedTestCases = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { projectId: string; suiteId: string; jiraIssueKey: string; createSubtask?: boolean; testCases: GeneratedTestCaseItem[] }) =>
      api.integrations.saveGeneratedTestCases(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['testCases'] });
    },
  });
};

export const useAiAuditLogs = (limit = 50, offset = 0) => {
  return useQuery({
    queryKey: ['aiAuditLogs', limit, offset],
    queryFn: () => api.integrations.getAiAuditLogs(limit, offset),
  });
};
