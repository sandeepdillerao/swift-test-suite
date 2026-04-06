import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { getPaginationParams, paginate } from '@/common/utils/pagination.util';
import { TestStatus } from '@/modules/test-cases/entities/test-case.enums';
import { TestRun } from './entities/test-run.entity';
import { TestRunCase } from './entities/test-run-case.entity';
import { TestRunHistory } from './entities/test-run-history.entity';
import { TestRunStatus } from './entities/test-run.enums';
import { isUUID } from 'class-validator';
import { CreateTestRunDto } from './dto/create-test-run.dto';
import { UpdateTestRunDto } from './dto/update-test-run.dto';
import { UpdateTestRunCaseDto } from './dto/update-test-run-case.dto';

@Injectable()
export class TestRunsService {
  constructor(
    @InjectRepository(TestRun) private runRepo: Repository<TestRun>,
    @InjectRepository(TestRunCase) private caseRepo: Repository<TestRunCase>,
    @InjectRepository(TestRunHistory) private historyRepo: Repository<TestRunHistory>,
  ) {}

  async create(createdBy: string, dto: CreateTestRunDto): Promise<TestRun> {
    const run = await this.runRepo.save(
      this.runRepo.create({
        ...dto,
        createdBy,
        releaseId: dto.releaseId ?? null,
        assignedTo: dto.assignedTo ?? null,
        environment: dto.environment ?? null,
        buildNumber: dto.buildNumber ?? null,
        startedAt: new Date(),
        status: TestRunStatus.ACTIVE,
        passRate: 0,
      }),
    );

    // Create TestRunCase records for each test case
    if (dto.testCaseIds?.length) {
      const runCases = dto.testCaseIds.map((testCaseId) =>
        this.caseRepo.create({ testRunId: run.id, testCaseId, status: TestStatus.NOT_RUN, defects: [] }),
      );
      await this.caseRepo.save(runCases);
    }

    return this.findById(run.id);
  }

  async findAll(projectId: string, page = 1, limit = 20, sortBy = 'createdAt', sortOrder: 'ASC' | 'DESC' = 'DESC', status?: TestRunStatus) {
    if (!projectId || !isUUID(projectId)) {
      throw new BadRequestException('projectId must be a valid UUID');
    }
    const { skip, take } = getPaginationParams(page, limit);
    const where: any = { projectId, ...(status && { status }) };
    const [data, total] = await this.runRepo.findAndCount({
      where,
      skip, take,
      order: { [sortBy]: sortOrder },
      relations: ['testCases', 'testCases.testCase'],
    });
    return paginate(data, total, page, take);
  }

  async findById(id: string): Promise<TestRun> {
    const run = await this.runRepo.findOne({ where: { id }, relations: ['testCases', 'testCases.testCase'] });
    if (!run) throw new NotFoundException('Test run not found');
    return run;
  }

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

  async getHistory(runId: string): Promise<TestRunHistory[]> {
    return this.historyRepo.find({ where: { testRunId: runId }, order: { createdAt: 'DESC' } });
  }

  async updateTestCase(runId: string, testCaseId: string, executedBy: string, dto: UpdateTestRunCaseDto): Promise<TestRunCase> {
    const runCase = await this.caseRepo.findOne({ where: { testRunId: runId, testCaseId } });
    if (!runCase) throw new NotFoundException('Test run case not found');

    const updated = await this.caseRepo.save({
      ...runCase,
      ...dto,
      executedBy,
      executedAt: new Date(),
    });

    // Record history entry
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

    // Recalculate pass rate
    await this.recalculatePassRate(runId);

    return updated;
  }

  private async recalculatePassRate(runId: string): Promise<void> {
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
}
