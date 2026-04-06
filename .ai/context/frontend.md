# Frontend Context — TestFlow TCM

## Stack
- **Framework**: React 18.3.1 + TypeScript (strict)
- **Build**: Vite 5.4.19 + SWC, port 5173
- **Styling**: Tailwind CSS 3.4.17 + shadcn/ui (Radix UI primitives)
- **Routing**: React Router 6.30.1 (nested routes)
- **Server State**: TanStack React Query 5.83.0
- **Client State**: Zustand 5.0.10 (with persist middleware)
- **HTTP**: Axios 1.7.9 with interceptors
- **Forms**: React Hook Form 7.61.1 + Zod validation
- **Tables**: TanStack Table 8.21.3
- **Charts**: Recharts 2.15.4
- **Animations**: Framer Motion
- **Notifications**: Sonner 1.7.4 toasts
- **Icons**: Lucide React 0.462.0
- **Theme**: next-themes 0.3.0 (dark/light mode)
- **Date Picker**: react-day-picker 8.10.1
- **Testing**: Vitest 3.2.4 + @testing-library/react 16.0.0

---

## Directory Structure

```
frontend/
├── package.json
├── tsconfig.json / tsconfig.app.json / tsconfig.node.json
├── vite.config.ts             # React SWC, alias @/, port 5173
├── vitest.config.ts           # jsdom, setupFiles
├── tailwind.config.ts         # shadcn/ui integration
├── postcss.config.js
├── eslint.config.js
├── .env.example               # VITE_API_URL
├── components.json            # shadcn/ui CLI config
├── index.html
│
├── src/
│   ├── main.tsx               # ReactDOM.createRoot
│   ├── App.tsx                # Routes, providers, theme
│   ├── index.css              # Tailwind directives, CSS vars
│   │
│   ├── pages/
│   │   ├── Login.tsx
│   │   ├── NotFound.tsx
│   │   └── app/               # Protected routes (inside AppLayout)
│   │       ├── Dashboard.tsx
│   │       ├── Projects.tsx
│   │       ├── TestCases.tsx / TestCaseDetail.tsx
│   │       ├── TestSuites.tsx / TestSuiteDetail.tsx
│   │       ├── TestRuns.tsx / TestRunDetail.tsx
│   │       ├── Releases.tsx
│   │       ├── Integrations.tsx     # Jira, GitLab, AI config
│   │       ├── UserManagement.tsx
│   │       ├── RolesPermissions.tsx # RBAC admin
│   │       ├── AiReviewPage.tsx     # AI audit log
│   │       └── Settings.tsx         # API keys, org settings
│   │
│   ├── components/
│   │   ├── ui/                # shadcn/ui (50+ files, auto-generated, DON'T EDIT)
│   │   ├── layout/            # AppLayout.tsx (sidebar + navbar)
│   │   ├── auth/              # LoginForm, ProtectedRoute
│   │   ├── projects/
│   │   ├── testcases/
│   │   ├── testsuites/
│   │   ├── testruns/
│   │   ├── releases/
│   │   ├── automation/        # Playwright components
│   │   ├── landing/
│   │   ├── StatusBadge.tsx
│   │   ├── NavLink.tsx
│   │   └── ThemeToggle.tsx
│   │
│   ├── hooks/                 # One file per domain
│   │   ├── useAuthStore.ts
│   │   ├── usePermissions.ts
│   │   ├── useRbac.ts
│   │   ├── useProjects.ts
│   │   ├── useTestCases.ts
│   │   ├── useTestSuites.ts
│   │   ├── useTestRuns.ts
│   │   ├── useReleases.ts
│   │   ├── useDashboard.ts
│   │   ├── useIntegrations.ts
│   │   ├── useAutomation.ts
│   │   ├── useUsers.ts
│   │   ├── use-mobile.tsx
│   │   └── use-toast.ts
│   │
│   ├── services/
│   │   ├── api.ts             # Single import point (facade)
│   │   ├── http-client.ts     # Axios + JWT + refresh + unwrap
│   │   └── modules/           # One service per backend domain
│   │       ├── auth.service.ts
│   │       ├── users.service.ts
│   │       ├── organizations.service.ts
│   │       ├── projects.service.ts
│   │       ├── test-cases.service.ts
│   │       ├── test-suites.service.ts
│   │       ├── test-runs.service.ts
│   │       ├── releases.service.ts
│   │       ├── dashboard.service.ts
│   │       ├── settings.service.ts
│   │       ├── integrations.service.ts
│   │       ├── automation.service.ts
│   │       └── rbac.service.ts
│   │
│   ├── stores/                # Zustand global state
│   │   ├── authStore.ts
│   │   ├── uiStore.ts
│   │   ├── projectStore.ts
│   │   ├── permissionStore.ts
│   │   ├── aiConfigStore.ts
│   │   └── aiGenerationStore.ts
│   │
│   ├── types/
│   │   └── index.ts           # ALL shared types
│   │
│   ├── lib/
│   │   └── utils.ts           # cn() helper (clsx + tailwind-merge)
│   │
│   └── test/
│       ├── setup.ts           # Vitest setup (mocks, globals)
│       └── example.test.ts
│
├── public/
└── dist/
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
| `usePermissionStore` | `stores/permissionStore.ts` | No | User permissions cache |
| `useAIGenerationStore` | `stores/aiGenerationStore.ts` | No | AI generation state between dialog and review page |

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
- **401 handling**: silent refresh → retry queue (deduplicates concurrent 401s) → or logout + redirect to `/login`
- **Error**: surfaces RFC 7807 `detail` field as `Error.message`
- **Timeout**: 2 minutes

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
- Dark mode managed by `next-themes`

---

## Routing Structure
```
/ ➜ /app (redirect authenticated users)
/login ➜ Public login page
/app ➜ Protected routes (ProtectedRoute wrapper)
  /app ➜ Dashboard
  /app/projects ➜ Project list
  /app/test-cases ➜ Test case list
  /app/test-cases/:id ➜ Test case detail
  /app/test-suites ➜ Test suite list
  /app/test-suites/:id ➜ Test suite detail
  /app/test-runs ➜ Test run list
  /app/test-runs/:id ➜ Test run detail + history
  /app/releases ➜ Release list
  /app/integrations ➜ Jira/GitLab/AI config
  /app/users ➜ User management (admin only)
  /app/roles ➜ Roles & permissions (admin only)
  /app/ai-review ➜ AI audit log
  /app/settings ➜ Org settings, API keys
* ➜ 404 Not Found
```
All `/app/*` routes render inside `AppLayout` (sidebar + top nav).

---

## Type System
Single source of truth: `src/types/index.ts`
- All domain interfaces exported from here
- Frontend types mirror backend entity shapes (may diverge slightly)
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Project created');
    },
    onError: (error) => toast.error(error.message)
  });
};
```

---

## Service Module Pattern
```ts
// services/modules/projects.service.ts
export const projectsService = {
  list: async () => httpClient.get('/projects'),
  get: async (id: string) => httpClient.get(`/projects/${id}`),
  create: async (data: Partial<Project>) => httpClient.post('/projects', data),
  update: async (id: string, data: Partial<Project>) =>
    httpClient.patch(`/projects/${id}`, data),
  delete: async (id: string) => httpClient.delete(`/projects/${id}`)
};
```

---

## AI Config Store
Supports multi-provider AI key management. Usage:
```ts
const { activeProvider, activeModel, getActiveApiKey, isConfigured } = useAIConfigStore();
```
Keys are stored in localStorage — never sent to the backend.

---

## Testing

### Config
- `vitest.config.ts` — jsdom environment, setupFiles: `src/test/setup.ts`

### Commands
```bash
npm run test              # Single run
npm run test:watch       # Watch mode
npm run lint             # ESLint
npm run build            # Production build
```

### Example
```typescript
import { render, screen } from '@testing-library/react';
import { LoginForm } from '@/components/auth/LoginForm';

describe('LoginForm', () => {
  it('renders login form', () => {
    render(<LoginForm />);
    expect(screen.getByPlaceholderText(/email/i)).toBeInTheDocument();
  });
});
```
