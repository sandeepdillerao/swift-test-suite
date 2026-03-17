import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { getPaginationParams, paginate } from '@/common/utils/pagination.util';
import { User, UserRole } from '@/modules/users/entities/user.entity';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { Organization } from './entities/organization.entity';
import { slugify } from '@/common/utils/hash.util';

@Injectable()
export class OrganizationsService {
  constructor(
    @InjectRepository(Organization)
    private orgRepository: Repository<Organization>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async findById(id: string): Promise<Organization & { memberCount: number }> {
    const org = await this.orgRepository.findOne({ where: { id } });
    if (!org) throw new NotFoundException('Organization not found');

    const memberCount = await this.userRepository.count({
      where: { organizationId: id },
    });

    return { ...org, memberCount };
  }

  async update(id: string, dto: UpdateOrganizationDto): Promise<Organization> {
    const org = await this.orgRepository.findOne({ where: { id } });
    if (!org) throw new NotFoundException('Organization not found');

    const updateData: Partial<Organization> = {
      ...(dto.name && { name: dto.name, slug: slugify(dto.name) }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.logoUrl !== undefined && { logoUrl: dto.logoUrl }),
      ...(dto.website !== undefined && { website: dto.website }),
      ...(dto.settings !== undefined && { settings: dto.settings as Record<string, unknown> }),
    };

    await this.orgRepository.save({ ...org, ...updateData });
    return this.orgRepository.findOne({ where: { id } }) as Promise<Organization>;
  }

  async getMembers(
    organizationId: string,
    page: number,
    limit: number,
    role?: UserRole,
    isActive?: boolean,
  ) {
    const { skip, take } = getPaginationParams(page, limit);

    const where: Record<string, unknown> = { organizationId };
    if (role) where.role = role;
    if (isActive !== undefined) where.isActive = isActive;

    const [users, total] = await this.userRepository.findAndCount({
      where,
      skip,
      take,
      order: { createdAt: 'DESC' },
      relations: ['organization'],
    });

    return paginate(users, total, page, take);
  }

  async getStats(organizationId: string) {
    const [totalUsers, activeUsers] = await Promise.all([
      this.userRepository.count({ where: { organizationId } }),
      this.userRepository.count({ where: { organizationId, isActive: true } }),
    ]);

    return {
      totalUsers,
      activeUsers,
      totalProjects: 0,
      totalTestCases: 0,
      totalTestRuns: 0,
    };
  }
}
