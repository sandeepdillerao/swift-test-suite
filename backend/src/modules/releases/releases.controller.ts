import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { User, UserRole } from '@/modules/users/entities/user.entity';
import { ReleaseStatus } from './entities/release.enums';
import { CreateReleaseDto } from './dto/create-release.dto';
import { UpdateReleaseDto } from './dto/update-release.dto';
import { ReleasesService } from './releases.service';

@ApiTags('Releases')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('releases')
export class ReleasesController {
  constructor(private readonly service: ReleasesService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.QA_LEAD)
  @ApiOperation({ summary: 'Create release' })
  create(@CurrentUser() user: User, @Body() dto: CreateReleaseDto) {
    return this.service.create(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List releases by project' })
  findAll(
    @Query('projectId') projectId: string,
    @Query('page') page = 1, @Query('limit') limit = 20,
    @Query('sortBy') sortBy = 'createdAt', @Query('sortOrder') sortOrder: 'ASC' | 'DESC' = 'DESC',
    @Query('status') status?: ReleaseStatus,
  ) {
    return this.service.findAll(projectId, +page, +limit, sortBy, sortOrder, status);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get release by ID' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findById(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.QA_LEAD)
  @ApiOperation({ summary: 'Update release' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateReleaseDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete release (soft)' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }
}
