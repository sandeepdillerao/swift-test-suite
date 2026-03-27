import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { User, UserRole } from '@/modules/users/entities/user.entity';
import { JiraService } from './jira.service';
import { SaveJiraConfigDto } from './dto/save-jira-config.dto';
import { SearchJiraIssuesDto } from './dto/search-jira-issues.dto';
import { LinkJiraIssueDto } from './dto/link-jira-issue.dto';

@ApiTags('Integrations - Jira')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('integrations/jira')
export class JiraController {
  constructor(private readonly jiraService: JiraService) {}

  @Post('config')
  @Roles(UserRole.ADMIN, UserRole.QA_LEAD)
  @ApiOperation({ summary: 'Save Jira configuration' })
  saveConfig(@CurrentUser() user: User, @Body() dto: SaveJiraConfigDto) {
    return this.jiraService.saveConfig(user.organizationId, dto);
  }

  @Get('config')
  @Roles(UserRole.ADMIN, UserRole.QA_LEAD)
  @ApiOperation({ summary: 'Get Jira configuration (token masked)' })
  getConfig(@CurrentUser() user: User) {
    return this.jiraService.getConfig(user.organizationId);
  }

  @Delete('config')
  @Roles(UserRole.ADMIN, UserRole.QA_LEAD)
  @ApiOperation({ summary: 'Disconnect Jira' })
  disconnect(@CurrentUser() user: User) {
    return this.jiraService.disconnect(user.organizationId);
  }

  @Post('test-connection')
  @Roles(UserRole.ADMIN, UserRole.QA_LEAD)
  @ApiOperation({ summary: 'Test existing Jira connection' })
  testConnection(@CurrentUser() user: User) {
    return this.jiraService.testConnection(user.organizationId);
  }

  @Post('verify-credentials')
  @Roles(UserRole.ADMIN, UserRole.QA_LEAD)
  @ApiOperation({ summary: 'Verify Jira credentials before saving' })
  verifyCredentials(@Body() dto: SaveJiraConfigDto) {
    return this.jiraService.testConnectionWithCredentials(dto);
  }

  @Get('projects')
  @Roles(UserRole.ADMIN, UserRole.QA_LEAD, UserRole.TESTER)
  @ApiOperation({ summary: 'List Jira projects' })
  @ApiQuery({ name: 'page', required: false }) @ApiQuery({ name: 'limit', required: false })
  getProjects(@CurrentUser() user: User, @Query('page') page = 1, @Query('limit') limit = 50) {
    return this.jiraService.getProjects(user.organizationId, +page, +limit);
  }

  @Get('issues')
  @Roles(UserRole.ADMIN, UserRole.QA_LEAD, UserRole.TESTER)
  @ApiOperation({ summary: 'Search Jira issues' })
  getIssues(@CurrentUser() user: User, @Query() dto: SearchJiraIssuesDto) {
    return this.jiraService.searchIssues(user.organizationId, dto);
  }

  @Get('issues/:issueKey')
  @Roles(UserRole.ADMIN, UserRole.QA_LEAD, UserRole.TESTER)
  @ApiOperation({ summary: 'Get Jira issue detail' })
  getIssue(@CurrentUser() user: User, @Param('issueKey') issueKey: string) {
    return this.jiraService.getIssue(user.organizationId, issueKey);
  }

  @Post('link/:testCaseId')
  @Roles(UserRole.ADMIN, UserRole.QA_LEAD, UserRole.TESTER)
  @ApiOperation({ summary: 'Link test case to Jira issue' })
  linkIssue(
    @CurrentUser() user: User,
    @Param('testCaseId', ParseUUIDPipe) testCaseId: string,
    @Body() dto: LinkJiraIssueDto,
  ) {
    return this.jiraService.linkIssue(user.organizationId, testCaseId, dto);
  }

  @Delete('link/:testCaseId')
  @Roles(UserRole.ADMIN, UserRole.QA_LEAD, UserRole.TESTER)
  @ApiOperation({ summary: 'Unlink test case from Jira' })
  unlinkIssue(@Param('testCaseId', ParseUUIDPipe) testCaseId: string) {
    return this.jiraService.unlinkIssue(testCaseId);
  }

  @Patch('sync-status/:testCaseId')
  @Roles(UserRole.ADMIN, UserRole.QA_LEAD, UserRole.TESTER)
  @ApiOperation({ summary: 'Sync test case status to Jira subtask' })
  syncStatus(
    @CurrentUser() user: User,
    @Param('testCaseId', ParseUUIDPipe) testCaseId: string,
    @Body('status') status: string,
  ) {
    return this.jiraService.syncTestCaseStatus(user.organizationId, testCaseId, status as any);
  }
}
