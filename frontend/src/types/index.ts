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
  roleId?: string | null;
  roleEntity?: Role | null;
  organizationId: string;
  isActive: boolean;
  isEmailVerified: boolean;
  lastLoginAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── RBAC Types ──────────────────────────────────────────────────────────────

export interface Permission {
  id: string;
  code: string;
  category: string;
  description: string | null;
}

export interface Role {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  description: string | null;
  isSystem: boolean;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectMember {
  id: string;
  projectId: string;
  userId: string;
  roleId: string;
  addedBy: string | null;
  user?: User;
  role?: Role;
  createdAt: string;
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
  testCase?: TestCase;
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

// Automation types
export type ScriptStatus = 'draft' | 'ready' | 'running' | 'passed' | 'failed' | 'error';
export type ExecutionStatus = 'queued' | 'running' | 'passed' | 'failed' | 'error' | 'healed';
export type BrowserType = 'chromium' | 'firefox' | 'webkit';
export type ScriptSource = 'ai_generated' | 'codegen' | 'manual';

export interface AutomationScript {
  id: string;
  testCaseId: string;
  projectId: string;
  name: string;
  rawScript: string | null;
  cleanScript: string | null;
  healedScript: string | null;
  activeScript: string | null;
  targetUrl: string | null;
  status: ScriptStatus;
  source: ScriptSource;
  browserType: BrowserType;
  stabilityScore: number;
  healingAttempts: number;
  maxHealingAttempts: number;
  totalRuns: number;
  passedRuns: number;
  lastRunAt: string | null;
  lastRunDuration: number | null;
  metadata: Record<string, any>;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ScriptExecution {
  id: string;
  scriptId: string;
  testCaseId: string;
  status: ExecutionStatus;
  startedAt: string | null;
  completedAt: string | null;
  duration: number | null;
  logs: string | null;
  errorMessage: string | null;
  screenshots: string[];
  videoPath: string | null;
  healingApplied: boolean;
  healingDetails: Record<string, any> | null;
  browserType: BrowserType;
  scriptSnapshot: string | null;
  executedBy: string;
  createdAt: string;
}

export interface StructuredLogs {
  summary: {
    passed: boolean;
    duration: string;
    totalTests: number;
    passedTests: number;
    failedTests: number;
    skippedTests: number;
  };
  steps: Array<{
    name: string;
    status: 'passed' | 'failed' | 'skipped';
    duration: string;
    error?: string;
    snippet?: string;
    location?: string;
    actions?: Array<{
      title: string;
      status: 'passed' | 'failed';
      duration: string;
      error?: string;
    }>;
  }>;
  error: string | null;
  stdout: string | null;
  stderr: string | null;
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
