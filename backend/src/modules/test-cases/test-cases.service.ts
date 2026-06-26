import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { getPaginationParams, paginate } from '@/common/utils/pagination.util';
import { TestCase } from './entities/test-case.entity';
import { Priority, TestStatus, TestType } from './entities/test-case.enums';
import { CreateTestCaseDto } from './dto/create-test-case.dto';
import { UpdateTestCaseDto } from './dto/update-test-case.dto';

@Injectable()
export class TestCasesService {
  constructor(@InjectRepository(TestCase) private repo: Repository<TestCase>) {}

  async create(createdBy: string, dto: CreateTestCaseDto): Promise<TestCase> {
    const [{ val }] = await this.repo.query("SELECT nextval('tc_id_seq') AS val");
    const tcId = `TC-${String(val).padStart(3, '0')}`;
    const testCase = this.repo.create({
      ...dto,
      tcId,
      createdBy,
      assignedTo: dto.assignedTo ?? null,
      steps: dto.steps ?? [],
      tags: dto.tags ?? [],
      variables: dto.variables ?? {},
      priority: dto.priority ?? Priority.MEDIUM,
      type: dto.type ?? TestType.MANUAL,
      status: TestStatus.NOT_RUN,
    });
    return this.repo.save(testCase);
  }

  async findAll(
    params: { projectId?: string; suiteId?: string; search?: string; status?: TestStatus; priority?: Priority; type?: TestType; tags?: string },
    page = 1, limit = 20, sortBy = 'createdAt', sortOrder: 'ASC' | 'DESC' = 'DESC',
  ) {
    const { skip, take } = getPaginationParams(page, limit);
    const qb = this.repo.createQueryBuilder('tc').where('tc.deletedAt IS NULL');
    if (params.projectId) qb.andWhere('tc.projectId = :projectId', { projectId: params.projectId });
    if (params.suiteId) qb.andWhere('tc.suiteId = :suiteId', { suiteId: params.suiteId });
    if (params.status) qb.andWhere('tc.status = :status', { status: params.status });
    if (params.priority) qb.andWhere('tc.priority = :priority', { priority: params.priority });
    if (params.type) qb.andWhere('tc.type = :type', { type: params.type });
    if (params.search) qb.andWhere('tc.title ILIKE :search', { search: `%${params.search}%` });
    if (params.tags) qb.andWhere(':tag = ANY(tc.tags)', { tag: params.tags });
    qb.skip(skip).take(take).orderBy(`tc.${sortBy}`, sortOrder);
    const [data, total] = await qb.getManyAndCount();
    return paginate(data, total, page, take);
  }

  async findById(id: string): Promise<TestCase> {
    const tc = await this.repo.findOne({ where: { id }, relations: ['project', 'suite'] });
    if (!tc) throw new NotFoundException('Test case not found');
    return tc;
  }

  async update(id: string, dto: UpdateTestCaseDto): Promise<TestCase> {
    await this.findById(id);
    await this.repo.save({ id, ...dto });
    return this.findById(id);
  }

  async remove(id: string): Promise<void> {
    await this.findById(id);
    await this.repo.softDelete(id);
  }

  async countByProject(projectId: string): Promise<number> {
    return this.repo.count({ where: { projectId } });
  }

  async getStatusCountsByProject(projectId: string) {
    const result = await this.repo
      .createQueryBuilder('tc')
      .select('tc.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('tc.projectId = :projectId AND tc.deletedAt IS NULL', { projectId })
      .groupBy('tc.status')
      .getRawMany();
    return result;
  }
}
