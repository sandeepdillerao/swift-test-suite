/**
 * api — single import point used by all hooks.
 *
 * Each namespace delegates to its dedicated service module which calls the
 * real backend via the shared httpClient (JWT interceptor, token refresh,
 * envelope unwrapping, RFC 7807 error surfacing).
 *
 * Hook files don't need to change — they still do `import { api } from '@/services/api'`.
 */

import { authService } from './modules/auth.service';
import { usersService } from './modules/users.service';
import { organizationsService } from './modules/organizations.service';
import { projectsService } from './modules/projects.service';
import { testSuitesService } from './modules/test-suites.service';
import { testCasesService } from './modules/test-cases.service';
import { testRunsService } from './modules/test-runs.service';
import { releasesService } from './modules/releases.service';
import { dashboardService } from './modules/dashboard.service';
import { settingsService } from './modules/settings.service';
import { integrationsService } from './modules/integrations.service';
import { automationService } from './modules/automation.service';
import type { Project, TestCase, TestRun, TestRunCase, Release } from '@/types';

export const api = {
  // ── Auth ────────────────────────────────────────────────────────────────────
  auth: {
    login: (email: string, password: string) => authService.login(email, password),
    logout: (refreshToken: string) => authService.logout(refreshToken),
    getCurrentUser: () => authService.me(),
    register: authService.register,
    refresh: authService.refresh,
    forgotPassword: authService.forgotPassword,
    resetPassword: authService.resetPassword,
    verifyEmail: authService.verifyEmail,
  },

  // ── Organization ─────────────────────────────────────────────────────────────
  organization: {
    get: () => organizationsService.getMy(),
    update: organizationsService.updateMy,
    getMembers: organizationsService.getMembers,
    getStats: organizationsService.getStats,
  },

  // ── Projects ─────────────────────────────────────────────────────────────────
  projects: {
    list: () => projectsService.list(),
    get: (id: string) => projectsService.get(id),
    create: (data: Partial<Project>) => projectsService.create(data),
    update: (id: string, data: Partial<Project>) => projectsService.update(id, data),
    delete: (id: string) => projectsService.delete(id),
  },

  // ── Test Suites ───────────────────────────────────────────────────────────────
  testSuites: {
    list: (projectId: string) => testSuitesService.list(projectId),
    get: (id: string) => testSuitesService.get(id),
    create: testSuitesService.create,
    update: testSuitesService.update,
    delete: testSuitesService.delete,
  },

  // ── Test Cases ────────────────────────────────────────────────────────────────
  testCases: {
    list: (projectId?: string, suiteId?: string) =>
      testCasesService.list({ projectId, suiteId }),
    get: (id: string) => testCasesService.get(id),
    create: (data: Partial<TestCase>) => testCasesService.create(data),
    update: (id: string, data: Partial<TestCase>) => testCasesService.update(id, data),
    delete: (id: string) => testCasesService.delete(id),
  },

  // ── Test Runs ─────────────────────────────────────────────────────────────────
  testRuns: {
    list: (projectId?: string) => testRunsService.list({ projectId }),
    get: (id: string) => testRunsService.get(id),
    create: (data: Record<string, any>) => testRunsService.create(data),
    update: (id: string, data: Partial<TestRun>) => testRunsService.update(id, data),
    delete: (id: string) => testRunsService.delete(id),
    getHistory: (runId: string) => testRunsService.getHistory(runId),
    updateTestCase: (runId: string, testCaseId: string, data: Partial<TestRunCase>) =>
      testRunsService.updateTestCase(runId, testCaseId, data),
  },

  // ── Releases ──────────────────────────────────────────────────────────────────
  releases: {
    list: (projectId?: string) => releasesService.list({ projectId }),
    get: (id: string) => releasesService.get(id),
    create: (data: Partial<Release>) => releasesService.create(data),
    update: (id: string, data: Partial<Release>) => releasesService.update(id, data),
    delete: (id: string) => releasesService.delete(id),
  },

  // ── Dashboard ─────────────────────────────────────────────────────────────────
  dashboard: {
    getStats: (projectId?: string) => dashboardService.getStats({ projectId }),
  },

  // ── Settings ──────────────────────────────────────────────────────────────────
  settings: {
    getAll: () => settingsService.getAll(),
    updateNotifications: settingsService.updateNotifications,
    updateAi: settingsService.updateAi,
    updateOrganization: settingsService.updateOrganization,
    getApiKeys: () => settingsService.getApiKeys(),
    setApiKey: (provider: string, key: string) => settingsService.setApiKey(provider, key),
    deleteApiKey: (provider: string) => settingsService.deleteApiKey(provider),
  },

  // ── Integrations ─────────────────────────────────────────────────────────────
  integrations: {
    getJiraConfig: () => integrationsService.getJiraConfig(),
    saveJiraConfig: integrationsService.saveJiraConfig,
    disconnectJira: () => integrationsService.disconnectJira(),
    testJiraConnection: () => integrationsService.testJiraConnection(),
    verifyJiraCredentials: integrationsService.verifyJiraCredentials,
    getJiraProjects: integrationsService.getJiraProjects,
    searchJiraIssues: integrationsService.searchJiraIssues,
    getJiraIssue: integrationsService.getJiraIssue,
    linkJiraIssue: integrationsService.linkJiraIssue,
    unlinkJiraIssue: integrationsService.unlinkJiraIssue,
    syncJiraStatus: integrationsService.syncJiraStatus,
    generateFromJira: integrationsService.generateFromJira,
    saveGeneratedTestCases: integrationsService.saveGeneratedTestCases,
  },

  // ── Automation ──────────────────────────────────────────────────────────────
  automation: {
    generate: automationService.generate,
    importCodegen: automationService.importCodegen,
    getByTestCase: (testCaseId: string) => automationService.getByTestCase(testCaseId),
    get: (id: string) => automationService.get(id),
    update: automationService.update,
    delete: automationService.delete,
    execute: automationService.execute,
    getExecutions: automationService.getExecutions,
    getExecutionsByTestCase: automationService.getExecutionsByTestCase,
    getExecution: automationService.getExecution,
  },

  // ── Users ─────────────────────────────────────────────────────────────────────
  users: {
    list: (params?: Parameters<typeof usersService.list>[0]) => usersService.list(params),
    get: (id: string) => usersService.get(id),
    invite: usersService.invite,
    acceptInvite: usersService.acceptInvite,
    updateProfile: usersService.updateProfile,
    changePassword: usersService.changePassword,
    activate: usersService.activate,
    deactivate: usersService.deactivate,
    updateRole: usersService.updateRole,
    delete: usersService.delete,
  },
};

// Named re-exports for callers who prefer direct service imports
export { authService } from './modules/auth.service';
export { usersService } from './modules/users.service';
export { organizationsService } from './modules/organizations.service';
export { projectsService } from './modules/projects.service';
export { testSuitesService } from './modules/test-suites.service';
export { testCasesService } from './modules/test-cases.service';
export { testRunsService } from './modules/test-runs.service';
export { releasesService } from './modules/releases.service';
export { dashboardService } from './modules/dashboard.service';
export { settingsService } from './modules/settings.service';
export { integrationsService } from './modules/integrations.service';
export { automationService } from './modules/automation.service';
export { httpClient } from './http-client';
export type { ApiError } from './http-client';
