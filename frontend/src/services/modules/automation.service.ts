import { httpClient } from '../http-client';
import type { AutomationScript, ScriptExecution } from '@/types';

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1';

export interface CodegenSessionStatus {
  sessionId: string;
  status: 'recording' | 'completed' | 'failed' | 'cancelled';
  recordedScript: string | null;
  error: string | null;
  startedAt: string;
  completedAt: string | null;
}

export const automationService = {
  // ─── Codegen Recording ──────────────────────────────────────────────────
  startCodegen: (data: { testCaseId: string; projectId: string; targetUrl?: string; browserType?: string }) =>
    httpClient.post<{ sessionId: string; status: string }>('/automation/codegen/start', data).then((r) => r.data),

  getCodegenStatus: (sessionId: string) =>
    httpClient.get<CodegenSessionStatus>(`/automation/codegen/${sessionId}/status`).then((r) => r.data),

  stopCodegen: (sessionId: string) =>
    httpClient.post<{ status: string }>(`/automation/codegen/${sessionId}/stop`).then((r) => r.data),

  completeCodegen: (sessionId: string) =>
    httpClient.post<AutomationScript>(`/automation/codegen/${sessionId}/complete`).then((r) => r.data),

  saveCodegenDirect: (sessionId: string) =>
    httpClient.post<AutomationScript>(`/automation/codegen/${sessionId}/save-direct`).then((r) => r.data),

  // ─── Script Generation ──────────────────────────────────────────────────
  generate: (data: {
    testCaseId: string; projectId: string; targetUrl?: string; browserType?: string;
    codegenScript?: string; variables?: Record<string, string>; authConfigs?: { label: string; username: string; password: string; role?: string }[];
  }) =>
    httpClient.post<AutomationScript>('/automation/scripts/generate', data).then((r) => r.data),

  importCodegen: (data: {
    testCaseId: string; projectId: string; rawScript: string; targetUrl?: string; browserType?: string;
    variables?: Record<string, string>; authConfigs?: { label: string; username: string; password: string; role?: string }[];
  }) =>
    httpClient.post<AutomationScript>('/automation/scripts/import-codegen', data).then((r) => r.data),

  // ─── Script CRUD ────────────────────────────────────────────────────────
  getByTestCase: (testCaseId: string) =>
    httpClient.get<AutomationScript[]>(`/automation/scripts/test-case/${testCaseId}`).then((r) => r.data),

  get: (id: string) =>
    httpClient.get<AutomationScript>(`/automation/scripts/${id}`).then((r) => r.data),

  update: (id: string, data: Partial<AutomationScript>) =>
    httpClient.patch<AutomationScript>(`/automation/scripts/${id}`, data).then((r) => r.data),

  delete: (id: string) =>
    httpClient.delete(`/automation/scripts/${id}`).then((r) => r.data),

  // ─── Execution ──────────────────────────────────────────────────────────
  execute: (scriptId: string, data?: { browserType?: string; targetUrl?: string; enableHealing?: boolean; headless?: boolean; variables?: Record<string, string> }) =>
    httpClient.post<ScriptExecution>(`/automation/scripts/${scriptId}/execute`, data || {}).then((r) => r.data),

  cancelExecution: (executionId: string) =>
    httpClient.post(`/automation/executions/${executionId}/cancel`).then((r) => r.data),

  getExecutions: (scriptId: string, limit = 20) =>
    httpClient.get<ScriptExecution[]>(`/automation/scripts/${scriptId}/executions`, { params: { limit } }).then((r) => r.data),

  getExecutionsByTestCase: (testCaseId: string, limit = 20) =>
    httpClient.get<ScriptExecution[]>(`/automation/executions/test-case/${testCaseId}`, { params: { limit } }).then((r) => r.data),

  getExecution: (id: string) =>
    httpClient.get<ScriptExecution>(`/automation/executions/${id}`).then((r) => r.data),

  // ─── Artifacts ──────────────────────────────────────────────────────────
  getArtifactUrl: (executionId: string, filename: string) =>
    `${BASE}/automation/executions/${executionId}/artifacts/${filename}`,
};
