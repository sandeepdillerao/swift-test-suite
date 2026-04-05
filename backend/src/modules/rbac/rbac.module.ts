import { Global, Module, OnModuleInit, Logger } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Permission } from './entities/permission.entity';
import { Role } from './entities/role.entity';
import { RolePermission } from './entities/role-permission.entity';
import { ProjectMember } from './entities/project-member.entity';
import { User } from '@/modules/users/entities/user.entity';
import { Organization } from '@/modules/organizations/entities/organization.entity';
import { RbacService } from './rbac.service';
import { RbacController } from './rbac.controller';
import { PermissionCacheService } from './permission-cache.service';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([Permission, Role, RolePermission, ProjectMember, User, Organization])],
  controllers: [RbacController],
  providers: [RbacService, PermissionCacheService],
  exports: [RbacService, PermissionCacheService],
})
export class RbacModule implements OnModuleInit {
  private readonly logger = new Logger(RbacModule.name);

  constructor(
    private readonly rbacService: RbacService,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Organization) private readonly orgRepo: Repository<Organization>,
  ) {}

  async onModuleInit() {
    // 1. Seed platform permissions
    await this.rbacService.seedPermissions();
    this.logger.log('Platform permissions seeded');

    // 2. Seed default roles for any org that doesn't have them yet
    const orgs = await this.orgRepo.find({ select: ['id'] });
    for (const org of orgs) {
      await this.rbacService.seedDefaultRolesForOrg(org.id);
    }

    // 3. Backfill roleId for existing users who don't have one
    const usersWithoutRole = await this.userRepo.find({
      where: { roleId: null as any },
      select: ['id', 'organizationId', 'role'],
    });
    if (usersWithoutRole.length > 0) {
      let migrated = 0;
      for (const u of usersWithoutRole) {
        const role = await this.rbacService.findRoleBySlug(u.organizationId, u.role);
        if (role) {
          await this.userRepo.update(u.id, { roleId: role.id });
          migrated++;
        }
      }
      this.logger.log(`Backfilled roleId for ${migrated}/${usersWithoutRole.length} users`);
    }
  }
}
