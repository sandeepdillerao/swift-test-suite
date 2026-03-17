import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { getPaginationParams, paginate } from '@/common/utils/pagination.util';
import { Release } from './entities/release.entity';
import { ReleaseStatus } from './entities/release.enums';
import { CreateReleaseDto } from './dto/create-release.dto';
import { UpdateReleaseDto } from './dto/update-release.dto';
import { isUUID } from 'class-validator';

@Injectable()
export class ReleasesService {
  constructor(@InjectRepository(Release) private repo: Repository<Release>) {}

  async create(createdBy: string, dto: CreateReleaseDto): Promise<Release> {
    const release = this.repo.create({
      ...dto,
      createdBy,
      status: dto.status ?? ReleaseStatus.PLANNING,
      plannedDate: dto.plannedDate ? new Date(dto.plannedDate) : null,
    });
    return this.repo.save(release);
  }

  async findAll(projectId: string, page = 1, limit = 20, sortBy = 'createdAt', sortOrder: 'ASC' | 'DESC' = 'DESC', status?: ReleaseStatus) {
    if (!projectId || !isUUID(projectId)) {
      throw new BadRequestException('projectId must be a valid UUID');
    }
    const { skip, take } = getPaginationParams(page, limit);
    const where: any = { projectId, ...(status && { status }) };
    const [data, total] = await this.repo.findAndCount({ where, skip, take, order: { [sortBy]: sortOrder } });
    return paginate(data, total, page, take);
  }

  async findById(id: string): Promise<Release> {
    const release = await this.repo.findOne({ where: { id } });
    if (!release) throw new NotFoundException('Release not found');
    return release;
  }

  async update(id: string, dto: UpdateReleaseDto): Promise<Release> {
    await this.findById(id);
    const updateData: any = { ...dto };
    if (dto.plannedDate) updateData.plannedDate = new Date(dto.plannedDate);
    if (dto.releasedDate) updateData.releasedDate = new Date(dto.releasedDate);
    await this.repo.update(id, updateData);
    return this.findById(id);
  }

  async remove(id: string): Promise<void> {
    await this.findById(id);
    await this.repo.softDelete(id);
  }
}
