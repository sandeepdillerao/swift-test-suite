import { 
  mockUsers, mockProjects, mockTestSuites, mockTestCases, 
  mockTestRuns, mockDashboardStats, mockOrganization, delay 
} from '@/lib/mock-data';
import type { 
  User, Project, TestSuite, TestCase, TestRun, DashboardStats, Organization 
} from '@/types';

// Simulated API delay (ms)
const API_DELAY = 300;

// API Service with mock implementations
export const api = {
  // Auth
  auth: {
    login: async (email: string, password: string): Promise<User> => {
      await delay(API_DELAY);
      const user = mockUsers.find(u => u.email === email);
      if (!user) throw new Error('Invalid credentials');
      return user;
    },
    logout: async (): Promise<void> => {
      await delay(API_DELAY);
    },
    getCurrentUser: async (): Promise<User | null> => {
      await delay(API_DELAY);
      return mockUsers[0]; // Return first user as logged in
    },
  },

  // Organization
  organization: {
    get: async (): Promise<Organization> => {
      await delay(API_DELAY);
      return mockOrganization;
    },
  },

  // Projects
  projects: {
    list: async (): Promise<Project[]> => {
      await delay(API_DELAY);
      return mockProjects;
    },
    get: async (id: string): Promise<Project | undefined> => {
      await delay(API_DELAY);
      return mockProjects.find(p => p.id === id);
    },
    create: async (data: Partial<Project>): Promise<Project> => {
      await delay(API_DELAY);
      const newProject: Project = {
        id: String(mockProjects.length + 1),
        name: data.name || 'New Project',
        description: data.description || '',
        organizationId: '1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        testCasesCount: 0,
        passRate: 0,
      };
      return newProject;
    },
  },

  // Test Suites
  testSuites: {
    list: async (projectId: string): Promise<TestSuite[]> => {
      await delay(API_DELAY);
      return mockTestSuites.filter(s => s.projectId === projectId);
    },
    get: async (id: string): Promise<TestSuite | undefined> => {
      await delay(API_DELAY);
      return mockTestSuites.find(s => s.id === id);
    },
  },

  // Test Cases
  testCases: {
    list: async (projectId?: string, suiteId?: string): Promise<TestCase[]> => {
      await delay(API_DELAY);
      let cases = [...mockTestCases];
      if (projectId) cases = cases.filter(tc => tc.projectId === projectId);
      if (suiteId) cases = cases.filter(tc => tc.suiteId === suiteId);
      return cases;
    },
    get: async (id: string): Promise<TestCase | undefined> => {
      await delay(API_DELAY);
      return mockTestCases.find(tc => tc.id === id);
    },
    create: async (data: Partial<TestCase>): Promise<TestCase> => {
      await delay(API_DELAY);
      const newCase: TestCase = {
        id: `TC-${String(mockTestCases.length + 1).padStart(3, '0')}`,
        title: data.title || 'New Test Case',
        description: data.description || '',
        steps: data.steps || [],
        expectedResult: data.expectedResult || '',
        priority: data.priority || 'medium',
        type: data.type || 'manual',
        status: 'not_run',
        suiteId: data.suiteId || '1',
        projectId: data.projectId || '1',
        tags: data.tags || [],
        createdBy: '1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      return newCase;
    },
    update: async (id: string, data: Partial<TestCase>): Promise<TestCase> => {
      await delay(API_DELAY);
      const existing = mockTestCases.find(tc => tc.id === id);
      if (!existing) throw new Error('Test case not found');
      return { ...existing, ...data, updatedAt: new Date().toISOString() };
    },
    delete: async (id: string): Promise<void> => {
      await delay(API_DELAY);
    },
  },

  // Test Runs
  testRuns: {
    list: async (projectId?: string): Promise<TestRun[]> => {
      await delay(API_DELAY);
      if (projectId) return mockTestRuns.filter(r => r.projectId === projectId);
      return mockTestRuns;
    },
    get: async (id: string): Promise<TestRun | undefined> => {
      await delay(API_DELAY);
      return mockTestRuns.find(r => r.id === id);
    },
    create: async (data: Partial<TestRun>): Promise<TestRun> => {
      await delay(API_DELAY);
      const newRun: TestRun = {
        id: String(mockTestRuns.length + 1),
        name: data.name || 'New Test Run',
        projectId: data.projectId || '1',
        status: 'active',
        testCases: [],
        createdBy: '1',
        startedAt: new Date().toISOString(),
        passRate: 0,
      };
      return newRun;
    },
  },

  // Dashboard
  dashboard: {
    getStats: async (projectId?: string): Promise<DashboardStats> => {
      await delay(API_DELAY);
      return mockDashboardStats;
    },
  },

  // Users
  users: {
    list: async (): Promise<User[]> => {
      await delay(API_DELAY);
      return mockUsers;
    },
  },
};
