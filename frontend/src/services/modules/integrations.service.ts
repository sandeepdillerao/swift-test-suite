import { httpClient } from '../http-client';

export interface JiraConfigResponse {
  connected: boolean;
  baseUrl?: string;
  email?: string;
  maskedToken?: string;
  defaultProjectKey?: string;
  syncEnabled?: boolean;
  connectedAt?: string;
}

export interface JiraProject {
  id: string;
  key: string;
  name: string;
  avatarUrl?: string;
  projectTypeKey?: string;
}

export interface JiraIssue {
  key: string;
  summary: string;
  status?: string;
  issueType?: string;
  priority?: string;
  assignee?: string;
  updated?: string;
}

export interface JiraIssueDetail extends JiraIssue {
  description: string;
  labels: string[];
}

export interface SearchJiraIssuesParams {
  projectKey?: string;
  searchText?: string;
  issueType?: 'story' | 'task' | 'bug' | 'epic';
  status?: string;
  page?: number;
  limit?: number;
}

export interface GeneratedTestCaseItem {
  title: string;
  description: string;
  preconditions: string;
  steps: { id: string; order: number; action: string; expectedResult: string }[];
  expectedResult: string;
  priority: string;
  type: string;
  tags: string[];
}

export interface GenerateFromJiraResponse {
  jiraIssue: JiraIssueDetail;
  generatedTestCases: GeneratedTestCaseItem[];
}

export interface AiAuditLog {
  id: string;
  userId: string;
  orgId: string;
  provider: string;
  model: string;
  jiraIssueKey: string | null;
  inputTokens: number;
  outputTokens: number;
  responseTimeMs: number;
  testCasesGenerated: number;
  success: boolean;
  errorMessage: string | null;
  createdAt: string;
}

export const integrationsService = {
  // ── Jira Config ─────────────────────────────────────────────────────────
  getJiraConfig: () =>
    httpClient.get<JiraConfigResponse>('/integrations/jira/config').then((r) => r.data),

  saveJiraConfig: (data: { baseUrl: string; email: string; apiToken: string; defaultProjectKey?: string; syncEnabled?: boolean }) =>
    httpClient.post<JiraConfigResponse>('/integrations/jira/config', data).then((r) => r.data),

  disconnectJira: () =>
    httpClient.delete<{ connected: false }>('/integrations/jira/config').then((r) => r.data),

  testJiraConnection: () =>
    httpClient.post<{ success: boolean; user: { displayName: string; emailAddress: string } }>('/integrations/jira/test-connection').then((r) => r.data),

  verifyJiraCredentials: (data: { baseUrl: string; email: string; apiToken: string; defaultProjectKey?: string; syncEnabled?: boolean }) =>
    httpClient.post<{ success: boolean; user: { displayName: string; emailAddress: string } }>('/integrations/jira/verify-credentials', data).then((r) => r.data),

  // ── Jira Data ───────────────────────────────────────────────────────────
  getJiraProjects: (page = 1, limit = 50) =>
    httpClient.get<{ projects: JiraProject[]; total: number }>(`/integrations/jira/projects?page=${page}&limit=${limit}`).then((r) => r.data),

  searchJiraIssues: (params: SearchJiraIssuesParams) => {
    const searchParams = new URLSearchParams();
    if (params.projectKey) searchParams.set('projectKey', params.projectKey);
    if (params.searchText) searchParams.set('searchText', params.searchText);
    if (params.issueType) searchParams.set('issueType', params.issueType);
    if (params.status) searchParams.set('status', params.status);
    if (params.page) searchParams.set('page', String(params.page));
    if (params.limit) searchParams.set('limit', String(params.limit));
    return httpClient.get<{ issues: JiraIssue[]; total: number }>(`/integrations/jira/issues?${searchParams}`).then((r) => r.data);
  },

  getJiraIssue: (issueKey: string) =>
    httpClient.get<JiraIssueDetail>(`/integrations/jira/issues/${issueKey}`).then((r) => r.data),

  // ── Linking ─────────────────────────────────────────────────────────────
  linkJiraIssue: (testCaseId: string, data: { jiraIssueKey: string; createSubtask?: boolean }) =>
    httpClient.post(`/integrations/jira/link/${testCaseId}`, data).then((r) => r.data),

  unlinkJiraIssue: (testCaseId: string) =>
    httpClient.delete(`/integrations/jira/link/${testCaseId}`).then((r) => r.data),

  syncJiraStatus: (testCaseId: string, status: string) =>
    httpClient.patch(`/integrations/jira/sync-status/${testCaseId}`, { status }).then((r) => r.data),

  // ── AI Generation ───────────────────────────────────────────────────────
  generateFromJira: (jiraIssueKey: string) =>
    httpClient.post<GenerateFromJiraResponse>('/integrations/ai/generate-from-jira', { jiraIssueKey }).then((r) => r.data),

  saveGeneratedTestCases: (data: { projectId: string; suiteId: string; jiraIssueKey: string; createSubtask?: boolean; testCases: GeneratedTestCaseItem[] }) =>
    httpClient.post('/integrations/ai/save-generated', data).then((r) => r.data),

  // ── AI Audit Logs ──────────────────────────────────────────────────────
  getAiAuditLogs: (limit = 50, offset = 0) =>
    httpClient.get<{ logs: AiAuditLog[]; total: number }>(`/integrations/ai/audit-logs?limit=${limit}&offset=${offset}`).then((r) => r.data),
};
