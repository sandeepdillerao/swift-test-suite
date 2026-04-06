import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { User, UserRole } from '@/modules/users/entities/user.entity';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectsService } from './projects.service';

@ApiTags('Projects')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('projects')
export class ProjectsController {
  constructor(private readonly service: ProjectsService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.QA_LEAD)
  @ApiOperation({ summary: 'Create project' })
  @ApiResponse({ status: 201 })
  create(@CurrentUser() user: User, @Body() dto: CreateProjectDto) {
    return this.service.create(user.organizationId, user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List projects (filtered by membership for non-admins)' })
  @ApiQuery({ name: 'page', required: false }) @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'search', required: false }) @ApiQuery({ name: 'isArchived', required: false })
  findAll(
    @CurrentUser() user: User,
    @Query('page') page = 1, @Query('limit') limit = 20,
    @Query('sortBy') sortBy = 'createdAt', @Query('sortOrder') sortOrder: 'ASC' | 'DESC' = 'DESC',
    @Query('search') search?: string, @Query('isArchived') isArchived?: boolean,
  ) {
    return this.service.findAll(user.organizationId, user.id, user.role, +page, +limit, sortBy, sortOrder, search, isArchived);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get project by ID' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.service.findById(id, user.organizationId);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.QA_LEAD)
  @ApiOperation({ summary: 'Update project' })
  update(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User, @Body() dto: UpdateProjectDto) {
    return this.service.update(id, user.organizationId, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete project (soft)' })
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.service.remove(id, user.organizationId);
  }
}
