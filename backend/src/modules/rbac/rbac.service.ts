import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Permission } from './entities/permission.entity';
import { Role } from './entities/role.entity';
import { RolePermission } from './entities/role-permission.entity';
import { ProjectMember } from './entities/project-member.entity';
import { PermissionCacheService } from './permission-cache.service';
import { PERMISSION_CATALOG, DEFAULT_ROLE_PERMISSIONS, ALL_PERMISSION_CODES } from './permissions.catalog';

@Injectable()
export class RbacService {
  private readonly logger = new Logger(RbacService.name);

  constructor(
    @InjectRepository(Permission) private readonly permRepo: Repository<Permission>,
    @InjectRepository(Role) private readonly roleRepo: Repository<Role>,
    @InjectRepository(RolePermission) private readonly rpRepo: Repository<RolePermission>,
    @InjectRepository(ProjectMember) private readonly pmRepo: Repository<ProjectMember>,
    private readonly permCache: PermissionCacheService,
  ) {}

  // ─── Platform Permission Seeding (runs once on startup) ─────────────────────

  async seedPermissions(): Promise<void> {
    const existing = await this.permRepo.find();
    const existingCodes = new Set(existing.map((p) => p.code));

    const toInsert = PERMISSION_CATALOG.filter((p) => !existingCodes.has(p.code));
    if (toInsert.length > 0) {
      await this.permRepo.save(toInsert.map((p) => this.permRepo.create(p)));
      this.logger.log(`Seeded ${toInsert.length} new permissions`);
    }
  }

  // ─── Organization Default Roles (called on org creation) ────────────────────

  async seedDefaultRolesForOrg(organizationId: string): Promise<void> {
    const allPerms = await this.permRepo.find();
    const permByCode = new Map(allPerms.map((p) => [p.code, p]));

    for (const [slug, def] of Object.entries(DEFAULT_ROLE_PERMISSIONS)) {
      let role = await this.roleRepo.findOne({ where: { organizationId, slug } });
      let isNewRole = false;

      if (!role) {
        role = await this.roleRepo.save(
          this.roleRepo.create({
            organizationId,
            name: def.name,
            slug,
            description: def.description,
            isSystem: true,
            isDefault: slug === 'tester',
          }),
        );
        isNewRole = true;
      }

      // Only seed default permissions for NEWLY created roles.
      // Existing roles keep their admin-configured permissions intact.
      if (isNewRole) {
        const permsToAdd = def.permissions
          .map((code) => permByCode.get(code))
          .filter((perm): perm is NonNullable<typeof perm> => !!perm)
          .map((perm) => this.rpRepo.create({ roleId: role!.id, permissionId: perm.id }));

        if (permsToAdd.length > 0) {
          await this.rpRepo.save(permsToAdd);
          this.logger.log(`Seeded ${permsToAdd.length} permissions for new role ${slug} in org ${organizationId}`);
        }
      }
    }

    this.logger.log(`Seeded default roles for org ${organizationId}`);
  }

  // ─── Resolve role ID from legacy slug ───────────────────────────────────────

  async findRoleBySlug(organizationId: string, slug: string): Promise<Role | null> {
    return this.roleRepo.findOne({ where: { organizationId, slug } });
  }

  // ─── Roles CRUD ─────────────────────────────────────────────────────────────

  async getRoles(organizationId: string): Promise<Role[]> {
    return this.roleRepo.find({
      where: { organizationId },
      order: { isSystem: 'DESC', name: 'ASC' },
    });
  }

  async getRoleById(id: string, organizationId: string): Promise<Role> {
    const role = await this.roleRepo.findOne({ where: { id, organizationId } });
    if (!role) throw new NotFoundException('Role not found');
    return role;
  }

  async createRole(organizationId: string, data: { name: string; slug: string; description?: string }): Promise<Role> {
    const existing = await this.roleRepo.findOne({ where: { organizationId, slug: data.slug } });
    if (existing) throw new ConflictException(`Role slug '${data.slug}' already exists`);

    const role = this.roleRepo.create({
      organizationId,
      name: data.name,
      slug: data.slug,
      description: data.description || null,
      isSystem: false,
      isDefault: false,
    });
    return this.roleRepo.save(role);
  }

  async updateRole(id: string, organizationId: string, data: { name?: string; description?: string; isDefault?: boolean }): Promise<Role> {
    const role = await this.getRoleById(id, organizationId);

    if (data.name !== undefined) role.name = data.name;
    if (data.description !== undefined) role.description = data.description;

    // If setting as default, unset other defaults
    if (data.isDefault === true) {
      await this.roleRepo.update({ organizationId, isDefault: true }, { isDefault: false });
      role.isDefault = true;
    } else if (data.isDefault === false) {
      role.isDefault = false;
    }

    return this.roleRepo.save(role);
  }

  async deleteRole(id: string, organizationId: string): Promise<void> {
    const role = await this.getRoleById(id, organizationId);
    if (role.isSystem) throw new ForbiddenException('Cannot delete system roles');

    // Check if any users are assigned this role
    // Import User entity check would create circular dep, so use query
    const usersWithRole = await this.roleRepo.manager.query(
      `SELECT COUNT(*) as count FROM users WHERE "roleId" = $1 AND "deletedAt" IS NULL`,
      [id],
    );
    if (parseInt(usersWithRole[0].count) > 0) {
      throw new BadRequestException('Cannot delete role — users are still assigned to it. Reassign them first.');
    }

    await this.roleRepo.softDelete(id);
    this.permCache.invalidateRole(id);
  }

  // ─── Role Permissions ───────────────────────────────────────────────────────

  async getRolePermissions(roleId: string, organizationId: string): Promise<string[]> {
    await this.getRoleById(roleId, organizationId); // ensure role belongs to org
    const perms = await this.permCache.getPermissionsForRole(roleId);
    return Array.from(perms);
  }

  async setRolePermissions(roleId: string, organizationId: string, permissionCodes: string[]): Promise<string[]> {
    const role = await this.getRoleById(roleId, organizationId);

    // Validate codes
    const invalid = permissionCodes.filter((c) => !ALL_PERMISSION_CODES.has(c));
    if (invalid.length > 0) throw new BadRequestException(`Invalid permission codes: ${invalid.join(', ')}`);

    // Resolve permission IDs
    const permissions = await this.permRepo.find({ where: { code: In(permissionCodes) } });

    // Replace all permissions
    await this.rpRepo.delete({ roleId });
    const rps = permissions.map((p) => this.rpRepo.create({ roleId, permissionId: p.id }));
    if (rps.length > 0) await this.rpRepo.save(rps);

    this.permCache.invalidateRole(roleId);
    return permissionCodes;
  }

  // ─── All Permissions (catalog) ──────────────────────────────────────────────

  async getAllPermissions(): Promise<Permission[]> {
    return this.permRepo.find({ order: { category: 'ASC', code: 'ASC' } });
  }

  // ─── Project Members ───────────────────────────────────────────────────────

  async getProjectMembers(projectId: string): Promise<ProjectMember[]> {
    return this.pmRepo.find({
      where: { projectId },
      relations: ['user', 'role'],
      order: { createdAt: 'ASC' },
    });
  }

  async addProjectMember(projectId: string, userId: string, roleId: string, addedBy: string): Promise<ProjectMember> {
    const existing = await this.pmRepo.findOne({ where: { projectId, userId } });
    if (existing) throw new ConflictException('User is already a member of this project');

    const member = this.pmRepo.create({ projectId, userId, roleId, addedBy });
    return this.pmRepo.save(member);
  }

  async updateProjectMemberRole(projectId: string, userId: string, roleId: string): Promise<ProjectMember> {
    const member = await this.pmRepo.findOne({ where: { projectId, userId } });
    if (!member) throw new NotFoundException('Project member not found');
    member.roleId = roleId;
    return this.pmRepo.save(member);
  }

  async removeProjectMember(projectId: string, userId: string): Promise<void> {
    const member = await this.pmRepo.findOne({ where: { projectId, userId } });
    if (!member) throw new NotFoundException('Project member not found');
    await this.pmRepo.remove(member);
  }

  /** Get user's effective role for a specific project (project override or org role) */
  async getProjectRoleId(projectId: string, userId: string): Promise<string | null> {
    const member = await this.pmRepo.findOne({ where: { projectId, userId } });
    return member?.roleId ?? null;
  }
}
