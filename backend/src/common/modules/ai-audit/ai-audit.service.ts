import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiAuditLog } from './ai-audit-log.entity';

export interface AiAuditEntry {
  userId: string;
  orgId: string;
  feature: string;
  action: string;
  provider: string;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
  responseTimeMs?: number;
  success: boolean;
  errorMessage?: string | null;
  metadata?: Record<string, any> | null;
}

@Injectable()
export class AiAuditService {
  private readonly logger = new Logger(AiAuditService.name);

  constructor(
    @InjectRepository(AiAuditLog) private readonly repo: Repository<AiAuditLog>,
  ) {}

  /** Fire-and-forget audit log — never throws */
  async log(entry: AiAuditEntry): Promise<void> {
    try {
      const record = this.repo.create({
        ...entry,
        inputTokens: entry.inputTokens ?? 0,
        outputTokens: entry.outputTokens ?? 0,
        totalTokens: (entry.inputTokens ?? 0) + (entry.outputTokens ?? 0),
        responseTimeMs: entry.responseTimeMs ?? 0,
        errorMessage: entry.errorMessage ?? null,
        metadata: entry.metadata ?? null,
      });
      await this.repo.save(record);
    } catch (err) {
      this.logger.error(`Failed to save AI audit log: ${(err as Error).message}`);
    }
  }

  /** Query logs with filters */
  async findAll(filters: {
    orgId?: string;
    userId?: string;
    feature?: string;
    limit?: number;
    offset?: number;
  }) {
    const qb = this.repo.createQueryBuilder('log').orderBy('log.createdAt', 'DESC');

    if (filters.orgId) qb.andWhere('log.orgId = :orgId', { orgId: filters.orgId });
    if (filters.userId) qb.andWhere('log.userId = :userId', { userId: filters.userId });
    if (filters.feature) qb.andWhere('log.feature = :feature', { feature: filters.feature });

    qb.take(filters.limit ?? 50).skip(filters.offset ?? 0);

    const [logs, total] = await qb.getManyAndCount();
    return { logs, total };
  }
}
