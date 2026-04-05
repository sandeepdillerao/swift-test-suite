export enum ScriptStatus {
  DRAFT = 'draft',
  READY = 'ready',
  RUNNING = 'running',
  PASSED = 'passed',
  FAILED = 'failed',
  ERROR = 'error',
}

export enum ExecutionStatus {
  QUEUED = 'queued',
  RUNNING = 'running',
  PASSED = 'passed',
  FAILED = 'failed',
  ERROR = 'error',
  HEALED = 'healed',
}

export enum BrowserType {
  CHROMIUM = 'chromium',
  FIREFOX = 'firefox',
  WEBKIT = 'webkit',
}

export enum ScriptSource {
  AI_GENERATED = 'ai_generated',
  CODEGEN = 'codegen',
  MANUAL = 'manual',
}
