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
  ) {}

  async generateFromJira(orgId: string, userId: string, jiraIssueKey: string) {
    // 1. Fetch Jira issue detail
    const jiraIssue = await this.jiraService.getIssue(orgId, jiraIssueKey);

    // 2. Get user's active AI settings
    const allSettings = await this.settingsService.getAll(userId);
    const provider = allSettings.ai.activeProvider as AiProvider;
    const model = allSettings.ai.activeModel;

    // 3. Decrypt API key
    const apiKey = await this.settingsService.getApiKey(userId, provider);
    if (!apiKey) {
      throw new BadRequestException(
        `No API key configured for ${provider}. Please add your API key in Settings → AI Configuration.`,
      );
    }

    // 4. Build prompt
    const prompt = this.buildPrompt(jiraIssue);

    // 5. Call AI provider
    const aiResponse = await this.callAiProvider(provider, model, apiKey, prompt);

    // 6. Parse response
    const generatedTestCases = this.parseAiResponse(aiResponse);

    return { jiraIssue, generatedTestCases };
  }

  async saveGenerated(userId: string, dto: SaveGeneratedTestCasesDto) {
    const testCases: TestCase[] = [];

    for (const tc of dto.testCases) {
      const entity = this.testCaseRepo.create({
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
        jiraSyncStatus: JiraSyncStatus.SYNCED,
      });
      testCases.push(entity);
    }

    const saved = await this.testCaseRepo.save(testCases);
    return saved;
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

  private async callAiProvider(provider: AiProvider, model: string, apiKey: string, prompt: string): Promise<string> {
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
      this.logger.error(`AI provider error (${provider}): ${error.message}`);
      throw new BadRequestException(`AI generation failed: ${error.message}`);
    }
  }

  private async callOpenAI(model: string, apiKey: string, prompt: string): Promise<string> {
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
          max_tokens: 4000,
        },
        {
          headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          timeout: 60000,
        },
      ),
    );
    return response.data.choices[0].message.content;
  }

  private async callAnthropic(model: string, apiKey: string, prompt: string): Promise<string> {
    const response = await firstValueFrom(
      this.httpService.post(
        'https://api.anthropic.com/v1/messages',
        {
          model,
          max_tokens: 4000,
          messages: [{ role: 'user', content: prompt }],
          system: 'You are a QA test case generator. Return only valid JSON arrays.',
        },
        {
          headers: {
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json',
          },
          timeout: 60000,
        },
      ),
    );
    return response.data.content[0].text;
  }

  private async callGemini(model: string, apiKey: string, prompt: string): Promise<string> {
    const response = await firstValueFrom(
      this.httpService.post(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 4000 },
          systemInstruction: { parts: [{ text: 'You are a QA test case generator. Return only valid JSON arrays.' }] },
        },
        { headers: { 'Content-Type': 'application/json' }, timeout: 60000 },
      ),
    );
    return response.data.candidates[0].content.parts[0].text;
  }

  private parseAiResponse(rawResponse: string): GeneratedTestCaseItem[] {
    // Strip markdown code fences if present
    let cleaned = rawResponse.trim();
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
    }

    try {
      const parsed = JSON.parse(cleaned);
      if (!Array.isArray(parsed)) {
        throw new Error('Expected JSON array');
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
    } catch (error) {
      this.logger.error(`Failed to parse AI response: ${error}`);
      throw new BadRequestException('Failed to parse AI response. Please try again.');
    }
  }
}
