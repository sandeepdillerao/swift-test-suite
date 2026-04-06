import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { User, UserRole } from '@/modules/users/entities/user.entity';
import { EnvironmentsService } from './environments.service';
import { CreateEnvironmentDto } from './dto/create-environment.dto';
import { UpdateEnvironmentDto } from './dto/update-environment.dto';

@ApiTags('Project Environments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('projects/:projectId/environments')
export class EnvironmentsController {
  constructor(private readonly service: EnvironmentsService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.QA_LEAD)
  @ApiOperation({ summary: 'Create environment for project' })
  create(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser() user: User,
    @Body() dto: CreateEnvironmentDto,
  ) {
    return this.service.create(projectId, user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List environments for project' })
  findAll(@Param('projectId', ParseUUIDPipe) projectId: string) {
    return this.service.findAll(projectId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get environment by ID' })
  findOne(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.findById(id, projectId);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.QA_LEAD)
  @ApiOperation({ summary: 'Update environment' })
  update(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEnvironmentDto,
  ) {
    return this.service.update(id, projectId, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.QA_LEAD)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete environment' })
  remove(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.remove(id, projectId);
  }
}
