import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { getPaginationParams, paginate } from '@/common/utils/pagination.util';
import { TestSuite } from './entities/test-suite.entity';
import { isUUID } from 'class-validator';
import { CreateTestSuiteDto } from './dto/create-test-suite.dto';
import { UpdateTestSuiteDto } from './dto/update-test-suite.dto';

@Injectable()
export class TestSuitesService {
  constructor(
    @InjectRepository(TestSuite) private repo: Repository<TestSuite>,
    private dataSource: DataSource,
  ) {}

  async create(createdBy: string, dto: CreateTestSuiteDto): Promise<TestSuite> {
    const suite = this.repo.create({ ...dto, createdBy, parentId: dto.parentId ?? null });
    return this.repo.save(suite);
  }

  async findAll(projectId: string, page = 1, limit = 20) {
    if (!projectId || !isUUID(projectId)) {
      throw new BadRequestException('projectId must be a valid UUID');
    }
    const { skip, take } = getPaginationParams(page, limit);
    const [data, total] = await this.repo.findAndCount({ where: { projectId }, skip, take, order: { createdAt: 'ASC' } });

    // Attach testCasesCount via a single batch query
    const suiteIds = data.map(s => s.id);
    const counts: Array<{ suiteId: string; count: string }> = suiteIds.length
      ? await this.dataSource.query(
          `SELECT "suiteId", COUNT(*)::int AS count FROM test_cases WHERE "suiteId" = ANY($1) AND "deletedAt" IS NULL GROUP BY "suiteId"`,
          [suiteIds],
        )
      : [];
    const countMap = new Map(counts.map(c => [c.suiteId, Number(c.count)]));
    const enriched = data.map(s => ({ ...s, testCasesCount: countMap.get(s.id) ?? 0 }));

    return paginate(enriched, total, page, take);
  }

  async findById(id: string): Promise<TestSuite> {
    const suite = await this.repo.findOne({ where: { id } });
    if (!suite) throw new NotFoundException('Test suite not found');
    return suite;
  }

  async update(id: string, dto: UpdateTestSuiteDto): Promise<TestSuite> {
    await this.findById(id);
    await this.repo.update(id, dto as any);
    return this.findById(id);
  }

  async remove(id: string): Promise<void> {
    await this.findById(id);
    await this.repo.softDelete(id);
  }

  async countByProject(projectId: string): Promise<number> {
    return this.repo.count({ where: { projectId } });
  }
}
