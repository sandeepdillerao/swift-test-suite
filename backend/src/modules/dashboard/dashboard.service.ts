import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TestCase } from '@/modules/test-cases/entities/test-case.entity';
import { TestStatus } from '@/modules/test-cases/entities/test-case.enums';
import { TestRun } from '@/modules/test-runs/entities/test-run.entity';
import { TestRunStatus } from '@/modules/test-runs/entities/test-run.enums';
import { Project } from '@/modules/projects/entities/project.entity';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(TestCase) private tcRepo: Repository<TestCase>,
    @InjectRepository(TestRun) private runRepo: Repository<TestRun>,
    @InjectRepository(Project) private projectRepo: Repository<Project>,
  ) {}

  async getStats(organizationId: string, projectId?: string) {
    const projectFilter = projectId ? { projectId } : {};

    // Get all projects for org to scope queries
    const projects = await this.projectRepo.find({ where: { organizationId } });
    const projectIds = projects.map((p) => p.id);
    if (!projectIds.length) {
      return this.emptyStats();
    }

    const tcWhere = projectId
      ? `tc.projectId = '${projectId}' AND tc.deletedAt IS NULL`
      : `tc.projectId IN ('${projectIds.join("','")}') AND tc.deletedAt IS NULL`;

    const statusCounts = await this.tcRepo
      .createQueryBuilder('tc')
      .select('tc.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where(tcWhere)
      .groupBy('tc.status')
      .getRawMany<{ status: string; count: string }>();

    const counts: Record<string, number> = {};
    for (const row of statusCounts) {
      counts[row.status] = parseInt(row.count, 10);
    }

    const totalTestCases = Object.values(counts).reduce((a, b) => a + b, 0);
    const passedTests = counts[TestStatus.PASSED] ?? 0;
    const failedTests = counts[TestStatus.FAILED] ?? 0;
    const blockedTests = counts[TestStatus.BLOCKED] ?? 0;
    const notRunTests = counts[TestStatus.NOT_RUN] ?? 0;
    const passRate = totalTestCases > 0 ? Math.round((passedTests / totalTestCases) * 100 * 100) / 100 : 0;

    const runWhere = projectId
      ? { projectId, status: TestRunStatus.ACTIVE }
      : { status: TestRunStatus.ACTIVE };

    const activeTestRuns = await this.runRepo.count({ where: runWhere as any });

    return {
      totalTestCases,
      passedTests,
      failedTests,
      blockedTests,
      notRunTests,
      passRate,
      activeTestRuns,
      recentActivity: [],
    };
  }

  private emptyStats() {
    return { totalTestCases: 0, passedTests: 0, failedTests: 0, blockedTests: 0, notRunTests: 0, passRate: 0, activeTestRuns: 0, recentActivity: [] };
  }
}
