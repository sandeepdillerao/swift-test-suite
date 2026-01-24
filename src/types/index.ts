// Core Types for TestFlow TCM

export type TestStatus = 'passed' | 'failed' | 'blocked' | 'not_run' | 'in_progress';
export type Priority = 'critical' | 'high' | 'medium' | 'low';
export type TestType = 'manual' | 'automated';

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: 'admin' | 'qa_lead' | 'tester' | 'viewer';
  organizationId: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
  testCasesCount: number;
  passRate: number;
}

export interface TestSuite {
  id: string;
  name: string;
  description: string;
  projectId: string;
  parentId?: string;
  testCasesCount: number;
  createdAt: string;
}

export interface TestCase {
  id: string;
  title: string;
  description: string;
  preconditions?: string;
  steps: TestStep[];
  expectedResult: string;
  priority: Priority;
  type: TestType;
  status: TestStatus;
  suiteId: string;
  projectId: string;
  tags: string[];
  createdBy: string;
  assignedTo?: string;
  createdAt: string;
  updatedAt: string;
  lastRunAt?: string;
}

export interface TestStep {
  id: string;
  order: number;
  action: string;
  expectedResult: string;
}

export interface TestRun {
  id: string;
  name: string;
  projectId: string;
  status: 'active' | 'completed' | 'archived';
  testCases: TestRunCase[];
  createdBy: string;
  assignedTo?: string;
  startedAt: string;
  completedAt?: string;
  passRate: number;
}

export interface TestRunCase {
  id: string;
  testCaseId: string;
  testRunId: string;
  status: TestStatus;
  executedBy?: string;
  executedAt?: string;
  duration?: number;
  comment?: string;
  defects?: string[];
}

export interface DashboardStats {
  totalTestCases: number;
  passedTests: number;
  failedTests: number;
  blockedTests: number;
  notRunTests: number;
  passRate: number;
  activeTestRuns: number;
  recentActivity: ActivityItem[];
}

export interface ActivityItem {
  id: string;
  type: 'test_created' | 'test_executed' | 'test_updated' | 'run_started' | 'run_completed';
  description: string;
  userId: string;
  userName: string;
  timestamp: string;
}
