import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, In, Repository } from 'typeorm';
import { getPaginationParams, paginate } from '@/common/utils/pagination.util';
import { Project } from './entities/project.entity';
import { ProjectMember } from '@/modules/rbac/entities/project-member.entity';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project) private repo: Repository<Project>,
    @InjectRepository(ProjectMember) private pmRepo: Repository<ProjectMember>,
  ) {}

  async create(organizationId: string, createdBy: string, dto: CreateProjectDto): Promise<Project> {
    const existing = await this.repo.findOne({ where: { organizationId, key: dto.key } });
    if (existing) throw new ConflictException(`Project key '${dto.key}' already used in this organization`);
    const { jiraProjectKey, ...rest } = dto;
    const settings: Record<string, unknown> = {};
    if (jiraProjectKey) settings.jiraProjectKey = jiraProjectKey;
    const project = this.repo.create({ ...rest, organizationId, createdBy, settings });
    const saved = await this.repo.save(project);

    // Auto-add creator as project member (uses first available role or null)
    try {
      await this.pmRepo.save(this.pmRepo.create({
        projectId: saved.id,
        userId: createdBy,
        roleId: null as any, // Will use org-level role by default
        addedBy: createdBy,
      }));
    } catch {
      // Non-critical — creator still has org-level access
    }

    return saved;
  }

  /**
   * List projects. Admins see all; other users see only projects they're a member of.
   */
  async findAll(
    organizationId: string,
    userId: string,
    userRole: string,
    page = 1,
    limit = 20,
    sortBy = 'createdAt',
    sortOrder: 'ASC' | 'DESC' = 'DESC',
    search?: string,
    isArchived?: boolean,
  ) {
    const { skip, take } = getPaginationParams(page, limit);

    // Non-admin users only see projects they belong to
    let projectIds: string[] | null = null;
    if (userRole !== 'admin') {
      const memberships = await this.pmRepo.find({
        where: { userId },
        select: ['projectId'],
      });
      projectIds = memberships.map((m) => m.projectId);
      if (projectIds.length === 0) {
        return paginate([], 0, page, take);
      }
    }

    const where: any = { organizationId, ...(isArchived !== undefined && { isArchived }) };
    if (projectIds) where.id = In(projectIds);

    const baseWhere = search
      ? [{ ...where, name: ILike(`%${search}%`) }, { ...where, key: ILike(`%${search}%`) }]
      : [where];

    const [data, total] = await this.repo.findAndCount({
      where: baseWhere,
      skip,
      take,
      order: { [sortBy]: sortOrder },
    });
    return paginate(data, total, page, take);
  }

  async findById(id: string, organizationId: string): Promise<Project> {
    const project = await this.repo.findOne({ where: { id, organizationId } });
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  async update(id: string, organizationId: string, dto: UpdateProjectDto): Promise<Project> {
    const project = await this.findById(id, organizationId);
    const { jiraProjectKey, settings: dtoSettings, ...rest } = dto;

    if (jiraProjectKey !== undefined) {
      const currentSettings = (project.settings || {}) as Record<string, unknown>;
      if (jiraProjectKey === null || jiraProjectKey === '') {
        delete currentSettings.jiraProjectKey;
      } else {
        currentSettings.jiraProjectKey = jiraProjectKey;
      }
      (rest as any).settings = { ...currentSettings, ...(dtoSettings || {}) };
    } else if (dtoSettings) {
      (rest as any).settings = { ...(project.settings || {}), ...dtoSettings };
    }

    await this.repo.update(id, rest as any);
    return this.findById(id, organizationId);
  }

  async remove(id: string, organizationId: string): Promise<void> {
    await this.findById(id, organizationId);
    await this.repo.softDelete(id);
  }

  /** Check if a user is a member of a project */
  async isMember(projectId: string, userId: string): Promise<boolean> {
    const count = await this.pmRepo.count({ where: { projectId, userId } });
    return count > 0;
  }
}
