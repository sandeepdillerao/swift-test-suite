import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ChildProcess, spawn } from 'child_process';
import { v4 as uuidv4 } from 'uuid';
import { AutomationScript } from './entities/automation-script.entity';
import { ScriptExecution } from './entities/script-execution.entity';
import { ScriptStatus, ExecutionStatus, BrowserType, ScriptSource } from './entities/automation.enums';
import { TestCase } from '@/modules/test-cases/entities/test-case.entity';
import { TestStatus, TestType } from '@/modules/test-cases/entities/test-case.enums';
import { User } from '@/modules/users/entities/user.entity';
import { SettingsService, AiProvider } from '@/modules/settings/settings.service';
import { AiAuditService } from '@/common/modules/ai-audit';
import { GenerateScriptDto, ImportCodegenScriptDto } from './dto/generate-script.dto';
import { UpdateScriptDto } from './dto/update-script.dto';
import { ExecuteScriptDto } from './dto/execute-script.dto';
import { StartCodegenDto } from './dto/codegen-session.dto';

/** Codegen session tracked in memory */
interface CodegenSession {
  id: string;
  userId: string;
  testCaseId: string;
  projectId: string;
  targetUrl?: string;
  browserType: BrowserType;
  status: 'recording' | 'completed' | 'failed' | 'cancelled';
  recordedScript: string | null;
  outputFile: string;
  process: ChildProcess | null;
  startedAt: Date;
  completedAt: Date | null;
  error: string | null;
}

/** Persistent storage root for execution artifacts */
const ARTIFACTS_ROOT = path.resolve(process.cwd(), 'uploads', 'automation');

@Injectable()
export class AutomationService {
  private readonly logger = new Logger(AutomationService.name);
  private readonly codegenSessions = new Map<string, CodegenSession>();
  /** Track running Playwright processes by execution ID for cancellation */
  private readonly runningProcesses = new Map<string, ChildProcess>();

  constructor(
    @InjectRepository(AutomationScript) private readonly scriptRepo: Repository<AutomationScript>,
    @InjectRepository(ScriptExecution) private readonly executionRepo: Repository<ScriptExecution>,
    @InjectRepository(TestCase) private readonly testCaseRepo: Repository<TestCase>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    private readonly settingsService: SettingsService,
    private readonly httpService: HttpService,
    private readonly aiAuditService: AiAuditService,
  ) {
    // Ensure artifacts directory exists on startup
    fs.mkdirSync(ARTIFACTS_ROOT, { recursive: true });
  }

  // ─── Codegen Session Management ───────────────────────────────────────────

  async startCodegen(userId: string, dto: StartCodegenDto): Promise<{ sessionId: string; status: string }> {
    const testCase = await this.testCaseRepo.findOne({ where: { id: dto.testCaseId } });
    if (!testCase) throw new NotFoundException('Test case not found');

    const sessionId = uuidv4();
    const outputFile = path.join(os.tmpdir(), `codegen-${sessionId}.ts`);

    // Resolve playwright binary
    const backendRoot = path.resolve(__dirname, '..', '..', '..');
    let nodeModulesPath = path.join(backendRoot, 'node_modules');
    if (!fs.existsSync(path.join(nodeModulesPath, '@playwright', 'test'))) {
      const workspaceRoot = path.resolve(backendRoot, '..');
      if (fs.existsSync(path.join(workspaceRoot, 'node_modules', '@playwright', 'test'))) {
        nodeModulesPath = path.join(workspaceRoot, 'node_modules');
      }
    }
    const playwrightBin = path.join(nodeModulesPath, '.bin', 'playwright');

    const url = dto.targetUrl || 'http://localhost:3000';
    const browser = dto.browserType || BrowserType.CHROMIUM;

    const session: CodegenSession = {
      id: sessionId,
      userId,
      testCaseId: dto.testCaseId,
      projectId: dto.projectId,
      targetUrl: dto.targetUrl,
      browserType: browser,
      status: 'recording',
      recordedScript: null,
      outputFile,
      process: null,
      startedAt: new Date(),
      completedAt: null,
      error: null,
    };

    // Spawn playwright codegen — opens a browser on the user's machine
    const args = ['codegen', '--output', outputFile, '--browser', browser, url];
    this.logger.log(`Starting codegen session ${sessionId}: ${playwrightBin} ${args.join(' ')}`);

    const proc = spawn(playwrightBin, args, {
      shell: true,
      env: { ...process.env, NODE_PATH: nodeModulesPath },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    session.process = proc;
    this.codegenSessions.set(sessionId, session);

    let stderr = '';
    proc.stderr?.on('data', (data) => { stderr += data.toString(); });

    proc.on('close', (code) => {
      const s = this.codegenSessions.get(sessionId);
      if (!s || s.status === 'cancelled') return;

      if (code === 0 && fs.existsSync(outputFile)) {
        try {
          s.recordedScript = fs.readFileSync(outputFile, 'utf-8');
          s.status = 'completed';
          this.logger.log(`Codegen session ${sessionId} completed — ${s.recordedScript.length} chars recorded`);
        } catch (err) {
          s.status = 'failed';
          s.error = `Failed to read output file: ${(err as Error).message}`;
        }
      } else {
        s.status = code === null ? 'failed' : (code === 0 ? 'completed' : 'failed');
        s.error = stderr.trim() || `Codegen process exited with code ${code}`;
        // Still try to read partial output
        if (fs.existsSync(outputFile)) {
          try { s.recordedScript = fs.readFileSync(outputFile, 'utf-8'); s.status = 'completed'; } catch { /* ignore */ }
        }
      }
      s.completedAt = new Date();
      s.process = null;

      // Clean up output file
      try { fs.unlinkSync(outputFile); } catch { /* ignore */ }
    });

    proc.on('error', (err) => {
      const s = this.codegenSessions.get(sessionId);
      if (!s) return;
      s.status = 'failed';
      s.error = err.message;
      s.completedAt = new Date();
      s.process = null;
    });

    return { sessionId, status: 'recording' };
  }

  getCodegenStatus(sessionId: string): {
    sessionId: string;
    status: string;
    recordedScript: string | null;
    error: string | null;
    startedAt: string;
    completedAt: string | null;
  } {
    const session = this.codegenSessions.get(sessionId);
    if (!session) throw new NotFoundException('Codegen session not found');

    return {
      sessionId: session.id,
      status: session.status,
      recordedScript: session.recordedScript,
      error: session.error,
      startedAt: session.startedAt.toISOString(),
      completedAt: session.completedAt?.toISOString() || null,
    };
  }

  stopCodegen(sessionId: string): { status: string } {
    const session = this.codegenSessions.get(sessionId);
    if (!session) throw new NotFoundException('Codegen session not found');

    if (session.process) {
      session.status = 'cancelled';
      session.process.kill('SIGTERM');
      session.process = null;
      session.completedAt = new Date();

      // Try to read partial output
      if (fs.existsSync(session.outputFile)) {
        try {
          session.recordedScript = fs.readFileSync(session.outputFile, 'utf-8');
          if (session.recordedScript.trim()) session.status = 'completed';
        } catch { /* ignore */ }
        try { fs.unlinkSync(session.outputFile); } catch { /* ignore */ }
      }
    }

    return { status: session.status };
  }

  /**
   * Complete codegen-first flow: take recorded script from session, feed to AI
   * with test case + Jira context, and save the generated automation script.
   */
  async completeCodegenFlow(userId: string, sessionId: string): Promise<AutomationScript> {
    const session = this.codegenSessions.get(sessionId);
    if (!session) throw new NotFoundException('Codegen session not found');
    if (!session.recordedScript?.trim()) {
      throw new BadRequestException('No codegen recording found. Record some actions first.');
    }

    const result = await this.generateScript(userId, {
      testCaseId: session.testCaseId,
      projectId: session.projectId,
      targetUrl: session.targetUrl,
      browserType: session.browserType,
      codegenScript: session.recordedScript,
    });

    // Clean up session after successful generation
    this.codegenSessions.delete(sessionId);

    return result;
  }

  // ─── Codegen-First Generation (Codegen + Test Case + Jira → AI) ──────────

  async generateScript(userId: string, dto: GenerateScriptDto): Promise<AutomationScript> {
    const testCase = await this.testCaseRepo.findOne({ where: { id: dto.testCaseId } });
    if (!testCase) throw new NotFoundException('Test case not found');

    if (!testCase.steps || testCase.steps.length === 0) {
      throw new BadRequestException('Test case has no steps defined. Add steps before generating an automation script.');
    }

    const { provider, model, apiKey } = await this.getAiCredentials(userId);
    const orgId = await this.getOrgId(userId);
    const action = dto.codegenScript ? 'generate_from_codegen' : 'generate_script';

    // Build the prompt — if codegen is provided, use the enhanced codegen-first flow
    const prompt = dto.codegenScript
      ? this.buildCodegenEnhancedPrompt(testCase, dto.codegenScript, dto.targetUrl)
      : this.buildGeneratePrompt(testCase, dto.targetUrl);

    const startTime = Date.now();
    let aiResult: { content: string; inputTokens: number; outputTokens: number };
    try {
      aiResult = await this.callAiProvider(provider, model, apiKey, prompt);
    } catch (err: any) {
      this.aiAuditService.log({ userId, orgId, feature: 'automation', action, provider, model, inputTokens: 0, outputTokens: 0, responseTimeMs: Date.now() - startTime, success: false, errorMessage: err.message, metadata: { testCaseId: dto.testCaseId } });
      throw err;
    }
    const responseTimeMs = Date.now() - startTime;

    this.aiAuditService.log({ userId, orgId, feature: 'automation', action, provider, model, inputTokens: aiResult.inputTokens, outputTokens: aiResult.outputTokens, responseTimeMs, success: true, metadata: { testCaseId: dto.testCaseId } });

    const cleanScript = this.extractScript(aiResult.content);

    const script = this.scriptRepo.create({
      testCaseId: dto.testCaseId,
      projectId: dto.projectId,
      name: `${testCase.tcId} - ${testCase.title}`,
      rawScript: dto.codegenScript || null,
      cleanScript,
      healedScript: null,
      activeScript: cleanScript,
      targetUrl: dto.targetUrl || null,
      status: ScriptStatus.READY,
      source: dto.codegenScript ? ScriptSource.CODEGEN : ScriptSource.AI_GENERATED,
      browserType: dto.browserType || BrowserType.CHROMIUM,
      stabilityScore: dto.codegenScript ? 80 : 70,
      createdBy: userId,
    });

    return this.scriptRepo.save(script);
  }

  async importCodegenScript(userId: string, dto: ImportCodegenScriptDto): Promise<AutomationScript> {
    const testCase = await this.testCaseRepo.findOne({ where: { id: dto.testCaseId } });
    if (!testCase) throw new NotFoundException('Test case not found');

    let cleanScript = dto.rawScript;
    try {
      const { provider, model, apiKey } = await this.getAiCredentials(userId);
      const orgId = await this.getOrgId(userId);
      const prompt = this.buildCodegenEnhancedPrompt(testCase, dto.rawScript, dto.targetUrl);
      const startTime = Date.now();
      let aiResult: { content: string; inputTokens: number; outputTokens: number };
      try {
        aiResult = await this.callAiProvider(provider, model, apiKey, prompt);
      } catch (err: any) {
        this.aiAuditService.log({ userId, orgId, feature: 'automation', action: 'import_codegen', provider, model, inputTokens: 0, outputTokens: 0, responseTimeMs: Date.now() - startTime, success: false, errorMessage: err.message, metadata: { testCaseId: dto.testCaseId } });
        throw err;
      }
      this.aiAuditService.log({ userId, orgId, feature: 'automation', action: 'import_codegen', provider, model, inputTokens: aiResult.inputTokens, outputTokens: aiResult.outputTokens, responseTimeMs: Date.now() - startTime, success: true, metadata: { testCaseId: dto.testCaseId } });
      cleanScript = this.extractScript(aiResult.content);
    } catch (err) {
      this.logger.warn(`AI refactor failed, using raw script: ${(err as Error).message}`);
    }

    const script = this.scriptRepo.create({
      testCaseId: dto.testCaseId,
      projectId: dto.projectId,
      name: `${testCase.tcId} - ${testCase.title}`,
      rawScript: dto.rawScript,
      cleanScript,
      healedScript: null,
      activeScript: cleanScript,
      targetUrl: dto.targetUrl || null,
      status: ScriptStatus.READY,
      source: ScriptSource.CODEGEN,
      browserType: dto.browserType || BrowserType.CHROMIUM,
      stabilityScore: 80,
      createdBy: userId,
    });

    return this.scriptRepo.save(script);
  }

  // ─── Script Execution ────────────────────────────────────────────────────────

  async executeScript(userId: string, scriptId: string, dto: ExecuteScriptDto): Promise<ScriptExecution> {
    const script = await this.scriptRepo.findOne({ where: { id: scriptId } });
    if (!script) throw new NotFoundException('Automation script not found');

    const scriptToRun = script.activeScript || script.cleanScript;
    if (!scriptToRun) throw new BadRequestException('No script content available to execute.');

    const execution = this.executionRepo.create({
      scriptId: script.id,
      testCaseId: script.testCaseId,
      status: ExecutionStatus.RUNNING,
      startedAt: new Date(),
      browserType: dto.browserType || script.browserType,
      scriptSnapshot: scriptToRun,
      executedBy: userId,
    });
    const savedExecution = await this.executionRepo.save(execution);

    await this.scriptRepo.update(script.id, { status: ScriptStatus.RUNNING });

    // Run async — don't block the response
    this.runPlaywright(script, savedExecution, dto).catch((err) => {
      this.logger.error(`Playwright execution error: ${err.message}`);
    });

    return savedExecution;
  }

  private async runPlaywright(
    script: AutomationScript,
    execution: ScriptExecution,
    dto: ExecuteScriptDto,
  ): Promise<void> {
    const startTime = Date.now();
    const tmpDir = path.join(os.tmpdir(), `pw-${execution.id}`);
    const scriptPath = path.join(tmpDir, 'test.spec.ts');
    const testResultsDir = path.join(tmpDir, 'test-results');
    const resultsJsonPath = path.join(tmpDir, 'results.json');

    // Persistent artifact dir for this execution
    const artifactDir = path.join(ARTIFACTS_ROOT, execution.id);

    try {
      fs.mkdirSync(tmpDir, { recursive: true });
      fs.mkdirSync(artifactDir, { recursive: true });

      // Inject target URL override if provided
      let scriptContent = execution.scriptSnapshot!;
      const targetUrl = dto.targetUrl || script.targetUrl;
      if (targetUrl) {
        scriptContent = `// Target URL: ${targetUrl}\n${scriptContent}`;
      }

      // Resolve node_modules
      const backendRoot = path.resolve(__dirname, '..', '..', '..');
      let nodeModulesPath = path.join(backendRoot, 'node_modules');
      if (!fs.existsSync(path.join(nodeModulesPath, '@playwright', 'test'))) {
        const workspaceRoot = path.resolve(backendRoot, '..');
        if (fs.existsSync(path.join(workspaceRoot, 'node_modules', '@playwright', 'test'))) {
          nodeModulesPath = path.join(workspaceRoot, 'node_modules');
        }
      }

      // Write playwright config — always record video + screenshots
      const configPath = path.join(tmpDir, 'playwright.config.ts');
      const headless = dto.headless !== false;
      const browser = dto.browserType || script.browserType || 'chromium';
      fs.writeFileSync(
        configPath,
        `const { defineConfig } = require('@playwright/test');
module.exports = defineConfig({
  testDir: '.',
  timeout: 60000,
  retries: 0,
  reporter: [['json', { outputFile: '${resultsJsonPath.replace(/\\/g, '/')}' }]],
  outputDir: '${testResultsDir.replace(/\\/g, '/')}',
  use: {
    headless: ${headless},
    screenshot: 'on',
    video: 'on',
    trace: 'on',
    ${targetUrl ? `baseURL: '${targetUrl}',` : ''}
  },
  projects: [{ name: '${browser}', use: { browserName: '${browser}' } }],
});
`,
        'utf-8',
      );

      // Rewrite ESM → CJS for the temp environment
      const cjsScriptContent = scriptContent
        .replace(/import\s*\{([^}]+)\}\s*from\s*['"]@playwright\/test['"]/g, 'const {$1} = require("@playwright/test")')
        .replace(/import\s+(\w+)\s+from\s*['"]@playwright\/test['"]/g, 'const $1 = require("@playwright/test")');
      fs.writeFileSync(scriptPath, cjsScriptContent, 'utf-8');

      // Execute playwright (track process for cancellation)
      const playwrightBin = path.join(nodeModulesPath, '.bin', 'playwright');
      const { stdout, stderr, exitCode } = await this.spawnPlaywright(playwrightBin, tmpDir, nodeModulesPath, execution.id);
      const duration = Date.now() - startTime;

      // ─── Collect & persist artifacts ──────────────────────────────────
      const screenshots: string[] = [];
      let videoPath: string | null = null;
      let tracePath: string | null = null;

      if (fs.existsSync(testResultsDir)) {
        this.collectArtifacts(testResultsDir, artifactDir, screenshots, (v) => { videoPath = v; }, (t) => { tracePath = t; });
      }

      // ─── Parse structured results ────────────────────────────────────
      let resultJson: any = null;
      if (fs.existsSync(resultsJsonPath)) {
        try { resultJson = JSON.parse(fs.readFileSync(resultsJsonPath, 'utf-8')); } catch { /* ignore */ }
      }

      const passed = exitCode === 0;
      const structuredLogs = this.buildStructuredLogs(stdout, stderr, resultJson, passed, duration);

      // Update execution
      await this.executionRepo.update(execution.id, {
        status: passed ? ExecutionStatus.PASSED : ExecutionStatus.FAILED,
        completedAt: new Date(),
        duration,
        logs: JSON.stringify(structuredLogs),
        errorMessage: passed ? null : structuredLogs.error,
        screenshots,
        videoPath,
      });

      // Update script stats
      const totalRuns = script.totalRuns + 1;
      const passedRuns = script.passedRuns + (passed ? 1 : 0);
      const stabilityScore = Math.round((passedRuns / totalRuns) * 100);

      await this.scriptRepo.update(script.id, {
        status: passed ? ScriptStatus.PASSED : ScriptStatus.FAILED,
        lastRunAt: new Date(),
        lastRunDuration: duration,
        totalRuns,
        passedRuns,
        stabilityScore,
      });

      // Update test case status + auto-promote to automated type on pass
      await this.testCaseRepo.update(script.testCaseId, {
        status: passed ? TestStatus.PASSED : TestStatus.FAILED,
        lastRunAt: new Date(),
        ...(passed && { type: TestType.AUTOMATED }),
      });

      // Self-healing on failure
      if (!passed && dto.enableHealing !== false && script.healingAttempts < script.maxHealingAttempts) {
        await this.attemptHealing(script, execution, structuredLogs.error || stderr + stdout);
      }
    } catch (err: any) {
      const duration = Date.now() - startTime;
      const structuredLogs = this.buildStructuredLogs('', err.stack || err.message, null, false, duration);
      await this.executionRepo.update(execution.id, {
        status: ExecutionStatus.ERROR,
        completedAt: new Date(),
        duration,
        errorMessage: err.message,
        logs: JSON.stringify(structuredLogs),
      });
      await this.scriptRepo.update(script.id, { status: ScriptStatus.ERROR });
    } finally {
      try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* ignore */ }
    }
  }

  /** Walk the test-results dir, copy screenshots/video/trace to artifact dir */
  private collectArtifacts(
    srcDir: string,
    destDir: string,
    screenshots: string[],
    setVideo: (p: string) => void,
    setTrace: (p: string) => void,
  ) {
    const walkDir = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) { walkDir(fullPath); continue; }

        const ext = entry.name.toLowerCase();
        if (ext.endsWith('.png') || ext.endsWith('.jpg') || ext.endsWith('.jpeg')) {
          const dest = path.join(destDir, `screenshot-${screenshots.length + 1}${path.extname(entry.name)}`);
          fs.copyFileSync(fullPath, dest);
          screenshots.push(`screenshot-${screenshots.length + 1}${path.extname(entry.name)}`);
        } else if (ext.endsWith('.webm') || ext.endsWith('.mp4')) {
          const dest = path.join(destDir, `video${path.extname(entry.name)}`);
          fs.copyFileSync(fullPath, dest);
          setVideo(`video${path.extname(entry.name)}`);
        } else if (ext.endsWith('.zip') && entry.name.includes('trace')) {
          const dest = path.join(destDir, 'trace.zip');
          fs.copyFileSync(fullPath, dest);
          setTrace('trace.zip');
        }
      }
    };
    try { walkDir(srcDir); } catch (err) {
      this.logger.warn(`Artifact collection error: ${(err as Error).message}`);
    }
  }

  /** Build structured, human-readable log object from raw output */
  private buildStructuredLogs(stdout: string, stderr: string, resultJson: any, passed: boolean, durationMs: number) {
    const summary = {
      passed,
      duration: `${(durationMs / 1000).toFixed(1)}s`,
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      skippedTests: 0,
    };

    const steps: Array<{
      name: string;
      status: 'passed' | 'failed' | 'skipped';
      duration: string;
      error?: string;
      snippet?: string;
      location?: string;
      actions?: Array<{ title: string; status: 'passed' | 'failed'; duration: string; error?: string }>;
    }> = [];
    let error: string | null = null;

    // Recursively traverse suites (Playwright nests suites inside suites for test.describe)
    const processSuite = (suite: any) => {
      // Process nested suites first
      for (const childSuite of suite.suites || []) {
        processSuite(childSuite);
      }

      // Process specs in this suite
      for (const spec of suite.specs || []) {
        for (const test of spec.tests || []) {
          for (const result of test.results || []) {
            summary.totalTests++;
            const testPassed = result.status === 'passed' || result.status === 'expected';
            const testFailed = result.status === 'failed' || result.status === 'timedOut' || result.status === 'unexpected';
            if (testPassed) summary.passedTests++;
            else if (testFailed) summary.failedTests++;
            else summary.skippedTests++;

            // Extract step-level actions from the result
            const actions: Array<{ title: string; status: 'passed' | 'failed'; duration: string; error?: string }> = [];
            const extractSteps = (resultSteps: any[]) => {
              for (const s of resultSteps || []) {
                // Skip internal/framework steps, show user-facing ones
                if (s.category === 'hook' || s.category === 'fixture') continue;
                actions.push({
                  title: s.title || 'Unknown action',
                  status: s.error ? 'failed' : 'passed',
                  duration: `${((s.duration || 0) / 1000).toFixed(2)}s`,
                  error: s.error?.message,
                });
                // Include nested steps (test.step() inside test.step())
                if (s.steps?.length) extractSteps(s.steps);
              }
            };
            extractSteps(result.steps);

            const suiteName = suite.title ? `${suite.title} > ` : '';
            const stepEntry: any = {
              name: `${suiteName}${spec.title || 'Unknown test'}`,
              status: testPassed ? 'passed' : testFailed ? 'failed' : 'skipped',
              duration: `${((result.duration || 0) / 1000).toFixed(1)}s`,
              actions,
            };

            if (testFailed && result.error) {
              stepEntry.error = result.error.message || '';
              stepEntry.snippet = result.error.snippet || '';
              stepEntry.location = result.error.location
                ? `${result.error.location.file}:${result.error.location.line}`
                : '';
              if (!error) error = result.error.message || 'Test failed';
            }
            steps.push(stepEntry);
          }
        }
      }
    };

    if (resultJson?.suites) {
      for (const suite of resultJson.suites) {
        processSuite(suite);
      }
    }

    // Fallback error extraction from raw output
    if (!error && !passed) {
      error = this.extractErrorMessage(stderr, stdout);
    }

    return {
      summary,
      steps,
      error,
      stdout: stdout.trim() || null,
      stderr: stderr.trim() || null,
    };
  }

  private spawnPlaywright(playwrightBin: string, cwd: string, nodeModulesPath: string, executionId?: string): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    return new Promise((resolve) => {
      const proc = spawn(playwrightBin, ['test', '--config=playwright.config.ts'], {
        cwd,
        shell: true,
        timeout: 120000,
        env: { ...process.env, NODE_PATH: nodeModulesPath },
      });

      // Track the process for cancellation
      if (executionId) this.runningProcesses.set(executionId, proc);

      let stdout = '';
      let stderr = '';
      proc.stdout.on('data', (data) => { stdout += data.toString(); });
      proc.stderr.on('data', (data) => { stderr += data.toString(); });
      proc.on('close', (code) => {
        if (executionId) this.runningProcesses.delete(executionId);
        resolve({ stdout, stderr, exitCode: code ?? 1 });
      });
      proc.on('error', (err) => {
        if (executionId) this.runningProcesses.delete(executionId);
        resolve({ stdout, stderr: stderr + '\n' + err.message, exitCode: 1 });
      });
    });
  }

  // ─── Cancel Execution ──────────────────────────────────────────────────────

  async cancelExecution(executionId: string): Promise<void> {
    const execution = await this.executionRepo.findOne({ where: { id: executionId } });
    if (!execution) throw new NotFoundException('Execution not found');

    if (execution.status !== ExecutionStatus.RUNNING) {
      throw new BadRequestException('Only running executions can be cancelled');
    }

    // Kill the process if it's still running
    const proc = this.runningProcesses.get(executionId);
    if (proc) {
      proc.kill('SIGTERM');
      this.runningProcesses.delete(executionId);
    }

    // Update execution and script status
    await this.executionRepo.update(executionId, {
      status: ExecutionStatus.ERROR,
      completedAt: new Date(),
      duration: Date.now() - new Date(execution.startedAt!).getTime(),
      errorMessage: 'Execution cancelled by user',
      logs: JSON.stringify({
        summary: { passed: false, duration: '0s', totalTests: 0, passedTests: 0, failedTests: 0, skippedTests: 0 },
        steps: [],
        error: 'Execution cancelled by user',
        stdout: null,
        stderr: null,
      }),
    });

    await this.scriptRepo.update(execution.scriptId, { status: ScriptStatus.READY });
    this.logger.log(`Execution ${executionId} cancelled`);
  }

  // ─── Self-Healing ────────────────────────────────────────────────────────────

  private async attemptHealing(
    script: AutomationScript,
    failedExecution: ScriptExecution,
    errorOutput: string,
  ): Promise<void> {
    this.logger.log(`Self-healing attempt ${script.healingAttempts + 1}/${script.maxHealingAttempts} for script ${script.id}`);

    try {
      const { provider, model, apiKey } = await this.getAiCredentials(script.createdBy);
      const orgId = await this.getOrgId(script.createdBy);
      const prompt = this.buildHealingPrompt(script.activeScript!, errorOutput);
      const startTime = Date.now();
      let aiResult: { content: string; inputTokens: number; outputTokens: number };
      try {
        aiResult = await this.callAiProvider(provider, model, apiKey, prompt);
      } catch (err: any) {
        this.aiAuditService.log({ userId: script.createdBy, orgId, feature: 'automation', action: 'heal_script', provider, model, inputTokens: 0, outputTokens: 0, responseTimeMs: Date.now() - startTime, success: false, errorMessage: err.message, metadata: { scriptId: script.id, healingAttempt: script.healingAttempts + 1 } });
        throw err;
      }
      this.aiAuditService.log({ userId: script.createdBy, orgId, feature: 'automation', action: 'heal_script', provider, model, inputTokens: aiResult.inputTokens, outputTokens: aiResult.outputTokens, responseTimeMs: Date.now() - startTime, success: true, metadata: { scriptId: script.id, healingAttempt: script.healingAttempts + 1 } });

      const healedScript = this.extractScript(aiResult.content);

      await this.scriptRepo.update(script.id, {
        healedScript,
        activeScript: healedScript,
        healingAttempts: script.healingAttempts + 1,
        status: ScriptStatus.READY,
      });

      await this.executionRepo.update(failedExecution.id, {
        healingApplied: true,
        healingDetails: {
          attempt: script.healingAttempts + 1,
          provider,
          model,
          timestamp: new Date().toISOString(),
        } as any,
      });

      this.logger.log(`Self-healing applied for script ${script.id}`);
    } catch (err: any) {
      this.logger.error(`Self-healing failed: ${err.message}`);
      await this.scriptRepo.update(script.id, { healingAttempts: script.healingAttempts + 1 });
    }
  }

  // ─── Artifacts ───────────────────────────────────────────────────────────────

  getArtifactPath(executionId: string, filename: string): string | null {
    const filePath = path.join(ARTIFACTS_ROOT, executionId, filename);
    return fs.existsSync(filePath) ? filePath : null;
  }

  // ─── CRUD ────────────────────────────────────────────────────────────────────

  async findByTestCase(testCaseId: string): Promise<AutomationScript[]> {
    return this.scriptRepo.find({ where: { testCaseId }, order: { updatedAt: 'DESC' } });
  }

  async findById(id: string): Promise<AutomationScript> {
    const script = await this.scriptRepo.findOne({ where: { id } });
    if (!script) throw new NotFoundException('Automation script not found');
    return script;
  }

  async update(id: string, dto: UpdateScriptDto): Promise<AutomationScript> {
    const script = await this.findById(id);
    if (dto.activeScript !== undefined) {
      script.activeScript = dto.activeScript;
      script.status = ScriptStatus.READY;
      script.healingAttempts = 0;
    }
    if (dto.name !== undefined) script.name = dto.name;
    if (dto.targetUrl !== undefined) script.targetUrl = dto.targetUrl;
    if (dto.browserType !== undefined) script.browserType = dto.browserType;
    if (dto.maxHealingAttempts !== undefined) script.maxHealingAttempts = dto.maxHealingAttempts;
    return this.scriptRepo.save(script);
  }

  async remove(id: string): Promise<void> {
    await this.findById(id);
    await this.scriptRepo.softDelete(id);
  }

  async getExecutions(scriptId: string, limit = 20): Promise<ScriptExecution[]> {
    return this.executionRepo.find({ where: { scriptId }, order: { createdAt: 'DESC' }, take: limit });
  }

  async getExecutionsByTestCase(testCaseId: string, limit = 20): Promise<ScriptExecution[]> {
    return this.executionRepo.find({ where: { testCaseId }, order: { createdAt: 'DESC' }, take: limit });
  }

  async getExecution(id: string): Promise<ScriptExecution> {
    const exec = await this.executionRepo.findOne({ where: { id } });
    if (!exec) throw new NotFoundException('Execution not found');
    return exec;
  }

  // ─── AI Helpers ──────────────────────────────────────────────────────────────

  private async getAiCredentials(userId: string) {
    const allSettings = await this.settingsService.getAll(userId);
    const provider = allSettings.ai.activeProvider as AiProvider;
    const model = allSettings.ai.activeModel;
    const apiKey = await this.settingsService.getApiKey(userId, provider);
    if (!apiKey) throw new BadRequestException(`No API key configured for ${provider}. Add your key in Settings.`);
    return { provider, model, apiKey };
  }

  private async getOrgId(userId: string): Promise<string> {
    const user = await this.userRepo.findOne({ where: { id: userId }, select: ['organizationId'] });
    return user?.organizationId ?? '';
  }

  /**
   * The recommended flow: Codegen recording + Test Case context → AI produces
   * a production-ready script. Codegen provides real DOM selectors, AI adds
   * assertions, structure, error handling, and maps to test steps.
   */
  private buildCodegenEnhancedPrompt(testCase: TestCase, codegenScript: string, targetUrl?: string): string {
    const stepsText = (testCase.steps as any[])
      .map((s, i) => `  Step ${i + 1}: ${s.action}\n    Expected: ${s.expectedResult}`)
      .join('\n');

    const jiraContext = testCase.jiraTicketId
      ? `\n**Jira Ticket:** ${testCase.jiraTicketId}${testCase.jiraTicketUrl ? ` (${testCase.jiraTicketUrl})` : ''}`
      : '';

    return `You are an expert Playwright test automation engineer. You have TWO inputs:
1. A raw Playwright codegen recording (real DOM interactions — selectors from this are ground truth)
2. A test case with detailed steps and expected results

Your job: merge them into a **single production-ready Playwright test script**.

## Test Case
**ID:** ${testCase.tcId}
**Title:** ${testCase.title}
**Description:** ${testCase.description || 'N/A'}
**Preconditions:** ${testCase.preconditions || 'None'}${jiraContext}
${targetUrl ? `**Target URL:** ${targetUrl}` : ''}

## Test Steps (what should be validated)
${stepsText}

## Overall Expected Result
${testCase.expectedResult || 'N/A'}

## Codegen Recording (real DOM interactions — trust these selectors)
\`\`\`typescript
${codegenScript}
\`\`\`

## Your Task
1. **Use codegen selectors as the foundation** — they come from the real DOM and are accurate
2. **Upgrade fragile codegen selectors** — if codegen uses dynamic IDs (#login_xyz_123), replace with:
   - data-testid (preferred)
   - getByRole
   - getByLabel
   - getByText
   But KEEP selectors that are already stable (data-testid, role-based, etc.)
3. **Add assertions from the test steps** — each step's expected result must have a corresponding expect() assertion
4. **Structure properly** — use test.describe() and test() blocks, map code sections to test step numbers via comments
5. **Remove codegen bloat** — remove page.waitForTimeout(), unnecessary navigations, duplicate actions
6. **Add waitFor conditions** — replace hard waits with proper element waits (waitForSelector, expect().toBeVisible())
7. **Error handling** — add try/catch for flaky parts, meaningful error messages
${targetUrl ? `8. Use '${targetUrl}' as the base URL` : '8. Use relative paths for navigation'}

Return ONLY the Playwright TypeScript code. No explanations, no markdown fences.`;
  }

  private buildGeneratePrompt(testCase: TestCase, targetUrl?: string): string {
    const stepsText = (testCase.steps as any[])
      .map((s, i) => `  Step ${i + 1}: ${s.action}\n    Expected: ${s.expectedResult}`)
      .join('\n');

    return `You are an expert Playwright test automation engineer. Generate a production-ready Playwright TypeScript test script from the following test case.

## Test Case
**ID:** ${testCase.tcId}
**Title:** ${testCase.title}
**Description:** ${testCase.description || 'N/A'}
**Preconditions:** ${testCase.preconditions || 'None'}
${targetUrl ? `**Target URL:** ${targetUrl}` : ''}

## Test Steps
${stepsText}

## Overall Expected Result
${testCase.expectedResult || 'N/A'}

## Requirements
1. Use Playwright Test (@playwright/test) with TypeScript
2. Use stable selectors: prefer data-testid > getByRole > getByLabel > getByText
3. DO NOT use fragile selectors (dynamic IDs, nth-child, XPath)
4. Add proper assertions after each action step using expect()
5. Add meaningful test.describe and test() blocks
6. Use async/await properly
7. Add reasonable timeouts and waitFor conditions where needed
8. Handle page navigation properly
9. Include comments mapping each code section back to the test step
${targetUrl ? `10. Use '${targetUrl}' as the base URL for navigation` : '10. Use a configurable baseURL or relative paths'}

Return ONLY the Playwright TypeScript code. No explanations, no markdown fences.`;
  }

  private buildHealingPrompt(failedScript: string, errorOutput: string): string {
    const trimmedError = errorOutput.length > 3000
      ? errorOutput.substring(0, 1500) + '\n...[truncated]...\n' + errorOutput.substring(errorOutput.length - 1500)
      : errorOutput;

    return `You are an expert Playwright test automation engineer performing self-healing on a failed test script.

## Failed Script
${failedScript}

## Error Output
${trimmedError}

## Self-Healing Instructions
1. Analyze the error output to identify the root cause
2. Fix the specific failing selector/action
3. If a selector broke, try alternative stable selectors (data-testid, getByRole, getByText)
4. If a timing issue, add proper waitFor conditions
5. If navigation changed, update the navigation flow
6. Keep all passing parts unchanged
7. Ensure the fix doesn't introduce new issues

Return ONLY the fixed Playwright TypeScript code. No explanations, no markdown fences.`;
  }

  private async callAiProvider(provider: AiProvider, model: string, apiKey: string, prompt: string): Promise<{ content: string; inputTokens: number; outputTokens: number }> {
    try {
      switch (provider) {
        case 'openai': return await this.callOpenAI(model, apiKey, prompt);
        case 'anthropic': return await this.callAnthropic(model, apiKey, prompt);
        case 'gemini': return await this.callGemini(model, apiKey, prompt);
        default: throw new BadRequestException(`Unsupported AI provider: ${provider}`);
      }
    } catch (error: any) {
      if (error instanceof BadRequestException) throw error;
      const detail = error.response?.data?.error?.message || error.message;
      throw new BadRequestException(`AI call failed (${provider}): ${detail}`);
    }
  }

  private async callOpenAI(model: string, apiKey: string, prompt: string): Promise<{ content: string; inputTokens: number; outputTokens: number }> {
    const response = await firstValueFrom(
      this.httpService.post('https://api.openai.com/v1/chat/completions', {
        model,
        messages: [
          { role: 'system', content: 'You are a Playwright automation expert. Return only valid TypeScript Playwright test code.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.2, max_tokens: 8192,
      }, { headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, timeout: 120000 }),
    );
    const usage = response.data.usage;
    return { content: response.data.choices[0].message.content, inputTokens: usage?.prompt_tokens ?? 0, outputTokens: usage?.completion_tokens ?? 0 };
  }

  private async callAnthropic(model: string, apiKey: string, prompt: string): Promise<{ content: string; inputTokens: number; outputTokens: number }> {
    const response = await firstValueFrom(
      this.httpService.post('https://api.anthropic.com/v1/messages', {
        model, max_tokens: 8192,
        messages: [{ role: 'user', content: prompt }],
        system: 'You are a Playwright automation expert. Return only valid TypeScript Playwright test code.',
      }, {
        headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' },
        timeout: 120000,
      }),
    );
    const usage = response.data.usage;
    return { content: response.data.content[0].text, inputTokens: usage?.input_tokens ?? 0, outputTokens: usage?.output_tokens ?? 0 };
  }

  private async callGemini(model: string, apiKey: string, prompt: string): Promise<{ content: string; inputTokens: number; outputTokens: number }> {
    const response = await firstValueFrom(
      this.httpService.post(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 8192 },
          systemInstruction: { parts: [{ text: 'You are a Playwright automation expert. Return only valid TypeScript Playwright test code.' }] },
        },
        { headers: { 'Content-Type': 'application/json' }, timeout: 120000 },
      ),
    );
    const meta = response.data.usageMetadata;
    return { content: response.data.candidates[0].content.parts[0].text, inputTokens: meta?.promptTokenCount ?? 0, outputTokens: meta?.candidatesTokenCount ?? 0 };
  }

  private extractScript(rawResponse: string): string {
    let cleaned = rawResponse.trim();
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:typescript|ts|javascript|js)?\s*\n?/, '').replace(/\n?```\s*$/, '');
    }
    return cleaned.trim();
  }

  private extractErrorMessage(stderr: string, stdout: string): string {
    const combined = stderr + '\n' + stdout;
    const lines = combined.split('\n');
    const errorLines = lines.filter(
      (l) => l.includes('Error') || l.includes('error') || l.includes('FAIL') || l.includes('Timeout') || l.includes('expect('),
    );
    return errorLines.slice(0, 10).join('\n') || 'Script execution failed';
  }
}
