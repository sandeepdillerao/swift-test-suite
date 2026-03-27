import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { firstValueFrom } from 'rxjs';
import { AxiosRequestConfig } from 'axios';
import { Organization } from '@/modules/organizations/entities/organization.entity';
import { TestCase } from '@/modules/test-cases/entities/test-case.entity';
import { JiraSyncStatus, TestStatus } from '@/modules/test-cases/entities/test-case.enums';
import { encrypt, decrypt } from '@/common/utils/encryption.util';
import { SaveJiraConfigDto } from './dto/save-jira-config.dto';
import { SearchJiraIssuesDto } from './dto/search-jira-issues.dto';
import { LinkJiraIssueDto } from './dto/link-jira-issue.dto';

interface JiraConfig {
  baseUrl: string;
  email: string;
  encryptedToken: string;
  defaultProjectKey?: string;
  syncEnabled: boolean;
  connectedAt: string;
}

/** Map TestFlow test case status → Jira transition target status name */
const STATUS_TO_JIRA: Record<string, string> = {
  [TestStatus.PASSED]: 'Done',
  [TestStatus.FAILED]: 'To Do',
  [TestStatus.IN_PROGRESS]: 'In Progress',
  [TestStatus.BLOCKED]: 'To Do',
  [TestStatus.NOT_RUN]: 'To Do',
};

@Injectable()
export class JiraService {
  private readonly logger = new Logger(JiraService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    @InjectRepository(Organization) private readonly orgRepo: Repository<Organization>,
    @InjectRepository(TestCase) private readonly testCaseRepo: Repository<TestCase>,
  ) {}

  private get encryptionKey(): string {
    return this.configService.get<string>('SETTINGS_ENCRYPTION_KEY') ?? 'change-me-in-production-32-chars!!';
  }

  private getJiraConfig(org: Organization): JiraConfig | null {
    return (org.settings as Record<string, unknown>)?.jira as JiraConfig | null;
  }

  private async getOrg(orgId: string): Promise<Organization> {
    const org = await this.orgRepo.findOne({ where: { id: orgId } });
    if (!org) throw new NotFoundException('Organization not found');
    return org;
  }

  private buildAuthHeader(email: string, apiToken: string): Record<string, string> {
    const encoded = Buffer.from(`${email}:${apiToken}`).toString('base64');
    return { Authorization: `Basic ${encoded}`, Accept: 'application/json', 'Content-Type': 'application/json' };
  }

  private async jiraRequest<T>(
    method: 'get' | 'post' | 'put' | 'delete',
    baseUrl: string,
    path: string,
    headers: Record<string, string>,
    data?: unknown,
  ): Promise<T> {
    const url = `${baseUrl.replace(/\/$/, '')}${path}`;
    const config: AxiosRequestConfig = { method, url, headers, data, timeout: 15000 };

    const maxRetries = 3;
    const retryDelays = [1000, 2000, 4000];

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await firstValueFrom(this.httpService.request<T>(config));
        return response.data;
      } catch (error: any) {
        const status = error?.response?.status;
        const retryable = status === 408 || status === 429 || (status >= 500 && status < 600);

        if (retryable && attempt < maxRetries) {
          this.logger.warn(`Jira request failed (${status}), retrying in ${retryDelays[attempt]}ms...`);
          await new Promise(r => setTimeout(r, retryDelays[attempt]));
          continue;
        }

        const detail = error?.response?.data?.errorMessages?.join(', ')
          || (error?.response?.data?.errors ? JSON.stringify(error.response.data.errors) : null)
          || error?.response?.data?.message
          || error?.message
          || 'Jira request failed';
        throw new BadRequestException(`Jira API error: ${detail}`);
      }
    }

    throw new BadRequestException('Jira request failed after retries');
  }

  /** Recursively extract plain text from Jira ADF (Atlassian Document Format) */
  extractAdfText(node: any): string {
    if (!node) return '';
    if (typeof node === 'string') return node;
    if (node.type === 'text') return node.text || '';

    if (Array.isArray(node.content)) {
      return node.content.map((child: any) => this.extractAdfText(child)).join(
        node.type === 'paragraph' || node.type === 'heading' || node.type === 'bulletList' || node.type === 'orderedList'
          ? '\n'
          : '',
      );
    }

    return '';
  }

  // ── Config management ─────────────────────────────────────────────────────

  async saveConfig(orgId: string, dto: SaveJiraConfigDto) {
    const org = await this.getOrg(orgId);
    const encryptedToken = encrypt(dto.apiToken, this.encryptionKey);

    const jiraConfig: JiraConfig = {
      baseUrl: dto.baseUrl.replace(/\/$/, ''),
      email: dto.email,
      encryptedToken,
      defaultProjectKey: dto.defaultProjectKey,
      syncEnabled: dto.syncEnabled ?? true,
      connectedAt: new Date().toISOString(),
    };

    const settings = { ...org.settings, jira: jiraConfig };
    await this.orgRepo.save({ ...org, settings });

    return this.getConfig(orgId);
  }

  async getConfig(orgId: string) {
    const org = await this.getOrg(orgId);
    const config = this.getJiraConfig(org);

    if (!config) {
      return { connected: false };
    }

    return {
      connected: true,
      baseUrl: config.baseUrl,
      email: config.email,
      maskedToken: '••••••••',
      defaultProjectKey: config.defaultProjectKey,
      syncEnabled: config.syncEnabled,
      connectedAt: config.connectedAt,
    };
  }

  async disconnect(orgId: string) {
    const org = await this.getOrg(orgId);
    const { jira, ...rest } = org.settings as Record<string, unknown>;
    await this.orgRepo.save({ ...org, settings: rest });
    return { connected: false };
  }

  async testConnection(orgId: string) {
    const org = await this.getOrg(orgId);
    const config = this.getJiraConfig(org);
    if (!config) throw new BadRequestException('Jira is not configured');

    const apiToken = decrypt(config.encryptedToken, this.encryptionKey);
    return this.verifyCredentials(config.baseUrl, config.email, apiToken);
  }

  /** Test connection using raw credentials (before saving) */
  async testConnectionWithCredentials(dto: SaveJiraConfigDto) {
    return this.verifyCredentials(
      dto.baseUrl.replace(/\/$/, ''),
      dto.email,
      dto.apiToken,
    );
  }

  private async verifyCredentials(baseUrl: string, email: string, apiToken: string) {
    const headers = this.buildAuthHeader(email, apiToken);

    const result = await this.jiraRequest<{ accountId: string; displayName: string; emailAddress: string }>(
      'get', baseUrl, '/rest/api/3/myself', headers,
    );

    return { success: true, user: { displayName: result.displayName, emailAddress: result.emailAddress } };
  }

  // ── Jira data access ──────────────────────────────────────────────────────

  private async getCredentials(orgId: string) {
    const org = await this.getOrg(orgId);
    const config = this.getJiraConfig(org);
    if (!config) throw new BadRequestException('Jira is not configured. Please connect Jira first.');

    const apiToken = decrypt(config.encryptedToken, this.encryptionKey);
    const headers = this.buildAuthHeader(config.email, apiToken);
    return { config, headers };
  }

  async getProjects(orgId: string, page = 1, limit = 50) {
    const { config, headers } = await this.getCredentials(orgId);
    const startAt = (page - 1) * limit;

    const result = await this.jiraRequest<{ values: any[]; total: number }>(
      'get', config.baseUrl, `/rest/api/3/project/search?startAt=${startAt}&maxResults=${limit}`, headers,
    );

    return {
      projects: result.values.map((p: any) => ({
        id: p.id,
        key: p.key,
        name: p.name,
        avatarUrl: p.avatarUrls?.['48x48'],
        projectTypeKey: p.projectTypeKey,
      })),
      total: result.total,
      page,
      limit,
    };
  }

  async searchIssues(orgId: string, dto: SearchJiraIssuesDto) {
    const { config, headers } = await this.getCredentials(orgId);
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 20;
    const startAt = (page - 1) * limit;

    // Build JQL
    const jqlParts: string[] = [];
    if (dto.projectKey) jqlParts.push(`project = "${dto.projectKey}"`);
    if (dto.issueType) jqlParts.push(`issuetype = "${dto.issueType}"`);
    if (dto.status) jqlParts.push(`status = "${dto.status}"`);
    if (dto.searchText) jqlParts.push(`text ~ "${dto.searchText}"`);
    const jql = jqlParts.length > 0
      ? jqlParts.join(' AND ') + ' ORDER BY updated DESC'
      : 'ORDER BY updated DESC';

    const params = new URLSearchParams({
      jql,
      fields: 'summary,status,issuetype,priority,assignee,updated',
      startAt: String(startAt),
      maxResults: String(limit),
    });

    const result = await this.jiraRequest<{ issues: any[]; total: number }>(
      'get', config.baseUrl, `/rest/api/3/search/jql?${params}`, headers,
    );

    return {
      issues: result.issues.map((issue: any) => ({
        key: issue.key,
        summary: issue.fields.summary,
        status: issue.fields.status?.name,
        issueType: issue.fields.issuetype?.name,
        priority: issue.fields.priority?.name,
        assignee: issue.fields.assignee?.displayName,
        updated: issue.fields.updated,
      })),
      total: result.total,
      page,
      limit,
    };
  }

  async getIssue(orgId: string, issueKey: string) {
    const { config, headers } = await this.getCredentials(orgId);

    const result = await this.jiraRequest<any>(
      'get', config.baseUrl, `/rest/api/3/issue/${issueKey}?fields=summary,description,status,issuetype,priority,assignee,labels,updated`, headers,
    );

    const description = this.extractAdfText(result.fields.description);

    return {
      key: result.key,
      summary: result.fields.summary,
      description,
      status: result.fields.status?.name,
      issueType: result.fields.issuetype?.name,
      priority: result.fields.priority?.name,
      assignee: result.fields.assignee?.displayName,
      labels: result.fields.labels || [],
      updated: result.fields.updated,
    };
  }

  // ── Subtask helpers ────────────────────────────────────────────────────────

  /**
   * Find the subtask issue type ID valid for a specific project.
   * Uses the project-scoped createmeta endpoint, then falls back to global issuetype list.
   */
  private async findSubtaskTypeId(baseUrl: string, headers: Record<string, string>, projectKey: string): Promise<string> {
    // Try project-scoped createmeta first (most reliable)
    try {
      const meta = await this.jiraRequest<{ issueTypes: any[] }>(
        'get', baseUrl, `/rest/api/3/issue/createmeta/${projectKey}/issuetypes`, headers,
      );
      const subtaskType = meta.issueTypes.find((t: any) => t.subtask === true);
      if (subtaskType) {
        this.logger.log(`Found project subtask type: ${subtaskType.name} (${subtaskType.id}) for ${projectKey}`);
        return subtaskType.id;
      }
    } catch (err) {
      this.logger.warn(`createmeta lookup failed for ${projectKey}, falling back to global issuetype list`);
    }

    // Fallback: global issue types filtered by subtask flag
    const allTypes = await this.jiraRequest<any[]>(
      'get', baseUrl, '/rest/api/3/issuetype', headers,
    );
    const subtaskType = allTypes.find((t: any) => t.subtask === true);
    if (!subtaskType) {
      throw new BadRequestException(
        `No subtask issue type found for project ${projectKey}. Ensure your Jira project scheme includes a subtask type.`,
      );
    }
    this.logger.log(`Using global subtask type: ${subtaskType.name} (${subtaskType.id})`);
    return subtaskType.id;
  }

  /**
   * Build ADF description from test case data
   */
  private buildTestCaseAdf(tc: TestCase): any {
    const content: any[] = [
      {
        type: 'paragraph',
        content: [{ type: 'text', text: `Test case linked from TestFlow TCM (${tc.tcId})`, marks: [{ type: 'strong' }] }],
      },
    ];

    if (tc.description) {
      content.push({
        type: 'paragraph',
        content: [{ type: 'text', text: tc.description }],
      });
    }

    if (tc.steps && tc.steps.length > 0) {
      content.push({
        type: 'heading',
        attrs: { level: 3 },
        content: [{ type: 'text', text: 'Test Steps' }],
      });

      const listItems = tc.steps.map((step, i) => ({
        type: 'listItem',
        content: [{
          type: 'paragraph',
          content: [
            { type: 'text', text: `${step.action}`, marks: [{ type: 'strong' }] },
            { type: 'text', text: ` → ${step.expectedResult}` },
          ],
        }],
      }));

      content.push({ type: 'orderedList', content: listItems });
    }

    if (tc.expectedResult) {
      content.push(
        { type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: 'Expected Result' }] },
        { type: 'paragraph', content: [{ type: 'text', text: tc.expectedResult }] },
      );
    }

    return { type: 'doc', version: 1, content };
  }

  // ── Linking ───────────────────────────────────────────────────────────────

  async linkIssue(orgId: string, testCaseId: string, dto: LinkJiraIssueDto) {
    const { config, headers } = await this.getCredentials(orgId);

    // Fetch parent issue with fields we may need to copy to subtask
    const parentIssue = await this.jiraRequest<any>(
      'get', config.baseUrl, `/rest/api/3/issue/${dto.jiraIssueKey}?fields=summary,components,priority,labels`, headers,
    );

    const ticketUrl = `${config.baseUrl}/browse/${dto.jiraIssueKey}`;

    const updateData: Record<string, any> = {
      jiraTicketId: dto.jiraIssueKey,
      jiraTicketUrl: ticketUrl,
      jiraSyncStatus: JiraSyncStatus.SYNCED,
    };

    // Optionally create a subtask in Jira
    if (dto.createSubtask) {
      const tc = await this.testCaseRepo.findOne({ where: { id: testCaseId } });
      if (!tc) throw new NotFoundException('Test case not found');

      try {
        // Look up the correct subtask issue type ID dynamically for this project
        const projectKey = dto.jiraIssueKey.split('-')[0];
        const subtaskTypeId = await this.findSubtaskTypeId(config.baseUrl, headers, projectKey);

        // Copy required fields from parent issue
        const subtaskFields: Record<string, any> = {
          project: { key: projectKey },
          parent: { key: dto.jiraIssueKey },
          summary: `Test: ${tc.title}`,
          issuetype: { id: subtaskTypeId },
          description: this.buildTestCaseAdf(tc),
        };

        // Inherit components from parent (required by some Jira project schemes)
        if (parentIssue.fields.components?.length > 0) {
          subtaskFields.components = parentIssue.fields.components.map((c: any) => ({ id: c.id }));
        }

        // Inherit priority from parent
        if (parentIssue.fields.priority) {
          subtaskFields.priority = { id: parentIssue.fields.priority.id };
        }

        const subtask = await this.jiraRequest<any>('post', config.baseUrl, '/rest/api/3/issue', headers, {
          fields: subtaskFields,
        });

        updateData.jiraSubtaskId = subtask.key;
        updateData.jiraSubtaskUrl = `${config.baseUrl}/browse/${subtask.key}`;

        this.logger.log(`Created Jira subtask ${subtask.key} for test case ${tc.tcId}`);

        // Sync initial status
        await this.syncSubtaskStatus(config.baseUrl, headers, subtask.key, tc.status);
      } catch (err: any) {
        const msg = err?.message || String(err);
        this.logger.error(`Failed to create subtask for ${dto.jiraIssueKey}: ${msg}`);
        throw new BadRequestException(`Failed to create Jira subtask: ${msg}`);
      }
    }

    await this.testCaseRepo.update(testCaseId, updateData);
    return this.testCaseRepo.findOne({ where: { id: testCaseId } });
  }

  async unlinkIssue(testCaseId: string) {
    await this.testCaseRepo.update(testCaseId, {
      jiraTicketId: null,
      jiraTicketUrl: null,
      jiraSubtaskId: null,
      jiraSubtaskUrl: null,
      jiraSyncStatus: JiraSyncStatus.NOT_LINKED,
    });
    return this.testCaseRepo.findOne({ where: { id: testCaseId } });
  }

  // ── Status sync ───────────────────────────────────────────────────────────

  /**
   * Transition a Jira subtask to match a TestFlow test case status.
   * Looks up available transitions and picks the one matching the target name.
   */
  private async syncSubtaskStatus(
    baseUrl: string,
    headers: Record<string, string>,
    subtaskKey: string,
    testCaseStatus: TestStatus,
  ): Promise<void> {
    const targetJiraStatus = STATUS_TO_JIRA[testCaseStatus];
    if (!targetJiraStatus) return;

    try {
      // Get available transitions for the subtask
      const transitions = await this.jiraRequest<{ transitions: any[] }>(
        'get', baseUrl, `/rest/api/3/issue/${subtaskKey}/transitions`, headers,
      );

      // Find a transition whose target status name matches (case-insensitive)
      const match = transitions.transitions.find(
        (t: any) => t.to?.name?.toLowerCase() === targetJiraStatus.toLowerCase(),
      );

      if (match) {
        await this.jiraRequest<void>(
          'post', baseUrl, `/rest/api/3/issue/${subtaskKey}/transitions`, headers,
          { transition: { id: match.id } },
        );
        this.logger.log(`Transitioned subtask ${subtaskKey} → ${targetJiraStatus}`);
      } else {
        this.logger.warn(
          `No transition to "${targetJiraStatus}" found for ${subtaskKey}. Available: ${transitions.transitions.map((t: any) => t.to?.name).join(', ')}`,
        );
      }
    } catch (err) {
      this.logger.warn(`Failed to sync subtask ${subtaskKey} status: ${err}`);
      // Non-blocking — don't fail the main operation
    }
  }

  /**
   * Public method: sync test case status → Jira subtask.
   * Called when a test case status changes.
   */
  async syncTestCaseStatus(orgId: string, testCaseId: string, newStatus: TestStatus) {
    const tc = await this.testCaseRepo.findOne({ where: { id: testCaseId } });
    if (!tc?.jiraSubtaskId) return; // No subtask linked

    try {
      const { config, headers } = await this.getCredentials(orgId);
      await this.syncSubtaskStatus(config.baseUrl, headers, tc.jiraSubtaskId, newStatus);
      await this.testCaseRepo.update(testCaseId, { jiraSyncStatus: JiraSyncStatus.SYNCED });
    } catch (err) {
      this.logger.warn(`Status sync failed for ${testCaseId}: ${err}`);
      await this.testCaseRepo.update(testCaseId, { jiraSyncStatus: JiraSyncStatus.ERROR });
    }
  }
}
