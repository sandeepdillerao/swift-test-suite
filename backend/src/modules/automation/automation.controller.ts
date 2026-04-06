import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { User, UserRole } from '@/modules/users/entities/user.entity';
import { AutomationService } from './automation.service';
import { GenerateScriptDto, ImportCodegenScriptDto } from './dto/generate-script.dto';
import { UpdateScriptDto } from './dto/update-script.dto';
import { ExecuteScriptDto } from './dto/execute-script.dto';
import { StartCodegenDto } from './dto/codegen-session.dto';

@ApiTags('Automation')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('automation')
export class AutomationController {
  constructor(private readonly service: AutomationService) {}

  // ─── Codegen Recording ──────────────────────────────────────────────────

  @Post('codegen/start')
  @Roles(UserRole.ADMIN, UserRole.QA_LEAD, UserRole.TESTER)
  @ApiOperation({ summary: 'Start a Playwright codegen recording session — opens a browser for the user to interact with' })
  startCodegen(@CurrentUser() user: User, @Body() dto: StartCodegenDto) {
    return this.service.startCodegen(user.id, dto);
  }

  @Get('codegen/:sessionId/status')
  @ApiOperation({ summary: 'Poll codegen session status and recorded script' })
  getCodegenStatus(@Param('sessionId') sessionId: string) {
    return this.service.getCodegenStatus(sessionId);
  }

  @Post('codegen/:sessionId/stop')
  @Roles(UserRole.ADMIN, UserRole.QA_LEAD, UserRole.TESTER)
  @ApiOperation({ summary: 'Stop a codegen recording session' })
  stopCodegen(@Param('sessionId') sessionId: string) {
    return this.service.stopCodegen(sessionId);
  }

  @Post('codegen/:sessionId/complete')
  @Roles(UserRole.ADMIN, UserRole.QA_LEAD, UserRole.TESTER)
  @ApiOperation({ summary: 'Complete codegen flow — feed recorded script to AI with test case context' })
  completeCodegen(@CurrentUser() user: User, @Param('sessionId') sessionId: string) {
    return this.service.completeCodegenFlow(user.id, sessionId);
  }

  // ─── Script Generation ────────────────────────────────────────────────────

  @Post('scripts/generate')
  @Roles(UserRole.ADMIN, UserRole.QA_LEAD, UserRole.TESTER)
  @ApiOperation({ summary: 'Generate Playwright script from test case (optionally with codegen recording)' })
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

  @Post('executions/:id/cancel')
  @Roles(UserRole.ADMIN, UserRole.QA_LEAD, UserRole.TESTER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a running execution' })
  cancelExecution(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.cancelExecution(id);
  }

  @Get('scripts/:id/executions')
  @ApiOperation({ summary: 'Get execution history for a script' })
  @ApiQuery({ name: 'limit', required: false })
  getExecutions(@Param('id', ParseUUIDPipe) id: string, @Query('limit') limit?: number) {
    return this.service.getExecutions(id, limit ? +limit : 20);
  }

  @Get('executions/test-case/:testCaseId')
  @ApiOperation({ summary: 'Get all executions for a test case' })
  @ApiQuery({ name: 'limit', required: false })
  getExecutionsByTestCase(@Param('testCaseId', ParseUUIDPipe) testCaseId: string, @Query('limit') limit?: number) {
    return this.service.getExecutionsByTestCase(testCaseId, limit ? +limit : 20);
  }

  @Get('executions/:id')
  @ApiOperation({ summary: 'Get execution details' })
  getExecution(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.getExecution(id);
  }

  // ─── Artifacts (screenshots, video, trace) ─────────────────────────────────

  @Get('executions/:id/artifacts/:filename')
  @ApiOperation({ summary: 'Download an execution artifact (screenshot, video, trace)' })
  getArtifact(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('filename') filename: string,
    @Res() res: Response,
  ) {
    // Sanitize filename to prevent directory traversal
    const sanitized = filename.replace(/[^a-zA-Z0-9._-]/g, '');
    const filePath = this.service.getArtifactPath(id, sanitized);
    if (!filePath) throw new NotFoundException('Artifact not found');

    // Set content type based on extension
    const ext = sanitized.split('.').pop()?.toLowerCase();
    const mimeTypes: Record<string, string> = {
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      webm: 'video/webm',
      mp4: 'video/mp4',
      zip: 'application/zip',
    };
    res.setHeader('Content-Type', mimeTypes[ext || ''] || 'application/octet-stream');
    res.sendFile(filePath);
  }
}
