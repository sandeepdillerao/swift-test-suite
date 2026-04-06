import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { User, UserRole } from '@/modules/users/entities/user.entity';
import { AiGenerationService } from './ai-generation.service';
import { GenerateFromJiraDto } from '../jira/dto/generate-from-jira.dto';
import { SaveGeneratedTestCasesDto } from '../jira/dto/save-generated-test-cases.dto';

@ApiTags('Integrations - AI Generation')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('integrations/ai')
export class AiGenerationController {
  constructor(private readonly aiGenerationService: AiGenerationService) {}

  @Post('generate-from-jira')
  @Roles(UserRole.ADMIN, UserRole.QA_LEAD, UserRole.TESTER)
  @ApiOperation({ summary: 'Generate test cases from a Jira issue using AI' })
  generateFromJira(@CurrentUser() user: User, @Body() dto: GenerateFromJiraDto) {
    return this.aiGenerationService.generateFromJira(user.organizationId, user.id, dto.jiraIssueKey);
  }

  @Post('save-generated')
  @Roles(UserRole.ADMIN, UserRole.QA_LEAD, UserRole.TESTER)
  @ApiOperation({ summary: 'Save AI-generated test cases' })
  saveGenerated(@CurrentUser() user: User, @Body() dto: SaveGeneratedTestCasesDto) {
    return this.aiGenerationService.saveGenerated(user.organizationId, user.id, dto);
  }

  @Get('audit-logs')
  @Roles(UserRole.ADMIN, UserRole.QA_LEAD)
  @ApiOperation({ summary: 'Get AI generation audit logs' })
  getAuditLogs(
    @CurrentUser() user: User,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.aiGenerationService.getAuditLogs(
      user.organizationId,
      limit ? parseInt(limit, 10) : 50,
      offset ? parseInt(offset, 10) : 0,
    );
  }
}
