import { httpClient } from '../http-client';
import type { AutomationScript, ScriptExecution } from '@/types';

export const automationService = {
  // Script generation
  generate: (data: { testCaseId: string; projectId: string; targetUrl?: string; browserType?: string }) =>
    httpClient.post<AutomationScript>('/automation/scripts/generate', data).then((r) => r.data),

  importCodegen: (data: { testCaseId: string; projectId: string; rawScript: string; targetUrl?: string; browserType?: string }) =>
    httpClient.post<AutomationScript>('/automation/scripts/import-codegen', data).then((r) => r.data),

  // Script CRUD
  getByTestCase: (testCaseId: string) =>
    httpClient.get<AutomationScript[]>(`/automation/scripts/test-case/${testCaseId}`).then((r) => r.data),

  get: (id: string) =>
    httpClient.get<AutomationScript>(`/automation/scripts/${id}`).then((r) => r.data),

  update: (id: string, data: Partial<AutomationScript>) =>
    httpClient.patch<AutomationScript>(`/automation/scripts/${id}`, data).then((r) => r.data),

  delete: (id: string) =>
    httpClient.delete(`/automation/scripts/${id}`).then((r) => r.data),

  // Execution
  execute: (scriptId: string, data?: { browserType?: string; targetUrl?: string; enableHealing?: boolean; headless?: boolean }) =>
    httpClient.post<ScriptExecution>(`/automation/scripts/${scriptId}/execute`, data || {}).then((r) => r.data),

  getExecutions: (scriptId: string, limit = 20) =>
    httpClient.get<ScriptExecution[]>(`/automation/scripts/${scriptId}/executions`, { params: { limit } }).then((r) => r.data),

  getExecutionsByTestCase: (testCaseId: string, limit = 20) =>
    httpClient.get<ScriptExecution[]>(`/automation/executions/test-case/${testCaseId}`, { params: { limit } }).then((r) => r.data),

  getExecution: (id: string) =>
    httpClient.get<ScriptExecution>(`/automation/executions/${id}`).then((r) => r.data),
};
