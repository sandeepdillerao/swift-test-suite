# Skill: Frontend Feature

## Purpose
Generate a complete frontend feature: page component, feature dialogs, React Query hooks, and service module wiring.

## When to Use
- Adding a new app page (e.g. Projects list page)
- Adding a CRUD dialog to an existing feature
- Connecting a new backend module to the frontend

---

## Strict Coding Rules

### Service Module (`src/services/modules/{name}.service.ts`)
- Import `httpClient` from `../http-client`
- All methods return `httpClient.{method}<T>('/path', ...).then(r => r.data)`
- Use explicit TypeScript generic for response type
- Export as named `const {name}Service = { ... }`

### API Facade (`src/services/api.ts`)
- Add new namespace to the `api` object
- Import from the new service module
- Keep method signatures matching hook expectations

### Hook (`src/hooks/use{Name}.ts`)
- Use `useQuery` for reads, `useMutation` for writes
- Query keys: `['{resource}', { filters }]` for lists, `['{resource}', id]` for singles
- Every mutation invalidates the relevant list query on success
- `enabled: !!id` guard on detail queries

### Page Component (`src/pages/app/{Name}.tsx`)
- Use hooks only — no direct `api.*` calls in components
- Loading state: shadcn `Skeleton` or spinner
- Error state: display `error.message` in a toast or inline alert
- Empty state: informative message with action CTA

### Dialog/Form Components (`src/components/{feature}/`)
- Use React Hook Form + Zod schema
- Submit calls mutation hook
- Close dialog on success via controlled `open` state
- Show loading state on submit button

### Types
- Add new interfaces to `src/types/index.ts`
- Mirror backend entity shape (use `camelCase`)
- Use string literal unions, not enums

### Styling Rules
- Use Tailwind utility classes only
- Use `cn()` from `lib/utils.ts` for conditional classes
- Use shadcn/ui components from `src/components/ui/`
- Dark mode: use Tailwind `dark:` variants — never inline styles

---

## Output Expectations
- `src/services/modules/{name}.service.ts`
- `src/hooks/use{Name}.ts` (all CRUD hooks)
- `src/types/index.ts` additions
- `src/pages/app/{Name}.tsx` (list page)
- `src/components/{name}/Create{Name}Dialog.tsx`
- `src/services/api.ts` namespace addition

---

## Example Prompt
```
Using the frontend-feature skill, build the Projects feature.

Requirements:
- List page with cards (name, key, description, test case count, pass rate)
- Create project dialog (name, key, description fields)
- Delete with confirmation dialog
- Connect to api.projects.list(), api.projects.create(), api.projects.delete()
- Admin and qa_lead can create/delete; all roles can view
```
