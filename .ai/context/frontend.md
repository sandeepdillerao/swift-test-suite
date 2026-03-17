# Frontend Context — TestFlow TCM

## Stack
- **Framework**: React 18 + TypeScript (strict)
- **Build**: Vite 5 + SWC, port 8080
- **Styling**: Tailwind CSS v3 + shadcn/ui (Radix UI primitives)
- **Routing**: React Router v6 (nested routes)
- **Server State**: TanStack React Query v5
- **Client State**: Zustand v5 (with persist middleware)
- **HTTP**: Axios v1.7 with interceptors
- **Forms**: React Hook Form + Zod validation
- **Tables**: TanStack Table v8
- **Charts**: Recharts
- **Animations**: Framer Motion
- **Notifications**: Sonner toasts

---

## Folder Pattern

```
src/
  components/
    ui/              ← shadcn/ui components (never modify directly)
    layout/          ← AppLayout.tsx (nav + sidebar wrapper)
    {feature}/       ← feature-scoped dialogs/forms (e.g. testcases/, testruns/)
    NavLink.tsx      ← shared UI atoms
    StatusBadge.tsx
    ThemeToggle.tsx
  hooks/             ← TanStack Query hooks, one file per domain
  lib/
    utils.ts         ← cn() helper (clsx + tailwind-merge)
    mock-data.ts     ← mock data (replace with real API calls)
  pages/
    app/             ← authenticated app pages (Dashboard, TestCases, etc.)
    Index.tsx        ← landing page
    Login.tsx
    NotFound.tsx
  services/
    http-client.ts   ← Axios instance + interceptors
    api.ts           ← composed facade (import point for all hooks)
    modules/         ← one service file per domain
  stores/            ← Zustand stores
  types/             ← all TypeScript interfaces (index.ts)
```

---

## State Management

### Zustand Stores
| Store | File | Persisted | Purpose |
|---|---|---|---|
| `useAuthStore` | `stores/authStore.ts` | Yes (partialize) | user, accessToken, refreshToken, isAuthenticated |
| `useProjectStore` | `stores/projectStore.ts` | No | currentProject selection |
| `useUIStore` | `stores/uiStore.ts` | Yes | theme (light/dark), sidebarCollapsed |
| `useAIConfigStore` | `stores/aiConfigStore.ts` | Yes | AI provider, model, API keys per provider |

**Rule**: Access store outside React with `useStore.getState()`. Inside React, use the hook.

### Server State (React Query)
- All remote data lives in React Query cache
- Keys follow pattern: `['resource', { filters }]` or `['resource', id]`
- Mutations call `queryClient.invalidateQueries({ queryKey: ['resource'] })` on success

---

## API Integration

### Layer Stack
```
Hook (useQuery/useMutation)
  → api.ts facade
  → modules/{name}.service.ts
  → http-client.ts (Axios)
  → Backend
```

### httpClient Features
- `baseURL` from `import.meta.env.VITE_API_URL` (default: `http://localhost:3000/api/v1`)
- **Request**: auto-attaches `Authorization: Bearer <accessToken>` from `useAuthStore.getState()`
- **Response**: unwraps `{ success, data, timestamp }` envelope — callers receive `T`
- **401 handling**: silent refresh → retry queue → or logout + redirect to `/login`
- **Error**: surfaces RFC 7807 `detail` field as `Error.message`

### env var
```
VITE_API_URL=http://localhost:3000/api/v1   # in frontend/.env
```

---

## UI System
- Component library: **shadcn/ui** — components in `src/components/ui/`
- Never modify `ui/` files directly; re-configure via `components.json`
- Utility: `cn(...classes)` from `lib/utils.ts` for conditional class merging
- Theme: CSS variables in `index.css` (HSL-based), toggled via `dark` class on `<html>`
- Dark mode managed by `useUIStore.toggleTheme()` which sets `document.documentElement.classList`

---

## Routing Structure
```
/                   → Index (landing page)
/login              → Login
/app/dashboard      → Dashboard
/app/test-cases     → TestCases list
/app/test-cases/:id → TestCaseDetail
/app/test-suites    → TestSuites grid
/app/test-suites/:id→ TestSuiteDetail
/app/test-runs      → TestRuns list
/app/test-runs/:id  → TestRunDetail
/app/releases       → Releases
/app/integrations   → Integrations (Jira, GitLab)
/app/settings       → Settings
/app/users          → UserManagement
```
All `/app/*` routes render inside `AppLayout` (sidebar + top nav).

---

## Type System
Single source of truth: `src/types/index.ts`
- All domain interfaces exported from here
- Frontend types mirror backend entity shapes (may diverge slightly — e.g. `name` vs `firstName+lastName`)
- `TestStatus`, `Priority`, `TestType`, `ReleaseStatus` defined as string literal unions

---

## Hook Pattern
```ts
// hooks/useProjects.ts
export const useProjects = () =>
  useQuery({ queryKey: ['projects'], queryFn: () => api.projects.list() });

export const useCreateProject = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Project>) => api.projects.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projects'] }),
  });
};
```

---

## AI Config Store
Supports multi-provider AI key management. Usage:
```ts
const { activeProvider, activeModel, getActiveApiKey, isConfigured } = useAIConfigStore();
```
Keys are stored in localStorage — never sent to the backend.
