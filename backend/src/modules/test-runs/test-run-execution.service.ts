import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AutomationService } from '@/modules/automation/automation.service';
import { EnvironmentsService } from '@/modules/projects/environments.service';
import { ScriptExecution } from '@/modules/automation/entities/script-execution.entity';
import { ExecutionStatus } from '@/modules/automation/entities/automation.enums';
import { TestStatus } from '@/modules/test-cases/entities/test-case.enums';
import { TestRunsService } from './test-runs.service';
import { TestRunStatus } from './entities/test-run.enums';

const POLL_INTERVAL_MS = 2000;
const MAX_WAIT_MS = 5 * 60 * 1000; // 5 minutes per script

@Injectable()
export class TestRunExecutionService {
  private readonly logger = new Logger(TestRunExecutionService.name);
  /** Track which test runs are currently executing to prevent duplicates */
  private readonly executingRuns = new Set<string>();

  constructor(
    private readonly testRunsService: TestRunsService,
    private readonly automationService: AutomationService,
    private readonly environmentsService: EnvironmentsService,
    @InjectRepository(ScriptExecution) private readonly execRepo: Repository<ScriptExecution>,
  ) {}

  /**
   * Execute all automated test cases in a test run sequentially.
   * Returns immediately — execution happens in background.
   */
  async executeAutomatedCases(testRunId: string, userId: string): Promise<{ started: number }> {
    if (this.executingRuns.has(testRunId)) {
      throw new BadRequestException('This test run is already executing');
    }

    const run = await this.testRunsService.findById(testRunId);
    if (run.status === TestRunStatus.EXECUTING) {
      throw new BadRequestException('Test run is already executing');
    }

    const automatedCases = await this.testRunsService.getAutomatedCasesForExecution(testRunId);
    if (!automatedCases.length) {
      throw new BadRequestException('No automated test cases to execute');
    }

    // Resolve environment baseUrl
    let targetUrl: string | undefined;
    if (run.environmentId) {
      const env = await this.environmentsService.findByIdWithCredentials(run.environmentId);
      targetUrl = env.baseUrl;
    }

    // Mark run as executing
    await this.testRunsService.setRunStatus(testRunId, TestRunStatus.EXECUTING);
    this.executingRuns.add(testRunId);

    const caseCount = automatedCases.length;
    this.logger.log(`Starting execution of ${caseCount} automated cases for run ${testRunId}`);

    // Run in background (fire-and-forget, errors caught internally)
    this.runAutomatedCases(testRunId, automatedCases, userId, targetUrl).catch((err) => {
      this.logger.error(`Execution failed for run ${testRunId}: ${err.message}`);
    });

    return { started: caseCount };
  }

  /** Get real-time progress for an executing test run */
  async getExecutionProgress(testRunId: string) {
    const run = await this.testRunsService.findById(testRunId);
    const cases = run.testCases || [];

    const automated = cases.filter((c) => c.executionMode === 'automated');
    const completed = automated.filter((c) => c.status !== TestStatus.NOT_RUN && c.status !== TestStatus.IN_PROGRESS);
    const running = automated.filter((c) => c.status === TestStatus.IN_PROGRESS);
    const pending = automated.filter((c) => c.status === TestStatus.NOT_RUN);

    return {
      testRunId,
      status: run.status,
      total: automated.length,
      completed: completed.length,
      running: running.length,
      pending: pending.length,
      passed: completed.filter((c) => c.status === TestStatus.PASSED).length,
      failed: completed.filter((c) => c.status === TestStatus.FAILED).length,
      isExecuting: this.executingRuns.has(testRunId),
    };
  }

  /** Cancel execution of a test run */
  async cancelExecution(testRunId: string): Promise<void> {
    this.executingRuns.delete(testRunId);
    await this.testRunsService.setRunStatus(testRunId, TestRunStatus.ACTIVE);
    this.logger.log(`Execution cancelled for run ${testRunId}`);
  }

  // ── Private ────────────────────────────────────────────────────────────

  private async runAutomatedCases(
    testRunId: string,
    cases: { id: string; scriptId: string | null; testCaseId: string }[],
    userId: string,
    targetUrl?: string,
  ): Promise<void> {
    try {
      for (const runCase of cases) {
        // Check if cancelled
        if (!this.executingRuns.has(testRunId)) {
          this.logger.log(`Execution cancelled mid-run for ${testRunId}`);
          break;
        }

        if (!runCase.scriptId) continue;

        // Mark case as in-progress
        await this.testRunsService.updateCaseFromExecution(runCase.id, {
          status: TestStatus.IN_PROGRESS,
          executedBy: userId,
        });

        try {
          // Trigger script execution
          const execution = await this.automationService.executeScript(userId, runCase.scriptId, {
            targetUrl,
            headless: true,
            enableHealing: true,
          });

          // Wait for completion
          const result = await this.waitForExecution(execution.id);

          const passed = result.status === ExecutionStatus.PASSED || result.status === ExecutionStatus.HEALED;
          await this.testRunsService.updateCaseFromExecution(runCase.id, {
            status: passed ? TestStatus.PASSED : TestStatus.FAILED,
            duration: result.duration ? Math.round(result.duration / 1000) : undefined,
            actualResult: passed ? 'Automated execution passed' : (result.errorMessage || 'Automated execution failed'),
            scriptExecutionId: execution.id,
            executedBy: userId,
          });
        } catch (err: any) {
          this.logger.error(`Script execution failed for case ${runCase.testCaseId}: ${err.message}`);
          await this.testRunsService.updateCaseFromExecution(runCase.id, {
            status: TestStatus.FAILED,
            actualResult: `Execution error: ${err.message}`,
            executedBy: userId,
          });
        }

        await this.testRunsService.recalculatePassRate(testRunId);
      }
    } finally {
      this.executingRuns.delete(testRunId);

      // Check if all cases are done — if manual cases remain, go back to ACTIVE
      const run = await this.testRunsService.findById(testRunId);
      const hasManualPending = (run.testCases || []).some(
        (c) => c.executionMode === 'manual' && c.status === TestStatus.NOT_RUN,
      );

      if (hasManualPending) {
        await this.testRunsService.setRunStatus(testRunId, TestRunStatus.ACTIVE);
      } else {
        await this.testRunsService.setRunStatus(testRunId, TestRunStatus.COMPLETED);
      }

      await this.testRunsService.recalculatePassRate(testRunId);
      this.logger.log(`Execution finished for run ${testRunId}`);
    }
  }

  private async waitForExecution(executionId: string): Promise<ScriptExecution> {
    const startTime = Date.now();

    while (Date.now() - startTime < MAX_WAIT_MS) {
      const exec = await this.execRepo.findOne({ where: { id: executionId } });
      if (!exec) throw new NotFoundException(`Execution ${executionId} not found`);

      if (exec.status !== ExecutionStatus.QUEUED && exec.status !== ExecutionStatus.RUNNING) {
        return exec;
      }

      await this.sleep(POLL_INTERVAL_MS);
    }

    throw new Error(`Execution ${executionId} timed out after ${MAX_WAIT_MS / 1000}s`);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
