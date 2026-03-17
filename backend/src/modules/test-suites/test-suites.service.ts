import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { getPaginationParams, paginate } from '@/common/utils/pagination.util';
import { TestSuite } from './entities/test-suite.entity';
import { isUUID } from 'class-validator';
import { CreateTestSuiteDto } from './dto/create-test-suite.dto';
import { UpdateTestSuiteDto } from './dto/update-test-suite.dto';

@Injectable()
export class TestSuitesService {
  constructor(@InjectRepository(TestSuite) private repo: Repository<TestSuite>) {}

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
    return paginate(data, total, page, take);
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
