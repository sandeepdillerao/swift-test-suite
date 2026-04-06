# Skill: External Integration with Retry

## Purpose
Implement integrations with external APIs (Jira, GitLab, AI providers) with proper error handling, retry logic, and token management.

## When to Use
- Implementing Jira API calls (create/link tickets, sync status)
- Implementing GitLab API calls
- Calling AI provider APIs (Gemini, OpenAI, Anthropic) from backend
- Any external HTTP call that needs retry on transient failures

---

## Strict Rules

### Backend External Calls
- Use `@nestjs/axios` (HttpModule) — never raw `fetch` or `axios` directly in NestJS services
- Wrap in try/catch, map external errors to NestJS HTTP exceptions
- Credentials stored in DB or env — never hardcoded
- Log errors with context (service name, operation, external endpoint)

### Retry Pattern
```ts
async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  delayMs = 1000,
): Promise<T> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const isLastAttempt = attempt === maxAttempts;
      const isTransient = isTransientError(err);
      if (isLastAttempt || !isTransient) throw err;
      await new Promise((r) => setTimeout(r, delayMs * attempt)); // exponential
    }
  }
  throw new Error('unreachable');
}

function isTransientError(err: unknown): boolean {
  if (err instanceof AxiosError) {
    return [408, 429, 500, 502, 503, 504].includes(err.response?.status ?? 0);
  }
  return false;
}
```

### Frontend AI Provider Calls
- API keys from `useAIConfigStore.getState().getActiveApiKey()`
- Never log API keys
- Show user-friendly error if `isConfigured()` returns false
- Stream responses where supported (for UX)

### Jira Integration (planned)
- Store Jira credentials per org in `Organization.settings` JSONB
- `jiraSyncStatus` on TestCase: `'synced' | 'pending' | 'error' | 'not_linked'`
- Update sync status before and after API call
- Use `jiraTicketId` as idempotency key

---

## Output Expectations
- Integration service file: `src/modules/integrations/{name}.service.ts`
- Module registration with `HttpModule.register({ timeout: 10000 })`
- DTOs for integration config (stored in org settings)
- Error mapping from external status codes to NestJS exceptions
- Retry wrapper applied to all external calls
