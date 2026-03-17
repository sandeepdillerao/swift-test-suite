// Core Types for TestFlow TCM

export type TestStatus = 'passed' | 'failed' | 'blocked' | 'not_run' | 'in_progress';
export type Priority = 'critical' | 'high' | 'medium' | 'low';
export type TestType = 'manual' | 'automated';
export type ReleaseStatus = 'planning' | 'in_progress' | 'released' | 'archived';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  displayName: string;
  avatarUrl?: string | null;
  role: 'admin' | 'qa_lead' | 'tester' | 'viewer';
  organizationId: string;
  isActive: boolean;
  isEmailVerified: boolean;
  lastLoginAt?: string | null;
  createdAt: string;
  updatedAt: string;
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
  description: string | null;
  key: string;
  organizationId: string;
  isArchived: boolean;
  createdBy: string;
  settings: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
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
  tcId: string;
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
  jiraTicketId?: string;
  jiraTicketUrl?: string;
  jiraSubtaskId?: string;
  jiraSubtaskUrl?: string;
  jiraSyncStatus?: 'synced' | 'pending' | 'error' | 'not_linked';
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

export interface Release {
  id: string;
  name: string;
  version: string;
  description: string;
  projectId: string;
  status: ReleaseStatus;
  plannedDate?: string;
  releasedDate?: string;
  testRunIds: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface TestRun {
  id: string;
  name: string;
  description?: string;
  projectId: string;
  releaseId?: string;
  status: 'active' | 'completed' | 'archived';
  testCases: TestRunCase[];
  createdBy: string;
  assignedTo?: string;
  startedAt: string;
  completedAt?: string;
  passRate: number;
  environment?: string;
  buildNumber?: string;
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
  actualResult?: string;
}

export interface TestRunHistory {
  id: string;
  testRunId: string;
  testCaseId: string;
  status: TestStatus;
  executedBy: string;
  executedAt: string;
  comment?: string;
  duration?: number;
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

// Export format types
export interface TestCaseExport {
  id: string;
  title: string;
  description: string;
  preconditions: string;
  steps: string;
  expectedResult: string;
  priority: string;
  type: string;
  suite: string;
  tags: string;
}
