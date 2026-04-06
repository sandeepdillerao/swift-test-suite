import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { getPaginationParams, paginate } from '@/common/utils/pagination.util';
import { Project } from './entities/project.entity';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

@Injectable()
export class ProjectsService {
  constructor(@InjectRepository(Project) private repo: Repository<Project>) {}

  async create(organizationId: string, createdBy: string, dto: CreateProjectDto): Promise<Project> {
    const existing = await this.repo.findOne({ where: { organizationId, key: dto.key } });
    if (existing) throw new ConflictException(`Project key '${dto.key}' already used in this organization`);
    const project = this.repo.create({ ...dto, organizationId, createdBy });
    return this.repo.save(project);
  }

  async findAll(organizationId: string, page = 1, limit = 20, sortBy = 'createdAt', sortOrder: 'ASC' | 'DESC' = 'DESC', search?: string, isArchived?: boolean) {
    const { skip, take } = getPaginationParams(page, limit);
    const where: any = { organizationId, ...(isArchived !== undefined && { isArchived }) };
    const baseWhere = search
      ? [{ ...where, name: ILike(`%${search}%`) }, { ...where, key: ILike(`%${search}%`) }]
      : [where];
    const [data, total] = await this.repo.findAndCount({ where: baseWhere, skip, take, order: { [sortBy]: sortOrder } });
    return paginate(data, total, page, take);
  }

  async findById(id: string, organizationId: string): Promise<Project> {
    const project = await this.repo.findOne({ where: { id, organizationId } });
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  async update(id: string, organizationId: string, dto: UpdateProjectDto): Promise<Project> {
    await this.findById(id, organizationId);
    await this.repo.update(id, dto as any);
    return this.findById(id, organizationId);
  }

  async remove(id: string, organizationId: string): Promise<void> {
    await this.findById(id, organizationId);
    await this.repo.softDelete(id);
  }
}
