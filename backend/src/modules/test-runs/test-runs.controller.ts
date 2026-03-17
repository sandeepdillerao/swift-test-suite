import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { User, UserRole } from '@/modules/users/entities/user.entity';
import { TestRunStatus } from './entities/test-run.enums';
import { CreateTestRunDto } from './dto/create-test-run.dto';
import { UpdateTestRunDto } from './dto/update-test-run.dto';
import { UpdateTestRunCaseDto } from './dto/update-test-run-case.dto';
import { TestRunsService } from './test-runs.service';

@ApiTags('Test Runs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('test-runs')
export class TestRunsController {
  constructor(private readonly service: TestRunsService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.QA_LEAD)
  @ApiOperation({ summary: 'Create test run' })
  create(@CurrentUser() user: User, @Body() dto: CreateTestRunDto) {
    return this.service.create(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List test runs by project' })
  findAll(
    @Query('projectId') projectId: string,
    @Query('page') page = 1, @Query('limit') limit = 20,
    @Query('sortBy') sortBy = 'createdAt', @Query('sortOrder') sortOrder: 'ASC' | 'DESC' = 'DESC',
    @Query('status') status?: TestRunStatus,
  ) {
    return this.service.findAll(projectId, +page, +limit, sortBy, sortOrder, status);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get test run with cases' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findById(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.QA_LEAD)
  @ApiOperation({ summary: 'Update test run' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateTestRunDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete test run (soft)' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }

  @Get(':id/history')
  @ApiOperation({ summary: 'Get test run execution history' })
  getHistory(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.getHistory(id);
  }

  @Patch(':id/cases/:testCaseId')
  @Roles(UserRole.ADMIN, UserRole.QA_LEAD, UserRole.TESTER)
  @ApiOperation({ summary: 'Update test case result in run' })
  updateCase(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('testCaseId', ParseUUIDPipe) testCaseId: string,
    @CurrentUser() user: User,
    @Body() dto: UpdateTestRunCaseDto,
  ) {
    return this.service.updateTestCase(id, testCaseId, user.id, dto);
  }
}
