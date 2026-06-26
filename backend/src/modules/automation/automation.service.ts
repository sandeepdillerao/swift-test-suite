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
import { Priority, TestStatus, TestType } from '@/modules/test-cases/entities/test-case.enums';
import { TestSuite } from '@/modules/test-suites/entities/test-suite.entity';
import { User } from '@/modules/users/entities/user.entity';
import { Project } from '@/modules/projects/entities/project.entity';
import { SettingsService, AiProvider } from '@/modules/settings/settings.service';
import { EnvironmentsService } from '@/modules/projects/environments.service';
import { PLAYWRIGHT_CONFIG_DEFAULTS } from '@/modules/settings/dto/update-playwright-config.dto';
import { AiAuditService } from '@/common/modules/ai-audit';
import { GenerateScriptDto, ImportCodegenScriptDto } from './dto/generate-script.dto';
import { UpdateScriptDto } from './dto/update-script.dto';
import { ExecuteScriptDto } from './dto/execute-script.dto';
import { StartCodegenDto } from './dto/codegen-session.dto';
import { GenerateSuiteFromRecordingDto } from './dto/generate-suite-from-recording.dto';

/** Codegen session tracked in memory */
interface CodegenSession {
  id: string;
  userId: string;
  testCaseId?: string;
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

/** Persistent storage root for execution artifacts.
 *  UPLOADS_DIR is injected by the Electron main process so the app writes to a
 *  writable user-data directory instead of process.cwd() (which is / in packaged apps). */
const ARTIFACTS_ROOT = process.env.UPLOADS_DIR
  ? path.join(process.env.UPLOADS_DIR, 'automation')
  : path.resolve(process.cwd(), 'uploads', 'automation');

/**
 * Describes how to spawn the Playwright CLI.
 *
 * Two strategies are used depending on what's available:
 *
 *  A) JS-CLI strategy (preferred in Electron): run @playwright/test/cli.js directly
 *     using the current Node/Electron executable. Works cross-platform, requires no
 *     global Node.js, and works with the playwright packages bundled as extraResources.
 *
 *  B) Binary strategy (dev/web mode): use the .bin/playwright (macOS/Linux) or
 *     .bin/playwright.cmd (Windows) shim found in node_modules.
 */
interface PlaywrightRunner {
  executable: string;
  prependArgs: string[];
  shell: boolean;
  extraEnv: NodeJS.ProcessEnv;
}

/** Returns the node_modules directory that contains @playwright/test. */
function resolvePlaywrightNodeModules(): string {
  const searchRoots = [
    process.env.PLAYWRIGHT_NODE_MODULES,
    path.resolve(__dirname, '..', '..', '..', 'node_modules'),
    path.resolve(__dirname, '..', '..', '..', '..', 'node_modules'),
    path.resolve(__dirname, '..', '..', '..', '..', '..', 'node_modules'),
  ].filter(Boolean) as string[];

  for (const nm of searchRoots) {
    if (fs.existsSync(path.join(nm, '@playwright', 'test'))) return nm;
  }
  return '';
}

function resolvePlaywrightRunner(): PlaywrightRunner {
  const isWindows = process.platform === 'win32';

  // Strategy A: find @playwright/test/cli.js and run it with the current Node executable.
  // This is the Electron-packaged path: no global playwright or Node needed.
  // In Electron, process.execPath is the Electron binary; ELECTRON_RUN_AS_NODE=1 makes
  // it behave as plain Node.js. In dev/web mode, process.execPath is regular node.
  const nmRoots = [
    process.env.PLAYWRIGHT_NODE_MODULES,
    path.resolve(__dirname, '..', '..', '..', 'node_modules'),
    path.resolve(__dirname, '..', '..', '..', '..', 'node_modules'),
    path.resolve(__dirname, '..', '..', '..', '..', '..', 'node_modules'),
  ].filter(Boolean) as string[];

  for (const nm of nmRoots) {
    const cliJs = path.join(nm, '@playwright', 'test', 'cli.js');
    if (fs.existsSync(cliJs)) {
      const isElectron = !!process.env.ELECTRON_RUN_AS_NODE;
      return {
        executable: process.execPath,
        prependArgs: [cliJs],
        shell: false,
        extraEnv: isElectron ? { ELECTRON_RUN_AS_NODE: '1' } : {},
      };
    }
  }

  // Strategy B: .bin/playwright shim (dev mode on macOS/Linux, or global install).
  // On Windows, .cmd files require shell:true; on Unix the shim is directly executable.
  const binName = isWindows ? 'playwright.cmd' : 'playwright';
  for (const nm of nmRoots) {
    const bin = path.join(nm, '.bin', binName);
    if (fs.existsSync(bin)) {
      return { executable: bin, prependArgs: [], shell: isWindows, extraEnv: {} };
    }
  }

  // Last resort: hope playwright is on PATH (global install).
  return { executable: 'playwright', prependArgs: [], shell: isWindows, extraEnv: {} };
}

function chromiumExeExists(chromiumDir: string): boolean {
  if (process.platform === 'win32') {
    return fs.existsSync(path.join(chromiumDir, 'chrome-win64', 'chrome.exe'));
  }
  if (process.platform === 'darwin') {
    const app = path.join('Google Chrome for Testing.app', 'Contents', 'MacOS', 'Google Chrome for Testing');
    return (
      fs.existsSync(path.join(chromiumDir, 'chrome-mac-arm64', app)) ||
      fs.existsSync(path.join(chromiumDir, 'chrome-mac-x64', app))
    );
  }
  return fs.existsSync(path.join(chromiumDir, 'chrome-linux64', 'chrome'));
}

function defaultBrowsersPath(): string {
  if (process.platform === 'darwin') return path.join(os.homedir(), 'Library', 'Caches', 'ms-playwright');
  if (process.platform === 'win32') return path.join(process.env['LOCALAPPDATA'] || os.homedir(), 'ms-playwright');
  return path.join(os.homedir(), '.cache', 'ms-playwright');
}

/**
 * Returns true only when the Chromium executable actually exists.
 * Falls back to the platform default when PLAYWRIGHT_BROWSERS_PATH is not set
 * (e.g. in dev mode where the backend runs standalone, not via Electron).
 */
function isChromiumReady(): boolean {
  const browsersPath = process.env.PLAYWRIGHT_BROWSERS_PATH || defaultBrowsersPath();
  if (!fs.existsSync(browsersPath)) return false;
  return fs.readdirSync(browsersPath)
    .filter((d) => d.startsWith('chromium-'))
    .some((d) => chromiumExeExists(path.join(browsersPath, d)));
}

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
    @InjectRepository(TestSuite) private readonly testSuiteRepo: Repository<TestSuite>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Project) private readonly projectRepo: Repository<Project>,
    private readonly settingsService: SettingsService,
    private readonly environmentsService: EnvironmentsService,
    private readonly httpService: HttpService,
    private readonly aiAuditService: AiAuditService,
  ) {
    // Ensure artifacts directory exists on startup
    fs.mkdirSync(ARTIFACTS_ROOT, { recursive: true });
  }

  // ─── Codegen Session Management ───────────────────────────────────────────

  async startCodegen(userId: string, dto: StartCodegenDto): Promise<{ sessionId: string; status: string }> {
    if (!isChromiumReady()) {
      throw new BadRequestException(
        'Chromium browser is not installed yet. TestFlow is downloading it automatically — please wait a few minutes and try again.',
      );
    }

    if (dto.testCaseId) {
      const testCase = await this.testCaseRepo.findOne({ where: { id: dto.testCaseId } });
      if (!testCase) throw new NotFoundException('Test case not found');
    }

    const sessionId = uuidv4();
    const outputFile = path.join(os.tmpdir(), `codegen-${sessionId}.ts`);

    const runner = resolvePlaywrightRunner();
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

    const codegenArgs = [...runner.prependArgs, 'codegen', '--output', outputFile, '--browser', browser, url];
    this.logger.log(`Starting codegen ${sessionId}: ${runner.executable} ${codegenArgs.join(' ')}`);

    const nodeModulesPath = resolvePlaywrightNodeModules();
    const proc = spawn(runner.executable, codegenArgs, {
      shell: runner.shell,
      env: {
        ...process.env,
        ...runner.extraEnv,
        NODE_PATH: nodeModulesPath,
      },
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
        const rawError = stderr.trim() || `Codegen process exited with code ${code}`;
        const isChromiumMissing = rawError.includes("Executable doesn't exist") ||
          rawError.includes('Please run the following command to download new browsers') ||
          rawError.includes('playwright install');
        s.error = isChromiumMissing ? 'CHROMIUM_NOT_INSTALLED' : rawError;
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

    if (!session.testCaseId) throw new BadRequestException('This session is not linked to a test case');
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

  /** Save the raw codegen recording as the script — no AI processing. */
  async saveCodegenDirect(userId: string, sessionId: string): Promise<AutomationScript> {
    const session = this.codegenSessions.get(sessionId);
    if (!session) throw new NotFoundException('Codegen session not found');
    if (!session.recordedScript?.trim()) {
      throw new BadRequestException('No codegen recording found. Record some actions first.');
    }

    const testCase = await this.testCaseRepo.findOne({ where: { id: session.testCaseId } });
    if (!testCase) throw new NotFoundException('Test case not found');

    const script = this.scriptRepo.create({
      testCaseId: session.testCaseId,
      projectId: session.projectId,
      name: `${testCase.tcId} - ${testCase.title}`,
      rawScript: session.recordedScript,
      cleanScript: session.recordedScript,
      healedScript: null,
      activeScript: session.recordedScript,
      targetUrl: session.targetUrl || null,
      status: ScriptStatus.READY,
      source: ScriptSource.CODEGEN,
      browserType: session.browserType,
      stabilityScore: 75,
      createdBy: userId,
    });

    const saved = await this.scriptRepo.save(script);
    this.codegenSessions.delete(sessionId);
    return saved;
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
      ? this.buildCodegenEnhancedPrompt(testCase, dto.codegenScript, dto.targetUrl, dto.variables, dto.authConfigs)
      : this.buildGeneratePrompt(testCase, dto.targetUrl, dto.variables, dto.authConfigs);

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
      const prompt = this.buildCodegenEnhancedPrompt(testCase, dto.rawScript, dto.targetUrl, dto.variables, dto.authConfigs);
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
      // activeScript always starts as the raw recording — the AI-cleaned version
      // goes into cleanScript only; the user can promote it from the UI if desired.
      // This prevents AI selector hallucinations from breaking execution immediately.
      activeScript: dto.rawScript,
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
    if (!isChromiumReady()) {
      throw new BadRequestException(
        'Chromium browser is not installed yet. TestFlow is downloading it automatically — please wait a few minutes and try again.',
      );
    }

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

    // Resolve playwright config: user settings → project override → execution-level override
    const userSettings = await this.settingsService.getAll(userId);
    const userPwConfig = userSettings.playwrightConfig ?? PLAYWRIGHT_CONFIG_DEFAULTS;
    const project = script.projectId
      ? await this.projectRepo.findOne({ where: { id: script.projectId } })
      : null;
    const projectPwOverride = (project?.settings as any)?.playwrightConfig ?? {};
    const resolvedPwConfig = { ...PLAYWRIGHT_CONFIG_DEFAULTS, ...userPwConfig, ...projectPwOverride };

    // Run async — don't block the response
    this.runPlaywright(script, savedExecution, dto, resolvedPwConfig).catch((err) => {
      this.logger.error(`Playwright execution error: ${err.message}`);
    });

    return savedExecution;
  }

  private async runPlaywright(
    script: AutomationScript,
    execution: ScriptExecution,
    dto: ExecuteScriptDto,
    pwConfig: typeof PLAYWRIGHT_CONFIG_DEFAULTS,
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

      let scriptContent = execution.scriptSnapshot!;
      const explicitTargetUrl = dto.targetUrl || script.targetUrl;

      // Auto-extract a base URL from rawScript when no targetUrl is given.
      // This makes AI-generated scripts (which use relative paths like /login) work
      // even when the user runs without selecting an environment.
      let extractedBase: string | null = null;
      if (!explicitTargetUrl && script.rawScript) {
        const m = script.rawScript.match(/page\.goto\(\s*['"`](https?:\/\/[^/'"`\s]+)/);
        if (m) {
          try { extractedBase = new URL(m[1]).origin; } catch { /* ignore */ }
        }
      }

      const targetUrl = explicitTargetUrl || null;
      const configBaseUrl = explicitTargetUrl || extractedBase;

      // When an explicit targetUrl is given, rewrite absolute URLs in the script to point there
      if (explicitTargetUrl) {
        try {
          const targetBase = new URL(explicitTargetUrl);
          scriptContent = scriptContent.replace(
            /page\.goto\(\s*['"`]([^'"`]+)['"`]/g,
            (match: string, recordedUrl: string) => {
              try {
                const parsed = new URL(recordedUrl);
                parsed.protocol = targetBase.protocol;
                parsed.host = targetBase.host;
                return match.replace(recordedUrl, parsed.toString());
              } catch {
                return match; // relative URL — leave it; baseURL in config handles it
              }
            },
          );
        } catch {
          // invalid targetUrl — keep script as-is
        }
      }

      // Resolve environment variables — auth passwords must come from server-side decryption
      const envVars: Record<string, string> = { ...(dto.variables || {}) };
      if (dto.environmentId) {
        try {
          const rawEnv = await this.environmentsService.findByIdWithCredentials(dto.environmentId);
          // Environment-level variables take precedence over passed vars
          Object.assign(envVars, rawEnv.variables || {});
          // Auth config credentials — passwords are now decrypted
          for (const auth of rawEnv.authConfigs || []) {
            const prefix = (auth.label || 'AUTH').toUpperCase().replace(/[^A-Z0-9]/g, '_');
            envVars[`${prefix}_USERNAME`] = auth.username;
            envVars[`${prefix}_PASSWORD`] = auth.password; // real decrypted password
            if (auth.role) envVars[`${prefix}_ROLE`] = auth.role;
          }
        } catch (e) {
          this.logger.warn(`Could not resolve environment credentials for ${dto.environmentId}: ${e.message}`);
        }
      }

      if (Object.keys(envVars).length > 0) {
        const varLines = Object.entries(envVars)
          .map(([key, value]) => `const ${key} = ${JSON.stringify(value)};`)
          .join('\n');
        scriptContent = `// ── Environment Variables ──\n${varLines}\n\n${scriptContent}`;
      }

      // Write playwright config — merge resolved config with per-run overrides
      const configPath = path.join(tmpDir, 'playwright.config.ts');
      const headless = dto.headless !== undefined ? dto.headless : pwConfig.defaultHeadless;
      const browser = dto.browserType || script.browserType || pwConfig.defaultBrowser || 'chromium';

      const toCapture = (mode: string) =>
        mode === 'always' ? 'on' : mode === 'never' ? 'off' : 'retain-on-failure';
      const screenshotMode = toCapture(pwConfig.screenshot);
      const videoMode = toCapture(pwConfig.video);
      const traceMode = toCapture(pwConfig.trace);

      const viewportConfig = pwConfig.viewportWidth && pwConfig.viewportHeight
        ? `viewport: { width: ${pwConfig.viewportWidth}, height: ${pwConfig.viewportHeight} },`
        : '';
      const actionTimeoutConfig = pwConfig.actionTimeout > 0
        ? `actionTimeout: ${pwConfig.actionTimeout},`
        : '';
      const navigationTimeoutConfig = pwConfig.navigationTimeout > 0
        ? `navigationTimeout: ${pwConfig.navigationTimeout},`
        : '';
      const slowMoConfig = pwConfig.slowMo > 0 ? `slowMo: ${pwConfig.slowMo},` : '';
      const httpsConfig = pwConfig.ignoreHttpsErrors ? `ignoreHTTPSErrors: true,` : '';

      // Build process.env assignments for environment variables
      const envAssignments = Object.entries(envVars)
        .map(([key, value]) => `process.env[${JSON.stringify(key)}] = ${JSON.stringify(value)};`)
        .join('\n');

      fs.writeFileSync(
        configPath,
        `const { defineConfig } = require('@playwright/test');
${envAssignments ? `\n// Inject environment variables\n${envAssignments}\n` : ''}
module.exports = defineConfig({
  testDir: '.',
  timeout: ${pwConfig.testTimeout || 120000},
  retries: ${pwConfig.retries ?? 0},
  workers: ${pwConfig.workers || 1},
  reporter: [['json', { outputFile: '${resultsJsonPath.replace(/\\/g, '/')}' }]],
  outputDir: '${testResultsDir.replace(/\\/g, '/')}',
  use: {
    headless: ${headless},
    screenshot: '${screenshotMode}',
    video: '${videoMode}',
    trace: '${traceMode}',
    ${viewportConfig}
    ${actionTimeoutConfig}
    ${navigationTimeoutConfig}
    ${slowMoConfig}
    ${httpsConfig}
    ${configBaseUrl ? `baseURL: '${configBaseUrl}',` : ''}
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
      const runner = resolvePlaywrightRunner();
      const { stdout, stderr, exitCode } = await this.spawnPlaywright(runner, tmpDir, execution.id);
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
  private buildStructuredLogs(stdout: string, rawStderr: string, resultJson: any, passed: boolean, durationMs: number) {
    // Strip Node.js deprecation warnings and their hint lines — noise unrelated to test outcomes
    const stderr = rawStderr.split('\n')
      .filter(line => !/\[DEP\d+\]|DeprecationWarning|--trace-deprecation/.test(line))
      .join('\n');
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

            // Extract step-level actions — flatten all Playwright API calls with pass/fail
            const actions: Array<{ title: string; category: string; status: 'passed' | 'failed'; duration: string; error?: string }> = [];
            const extractSteps = (resultSteps: any[], depth = 0) => {
              for (const s of resultSteps || []) {
                const category = s.category || 'test';
                // Skip internal Playwright setup/teardown hooks
                if (category === 'hook' && depth === 0) continue;

                const title = s.title || 'Unknown action';
                const hasError = !!s.error;
                actions.push({
                  title,
                  category,
                  status: hasError ? 'failed' : 'passed',
                  duration: s.duration != null ? `${(s.duration / 1000).toFixed(2)}s` : '',
                  error: s.error?.message ? this.stripAnsi(s.error.message) : undefined,
                });

                // Only recurse into named test.step() groups — skip deep pw:api internals to avoid noise
                if (s.steps?.length && depth < 2 && (category === 'test' || s.steps.some((c: any) => c.category !== 'pw:api'))) {
                  extractSteps(s.steps, depth + 1);
                }
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
              stepEntry.error = this.stripAnsi(result.error.message || '');
              stepEntry.snippet = this.stripAnsi(result.error.snippet || '');
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
      error: error ? this.stripAnsi(error) : null,
      stdout: this.stripAnsi(stdout.trim()) || null,
      stderr: this.stripAnsi(stderr.trim()) || null,
    };
  }

  /** Remove ANSI escape codes (colors, cursor movement, etc.) from terminal output */
  private stripAnsi(text: string): string {
    // eslint-disable-next-line no-control-regex
    return text.replace(/\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g, '');
  }

  private spawnPlaywright(runner: PlaywrightRunner, cwd: string, executionId?: string): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    return new Promise((resolve) => {
      const nodeModulesPath = resolvePlaywrightNodeModules();
      const testArgs = [...runner.prependArgs, 'test', '--config=playwright.config.ts'];
      const proc = spawn(runner.executable, testArgs, {
        cwd,
        shell: runner.shell,
        timeout: 300000,
        env: {
          ...process.env,
          ...runner.extraEnv,
          // NODE_PATH lets the temp playwright.config.ts resolve @playwright/test
          // even though there's no node_modules in the tmp directory
          NODE_PATH: nodeModulesPath,
        },
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
  private buildEnvironmentContext(
    variables?: Record<string, string>,
    authConfigs?: { label: string; username: string; password: string; role?: string }[],
    targetUrl?: string,
  ): string {
    const hasVars = variables && Object.keys(variables).length > 0;
    const hasAuth = authConfigs && authConfigs.length > 0;
    if (!hasVars && !hasAuth && !targetUrl) return '';

    const parts: string[] = [];

    parts.push(`## ⚠️ CRITICAL: Runtime Variables — DO NOT HARDCODE

The execution environment **automatically injects** variables at runtime. Your script MUST reference these by name — NEVER hardcode their values as string literals.

Variables are available in two ways:
1. **As top-level constants** — use the variable name directly (e.g. \`BASE_URL\`, \`API_KEY\`)
2. **Via \`process.env\`** — e.g. \`process.env.BASE_URL\`

**baseURL is set in the Playwright config automatically**, so use \`page.goto('/')\` or relative paths like \`page.goto('/dashboard')\` instead of full URLs.`);

    if (hasVars) {
      const varNames = Object.keys(variables!);
      const varTable = varNames.map((key) => `  - \`${key}\` — available as constant \`${key}\` or \`process.env.${key}\``).join('\n');
      parts.push(`### Available Variables
${varTable}

**CORRECT** usage:
\`\`\`typescript
await page.goto('/');              // baseURL is already configured
await page.fill('#api-key', ${varNames[0]});  // use the constant directly
const val = process.env.${varNames[0]};       // or via process.env
\`\`\`

**WRONG — do NOT do this:**
\`\`\`typescript
await page.goto('${variables![varNames[0]] || 'https://example.com'}');  // ❌ NEVER hardcode
await page.fill('#api-key', '${variables![varNames[0]] || 'some-value'}'); // ❌ NEVER hardcode
\`\`\``);
    }

    if (hasAuth) {
      const authList = authConfigs!.map((a) => {
        const constPrefix = a.label.toUpperCase().replace(/[^A-Z0-9]/g, '_');
        return `  - **${a.label}**${a.role ? ` (role: ${a.role})` : ''}: use constants \`${constPrefix}_USERNAME\` and \`${constPrefix}_PASSWORD\``;
      }).join('\n');

      // Build the auth constant map that will be injected
      const authConstants = authConfigs!.map((a) => {
        const constPrefix = a.label.toUpperCase().replace(/[^A-Z0-9]/g, '_');
        return `// ${constPrefix}_USERNAME, ${constPrefix}_PASSWORD — injected at runtime`;
      }).join('\n');

      parts.push(`### Auth Credentials
${authList}

These credentials are injected as runtime constants. For login flows:
\`\`\`typescript
${authConstants}
await page.fill('[name="username"]', ${authConfigs![0].label.toUpperCase().replace(/[^A-Z0-9]/g, '_')}_USERNAME);
await page.fill('[name="password"]', ${authConfigs![0].label.toUpperCase().replace(/[^A-Z0-9]/g, '_')}_PASSWORD);
\`\`\`
**NEVER write actual usernames or passwords as string literals in the script.**`);
    }

    return '\n\n' + parts.join('\n\n');
  }

  private buildCodegenEnhancedPrompt(
    testCase: TestCase,
    codegenScript: string,
    targetUrl?: string,
    variables?: Record<string, string>,
    authConfigs?: { label: string; username: string; password: string; role?: string }[],
  ): string {
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
8. **Navigation** — ALWAYS use the FULL absolute URL from the codegen recording in every page.goto() call. NEVER convert to relative paths. Keep exactly what the recording had (e.g., \`page.goto('http://localhost:5173/login')\`). Relative paths will break execution.
${this.buildEnvironmentContext(variables, authConfigs, targetUrl)}

Return ONLY the Playwright TypeScript code. No explanations, no markdown fences.`;
  }

  private buildGeneratePrompt(
    testCase: TestCase,
    targetUrl?: string,
    variables?: Record<string, string>,
    authConfigs?: { label: string; username: string; password: string; role?: string }[],
  ): string {
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
8. **Navigation** — ${targetUrl ? `Use '${targetUrl}' as the base for all page.goto() calls (e.g., \`page.goto('${targetUrl}/login')\`).` : `Use full absolute URLs in every page.goto() call. NEVER use relative paths like '/login' — they will fail without a baseURL configured.`}
9. Include comments mapping each code section back to the test step
${this.buildEnvironmentContext(variables, authConfigs, targetUrl)}

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

  // ─── Record-to-TestSuite AI Generation ──────────────────────────────────────

  async generateSuiteFromRecording(userId: string, dto: GenerateSuiteFromRecordingDto) {
    const { provider, model, apiKey } = await this.getAiCredentials(userId);
    const orgId = await this.getOrgId(userId);
    const prompt = this.buildSuiteFromRecordingPrompt(dto.recordedScript, dto.flowDescription, dto.suiteName);
    const startTime = Date.now();
    let aiResult: { content: string; inputTokens: number; outputTokens: number };
    try {
      aiResult = await this.callAiProvider(provider, model, apiKey, prompt);
    } catch (err: any) {
      this.aiAuditService.log({ userId, orgId, feature: 'automation', action: 'generate_suite_from_recording', provider, model, inputTokens: 0, outputTokens: 0, responseTimeMs: Date.now() - startTime, success: false, errorMessage: err.message, metadata: { projectId: dto.projectId } });
      throw err;
    }
    this.aiAuditService.log({ userId, orgId, feature: 'automation', action: 'generate_suite_from_recording', provider, model, inputTokens: aiResult.inputTokens, outputTokens: aiResult.outputTokens, responseTimeMs: Date.now() - startTime, success: true, metadata: { projectId: dto.projectId } });

    const testCaseData = this.extractJsonArray(aiResult.content);

    // Create or reuse suite
    let suite: TestSuite;
    if (dto.targetSuiteId) {
      const existing = await this.testSuiteRepo.findOne({ where: { id: dto.targetSuiteId } });
      if (!existing) throw new BadRequestException('Target suite not found');
      suite = existing;
    } else {
      suite = await this.testSuiteRepo.save(
        this.testSuiteRepo.create({
          projectId: dto.projectId,
          name: dto.suiteName,
          description: dto.suiteDescription ?? null,
          variables: dto.suiteVariables ?? {},
          createdBy: userId,
        }),
      );
    }

    // Create test cases
    const testCases: TestCase[] = [];
    for (const tcData of testCaseData) {
      try {
        const [{ val }] = await this.testCaseRepo.query("SELECT nextval('tc_id_seq') AS val");
        const tcId = `TC-${String(val).padStart(3, '0')}`;
        const steps = (tcData.steps || []).map((s: any, i: number) => ({
          id: uuidv4(),
          order: s.order ?? i + 1,
          action: s.action ?? '',
          expectedResult: s.expectedResult ?? s.expected ?? '',
        }));
        const tc = await this.testCaseRepo.save(
          this.testCaseRepo.create({
            tcId,
            projectId: dto.projectId,
            suiteId: suite.id,
            createdBy: userId,
            assignedTo: null,
            title: String(tcData.title ?? 'Test Case'),
            description: tcData.description ?? null,
            preconditions: tcData.preconditions ?? null,
            steps,
            expectedResult: tcData.expectedResult ?? 'Test completes successfully',
            priority: (tcData.priority as any) ?? Priority.MEDIUM,
            type: TestType.AUTOMATED,
            status: TestStatus.NOT_RUN,
            tags: Array.isArray(tcData.tags) ? tcData.tags : [],
            isAiGenerated: true,
          }),
        );

        // Seed the codegen recording as the automation script for this test case
        await this.scriptRepo.save(
          this.scriptRepo.create({
            testCaseId: tc.id,
            projectId: dto.projectId,
            name: `${tcId} - ${tc.title}`,
            rawScript: dto.recordedScript,
            cleanScript: dto.recordedScript,
            healedScript: null,
            activeScript: dto.recordedScript,
            targetUrl: null,
            status: ScriptStatus.READY,
            source: ScriptSource.CODEGEN,
            browserType: BrowserType.CHROMIUM,
            stabilityScore: 70,
            healingAttempts: 0,
            maxHealingAttempts: 3,
            createdBy: userId,
          }),
        );

        testCases.push(tc);
      } catch (err: any) {
        this.logger.warn(`Failed to create test case "${tcData.title}": ${err.message}`);
      }
    }

    return { suite, testCases, count: testCases.length };
  }

  private buildSuiteFromRecordingPrompt(script: string, flowDescription: string | undefined, suiteName: string): string {
    const desc = flowDescription ? `The user described the flow as: "${flowDescription}"` : '';
    return `You are a senior QA engineer. Analyze the following Playwright codegen recording and generate as many distinct, high-quality test cases as the flow warrants for the test suite "${suiteName}".

${desc}

## Playwright Recording
\`\`\`typescript
${script}
\`\`\`

## Instructions

Analyze the recording carefully to understand:
1. What feature or flow is being tested
2. What user actions are taken (clicks, typing, navigation)
3. What elements and selectors are used

Decide the ideal number of test cases yourself. Generate enough to give thorough coverage:
- Happy path scenarios (valid inputs, expected success)
- Negative/error cases (invalid inputs, wrong credentials, missing required fields)
- Edge cases (boundary values, empty fields, special characters)
- Additional scenarios for different user perspectives where relevant

For each test case, write granular step-by-step instructions based on the real selectors seen in the recording.

## Output Format

Return ONLY a valid JSON array (no markdown fences, no explanation outside the JSON):
[
  {
    "title": "Descriptive title of what this test validates",
    "description": "Why this test case is important / what scenario it covers",
    "preconditions": "What must be true before the test starts (e.g. user must be logged out)",
    "steps": [
      { "order": 1, "action": "Navigate to the login page", "expectedResult": "Login form is displayed with username and password fields" },
      { "order": 2, "action": "Enter valid username in the username field", "expectedResult": "Username field shows the entered text" }
    ],
    "expectedResult": "Single sentence describing the final expected outcome",
    "priority": "high",
    "tags": ["login", "auth", "smoke"]
  }
]

Priority must be one of: "critical", "high", "medium", "low"`;
  }

  private extractJsonArray(raw: string): any[] {
    let cleaned = raw.trim();
    // Strip markdown fences
    cleaned = cleaned.replace(/^```(?:json|typescript|js)?\s*\n?/, '').replace(/\n?```\s*$/, '').trim();
    // Find the first [ ... ] block
    const start = cleaned.indexOf('[');
    const end = cleaned.lastIndexOf(']');
    if (start === -1 || end === -1) return [];
    try {
      return JSON.parse(cleaned.slice(start, end + 1));
    } catch {
      return [];
    }
  }

  private extractScript(rawResponse: string): string {
    let cleaned = rawResponse.trim();
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:typescript|ts|javascript|js)?\s*\n?/, '').replace(/\n?```\s*$/, '');
    }
    return cleaned.trim();
  }

  private extractErrorMessage(stderr: string, stdout: string): string {
    const combined = this.stripAnsi(stderr + '\n' + stdout);
    const lines = combined.split('\n');
    const errorLines = lines.filter(
      (l) => l.includes('Error') || l.includes('error') || l.includes('FAIL') || l.includes('Timeout') || l.includes('expect('),
    );
    return errorLines.slice(0, 10).join('\n') || 'Script execution failed';
  }
}
