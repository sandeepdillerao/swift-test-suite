import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type AIProvider = 'gemini' | 'openai' | 'anthropic';

export interface AIProviderConfig {
  provider: AIProvider;
  label: string;
  description: string;
  models: string[];
}

export const AI_PROVIDERS: AIProviderConfig[] = [
  {
    provider: 'gemini',
    label: 'Google Gemini',
    description: 'Google AI models including Gemini Pro and Flash',
    models: ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.0-flash'],
  },
  {
    provider: 'openai',
    label: 'OpenAI',
    description: 'GPT models for text generation and analysis',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'],
  },
  {
    provider: 'anthropic',
    label: 'Anthropic Claude',
    description: 'Claude models for safe and helpful AI',
    models: ['claude-sonnet-4-20250514', 'claude-3-5-haiku-20241022'],
  },
];

// Only stores UI preferences — API keys are stored encrypted on the backend only
interface AIConfigState {
  activeProvider: AIProvider;
  activeModel: string;
  enabledProviders: Record<AIProvider, boolean>;
  setActiveProvider: (provider: AIProvider) => void;
  setActiveModel: (model: string) => void;
  setProviderEnabled: (provider: AIProvider, enabled: boolean) => void;
  getEnabledProviders: () => AIProviderConfig[];
}

export const useAIConfigStore = create<AIConfigState>()(
  persist(
    (set, get) => ({
      activeProvider: 'gemini',
      activeModel: 'gemini-2.5-flash',
      enabledProviders: { gemini: true, openai: true, anthropic: true },
      setActiveProvider: (provider) => {
        const providerConfig = AI_PROVIDERS.find((p) => p.provider === provider);
        set({
          activeProvider: provider,
          activeModel: providerConfig?.models[0] || '',
        });
      },
      setActiveModel: (model) => set({ activeModel: model }),
      setProviderEnabled: (provider, enabled) => {
        const state = get();
        const next = { ...state.enabledProviders, [provider]: enabled };
        const updates: Partial<AIConfigState> = { enabledProviders: next };

        // If disabling the active provider, auto-switch to first enabled one
        if (!enabled && state.activeProvider === provider) {
          const fallback = AI_PROVIDERS.find((p) => next[p.provider] && p.provider !== provider);
          if (fallback) {
            updates.activeProvider = fallback.provider;
            updates.activeModel = fallback.models[0] || '';
          }
        }

        set(updates);
      },
      getEnabledProviders: () => {
        const { enabledProviders } = get();
        return AI_PROVIDERS.filter((p) => enabledProviders[p.provider]);
      },
    }),
    {
      name: 'ai-config-storage',
    }
  )
);
