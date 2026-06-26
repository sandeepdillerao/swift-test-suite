import { Body, Controller, Delete, Get, Header, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { User, UserRole } from '@/modules/users/entities/user.entity';
import { TestRunsService } from './test-runs.service';
import { TestRunExecutionService } from './test-run-execution.service';
import { CreateTestRunDto } from './dto/create-test-run.dto';
import { UpdateTestRunDto } from './dto/update-test-run.dto';
import { UpdateTestRunCaseDto } from './dto/update-test-run-case.dto';
import { TestRunStatus } from './entities/test-run.enums';

@ApiTags('Test Runs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('test-runs')
export class TestRunsController {
  constructor(
    private readonly service: TestRunsService,
    private readonly executionService: TestRunExecutionService,
  ) {}

  // ── CRUD ───────────────────────────────────────────────────────────────

  @Post()
  @Roles(UserRole.ADMIN, UserRole.QA_LEAD)
  @ApiOperation({ summary: 'Create test run (from test case IDs or suite)' })
  create(@CurrentUser() user: User, @Body() dto: CreateTestRunDto) {
    return this.service.create(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List test runs' })
  @ApiQuery({ name: 'projectId', required: true })
  @ApiQuery({ name: 'page', required: false }) @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'status', required: false, enum: TestRunStatus })
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

  // ── CSV Export ─────────────────────────────────────────────────────────

  @Get(':id/export/csv')
  @ApiOperation({ summary: 'Download test run results as CSV' })
  async exportCsv(@Param('id', ParseUUIDPipe) id: string, @Res() res: Response) {
    const csv = await this.service.exportCsv(id);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="test-run-${id}.csv"`);
    res.send(csv);
  }

  // ── History ────────────────────────────────────────────────────────────

  @Get(':id/history')
  @ApiOperation({ summary: 'Get test run execution history' })
  getHistory(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.getHistory(id);
  }

  // ── Individual test case update ────────────────────────────────────────

  @Patch(':id/cases/:testCaseId')
  @Roles(UserRole.ADMIN, UserRole.QA_LEAD, UserRole.TESTER)
  @ApiOperation({ summary: 'Update test case result in run' })
  updateTestCase(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('testCaseId', ParseUUIDPipe) testCaseId: string,
    @CurrentUser() user: User,
    @Body() dto: UpdateTestRunCaseDto,
  ) {
    return this.service.updateTestCase(id, testCaseId, user.id, dto);
  }

  // ── Automation Execution ───────────────────────────────────────────────

  @Post(':id/execute')
  @Roles(UserRole.ADMIN, UserRole.QA_LEAD)
  @ApiOperation({ summary: 'Execute all automated test cases in the run' })
  executeRun(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.executionService.executeAutomatedCases(id, user.id);
  }

  @Get(':id/execution-progress')
  @ApiOperation({ summary: 'Get real-time execution progress' })
  getExecutionProgress(@Param('id', ParseUUIDPipe) id: string) {
    return this.executionService.getExecutionProgress(id);
  }

  @Post(':id/cancel-execution')
  @Roles(UserRole.ADMIN, UserRole.QA_LEAD)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel running automated execution' })
  cancelExecution(@Param('id', ParseUUIDPipe) id: string) {
    return this.executionService.cancelExecution(id);
  }

  // ── Report ──────────────────────────────────────────────────────────────

  @Get(':id/report')
  @ApiOperation({ summary: 'Get test run report with automated/manual breakdown' })
  getReport(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.getReport(id);
  }

  // ── Suite Automation Summary ───────────────────────────────────────────

  @Get('suite/:suiteId/automation-summary')
  @ApiOperation({ summary: 'Get automation readiness summary for a suite' })
  getSuiteAutomationSummary(@Param('suiteId', ParseUUIDPipe) suiteId: string) {
    return this.service.getSuiteAutomationSummary(suiteId);
  }
}
