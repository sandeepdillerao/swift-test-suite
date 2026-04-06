import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RolePermission } from './entities/role-permission.entity';

interface CacheEntry {
  permissions: Set<string>;
  expiresAt: number;
}

@Injectable()
export class PermissionCacheService {
  private readonly logger = new Logger(PermissionCacheService.name);
  private readonly cache = new Map<string, CacheEntry>();
  private readonly TTL = 5 * 60 * 1000; // 5 minutes

  constructor(
    @InjectRepository(RolePermission) private readonly rpRepo: Repository<RolePermission>,
  ) {}

  async getPermissionsForRole(roleId: string): Promise<Set<string>> {
    const cached = this.cache.get(roleId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.permissions;
    }

    const rps = await this.rpRepo.find({
      where: { roleId },
      relations: ['permission'],
    });
    const permissions = new Set(rps.map((rp) => rp.permission.code));

    this.cache.set(roleId, { permissions, expiresAt: Date.now() + this.TTL });
    return permissions;
  }

  /** Invalidate cache for a specific role (call after permission changes) */
  invalidateRole(roleId: string): void {
    this.cache.delete(roleId);
  }

  /** Invalidate all cached roles for an org (call after bulk changes) */
  invalidateAll(): void {
    this.cache.clear();
  }
}
