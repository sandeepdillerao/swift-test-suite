import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { firstValueFrom } from 'rxjs';
import { JiraService } from '../jira/jira.service';
import { SettingsService, AiProvider } from '@/modules/settings/settings.service';
import { TestCase } from '@/modules/test-cases/entities/test-case.entity';
import { JiraSyncStatus, Priority, TestType } from '@/modules/test-cases/entities/test-case.enums';
import { SaveGeneratedTestCasesDto } from '../jira/dto/save-generated-test-cases.dto';
import { AiAuditService } from '@/common/modules/ai-audit';

interface AiProviderResult {
  content: string;
  inputTokens: number;
  outputTokens: number;
}

export interface GeneratedTestCaseItem {
  title: string;
  description: string;
  preconditions: string;
  steps: { id: string; order: number; action: string; expectedResult: string }[];
  expectedResult: string;
  priority: string;
  type: string;
  tags: string[];
}

@Injectable()
export class AiGenerationService {
  private readonly logger = new Logger(AiGenerationService.name);

  constructor(
    private readonly jiraService: JiraService,
    private readonly settingsService: SettingsService,
    private readonly httpService: HttpService,
    @InjectRepository(TestCase) private readonly testCaseRepo: Repository<TestCase>,
    private readonly aiAuditService: AiAuditService,
  ) {}

  async generateFromJira(orgId: string, userId: string, jiraIssueKey: string) {
    // 1. Fetch Jira issue detail
    const jiraIssue = await this.jiraService.getIssue(orgId, jiraIssueKey);

    // 2. Get user's active AI settings
    const allSettings = await this.settingsService.getAll(userId);
    const provider = allSettings.ai.activeProvider as AiProvider;
    const model = allSettings.ai.activeModel;
    const enabledProviders = allSettings.ai.enabledProviders ?? { gemini: true, openai: true, anthropic: true };

    // 3. Check provider is enabled
    if (!enabledProviders[provider]) {
      throw new BadRequestException(
        `AI provider "${provider}" is disabled. Please enable it or switch to an enabled provider in Settings → AI Configuration.`,
      );
    }

    // 4. Decrypt API key
    const apiKey = await this.settingsService.getApiKey(userId, provider);
    if (!apiKey) {
      throw new BadRequestException(
        `No API key configured for ${provider}. Please add your API key in Settings → AI Configuration.`,
      );
    }

    // 4. Build prompt
    const prompt = this.buildPrompt(jiraIssue);

    // 5. Call AI provider with timing
    const startTime = Date.now();
    let aiResult: AiProviderResult;
    let success = true;
    let errorMessage: string | null = null;
    let testCasesGenerated = 0;

    try {
      aiResult = await this.callAiProvider(provider, model, apiKey, prompt);
    } catch (error: any) {
      success = false;
      errorMessage = error.message;
      this.aiAuditService.log({ userId, orgId, feature: 'test_generation', action: 'generate_from_jira', provider, model, inputTokens: 0, outputTokens: 0, responseTimeMs: Date.now() - startTime, success: false, errorMessage, metadata: { jiraIssueKey } });
      throw error;
    }

    const responseTimeMs = Date.now() - startTime;

    // 6. Parse response
    const generatedTestCases = this.parseAiResponse(aiResult.content);
    testCasesGenerated = generatedTestCases.length;

    // 7. Log audit
    this.aiAuditService.log({ userId, orgId, feature: 'test_generation', action: 'generate_from_jira', provider, model, inputTokens: aiResult.inputTokens, outputTokens: aiResult.outputTokens, responseTimeMs, success: true, metadata: { jiraIssueKey, testCasesGenerated } });

    return { jiraIssue, generatedTestCases };
  }

  async saveGenerated(orgId: string, userId: string, dto: SaveGeneratedTestCasesDto) {
    // Resolve Jira ticket URL from org config
    let jiraTicketUrl: string | null = null;
    try {
      const jiraConfig = await this.jiraService.getConfig(orgId);
      if (jiraConfig?.connected && jiraConfig?.baseUrl) {
        jiraTicketUrl = `${jiraConfig.baseUrl}/browse/${dto.jiraIssueKey}`;
      }
    } catch {
      // Jira not configured — URL will be null
    }

    const testCases: TestCase[] = [];

    for (const tc of dto.testCases) {
      // Generate tcId from the same sequence used by TestCasesService
      const [{ val }] = await this.testCaseRepo.query("SELECT nextval('tc_id_seq') AS val");
      const tcId = `TC-${String(val).padStart(3, '0')}`;

      const entity = this.testCaseRepo.create({
        tcId,
        projectId: dto.projectId,
        suiteId: dto.suiteId,
        createdBy: userId,
        title: tc.title,
        description: tc.description || '',
        preconditions: tc.preconditions || '',
        steps: tc.steps,
        expectedResult: tc.expectedResult,
        priority: (tc.priority as Priority) || Priority.MEDIUM,
        type: (tc.type as TestType) || TestType.MANUAL,
        tags: tc.tags || [],
        jiraTicketId: dto.jiraIssueKey,
        jiraTicketUrl,
        jiraSyncStatus: JiraSyncStatus.SYNCED,
        isAiGenerated: true,
      });
      testCases.push(entity);
    }

    const saved = await this.testCaseRepo.save(testCases);

    // Optionally create Jira subtasks for each test case
    if (dto.createSubtask) {
      for (const tc of saved) {
        try {
          const linked = await this.jiraService.linkIssue(orgId, tc.id, {
            jiraIssueKey: dto.jiraIssueKey,
            createSubtask: true,
          });
          if (linked) {
            tc.jiraSubtaskId = linked.jiraSubtaskId;
            tc.jiraSubtaskUrl = linked.jiraSubtaskUrl;
          }
        } catch (err: any) {
          this.logger.warn(`Subtask creation failed for ${tc.tcId}: ${err.message}`);
        }
      }
    }

    return saved;
  }

  async getAuditLogs(orgId: string, limit = 50, offset = 0) {
    return this.aiAuditService.findAll({ orgId, limit, offset });
  }

  private buildPrompt(jiraIssue: { summary: string; description: string; labels: string[]; priority?: string }) {
    return `You are a QA engineer. Based on the following Jira issue, generate comprehensive test cases.

## Jira Issue
**Summary:** ${jiraIssue.summary}
**Priority:** ${jiraIssue.priority || 'Medium'}
**Labels:** ${jiraIssue.labels.join(', ') || 'None'}

**Description:**
${jiraIssue.description || 'No description provided.'}

## Instructions
Generate 3-6 test cases covering:
1. Happy path / main flow
2. Error handling / negative scenarios
3. Edge cases / boundary conditions
4. Security / permission checks (if applicable)

Return ONLY a JSON array (no markdown, no explanation) with this exact structure:
[
  {
    "title": "string",
    "description": "string",
    "preconditions": "string",
    "steps": [
      { "id": "s1", "order": 1, "action": "string", "expectedResult": "string" }
    ],
    "expectedResult": "string",
    "priority": "critical|high|medium|low",
    "type": "manual",
    "tags": ["string"]
  }
]`;
  }

  private async callAiProvider(provider: AiProvider, model: string, apiKey: string, prompt: string): Promise<AiProviderResult> {
    try {
      switch (provider) {
        case 'openai':
          return await this.callOpenAI(model, apiKey, prompt);
        case 'anthropic':
          return await this.callAnthropic(model, apiKey, prompt);
        case 'gemini':
          return await this.callGemini(model, apiKey, prompt);
        default:
          throw new BadRequestException(`Unsupported AI provider: ${provider}`);
      }
    } catch (error: any) {
      if (error instanceof BadRequestException) throw error;
      const responseData = error.response?.data;
      const detail = responseData?.error?.message || responseData?.error?.type || responseData?.message || error.message;
      this.logger.error(`AI provider error (${provider}): ${detail}`, responseData ? JSON.stringify(responseData) : '');
      throw new BadRequestException(`AI generation failed (${provider}): ${detail}`);
    }
  }

  private async callOpenAI(model: string, apiKey: string, prompt: string): Promise<AiProviderResult> {
    const response = await firstValueFrom(
      this.httpService.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model,
          messages: [
            { role: 'system', content: 'You are a QA test case generator. Return only valid JSON arrays.' },
            { role: 'user', content: prompt },
          ],
          temperature: 0.3,
          max_tokens: 8192,
        },
        {
          headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          timeout: 90000,
        },
      ),
    );
    const usage = response.data.usage;
    return {
      content: response.data.choices[0].message.content,
      inputTokens: usage?.prompt_tokens ?? 0,
      outputTokens: usage?.completion_tokens ?? 0,
    };
  }

  private async callAnthropic(model: string, apiKey: string, prompt: string): Promise<AiProviderResult> {
    const response = await firstValueFrom(
      this.httpService.post(
        'https://api.anthropic.com/v1/messages',
        {
          model,
          max_tokens: 8192,
          messages: [{ role: 'user', content: prompt }],
          system: 'You are a QA test case generator. Return only valid JSON arrays.',
        },
        {
          headers: {
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json',
          },
          timeout: 90000,
        },
      ),
    );
    const usage = response.data.usage;
    return {
      content: response.data.content[0].text,
      inputTokens: usage?.input_tokens ?? 0,
      outputTokens: usage?.output_tokens ?? 0,
    };
  }

  private async callGemini(model: string, apiKey: string, prompt: string): Promise<AiProviderResult> {
    const response = await firstValueFrom(
      this.httpService.post(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 8192, responseMimeType: 'application/json' },
          systemInstruction: { parts: [{ text: 'You are a QA test case generator. Return only valid JSON arrays.' }] },
        },
        { headers: { 'Content-Type': 'application/json' }, timeout: 90000 },
      ),
    );
    const meta = response.data.usageMetadata;
    return {
      content: response.data.candidates[0].content.parts[0].text,
      inputTokens: meta?.promptTokenCount ?? 0,
      outputTokens: meta?.candidatesTokenCount ?? 0,
    };
  }

  private parseAiResponse(rawResponse: string): GeneratedTestCaseItem[] {
    // Strip markdown code fences if present
    let cleaned = rawResponse.trim();
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
    }

    let parsed: any[];

    try {
      const result = JSON.parse(cleaned);
      if (!Array.isArray(result)) {
        throw new Error('Expected JSON array');
      }
      parsed = result;
    } catch (error) {
      // Attempt to recover truncated JSON — extract complete objects from the array
      this.logger.warn(`Initial parse failed, attempting truncated JSON recovery: ${(error as Error).message}`);
      parsed = this.recoverTruncatedJson(cleaned);
      if (parsed.length === 0) {
        this.logger.error(`Failed to parse AI response: ${error}`);
        throw new BadRequestException('AI response was truncated. Please try again — the model may need a simpler ticket.');
      }
      this.logger.log(`Recovered ${parsed.length} test case(s) from truncated response`);
    }

    return parsed.map((item: any, index: number) => ({
      title: item.title || `Test Case ${index + 1}`,
      description: item.description || '',
      preconditions: item.preconditions || '',
      steps: Array.isArray(item.steps)
        ? item.steps.map((s: any, i: number) => ({
            id: s.id || `s${i + 1}`,
            order: s.order || i + 1,
            action: s.action || '',
            expectedResult: s.expectedResult || '',
          }))
        : [],
      expectedResult: item.expectedResult || '',
      priority: ['critical', 'high', 'medium', 'low'].includes(item.priority) ? item.priority : 'medium',
      type: item.type || 'manual',
      tags: Array.isArray(item.tags) ? item.tags : [],
    }));
  }

  /**
   * Recover complete JSON objects from a truncated array response.
   * Finds the last complete object in the array and parses up to that point.
   */
  private recoverTruncatedJson(text: string): any[] {
    // Ensure it starts with [
    const start = text.indexOf('[');
    if (start === -1) return [];

    const content = text.substring(start);

    // Find all positions where a top-level object ends ('},')  or last complete object ('}]')
    // Strategy: try parsing progressively shorter strings
    // Find the last '}' that could close a complete object in the array
    let lastGoodEnd = -1;
    let depth = 0;
    let inString = false;
    let escape = false;

    for (let i = 1; i < content.length; i++) {
      const ch = content[i];

      if (escape) { escape = false; continue; }
      if (ch === '\\' && inString) { escape = true; continue; }
      if (ch === '"') { inString = !inString; continue; }
      if (inString) continue;

      if (ch === '{' || ch === '[') depth++;
      if (ch === '}' || ch === ']') {
        depth--;
        // When depth returns to 0, we closed a top-level object in the array
        if (depth === 0 && ch === '}') {
          lastGoodEnd = i;
        }
      }
    }

    if (lastGoodEnd === -1) return [];

    // Build a valid JSON array with all complete objects
    const validJson = content.substring(0, lastGoodEnd + 1) + ']';
    try {
      const result = JSON.parse(validJson);
      return Array.isArray(result) ? result : [];
    } catch {
      return [];
    }
  }
}
