import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { isUUID } from 'class-validator';
import { getPaginationParams, paginate } from '@/common/utils/pagination.util';
import { TestCase } from '@/modules/test-cases/entities/test-case.entity';
import { TestStatus, TestType } from '@/modules/test-cases/entities/test-case.enums';
import { AutomationScript } from '@/modules/automation/entities/automation-script.entity';
import { ScriptStatus } from '@/modules/automation/entities/automation.enums';
import { TestRun } from './entities/test-run.entity';
import { TestRunCase } from './entities/test-run-case.entity';
import { TestRunHistory } from './entities/test-run-history.entity';
import { TestRunStatus, ExecutionMode } from './entities/test-run.enums';
import { CreateTestRunDto } from './dto/create-test-run.dto';
import { UpdateTestRunDto } from './dto/update-test-run.dto';
import { UpdateTestRunCaseDto } from './dto/update-test-run-case.dto';

@Injectable()
export class TestRunsService {
  private readonly logger = new Logger(TestRunsService.name);

  constructor(
    @InjectRepository(TestRun) private runRepo: Repository<TestRun>,
    @InjectRepository(TestRunCase) private caseRepo: Repository<TestRunCase>,
    @InjectRepository(TestRunHistory) private historyRepo: Repository<TestRunHistory>,
    @InjectRepository(TestCase) private testCaseRepo: Repository<TestCase>,
    @InjectRepository(AutomationScript) private scriptRepo: Repository<AutomationScript>,
  ) {}

  // ── Create ─────────────────────────────────────────────────────────────

  async create(createdBy: string, dto: CreateTestRunDto): Promise<TestRun> {
    if (!dto.testCaseIds?.length && !dto.suiteId) {
      throw new BadRequestException('Provide testCaseIds or suiteId');
    }

    // Resolve test case IDs — either from direct list or from suite
    let testCaseIds = dto.testCaseIds || [];
    if (dto.suiteId && !testCaseIds.length) {
      const suiteCases = await this.testCaseRepo.find({
        where: { suiteId: dto.suiteId },
        select: ['id'],
      });
      testCaseIds = suiteCases.map((tc) => tc.id);
    }

    if (!testCaseIds.length) {
      throw new BadRequestException('No test cases found for the given criteria');
    }

    // Create the test run
    const run = await this.runRepo.save(
      this.runRepo.create({
        name: dto.name,
        description: dto.description ?? null,
        projectId: dto.projectId,
        createdBy,
        releaseId: dto.releaseId ?? null,
        assignedTo: dto.assignedTo ?? null,
        environmentId: dto.environmentId ?? null,
        environment: dto.environment ?? null,
        buildNumber: dto.buildNumber ?? null,
        startedAt: new Date(),
        status: TestRunStatus.ACTIVE,
        passRate: 0,
      }),
    );

    // Detect automation readiness for each test case
    const readiness = await this.getAutomationReadiness(testCaseIds);
    const includeManual = dto.includeManualCases !== false;

    const runCases: Partial<TestRunCase>[] = [];
    for (const tcId of testCaseIds) {
      const auto = readiness.get(tcId);
      if (auto) {
        runCases.push({
          testRunId: run.id,
          testCaseId: tcId,
          status: TestStatus.NOT_RUN,
          executionMode: ExecutionMode.AUTOMATED,
          scriptId: auto.scriptId,
          defects: [],
        });
      } else if (includeManual) {
        runCases.push({
          testRunId: run.id,
          testCaseId: tcId,
          status: TestStatus.NOT_RUN,
          executionMode: ExecutionMode.MANUAL,
          scriptId: null,
          defects: [],
        });
      }
    }

    if (runCases.length) {
      await this.caseRepo.save(runCases.map((rc) => this.caseRepo.create(rc)));
    }

    return this.findById(run.id);
  }

  // ── Automation Readiness ───────────────────────────────────────────────

  /**
   * For a list of test case IDs, returns a Map of testCaseId → { scriptId }
   * for those that have a passing automation script.
   */
  async getAutomationReadiness(testCaseIds: string[]): Promise<Map<string, { scriptId: string }>> {
    if (!testCaseIds.length) return new Map();

    const scripts = await this.scriptRepo
      .createQueryBuilder('s')
      .select(['s.id', 's.testCaseId', 's.stabilityScore'])
      .where('s.testCaseId IN (:...ids)', { ids: testCaseIds })
      .andWhere('s.status = :status', { status: ScriptStatus.PASSED })
      .andWhere('s.deletedAt IS NULL')
      .orderBy('s.stabilityScore', 'DESC')
      .getMany();

    // Pick the best script (highest stability) per test case
    const map = new Map<string, { scriptId: string }>();
    for (const s of scripts) {
      if (!map.has(s.testCaseId)) {
        map.set(s.testCaseId, { scriptId: s.id });
      }
    }
    return map;
  }

  /** Public endpoint: get automation summary for a suite */
  async getSuiteAutomationSummary(suiteId: string) {
    const cases = await this.testCaseRepo.find({
      where: { suiteId },
      select: ['id', 'title', 'type', 'status'],
    });

    const readiness = await this.getAutomationReadiness(cases.map((c) => c.id));

    const automated = cases
      .filter((c) => readiness.has(c.id))
      .map((c) => ({ testCaseId: c.id, title: c.title, scriptId: readiness.get(c.id)!.scriptId }));

    const manual = cases
      .filter((c) => !readiness.has(c.id))
      .map((c) => ({ testCaseId: c.id, title: c.title }));

    return { suiteId, totalCases: cases.length, automatedCases: automated, manualCases: manual };
  }

  // ── Read ───────────────────────────────────────────────────────────────

  async findAll(projectId: string, page = 1, limit = 20, sortBy = 'createdAt', sortOrder: 'ASC' | 'DESC' = 'DESC', status?: TestRunStatus) {
    if (!projectId || !isUUID(projectId)) {
      throw new BadRequestException('projectId must be a valid UUID');
    }
    const { skip, take } = getPaginationParams(page, limit);
    const where: any = { projectId, ...(status && { status }) };
    const [data, total] = await this.runRepo.findAndCount({
      where,
      skip,
      take,
      order: { [sortBy]: sortOrder },
      relations: ['testCases', 'testCases.testCase', 'environmentConfig'],
    });
    return paginate(data, total, page, take);
  }

  async findById(id: string): Promise<TestRun> {
    const run = await this.runRepo.findOne({
      where: { id },
      relations: ['testCases', 'testCases.testCase', 'environmentConfig'],
    });
    if (!run) throw new NotFoundException('Test run not found');
    return run;
  }

  // ── Update ─────────────────────────────────────────────────────────────

  async update(id: string, dto: UpdateTestRunDto): Promise<TestRun> {
    await this.findById(id);
    const updateData: any = { ...dto };
    if (dto.status === TestRunStatus.COMPLETED) {
      updateData.completedAt = new Date();
    }
    await this.runRepo.update(id, updateData);
    return this.findById(id);
  }

  async remove(id: string): Promise<void> {
    await this.findById(id);
    await this.runRepo.softDelete(id);
  }

  // ── History ────────────────────────────────────────────────────────────

  async getHistory(runId: string): Promise<TestRunHistory[]> {
    return this.historyRepo.find({ where: { testRunId: runId }, order: { createdAt: 'DESC' } });
  }

  // ── Update individual test case in a run ───────────────────────────────

  async updateTestCase(runId: string, testCaseId: string, executedBy: string, dto: UpdateTestRunCaseDto): Promise<TestRunCase> {
    const runCase = await this.caseRepo.findOne({ where: { testRunId: runId, testCaseId } });
    if (!runCase) throw new NotFoundException('Test run case not found');

    const updated = await this.caseRepo.save({
      ...runCase,
      ...dto,
      executedBy,
      executedAt: new Date(),
    });

    await this.historyRepo.save(
      this.historyRepo.create({
        testRunId: runId,
        testCaseId,
        executedBy,
        status: dto.status,
        comment: dto.comment ?? null,
        duration: dto.duration ?? null,
        executedAt: new Date(),
      }),
    );

    await this.recalculatePassRate(runId);
    return updated;
  }

  // ── Execution orchestration ────────────────────────────────────────────

  /** Update a test run case from automation execution result */
  async updateCaseFromExecution(
    runCaseId: string,
    data: { status: TestStatus; duration?: number; actualResult?: string; scriptExecutionId?: string; executedBy?: string },
  ): Promise<void> {
    await this.caseRepo.update(runCaseId, {
      status: data.status,
      duration: data.duration ?? null,
      actualResult: data.actualResult ?? null,
      scriptExecutionId: data.scriptExecutionId ?? null,
      executedBy: data.executedBy ?? null,
      executedAt: new Date(),
    });
  }

  async setRunStatus(runId: string, status: TestRunStatus): Promise<void> {
    const updateData: any = { status };
    if (status === TestRunStatus.COMPLETED) updateData.completedAt = new Date();
    await this.runRepo.update(runId, updateData);
  }

  async recalculatePassRate(runId: string): Promise<void> {
    const cases = await this.caseRepo.find({ where: { testRunId: runId } });
    if (!cases.length) return;
    const executed = cases.filter((c) => c.status !== TestStatus.NOT_RUN && c.status !== TestStatus.IN_PROGRESS);
    if (!executed.length) return;
    const passed = executed.filter((c) => c.status === TestStatus.PASSED).length;
    const passRate = Math.round((passed / executed.length) * 100 * 100) / 100;
    await this.runRepo.update(runId, { passRate });
  }

  async countActiveByProject(projectId: string): Promise<number> {
    return this.runRepo.count({ where: { projectId, status: TestRunStatus.ACTIVE } });
  }

  /** Get automated cases in a run that are ready to execute */
  async getAutomatedCasesForExecution(runId: string): Promise<TestRunCase[]> {
    return this.caseRepo.find({
      where: { testRunId: runId, executionMode: ExecutionMode.AUTOMATED, status: TestStatus.NOT_RUN },
    });
  }

  // ── Report ─────────────────────────────────────────────────────────────

  async getReport(runId: string) {
    const run = await this.findById(runId);
    const cases = run.testCases || [];

    const automated = cases.filter((c) => c.executionMode === ExecutionMode.AUTOMATED);
    const manual = cases.filter((c) => c.executionMode === ExecutionMode.MANUAL);

    const count = (arr: TestRunCase[], status: TestStatus) => arr.filter((c) => c.status === status).length;
    const totalDuration = (arr: TestRunCase[]) => arr.reduce((sum, c) => sum + (c.duration || 0), 0);

    const automatedPassed = count(automated, TestStatus.PASSED);
    const automatedFailed = count(automated, TestStatus.FAILED);
    const manualPassed = count(manual, TestStatus.PASSED);
    const manualFailed = count(manual, TestStatus.FAILED);

    const defects = cases
      .filter((c) => c.defects?.length)
      .map((c) => ({
        testCaseId: c.testCaseId,
        tcId: c.testCase?.tcId,
        title: c.testCase?.title,
        status: c.status,
        defects: c.defects,
      }));

    const timeline = cases
      .filter((c) => c.executedAt)
      .sort((a, b) => new Date(a.executedAt!).getTime() - new Date(b.executedAt!).getTime())
      .map((c) => ({
        testCaseId: c.testCaseId,
        tcId: c.testCase?.tcId,
        title: c.testCase?.title,
        executionMode: c.executionMode,
        status: c.status,
        executedAt: c.executedAt,
        duration: c.duration,
      }));

    return {
      testRunId: run.id,
      name: run.name,
      status: run.status,
      projectId: run.projectId,
      environment: run.environmentConfig?.name || run.environment || null,
      buildNumber: run.buildNumber,
      startedAt: run.startedAt,
      completedAt: run.completedAt,
      summary: {
        totalCases: cases.length,
        overallPassRate: run.passRate,
        automated: {
          total: automated.length,
          passed: automatedPassed,
          failed: automatedFailed,
          blocked: count(automated, TestStatus.BLOCKED),
          notRun: count(automated, TestStatus.NOT_RUN),
          passRate: automated.length > 0
            ? Math.round(((automatedPassed) / Math.max(automatedPassed + automatedFailed, 1)) * 100)
            : 0,
          totalDuration: totalDuration(automated),
        },
        manual: {
          total: manual.length,
          passed: manualPassed,
          failed: manualFailed,
          blocked: count(manual, TestStatus.BLOCKED),
          notRun: count(manual, TestStatus.NOT_RUN),
          passRate: manual.length > 0
            ? Math.round(((manualPassed) / Math.max(manualPassed + manualFailed, 1)) * 100)
            : 0,
          totalDuration: totalDuration(manual),
        },
      },
      defects,
      timeline,
    };
  }

  // ── CSV Export ─────────────────────────────────────────────────────────

  async exportCsv(id: string): Promise<string> {
    const run = await this.findById(id);
    const cases = run.testCases || [];

    const escape = (v: unknown) => {
      const s = v == null ? '' : String(v);
      return `"${s.replace(/"/g, '""')}"`;
    };

    const headers = ['TC ID', 'Title', 'Priority', 'Type', 'Execution Mode', 'Status', 'Duration (ms)', 'Executed At', 'Actual Result', 'Comment', 'Defects'];
    const rows = cases.map((c) => [
      escape(c.testCase?.tcId ?? ''),
      escape(c.testCase?.title ?? ''),
      escape(c.testCase?.priority ?? ''),
      escape(c.testCase?.type ?? ''),
      escape(c.executionMode),
      escape(c.status),
      escape(c.duration ?? ''),
      escape(c.executedAt ? new Date(c.executedAt).toISOString() : ''),
      escape(c.actualResult ?? ''),
      escape(c.comment ?? ''),
      escape((c.defects ?? []).join('; ')),
    ]);

    const summary = [
      `# Test Run: ${run.name}`,
      `# Status: ${run.status}`,
      `# Pass Rate: ${run.passRate}%`,
      `# Total Cases: ${cases.length}`,
      `# Exported: ${new Date().toISOString()}`,
      '',
    ].join('\n');

    return summary + [headers, ...rows].map((r) => r.join(',')).join('\n');
  }
}
