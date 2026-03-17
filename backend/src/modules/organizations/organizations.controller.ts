import {
  Body,
  Controller,
  Get,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { User, UserRole } from '@/modules/users/entities/user.entity';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { OrganizationsService } from './organizations.service';

@ApiTags('Organizations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Get('my')
  @ApiOperation({ summary: 'Get my organization' })
  async getMyOrg(@CurrentUser() currentUser: User) {
    return this.organizationsService.findById(currentUser.organizationId);
  }

  @Patch('my')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update my organization' })
  async updateMyOrg(
    @CurrentUser() currentUser: User,
    @Body() dto: UpdateOrganizationDto,
  ) {
    return this.organizationsService.update(currentUser.organizationId, dto);
  }

  @Get('my/members')
  @Roles(UserRole.ADMIN, UserRole.QA_LEAD)
  @ApiOperation({ summary: 'Get organization members' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'role', required: false, enum: UserRole })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  async getMembers(
    @CurrentUser() currentUser: User,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('role') role?: UserRole,
    @Query('isActive') isActive?: boolean,
  ) {
    return this.organizationsService.getMembers(
      currentUser.organizationId,
      +page,
      +limit,
      role,
      isActive,
    );
  }

  @Get('my/stats')
  @Roles(UserRole.ADMIN, UserRole.QA_LEAD)
  @ApiOperation({ summary: 'Get organization statistics' })
  async getStats(@CurrentUser() currentUser: User) {
    return this.organizationsService.getStats(currentUser.organizationId);
  }
}
