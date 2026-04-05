import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { spawn } from 'child_process';
import { v4 as uuidv4 } from 'uuid';
import { AutomationScript } from './entities/automation-script.entity';
import { ScriptExecution } from './entities/script-execution.entity';
import { ScriptStatus, ExecutionStatus, BrowserType, ScriptSource } from './entities/automation.enums';
import { TestCase } from '@/modules/test-cases/entities/test-case.entity';
import { TestStatus } from '@/modules/test-cases/entities/test-case.enums';
import { SettingsService, AiProvider } from '@/modules/settings/settings.service';
import { GenerateScriptDto, ImportCodegenScriptDto } from './dto/generate-script.dto';
import { UpdateScriptDto } from './dto/update-script.dto';
import { ExecuteScriptDto } from './dto/execute-script.dto';

@Injectable()
export class AutomationService {
  private readonly logger = new Logger(AutomationService.name);

  constructor(
    @InjectRepository(AutomationScript) private readonly scriptRepo: Repository<AutomationScript>,
    @InjectRepository(ScriptExecution) private readonly executionRepo: Repository<ScriptExecution>,
    @InjectRepository(TestCase) private readonly testCaseRepo: Repository<TestCase>,
    private readonly settingsService: SettingsService,
    private readonly httpService: HttpService,
  ) {}

  // ─── Script Generation ───────────────────────────────────────────────────────

  async generateScript(userId: string, dto: GenerateScriptDto): Promise<AutomationScript> {
    const testCase = await this.testCaseRepo.findOne({ where: { id: dto.testCaseId } });
    if (!testCase) throw new NotFoundException('Test case not found');

    if (!testCase.steps || testCase.steps.length === 0) {
      throw new BadRequestException('Test case has no steps defined. Add steps before generating an automation script.');
    }

    // Get AI settings
    const allSettings = await this.settingsService.getAll(userId);
    const provider = allSettings.ai.activeProvider as AiProvider;
    const model = allSettings.ai.activeModel;
    const apiKey = await this.settingsService.getApiKey(userId, provider);
    if (!apiKey) {
      throw new BadRequestException(`No API key configured for ${provider}. Add your key in Settings.`);
    }

    // Build prompt for Playwright script generation
    const prompt = this.buildGeneratePrompt(testCase, dto.targetUrl);
    const aiResult = await this.callAiProvider(provider, model, apiKey, prompt);
    const cleanScript = this.extractScript(aiResult.content);

    // Create script entity
    const script = this.scriptRepo.create({
      testCaseId: dto.testCaseId,
      projectId: dto.projectId,
      name: `${testCase.tcId} - ${testCase.title}`,
      rawScript: null,
      cleanScript,
      healedScript: null,
      activeScript: cleanScript,
      targetUrl: dto.targetUrl || null,
      status: ScriptStatus.READY,
      source: ScriptSource.AI_GENERATED,
      browserType: dto.browserType || BrowserType.CHROMIUM,
      stabilityScore: 70,
      createdBy: userId,
    });

    return this.scriptRepo.save(script);
  }

  async importCodegenScript(userId: string, dto: ImportCodegenScriptDto): Promise<AutomationScript> {
    const testCase = await this.testCaseRepo.findOne({ where: { id: dto.testCaseId } });
    if (!testCase) throw new NotFoundException('Test case not found');

    // Get AI to refactor the raw codegen output
    const allSettings = await this.settingsService.getAll(userId);
    const provider = allSettings.ai.activeProvider as AiProvider;
    const model = allSettings.ai.activeModel;
    const apiKey = await this.settingsService.getApiKey(userId, provider);

    let cleanScript = dto.rawScript;
    if (apiKey) {
      try {
        const prompt = this.buildRefactorPrompt(dto.rawScript, testCase);
        const aiResult = await this.callAiProvider(provider, model, apiKey, prompt);
        cleanScript = this.extractScript(aiResult.content);
      } catch (err) {
        this.logger.warn(`AI refactor failed, using raw script: ${(err as Error).message}`);
      }
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
      stabilityScore: 60,
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

    // Create execution record
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

    // Update script status
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
    const resultsDir = path.join(tmpDir, 'results');

    try {
      fs.mkdirSync(tmpDir, { recursive: true });
      fs.mkdirSync(resultsDir, { recursive: true });

      // Inject target URL override if provided
      let scriptContent = execution.scriptSnapshot!;
      const targetUrl = dto.targetUrl || script.targetUrl;
      if (targetUrl) {
        scriptContent = `// Target URL: ${targetUrl}\n${scriptContent}`;
      }

      fs.writeFileSync(scriptPath, scriptContent, 'utf-8');

      // Resolve node_modules — in a monorepo, packages hoist to the workspace root
      // __dirname at runtime = dist/modules/automation, so go up 3 levels to backend root
      const backendRoot = path.resolve(__dirname, '..', '..', '..');
      let nodeModulesPath = path.join(backendRoot, 'node_modules');
      // If @playwright/test isn't in backend/node_modules, try the workspace root
      if (!fs.existsSync(path.join(nodeModulesPath, '@playwright', 'test'))) {
        const workspaceRoot = path.resolve(backendRoot, '..');
        if (fs.existsSync(path.join(workspaceRoot, 'node_modules', '@playwright', 'test'))) {
          nodeModulesPath = path.join(workspaceRoot, 'node_modules');
        }
      }
      this.logger.debug(`Using node_modules at: ${nodeModulesPath}`);

      // Write playwright config using require() (CommonJS) for compatibility
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
  reporter: [['json', { outputFile: '${path.join(resultsDir, 'results.json').replace(/\\/g, '/')}' }]],
  use: {
    headless: ${headless},
    screenshot: 'on',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
    ${targetUrl ? `baseURL: '${targetUrl}',` : ''}
  },
  projects: [{ name: '${browser}', use: { browserName: '${browser}' } }],
});
`,
        'utf-8',
      );

      // Also rewrite the test script imports from ESM to CJS for the temp environment
      const cjsScriptContent = scriptContent
        .replace(/import\s*\{([^}]+)\}\s*from\s*['"]@playwright\/test['"]/g, 'const {$1} = require("@playwright/test")')
        .replace(/import\s+(\w+)\s+from\s*['"]@playwright\/test['"]/g, 'const $1 = require("@playwright/test")');
      fs.writeFileSync(scriptPath, cjsScriptContent, 'utf-8');

      // Execute playwright with NODE_PATH pointing to backend's node_modules
      const { stdout, stderr, exitCode } = await this.spawnPlaywright(tmpDir, nodeModulesPath);
      const duration = Date.now() - startTime;

      // Collect screenshots
      const screenshots: string[] = [];
      if (fs.existsSync(resultsDir)) {
        const files = fs.readdirSync(resultsDir, { recursive: true }) as string[];
        for (const f of files) {
          const filePath = typeof f === 'string' ? f : '';
          if (filePath.endsWith('.png') || filePath.endsWith('.jpg')) {
            screenshots.push(filePath);
          }
        }
      }

      // Parse results
      let resultData: any = null;
      const resultsJsonPath = path.join(resultsDir, 'results.json');
      if (fs.existsSync(resultsJsonPath)) {
        try {
          resultData = JSON.parse(fs.readFileSync(resultsJsonPath, 'utf-8'));
        } catch { /* ignore parse errors */ }
      }

      const passed = exitCode === 0;
      const logs = `--- STDOUT ---\n${stdout}\n\n--- STDERR ---\n${stderr}`;

      // Update execution
      await this.executionRepo.update(execution.id, {
        status: passed ? ExecutionStatus.PASSED : ExecutionStatus.FAILED,
        completedAt: new Date(),
        duration,
        logs,
        errorMessage: passed ? null : this.extractErrorMessage(stderr, stdout),
        screenshots,
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

      // Update test case status based on result
      await this.testCaseRepo.update(script.testCaseId, {
        status: passed ? TestStatus.PASSED : TestStatus.FAILED,
        lastRunAt: new Date(),
      });

      // Self-healing on failure
      if (!passed && dto.enableHealing !== false && script.healingAttempts < script.maxHealingAttempts) {
        await this.attemptHealing(script, execution, stderr + stdout);
      }
    } catch (err: any) {
      const duration = Date.now() - startTime;
      await this.executionRepo.update(execution.id, {
        status: ExecutionStatus.ERROR,
        completedAt: new Date(),
        duration,
        errorMessage: err.message,
        logs: err.stack || err.message,
      });
      await this.scriptRepo.update(script.id, { status: ScriptStatus.ERROR });
    } finally {
      // Cleanup temp files
      try {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      } catch { /* ignore cleanup errors */ }
    }
  }

  private spawnPlaywright(cwd: string, nodeModulesPath: string): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    return new Promise((resolve) => {
      // Use the playwright CLI directly from the backend's node_modules
      const playwrightBin = path.join(nodeModulesPath, '.bin', 'playwright');
      const proc = spawn(playwrightBin, ['test', '--config=playwright.config.ts'], {
        cwd,
        shell: true,
        timeout: 120000,
        env: {
          ...process.env,
          NODE_PATH: nodeModulesPath,
        },
      });

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data) => { stdout += data.toString(); });
      proc.stderr.on('data', (data) => { stderr += data.toString(); });

      proc.on('close', (code) => {
        resolve({ stdout, stderr, exitCode: code ?? 1 });
      });

      proc.on('error', (err) => {
        resolve({ stdout, stderr: stderr + '\n' + err.message, exitCode: 1 });
      });
    });
  }

  // ─── Self-Healing ────────────────────────────────────────────────────────────

  private async attemptHealing(
    script: AutomationScript,
    failedExecution: ScriptExecution,
    errorOutput: string,
  ): Promise<void> {
    this.logger.log(`Attempting self-healing for script ${script.id} (attempt ${script.healingAttempts + 1}/${script.maxHealingAttempts})`);

    try {
      const allSettings = await this.settingsService.getAll(script.createdBy);
      const provider = allSettings.ai.activeProvider as AiProvider;
      const model = allSettings.ai.activeModel;
      const apiKey = await this.settingsService.getApiKey(script.createdBy, provider);
      if (!apiKey) return;

      const prompt = this.buildHealingPrompt(script.activeScript!, errorOutput);
      const aiResult = await this.callAiProvider(provider, model, apiKey, prompt);
      const healedScript = this.extractScript(aiResult.content);

      // Update script with healed version
      await this.scriptRepo.update(script.id, {
        healedScript,
        activeScript: healedScript,
        healingAttempts: script.healingAttempts + 1,
        status: ScriptStatus.READY,
      });

      // Update the execution with healing details
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
      this.logger.error(`Self-healing failed for script ${script.id}: ${err.message}`);
      await this.scriptRepo.update(script.id, { healingAttempts: script.healingAttempts + 1 });
    }
  }

  // ─── CRUD ────────────────────────────────────────────────────────────────────

  async findByTestCase(testCaseId: string): Promise<AutomationScript[]> {
    return this.scriptRepo.find({
      where: { testCaseId },
      order: { updatedAt: 'DESC' },
    });
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
      script.healingAttempts = 0; // Reset healing on manual edit
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
    return this.executionRepo.find({
      where: { scriptId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async getExecutionsByTestCase(testCaseId: string, limit = 20): Promise<ScriptExecution[]> {
    return this.executionRepo.find({
      where: { testCaseId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async getExecution(id: string): Promise<ScriptExecution> {
    const exec = await this.executionRepo.findOne({ where: { id } });
    if (!exec) throw new NotFoundException('Execution not found');
    return exec;
  }

  // ─── AI Integration ──────────────────────────────────────────────────────────

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

  private buildRefactorPrompt(rawScript: string, testCase: TestCase): string {
    return `You are an expert Playwright test automation engineer. Refactor this raw Playwright codegen output into production-ready code.

## Test Case Context
**Title:** ${testCase.title}
**Description:** ${testCase.description || 'N/A'}

## Raw Codegen Script
${rawScript}

## Refactoring Goals
1. Replace unstable selectors (dynamic IDs like #login_123_abcd, nth-child) with stable ones
2. Prefer selector priority: data-testid > getByRole > getByLabel > getByText
3. Remove hard-coded waits (page.waitForTimeout) — use proper waitFor conditions
4. Add meaningful assertions after key actions
5. Add proper test.describe and test() structure
6. Add comments for readability
7. Handle errors gracefully
8. Improve variable naming
9. Ensure TypeScript types are correct

Return ONLY the clean Playwright TypeScript code. No explanations, no markdown fences.`;
  }

  private buildHealingPrompt(failedScript: string, errorOutput: string): string {
    // Trim error output to avoid exceeding token limits
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

  private async callAiProvider(provider: AiProvider, model: string, apiKey: string, prompt: string): Promise<{ content: string }> {
    try {
      switch (provider) {
        case 'openai':
          return await this.callOpenAI(model, apiKey, prompt);
        case 'anthropic':
          return await this.callAnthropic(model, apiKey, prompt);
        case 'gemini':
          return await this.callGemini(model, apiKey, prompt);
        default:
          throw new BadRequestException(`Unsupported AI provider: ${provider}`);
      }
    } catch (error: any) {
      if (error instanceof BadRequestException) throw error;
      const detail = error.response?.data?.error?.message || error.message;
      throw new BadRequestException(`AI call failed (${provider}): ${detail}`);
    }
  }

  private async callOpenAI(model: string, apiKey: string, prompt: string): Promise<{ content: string }> {
    const response = await firstValueFrom(
      this.httpService.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model,
          messages: [
            { role: 'system', content: 'You are a Playwright automation expert. Return only valid TypeScript Playwright test code.' },
            { role: 'user', content: prompt },
          ],
          temperature: 0.2,
          max_tokens: 8192,
        },
        { headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, timeout: 120000 },
      ),
    );
    return { content: response.data.choices[0].message.content };
  }

  private async callAnthropic(model: string, apiKey: string, prompt: string): Promise<{ content: string }> {
    const response = await firstValueFrom(
      this.httpService.post(
        'https://api.anthropic.com/v1/messages',
        {
          model,
          max_tokens: 8192,
          messages: [{ role: 'user', content: prompt }],
          system: 'You are a Playwright automation expert. Return only valid TypeScript Playwright test code.',
        },
        {
          headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' },
          timeout: 120000,
        },
      ),
    );
    return { content: response.data.content[0].text };
  }

  private async callGemini(model: string, apiKey: string, prompt: string): Promise<{ content: string }> {
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
    return { content: response.data.candidates[0].content.parts[0].text };
  }

  private extractScript(rawResponse: string): string {
    let cleaned = rawResponse.trim();
    // Strip markdown code fences
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:typescript|ts|javascript|js)?\s*\n?/, '').replace(/\n?```\s*$/, '');
    }
    return cleaned.trim();
  }

  private extractErrorMessage(stderr: string, stdout: string): string {
    // Try to find the most relevant error line
    const combined = stderr + '\n' + stdout;
    const lines = combined.split('\n');
    const errorLines = lines.filter(
      (l) => l.includes('Error') || l.includes('error') || l.includes('FAIL') || l.includes('Timeout') || l.includes('expect('),
    );
    return errorLines.slice(0, 10).join('\n') || 'Script execution failed';
  }
}
