import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '@/common/decorators/roles.decorator';
import { PERMISSIONS_KEY } from '@/common/decorators/permissions.decorator';
import { UserRole } from '@/modules/users/entities/user.entity';
import { PermissionCacheService } from '@/modules/rbac/permission-cache.service';
import { RbacService } from '@/modules/rbac/rbac.service';

/**
 * Hybrid guard that supports both:
 * - Legacy: @Roles(UserRole.ADMIN, UserRole.QA_LEAD) — checks role slug
 * - New:    @Permissions('projects:create') — checks granular permission codes
 *
 * Resolution order:
 * 1. If @Permissions is set, check user's resolved permissions
 * 2. If @Roles is set (legacy), resolve role → permissions, or fallback to slug match
 * 3. If neither is set, allow access (authenticated-only)
 */
@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(
    private reflector: Reflector,
    private permCache: PermissionCacheService,
    private rbacService: RbacService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // No guard metadata → allow (authenticated users only, JWT guard already ran)
    if ((!requiredPermissions || requiredPermissions.length === 0) &&
        (!requiredRoles || requiredRoles.length === 0)) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Resolve user's role ID
    const roleId = await this.resolveRoleId(user);

    // If user has a resolved roleId, check permissions
    if (roleId) {
      const userPermissions = await this.permCache.getPermissionsForRole(roleId);

      // New-style: @Permissions('projects:create')
      if (requiredPermissions && requiredPermissions.length > 0) {
        const hasPermission = requiredPermissions.some((p) => userPermissions.has(p));
        if (!hasPermission) {
          throw new ForbiddenException(
            `Access denied. Required permission: ${requiredPermissions.join(' or ')}`,
          );
        }
        return true;
      }

      // Legacy-style: @Roles(UserRole.ADMIN, UserRole.QA_LEAD)
      // The user's role slug should match one of the required roles
      if (requiredRoles && requiredRoles.length > 0) {
        // First try slug match (fast path)
        const roleSlug = user.roleEntity?.slug || user.role;
        if (requiredRoles.includes(roleSlug as UserRole)) {
          return true;
        }
        // Slug didn't match — deny
        throw new ForbiddenException(
          `Access denied. Required roles: ${requiredRoles.join(', ')}. Your role: ${roleSlug}`,
        );
      }
    }

    // Fallback: legacy enum-only check (for users not yet migrated to roleId)
    if (requiredRoles && requiredRoles.length > 0) {
      if (!requiredRoles.includes(user.role)) {
        throw new ForbiddenException(
          `Access denied. Required roles: ${requiredRoles.join(', ')}. Your role: ${user.role}`,
        );
      }
      return true;
    }

    return true;
  }

  /** Resolve the user's org-level roleId — from roleId column, or by looking up their legacy enum slug */
  private async resolveRoleId(user: any): Promise<string | null> {
    if (user.roleId) return user.roleId;

    // Legacy user without roleId: find role by (orgId, slug=user.role)
    if (user.role && user.organizationId) {
      try {
        const role = await this.rbacService.findRoleBySlug(user.organizationId, user.role);
        if (role) {
          // Cache on request user so we don't re-query
          user.roleId = role.id;
          user.roleEntity = role;
          return role.id;
        }
      } catch {
        // Org might not have roles seeded yet
      }
    }
    return null;
  }
}
