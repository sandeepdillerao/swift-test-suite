import { create } from 'zustand';
import type { JiraIssueDetail, GeneratedTestCaseItem } from '@/services/modules/integrations.service';

export interface GeneratedTestCase extends GeneratedTestCaseItem {
  id: string;
  selected: boolean;
  created: boolean;
}

interface AiGenerationState {
  jiraIssue: JiraIssueDetail | null;
  generatedTestCases: GeneratedTestCase[];
  projectId: string;
  suiteId: string;
  suites: { id: string; name: string }[];
  createSubtask: boolean;

  setGenerationResult: (
    jiraIssue: JiraIssueDetail,
    testCases: GeneratedTestCaseItem[],
    projectId: string,
    suiteId: string,
    suites: { id: string; name: string }[],
  ) => void;
  toggleSelect: (id: string) => void;
  selectAll: () => void;
  updateTestCase: (id: string, updates: Partial<GeneratedTestCaseItem>) => void;
  markCreated: (ids: string[]) => void;
  setSuiteId: (suiteId: string) => void;
  setCreateSubtask: (value: boolean) => void;
  clear: () => void;
}

export const useAiGenerationStore = create<AiGenerationState>((set, get) => ({
  jiraIssue: null,
  generatedTestCases: [],
  projectId: '',
  suiteId: '',
  suites: [],
  createSubtask: false,

  setGenerationResult: (jiraIssue, testCases, projectId, suiteId, suites) =>
    set({
      jiraIssue,
      generatedTestCases: testCases.map((tc, i) => ({
        ...tc,
        id: `gen-${i + 1}`,
        selected: true,
        created: false,
      })),
      projectId,
      suiteId,
      suites,
    }),

  toggleSelect: (id) =>
    set((s) => ({
      generatedTestCases: s.generatedTestCases.map((g) =>
        g.id === id ? { ...g, selected: !g.selected } : g,
      ),
    })),

  selectAll: () =>
    set((s) => ({
      generatedTestCases: s.generatedTestCases.map((g) =>
        g.created ? g : { ...g, selected: true },
      ),
    })),

  updateTestCase: (id, updates) =>
    set((s) => ({
      generatedTestCases: s.generatedTestCases.map((g) =>
        g.id === id ? { ...g, ...updates } : g,
      ),
    })),

  markCreated: (ids) =>
    set((s) => ({
      generatedTestCases: s.generatedTestCases.map((g) =>
        ids.includes(g.id) ? { ...g, created: true } : g,
      ),
    })),

  setSuiteId: (suiteId) => set({ suiteId }),
  setCreateSubtask: (createSubtask) => set({ createSubtask }),
  clear: () => set({ jiraIssue: null, generatedTestCases: [], projectId: '', suiteId: '', suites: [], createSubtask: false }),
}));
