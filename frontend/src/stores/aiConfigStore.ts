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

interface AIConfigState {
  activeProvider: AIProvider;
  activeModel: string;
  apiKeys: Record<AIProvider, string>;
  setActiveProvider: (provider: AIProvider) => void;
  setActiveModel: (model: string) => void;
  setApiKey: (provider: AIProvider, key: string) => void;
  getActiveApiKey: () => string;
  isConfigured: () => boolean;
}

export const useAIConfigStore = create<AIConfigState>()(
  persist(
    (set, get) => ({
      activeProvider: 'gemini',
      activeModel: 'gemini-2.5-flash',
      apiKeys: {
        gemini: '',
        openai: '',
        anthropic: '',
      },
      setActiveProvider: (provider) => {
        const providerConfig = AI_PROVIDERS.find(p => p.provider === provider);
        set({
          activeProvider: provider,
          activeModel: providerConfig?.models[0] || '',
        });
      },
      setActiveModel: (model) => set({ activeModel: model }),
      setApiKey: (provider, key) =>
        set((state) => ({
          apiKeys: { ...state.apiKeys, [provider]: key },
        })),
      getActiveApiKey: () => {
        const state = get();
        return state.apiKeys[state.activeProvider];
      },
      isConfigured: () => {
        const state = get();
        return !!state.apiKeys[state.activeProvider];
      },
    }),
    {
      name: 'ai-config-storage',
    }
  )
);
