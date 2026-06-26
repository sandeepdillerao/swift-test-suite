import { httpClient } from '../http-client';
import type { PlaywrightConfig } from '@/types';

export interface NotificationSettings {
  email: boolean;
  testRunCompletion: boolean;
  failedTestAlerts: boolean;
  mentionAlerts: boolean;
}

export interface AISettings {
  activeProvider: string;
  activeModel: string;
  enabledProviders?: Record<string, boolean>;
  autoHealer?: boolean;
}

export interface OrganizationSettings {
  name?: string;
  website?: string;
  description?: string;
}

export interface ApiKeyStatus {
  provider: string;
  configured: boolean;
}

export interface AllSettings {
  notifications: NotificationSettings;
  ai: AISettings;
  playwrightConfig: PlaywrightConfig;
  organization: {
    name: string;
    website?: string;
    description?: string;
  };
  configuredProviders: ApiKeyStatus[];
}

export const settingsService = {
  getAll: () =>
    httpClient.get<AllSettings>('/settings').then((r) => r.data),

  updateNotifications: (data: Partial<NotificationSettings>) =>
    httpClient.patch<NotificationSettings>('/settings/notifications', data).then((r) => r.data),

  updateAi: (data: Partial<AISettings>) =>
    httpClient.patch<AISettings>('/settings/ai', data).then((r) => r.data),

  updatePlaywrightConfig: (data: Partial<PlaywrightConfig>) =>
    httpClient.patch<PlaywrightConfig>('/settings/playwright', data).then((r) => r.data),

  updateOrganization: (data: OrganizationSettings) =>
    httpClient.patch<{ message: string }>('/settings/organization', data).then((r) => r.data),

  getApiKeys: () =>
    httpClient.get<ApiKeyStatus[]>('/settings/api-keys').then((r) => r.data),

  setApiKey: (provider: string, key: string) =>
    httpClient.post<{ message: string }>(`/settings/api-keys/${provider}`, { key }).then((r) => r.data),

  deleteApiKey: (provider: string) =>
    httpClient.delete<{ message: string }>(`/settings/api-keys/${provider}`).then((r) => r.data),
};
