# Integrations Context — TestFlow TCM

**Status**: Jira + AI Generation + Playwright Automation + Settings + AI Audit — all fully implemented.
GitLab UI exists but backend API pending. Email is console-only. Redis provisioned but unused.

## Module Structure

```
backend/src/modules/integrations/
  integrations.module.ts          ← imports HttpModule, TypeORM, SettingsModule
  integrations.controller.ts
  integrations.service.ts
  jira/
    jira.controller.ts            ← 11 endpoints under /integrations/jira/
    jira.service.ts               ← Jira API calls, encryption, linking, sync
    dto/
      save-jira-config.dto.ts
      search-jira-issues.dto.ts
      link-jira-issue.dto.ts
      generate-from-jira.dto.ts
      save-generated-test-cases.dto.ts
  ai-generation/
    ai-generation.controller.ts   ← 3 endpoints under /integrations/ai/
    ai-generation.service.ts      ← AI test case generation from Jira issues
    entities/
      ai-audit-log.entity.ts     ← Tracks AI usage: provider, tokens, response time

backend/src/modules/automation/
  automation.module.ts
  automation.controller.ts        ← Playwright recording/codegen endpoints
  automation.service.ts
  entities/
  dto/

backend/src/common/modules/ai-audit/
  ← AI call logging and audit trail (used by integrations)
```

---

## Jira Integration

### Configuration Storage
- Stored in `organization.settings.jira` (JSONB)
- Fields: `baseUrl`, `email`, `encryptedToken`, `defaultProjectKey`, `syncEnabled`, `connectedAt`
- API token encrypted at rest using org-specific encryption key
- `SETTINGS_ENCRYPTION_KEY` env var for encryption

### Endpoints (prefix: `/integrations/jira/`)
| Method | Path | Roles | Purpose |
|--------|------|-------|---------|
| POST | `/config` | ADMIN, QA_LEAD | Save Jira config |
| GET | `/config` | ADMIN, QA_LEAD | Get config (masked token) |
| DELETE | `/config` | ADMIN, QA_LEAD | Disconnect Jira |
| POST | `/test-connection` | ADMIN, QA_LEAD | Test existing creds |
| POST | `/verify-credentials` | ADMIN, QA_LEAD | Verify before saving |
| GET | `/projects` | ADMIN, QA_LEAD, TESTER | List Jira projects |
| GET | `/issues` | ADMIN, QA_LEAD, TESTER | Search issues (JQL) |
| GET | `/issues/:issueKey` | ADMIN, QA_LEAD, TESTER | Get issue detail |
| POST | `/link/:testCaseId` | ADMIN, QA_LEAD, TESTER | Link test case to issue |
| DELETE | `/link/:testCaseId` | ADMIN, QA_LEAD, TESTER | Unlink test case |
| PATCH | `/sync-status/:testCaseId` | ADMIN, QA_LEAD, TESTER | Sync status to subtask |

### Jira Linking Flow
1. User selects Jira issue from searchable dropdown
2. Optional: create Jira subtask for test execution tracking
3. TestCase entity updated: `jiraTicketId`, `jiraTicketUrl`, `jiraSubtaskId`, `jiraSubtaskUrl`, `jiraSyncStatus`
4. Subtask inherits parent components + priority
5. Status auto-synced: Pass→Done, Fail→To Do, In Progress→In Progress

### Jira API Communication
- Basic auth: `email:apiToken` base64 encoded
- Retry logic: 3 retries with exponential backoff (1s, 2s, 4s)
- Timeout: 15s per request
- ADF (Atlassian Document Format) text extraction for descriptions

---

## AI Test Case Generation

### Endpoints (prefix: `/integrations/ai/`)
| Method | Path | Roles | Purpose |
|--------|------|-------|---------|
| POST | `/generate-from-jira` | ADMIN, QA_LEAD, TESTER | Generate test cases from Jira issue |
| POST | `/save-generated` | ADMIN, QA_LEAD, TESTER | Save generated test cases to DB |
| GET | `/audit-logs` | ADMIN, QA_LEAD | Get AI generation audit logs |

### Generation Flow
1. Fetch Jira issue details via JiraService
2. Get user's AI settings (provider + model) from SettingsService
3. Decrypt API key for the active provider
4. Build structured prompt with issue summary, description, labels, priority
5. Call AI provider (OpenAI / Anthropic / Gemini)
6. Parse JSON response into GeneratedTestCaseItem[]
7. Return `{ jiraIssue, generatedTestCases }` to frontend

### AI Providers
| Provider | Endpoint | Auth | Config |
|----------|----------|------|--------|
| OpenAI | `api.openai.com/v1/chat/completions` | Bearer token | temp: 0.3, max_tokens: 8192 |
| Anthropic | `api.anthropic.com/v1/messages` | x-api-key header | max_tokens: 8192 |
| Gemini | `generativelanguage.googleapis.com/v1beta/models/{model}:generateContent` | URL param key | temp: 0.3, maxOutputTokens: 8192, responseMimeType: application/json |

### API Key Storage
- Stored in `user.settings.encryptedApiKeys` (JSONB on User entity)
- Structure: `{ openai: "encrypted", anthropic: "encrypted", gemini: "encrypted" }`
- AI preference: `user.settings.ai = { activeProvider, activeModel }`
- Managed via Settings module endpoints: `POST/DELETE /settings/api-keys/:provider`

### Prompt Structure
- Role: QA engineer
- Generates 3-6 test cases covering: happy path, error handling, edge cases, security
- Output: JSON array with title, description, preconditions, steps[], expectedResult, priority, type, tags
- Response parsing strips markdown fences, validates JSON array, applies defaults

### Save Generated Flow
- Creates TestCase entities with:
  - `jiraTicketId` = Jira issue key
  - `jiraTicketUrl` = constructed from org's Jira baseUrl + `/browse/{key}`
  - `jiraSyncStatus` = SYNCED
  - `isAiGenerated` = true
  - Priority/type defaults applied if invalid
- Optional `createSubtask: true` creates Jira subtask per test case via JiraService.linkIssue

### AI Audit Log (ai_audit_logs table)
- Tracked per generation: userId, orgId, provider, model, jiraIssueKey
- Token usage: inputTokens, outputTokens (extracted per provider)
- Performance: responseTimeMs, testCasesGenerated, success, errorMessage
- Both success and failure logged
- Queryable via GET `/integrations/ai/audit-logs` (ADMIN, QA_LEAD only)

---

## Frontend Components

### GenerateFromJiraDialog.tsx
Search-only dialog:
- Jira project picker + issue search (connected) or manual ID input (disconnected)
- Same Jira search dropdown as JiraLinkDialog (Popover + Command combobox)
- On generate: stores result in aiGenerationStore, navigates to /app/ai-review

### AiReviewPage.tsx (full page at /app/ai-review)
Post-generation review page:
- Card grid layout with all generated test cases
- Toolbar: suite selector, "Create Jira subtask" toggle, select all, create selected
- Edit via side Sheet (same fields as TestCaseDialog)
- Uses aiGenerationStore (Zustand) to hold state between dialog and page

### Stores
- `aiGenerationStore.ts`: Holds jiraIssue, generatedTestCases, projectId, suiteId, suites, createSubtask
  - Actions: setGenerationResult, toggleSelect, selectAll, updateTestCase, markCreated, clear
- `aiConfigStore.ts`: UI preferences for AI provider/model, enabledProviders (synced to backend)

### JiraLinkDialog.tsx
Two modes:
- **Connected**: Project combobox + debounced search + type filters + issue list
- **Disconnected**: Manual ticket ID + optional URL input
- Optional subtask creation toggle
- Uses `useLinkJiraIssue` / `useUnlinkJiraIssue` hooks

### Hooks (useIntegrations.ts)
- Query: `useJiraConfig`, `useJiraProjects`, `useSearchJiraIssues`
- Mutations: `useLinkJiraIssue`, `useUnlinkJiraIssue`, `useGenerateFromJira`, `useSaveGeneratedTestCases`
- Config: `useSaveJiraConfig`, `useDisconnectJira`, `useTestJiraConnection`, `useVerifyJiraCredentials`

### Service (integrations.service.ts)
Full API wrapper for all Jira and AI generation endpoints. Types exported:
- `JiraConfigResponse`, `JiraProject`, `JiraIssue`, `JiraIssueDetail`
- `GeneratedTestCaseItem`, `GenerateFromJiraResponse`
- `SearchJiraIssuesParams`

---

## Test Case Jira Fields
```typescript
// On TestCase entity
jiraTicketId: string | null;      // e.g., "ECOM-101"
jiraTicketUrl: string | null;     // e.g., "https://your-domain.atlassian.net/browse/ECOM-101"
jiraSubtaskId: string | null;     // auto-created subtask ID
jiraSubtaskUrl: string | null;    // subtask URL
jiraSyncStatus: 'synced' | 'pending' | 'error' | 'not_linked' | null;
isAiGenerated: boolean;  // true for AI-generated test cases (for dashboard stats)
```

---

## Settings Module
```
backend/src/modules/settings/
  settings.controller.ts    ← 6 endpoints under /settings/
  settings.service.ts       ← manages notifications, AI, org settings, API keys
  dto/
    set-api-key.dto.ts
    update-ai-settings.dto.ts
    update-notifications.dto.ts
    update-organization-settings.dto.ts
```

Key endpoints:
- `GET /settings` — all user settings
- `PATCH /settings/ai` — update active AI provider/model
- `POST /settings/api-keys/:provider` — store encrypted API key
- `DELETE /settings/api-keys/:provider` — remove API key
- `GET /settings/api-keys` — list which providers have keys configured
