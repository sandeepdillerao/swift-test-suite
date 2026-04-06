import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectEnvironment, AuthConfig } from './entities/project-environment.entity';
import { CreateEnvironmentDto } from './dto/create-environment.dto';
import { UpdateEnvironmentDto } from './dto/update-environment.dto';
import { encrypt, decrypt } from '@/common/utils/encryption.util';

@Injectable()
export class EnvironmentsService {
  constructor(
    @InjectRepository(ProjectEnvironment) private readonly repo: Repository<ProjectEnvironment>,
    private readonly configService: ConfigService,
  ) {}

  private get encryptionKey(): string {
    return this.configService.get<string>('SETTINGS_ENCRYPTION_KEY') ?? 'change-me-in-production-32-chars!!';
  }

  // ── CRUD ───────────────────────────────────────────────────────────────

  async create(projectId: string, createdBy: string, dto: CreateEnvironmentDto): Promise<ProjectEnvironment> {
    if (dto.isDefault) await this.clearDefault(projectId);

    const env = this.repo.create({
      ...dto,
      projectId,
      createdBy,
      authConfigs: this.encryptAuthConfigs(dto.authConfigs || []),
    });
    const saved = await this.repo.save(env);
    return this.maskPasswords(saved);
  }

  async findAll(projectId: string): Promise<ProjectEnvironment[]> {
    const envs = await this.repo.find({
      where: { projectId },
      order: { isDefault: 'DESC', name: 'ASC' },
    });
    return envs.map((e) => this.maskPasswords(e));
  }

  async findById(id: string, projectId: string): Promise<ProjectEnvironment> {
    const env = await this.repo.findOne({ where: { id, projectId } });
    if (!env) throw new NotFoundException('Environment not found');
    return this.maskPasswords(env);
  }

  /** Get raw environment with decrypted credentials (for automation execution) */
  async findByIdWithCredentials(id: string): Promise<ProjectEnvironment> {
    const env = await this.repo.findOne({ where: { id } });
    if (!env) throw new NotFoundException('Environment not found');
    env.authConfigs = this.decryptAuthConfigs(env.authConfigs);
    return env;
  }

  async update(id: string, projectId: string, dto: UpdateEnvironmentDto): Promise<ProjectEnvironment> {
    const env = await this.repo.findOne({ where: { id, projectId } });
    if (!env) throw new NotFoundException('Environment not found');

    if (dto.isDefault) await this.clearDefault(projectId);
    if (dto.authConfigs) {
      (dto as any).authConfigs = this.encryptAuthConfigs(dto.authConfigs);
    }

    await this.repo.update(id, dto as any);
    return this.findById(id, projectId);
  }

  async remove(id: string, projectId: string): Promise<void> {
    const env = await this.repo.findOne({ where: { id, projectId } });
    if (!env) throw new NotFoundException('Environment not found');
    await this.repo.softDelete(id);
  }

  // ── Encryption helpers ─────────────────────────────────────────────────

  private async clearDefault(projectId: string): Promise<void> {
    await this.repo.update({ projectId, isDefault: true }, { isDefault: false });
  }

  private encryptAuthConfigs(configs: AuthConfig[]): AuthConfig[] {
    return configs.map((c) => ({ ...c, password: encrypt(c.password, this.encryptionKey) }));
  }

  private decryptAuthConfigs(configs: AuthConfig[]): AuthConfig[] {
    return (configs || []).map((c) => {
      try {
        return { ...c, password: decrypt(c.password, this.encryptionKey) };
      } catch {
        return { ...c, password: '' };
      }
    });
  }

  private maskPasswords(env: ProjectEnvironment): ProjectEnvironment {
    env.authConfigs = (env.authConfigs || []).map((c) => ({ ...c, password: '••••••••' }));
    return env;
  }
}
