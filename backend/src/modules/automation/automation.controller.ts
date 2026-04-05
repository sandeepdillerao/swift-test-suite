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
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { User, UserRole } from '@/modules/users/entities/user.entity';
import { AutomationService } from './automation.service';
import { GenerateScriptDto, ImportCodegenScriptDto } from './dto/generate-script.dto';
import { UpdateScriptDto } from './dto/update-script.dto';
import { ExecuteScriptDto } from './dto/execute-script.dto';

@ApiTags('Automation')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('automation')
export class AutomationController {
  constructor(private readonly service: AutomationService) {}

  // ─── Script Generation ────────────────────────────────────────────────────

  @Post('scripts/generate')
  @Roles(UserRole.ADMIN, UserRole.QA_LEAD, UserRole.TESTER)
  @ApiOperation({ summary: 'Generate Playwright script from test case using AI' })
  generate(@CurrentUser() user: User, @Body() dto: GenerateScriptDto) {
    return this.service.generateScript(user.id, dto);
  }

  @Post('scripts/import-codegen')
  @Roles(UserRole.ADMIN, UserRole.QA_LEAD, UserRole.TESTER)
  @ApiOperation({ summary: 'Import a Playwright codegen recording and refactor with AI' })
  importCodegen(@CurrentUser() user: User, @Body() dto: ImportCodegenScriptDto) {
    return this.service.importCodegenScript(user.id, dto);
  }

  // ─── Script CRUD ──────────────────────────────────────────────────────────

  @Get('scripts/test-case/:testCaseId')
  @ApiOperation({ summary: 'Get all automation scripts for a test case' })
  findByTestCase(@Param('testCaseId', ParseUUIDPipe) testCaseId: string) {
    return this.service.findByTestCase(testCaseId);
  }

  @Get('scripts/:id')
  @ApiOperation({ summary: 'Get automation script by ID' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findById(id);
  }

  @Patch('scripts/:id')
  @Roles(UserRole.ADMIN, UserRole.QA_LEAD, UserRole.TESTER)
  @ApiOperation({ summary: 'Update automation script' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateScriptDto) {
    return this.service.update(id, dto);
  }

  @Delete('scripts/:id')
  @Roles(UserRole.ADMIN, UserRole.QA_LEAD)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete automation script (soft)' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }

  // ─── Execution ────────────────────────────────────────────────────────────

  @Post('scripts/:id/execute')
  @Roles(UserRole.ADMIN, UserRole.QA_LEAD, UserRole.TESTER)
  @ApiOperation({ summary: 'Execute an automation script' })
  execute(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ExecuteScriptDto,
  ) {
    return this.service.executeScript(user.id, id, dto);
  }

  @Get('scripts/:id/executions')
  @ApiOperation({ summary: 'Get execution history for a script' })
  @ApiQuery({ name: 'limit', required: false })
  getExecutions(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('limit') limit?: number,
  ) {
    return this.service.getExecutions(id, limit ? +limit : 20);
  }

  @Get('executions/test-case/:testCaseId')
  @ApiOperation({ summary: 'Get all executions for a test case' })
  @ApiQuery({ name: 'limit', required: false })
  getExecutionsByTestCase(
    @Param('testCaseId', ParseUUIDPipe) testCaseId: string,
    @Query('limit') limit?: number,
  ) {
    return this.service.getExecutionsByTestCase(testCaseId, limit ? +limit : 20);
  }

  @Get('executions/:id')
  @ApiOperation({ summary: 'Get execution details' })
  getExecution(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.getExecution(id);
  }
}
