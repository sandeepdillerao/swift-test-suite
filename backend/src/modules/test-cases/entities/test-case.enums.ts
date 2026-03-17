export enum TestStatus {
  PASSED = 'passed',
  FAILED = 'failed',
  BLOCKED = 'blocked',
  NOT_RUN = 'not_run',
  IN_PROGRESS = 'in_progress',
}

export enum Priority {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

export enum TestType {
  MANUAL = 'manual',
  AUTOMATED = 'automated',
}

export enum JiraSyncStatus {
  SYNCED = 'synced',
  PENDING = 'pending',
  ERROR = 'error',
  NOT_LINKED = 'not_linked',
}
