import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { User } from '@/modules/users/entities/user.entity';
import { RbacService } from './rbac.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { UpdateRolePermissionsDto } from './dto/update-role-permissions.dto';
import { AddProjectMemberDto, UpdateProjectMemberRoleDto } from './dto/add-project-member.dto';

@ApiTags('RBAC')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('rbac')
export class RbacController {
  constructor(private readonly rbacService: RbacService) {}

  // ─── Current user's own permissions (no permission guard — bootstrap endpoint) ─

  @Get('my-permissions')
  @ApiOperation({ summary: 'Get the current user\'s resolved permission codes' })
  async getMyPermissions(@CurrentUser() user: User) {
    if (!user.roleId) return [];
    return this.rbacService.getRolePermissions(user.roleId, user.organizationId);
  }

  // ─── Permissions Catalog ────────────────────────────────────────────────────

  @Get('permissions')
  @Permissions('roles:read')
  @ApiOperation({ summary: 'List all platform permissions' })
  async getAllPermissions() {
    return this.rbacService.getAllPermissions();
  }

  // ─── Roles CRUD ─────────────────────────────────────────────────────────────

  @Get('roles')
  @Permissions('roles:read')
  @ApiOperation({ summary: 'List all roles for the organization' })
  async getRoles(@CurrentUser() user: User) {
    return this.rbacService.getRoles(user.organizationId);
  }

  @Get('roles/:id')
  @Permissions('roles:read')
  @ApiOperation({ summary: 'Get role details' })
  async getRole(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.rbacService.getRoleById(id, user.organizationId);
  }

  @Post('roles')
  @Permissions('roles:create')
  @ApiOperation({ summary: 'Create a custom role' })
  async createRole(@CurrentUser() user: User, @Body() dto: CreateRoleDto) {
    return this.rbacService.createRole(user.organizationId, dto);
  }

  @Patch('roles/:id')
  @Permissions('roles:update')
  @ApiOperation({ summary: 'Update role name/description' })
  async updateRole(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRoleDto,
  ) {
    return this.rbacService.updateRole(id, user.organizationId, dto);
  }

  @Delete('roles/:id')
  @Permissions('roles:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a custom role (system roles cannot be deleted)' })
  async deleteRole(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    await this.rbacService.deleteRole(id, user.organizationId);
  }

  // ─── Role Permissions ───────────────────────────────────────────────────────

  @Get('roles/:id/permissions')
  @ApiOperation({ summary: 'Get permissions for a role (any authenticated user can read their own role)' })
  async getRolePermissions(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.rbacService.getRolePermissions(id, user.organizationId);
  }

  @Put('roles/:id/permissions')
  @Permissions('roles:update')
  @ApiOperation({ summary: 'Set permissions for a role (full replace)' })
  async setRolePermissions(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRolePermissionsDto,
  ) {
    return this.rbacService.setRolePermissions(id, user.organizationId, dto.permissions);
  }

  // ─── Project Members ────────────────────────────────────────────────────────

  @Get('projects/:projectId/members')
  @Permissions('projects:read')
  @ApiOperation({ summary: 'List members of a project' })
  async getProjectMembers(@Param('projectId', ParseUUIDPipe) projectId: string) {
    return this.rbacService.getProjectMembers(projectId);
  }

  @Post('projects/:projectId/members')
  @Permissions('projects:update')
  @ApiOperation({ summary: 'Add a member to a project' })
  async addProjectMember(
    @CurrentUser() user: User,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: AddProjectMemberDto,
  ) {
    return this.rbacService.addProjectMember(projectId, dto.userId, dto.roleId, user.id);
  }

  @Patch('projects/:projectId/members/:userId')
  @Permissions('projects:update')
  @ApiOperation({ summary: 'Change a project member\'s role' })
  async updateProjectMemberRole(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: UpdateProjectMemberRoleDto,
  ) {
    return this.rbacService.updateProjectMemberRole(projectId, userId, dto.roleId);
  }

  @Delete('projects/:projectId/members/:userId')
  @Permissions('projects:update')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a member from a project' })
  async removeProjectMember(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    await this.rbacService.removeProjectMember(projectId, userId);
  }
}
