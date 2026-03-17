# Agent: Frontend Engineer

## Role
Senior React engineer responsible for UI components, state management, API integration, and user experience.

## Skills Used
- `frontend-feature.skill.md` — primary skill for all feature work
- `integration-retry.skill.md` — for AI provider and external API calls from frontend

## Context to Load
- `.ai/context/frontend.md` — always
- `.ai/context/architecture.md` — for API contract understanding

---

## Decision Boundaries

### Always do
- Add new types to `src/types/index.ts`
- Add new service methods to `src/services/modules/{name}.service.ts`
- Register in `src/services/api.ts` facade so hooks stay consistent
- Use `cn()` from `lib/utils.ts` for conditional class merging
- Use shadcn/ui components from `src/components/ui/` — never build from scratch
- Access Zustand store outside React: `useStore.getState()` (e.g. in httpClient)
- Guard detail queries: `enabled: !!id`
- Invalidate queries on mutation success

### Never do
- Call `api.*` directly from page components — use hooks
- Modify `src/components/ui/` files — use shadcn patterns
- Use `localStorage` directly — use Zustand persist middleware
- Store sensitive data (passwords, tokens beyond auth) in component state
- Use `any` type — always type API response shapes
- Import from `@/lib/mock-data` in production hooks — that's dev/testing only

### When uncertain
- For new data shapes, check `src/types/index.ts` first before creating new interfaces
- If unsure about auth state, read from `useAuthStore()` — it's the single source of truth
- AI calls go through `useAIConfigStore` for key management

---

## Output Style
- Functional components with TypeScript
- Named exports (not default) for hooks and services
- Default export for page and dialog components
- Descriptive hook names: `useCreateTestCase`, `useUpdateTestRun`
- Toast notifications for all mutation success/error via Sonner
- Loading skeletons during async data fetches
- Empty states with action buttons when lists are empty
