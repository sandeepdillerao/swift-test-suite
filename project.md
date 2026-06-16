# Project Blueprint — Fullstack Monorepo Template

> A reusable architectural blueprint for building production-grade fullstack web apps with Claude Code (or any AI coding agent).
> Copy this file into the root of any new project and adjust the "Product Scope" section. Everything else — stack, structure, conventions — should stay stable across projects so the AI can generate code that is consistent, predictable, and ready for scale.

---

## 1. Overview

### Philosophy
- **Monorepo** with two workspaces: `frontend/` and `backend/`, orchestrated via npm workspaces.
- **Typed end-to-end** — TypeScript strict mode on both sides.
- **Thin controllers, fat services** on the backend. **Thin pages, fat hooks** on the frontend.
- **Single source of truth** for types, for auth state, for HTTP wiring.
- **Convention over configuration** — the folder/file naming is predictable so new features slot in without thinking.
- **Env-driven** — every configurable value comes from environment variables, validated at boot.
- **Contract-first** — backend emits a response envelope; frontend's HTTP client unwraps it automatically.

### Product Scope (fill in per project)
```
Product name:   <e.g. Acme CRM>
Domain:         <e.g. customer relationship management>
Primary users:  <admin / ops / end-users>
Core modules:   <list feature modules>
```

---

## 2. Tech Stack

### Backend
| Concern | Choice | Version |
|---|---|---|
| Framework | NestJS | ^10.x |
| Language | TypeScript (strict) | ^5.x |
| ORM | TypeORM | ^0.3.x |
| Database | PostgreSQL | 15-alpine |
| Cache / Queue (optional) | Redis | 7-alpine |
| Auth | Passport + JWT (access + refresh) | ^10.x |
| Validation | class-validator + class-transformer | latest |
| API Docs | @nestjs/swagger (OpenAPI 3) | ^7.x |
| Config | @nestjs/config + Joi validation | latest |
| Password hashing | bcryptjs | latest |
| HTTP client (for 3rd party) | Axios | ^1.x |
| Testing | Jest + Supertest | latest |

### Frontend
| Concern | Choice | Version |
|---|---|---|
| Framework | React | ^18.x |
| Build tool | Vite + SWC | ^5.x |
| Language | TypeScript (strict) | ^5.x |
| Routing | React Router | ^6.x |
| Server state | TanStack React Query | ^5.x |
| Client state | Zustand (with persist) | ^5.x |
| HTTP | Axios (with interceptors) | ^1.x |
| Forms | React Hook Form + Zod | latest |
| Tables | TanStack Table | ^8.x |
| Charts | Recharts | latest |
| UI library | shadcn/ui (Radix primitives) | latest |
| Styling | Tailwind CSS | ^3.x |
| Icons | Lucide React | latest |
| Theme | next-themes (light/dark) | latest |
| Notifications | Sonner (toasts) | latest |
| Animations | Framer Motion | latest |
| Testing | Vitest + @testing-library/react | latest |

### Infra
| Concern | Choice |
|---|---|
| Containers | Docker + docker-compose |
| Web server (prod frontend) | Nginx (serves built static + reverse-proxies API) |
| CI (suggested) | GitHub Actions |
| Secrets | `.env` (local), env injection (deploy) — **never commit** |

---

## 3. Monorepo Structure

```
<project-root>/
├── package.json                 # npm workspaces: ["frontend", "backend"]
├── docker-compose.yml           # local dev: postgres, redis, pgadmin
├── docker-compose.prod.yml      # production compose
├── .env.production.example
├── project.md                   # ← this file
├── CLAUDE.md                    # AI agent entry point (brief + commands)
├── README.md
│
├── .ai/                         # AI agent knowledge base (see §11)
│   ├── ENTRYPOINT.md
│   ├── context/                 # deep-dive docs
│   ├── skills/                  # coding standards per domain
│   ├── prompts/                 # task templates
│   └── agents/                  # role definitions
│
├── scripts/
│   └── build-and-package.sh
│
├── backend/                     # NestJS API (see §5)
└── frontend/                    # React SPA (see §6)
```

---

## 4. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                          Browser (SPA)                           │
│  Pages → Hooks (React Query) → api facade → service modules     │
│                         → httpClient (Axios)                     │
└────────────────────────────┬────────────────────────────────────┘
                             │  HTTPS / JSON
                             │  Authorization: Bearer <JWT>
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      NestJS API (/api/v1)                        │
│  Global pipeline:                                                │
│    JwtAuthGuard → RolesGuard → ValidationPipe                    │
│    → Controller → Service → TypeORM Repository                   │
│    → TransformInterceptor → HttpExceptionFilter                  │
└────────────────────────────┬────────────────────────────────────┘
                             │
               ┌─────────────┼─────────────┐
               ▼             ▼             ▼
           PostgreSQL     Redis       3rd-party APIs
```

### Request/Response Contract
- **Success envelope**: `{ success: true, data: T, timestamp: string }`
- **Error envelope (RFC 7807)**: `{ type, title, status, detail, instance, timestamp, path }`
- **Pagination**: `{ data: T[], meta: { total, page, limit, totalPages, hasNextPage, hasPrevPage } }`
- Frontend's `httpClient` auto-unwraps `data` so callers receive `T` directly.
- Frontend surfaces `detail` as `Error.message` for toast display.

### Auth Flow
1. `POST /auth/login` → issues `accessToken` (15m) + `refreshToken` (7d, rotated, stored SHA-256 hashed).
2. Frontend stores tokens in `useAuthStore` (Zustand + persist).
3. Axios request interceptor attaches `Authorization: Bearer <accessToken>`.
4. On `401`: response interceptor silently calls `/auth/refresh`, queues concurrent 401s to dedupe, retries originals.
5. On refresh failure → clear store → redirect to `/login`.

---

## 5. Backend Conventions

### Directory Structure
```
backend/
├── package.json
├── tsconfig.json
├── nest-cli.json
├── .env / .env.example
├── Dockerfile / .dockerignore
├── docker-compose.yml
│
└── src/
    ├── main.ts                  # bootstrap: CORS, global pipes, Swagger
    ├── app.module.ts            # root module
    │
    ├── config/
    │   ├── app.config.ts
    │   ├── database.config.ts
    │   ├── jwt.config.ts
    │   └── config.validation.ts # Joi schema
    │
    ├── database/
    │   ├── data-source.ts       # TypeORM DataSource
    │   ├── init.sql             # extensions (uuid-ossp, pg_trgm)
    │   ├── migrations/
    │   └── seeds/
    │
    ├── common/
    │   ├── decorators/          # @Public, @Roles, @Permissions, @CurrentUser
    │   ├── guards/              # JwtAuthGuard, RolesGuard
    │   ├── interceptors/        # Transform (envelope), Logging
    │   ├── filters/             # HttpExceptionFilter (RFC 7807)
    │   └── utils/               # hash, encryption, pagination
    │
    └── modules/                 # one folder per feature domain
        └── <feature>/
            ├── <feature>.module.ts
            ├── <feature>.controller.ts
            ├── <feature>.service.ts
            ├── dto/
            │   ├── create-<feature>.dto.ts
            │   ├── update-<feature>.dto.ts
            │   └── <feature>-response.dto.ts
            └── entities/
                └── <feature>.entity.ts
```

### Hard Rules
| Rule | Standard |
|---|---|
| Primary key | UUID via `@PrimaryGeneratedColumn('uuid')` |
| Timestamps | `@CreateDateColumn createdAt`, `@UpdateDateColumn updatedAt` |
| Delete strategy | Soft delete via `@DeleteDateColumn deletedAt` — **never hard delete** |
| Sensitive fields | `@Exclude()` (passwordHash, tokens, secrets) |
| Foreign keys | Explicit UUID column + `@JoinColumn({ name: 'xyzId' })` |
| Validation | `class-validator` on every DTO field + `@ApiProperty()` for Swagger |
| Global pipe | `new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })` |
| Response shape | Plain object from service; `TransformInterceptor` wraps it |
| Errors | Throw NestJS `HttpException`; filter formats as RFC 7807 |
| Transactions | `dataSource.transaction()` for multi-table writes |
| Pagination | Always return `{ data, meta }` for list endpoints |
| Raw SQL | Forbidden except `init.sql` |
| DB sync | `DB_SYNC=false` in production — always use migrations |
| Token storage | Store SHA-256 hash, never raw |
| Secrets at rest | AES-encrypt via `common/utils/encryption.util.ts` |
| API versioning | Global prefix `/api/v1` — version in prefix, not URL segment or header |
| Configurable vars | **Always** loaded from env via `@nestjs/config` + validated by Joi |

### Auth Decorators
```ts
@Public()                          // skip JwtAuthGuard
@Roles('admin', 'qa_lead')         // role-based access
@Permissions('manage:projects')    // fine-grained RBAC
@CurrentUser() user: JwtPayload    // inject authenticated user
```

### JWT Payload
```ts
// access token
{ sub: userId, email, role, orgId, type: 'access' }
// refresh token
{ sub: userId, type: 'refresh', jti: uuid }
```

### Role Hierarchy (default — override per project)
```
admin    → full access
manager  → manage domain resources and sub-users
user     → create / execute own work
viewer   → read-only
```

### Swagger Convention
- Every controller: `@ApiTags('<Module>')` + `@ApiBearerAuth()` when protected.
- Every endpoint: `@ApiOperation`, `@ApiResponse(200)`, `@ApiResponse(401)`.

---

## 6. Frontend Conventions

### Directory Structure
```
frontend/
├── package.json
├── tsconfig.json / tsconfig.app.json / tsconfig.node.json
├── vite.config.ts               # alias @/ → src/
├── vitest.config.ts             # jsdom
├── tailwind.config.ts
├── components.json              # shadcn/ui CLI config
├── .env.example                 # VITE_API_URL=...
├── Dockerfile / nginx.conf
│
└── src/
    ├── main.tsx                 # ReactDOM.createRoot
    ├── App.tsx                  # routes + providers (QueryClient, Theme, Toaster)
    ├── index.css                # Tailwind directives + CSS HSL vars
    │
    ├── pages/
    │   ├── Login.tsx
    │   ├── NotFound.tsx
    │   └── app/                 # protected routes (inside AppLayout)
    │       └── <Feature>.tsx
    │
    ├── components/
    │   ├── ui/                  # shadcn/ui — DO NOT EDIT
    │   ├── layout/              # AppLayout (sidebar + navbar)
    │   ├── auth/                # LoginForm, ProtectedRoute
    │   └── <feature>/           # per-domain components & dialogs
    │
    ├── hooks/                   # one file per domain: use<Feature>.ts
    │   ├── useAuthStore.ts
    │   └── use<Feature>.ts
    │
    ├── services/
    │   ├── api.ts               # facade — single import point
    │   ├── http-client.ts       # Axios + JWT + refresh + unwrap
    │   └── modules/             # one service per backend domain
    │       └── <feature>.service.ts
    │
    ├── stores/                  # Zustand global state
    │   ├── authStore.ts         # persisted
    │   ├── uiStore.ts           # persisted (theme, sidebar)
    │   └── <feature>Store.ts
    │
    ├── types/
    │   └── index.ts             # ALL shared types live here
    │
    ├── lib/
    │   └── utils.ts             # cn() = clsx + tailwind-merge
    │
    └── test/
        └── setup.ts
```

### Layer Stack (every API call goes through all layers — no shortcuts)
```
Page / Component
  └─ Hook (useQuery | useMutation)
      └─ api.<namespace>.<method>()            (services/api.ts facade)
          └─ <feature>Service.<method>()       (services/modules/*.service.ts)
              └─ httpClient.<verb>()           (services/http-client.ts)
                  └─ Backend
```

### Hard Rules
| Rule | Standard |
|---|---|
| API calls | **Only** through hooks → facade → service → httpClient |
| Direct `api.*` in pages | Forbidden |
| Server state | React Query only |
| Client state | Zustand (global) or `useState` (local) |
| Auth tokens | `useAuthStore` only; use `getState()` outside React |
| `localStorage` | Forbidden — use Zustand `persist` |
| UI components | shadcn/ui from `src/components/ui/` — never modify |
| Styling | Tailwind utilities only; dark mode via `dark:` variant |
| Conditional classes | `cn()` from `lib/utils.ts` |
| Types | All shared types in `src/types/index.ts` — no scattered `interface X` |
| `any` | Forbidden — always type API responses |
| Env vars | Must be prefixed `VITE_` to be exposed |
| Hook naming | `use<Domain>` — e.g. `useProjects`, `useCreateProject` |
| Query keys | Lists: `['<resource>', { filters }]` — Singles: `['<resource>', id]` |
| Mutations | Always `queryClient.invalidateQueries` on success |
| Detail queries | Guard with `enabled: !!id` |
| Forms | React Hook Form + Zod schema |
| User feedback | `toast.success` / `toast.error` from Sonner |
| Exports | Named exports for hooks/services; default exports for pages/dialogs |

### Hook Pattern
```ts
export const useProjects = () =>
  useQuery({ queryKey: ['projects'], queryFn: () => api.projects.list() });

export const useCreateProject = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Project>) => api.projects.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Project created');
    },
    onError: (err) => toast.error(err.message),
  });
};
```

### Service Module Pattern
```ts
export const projectsService = {
  list:   ()                             => httpClient.get<Project[]>('/projects'),
  get:    (id: string)                   => httpClient.get<Project>(`/projects/${id}`),
  create: (data: Partial<Project>)       => httpClient.post<Project>('/projects', data),
  update: (id: string, data: Partial<Project>) =>
          httpClient.patch<Project>(`/projects/${id}`, data),
  delete: (id: string)                   => httpClient.delete<void>(`/projects/${id}`),
};
```

### Zustand Store Pattern (with persist)
```ts
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      login: (payload) => set({ ...payload, isAuthenticated: true }),
      logout: () => set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false }),
    }),
    { name: 'auth', partialize: (s) => ({ /* only persist what's safe */ }) },
  ),
);
```

### Loading / Error / Empty States
Every list page must render:
- **Loading**: shadcn `Skeleton` or spinner.
- **Error**: inline alert with `error.message` + retry button.
- **Empty**: informative copy + primary CTA to create the first resource.

---

## 7. Design Language & UI System

### Theming
- Theme tokens are **CSS variables in HSL** defined in `src/index.css` under `:root` and `.dark`.
- Toggle dark mode by adding/removing `dark` class on `<html>` — managed by `next-themes`.
- All shadcn/ui components consume these tokens — never hard-code hex colors.

### Token Set (standard shadcn palette — adjust hues per brand)
```
--background / --foreground
--primary / --primary-foreground
--secondary / --secondary-foreground
--accent / --accent-foreground
--destructive / --destructive-foreground
--muted / --muted-foreground
--card / --card-foreground
--popover / --popover-foreground
--border / --input / --ring
--radius                     (border-radius base; default 0.5rem)
```

### Typography
- System font stack (`font-sans` Tailwind default) unless brand dictates otherwise.
- Scale: `text-xs → text-sm → text-base → text-lg → text-xl → text-2xl → text-3xl`.
- Headings: `font-semibold` or `font-bold`; body: `font-normal`; captions: `text-muted-foreground`.

### Spacing & Layout
- Tailwind spacing scale (4px base).
- Page padding: `p-6` on desktop, `p-4` on mobile.
- Card padding: `p-4` or `p-6` depending on density.
- Grid: 12-col implicit via `grid-cols-*` — prefer `flex` for 1-D layouts.

### Components (pick from shadcn/ui — do not reinvent)
- **Structure**: Card, Sheet, Dialog, Drawer, Tabs, Accordion, Separator.
- **Inputs**: Input, Textarea, Select, Checkbox, RadioGroup, Switch, Slider, DatePicker, Command.
- **Feedback**: Toast (Sonner), Alert, AlertDialog, Skeleton, Progress, Badge.
- **Data**: Table (TanStack), DataTable wrapper, Pagination, DropdownMenu, ContextMenu.
- **Navigation**: Sidebar, NavigationMenu, Breadcrumb, Tabs, Pagination.

### Interaction Patterns
- **Mutations** → optimistic when safe, otherwise show loading state on button + disable.
- **Destructive actions** → AlertDialog confirmation with explicit action label ("Delete project").
- **Forms** → inline field-level errors (RHF + Zod) + submit button loading state.
- **Feedback** → always a Sonner toast for success/error on mutations.
- **Empty states** → icon + headline + subcopy + primary CTA.

### Accessibility
- All interactive elements reachable by keyboard (shadcn gives this free via Radix).
- Icons-only buttons require `aria-label`.
- Color contrast: use token pairs (`foreground` on `background`) — never pick arbitrary colors.

### Animation
- Micro-interactions via Tailwind transitions (`transition-colors`, `duration-200`).
- Page/component transitions via Framer Motion (opt-in, subtle — `fade` + `slide` only).

---

## 8. Environment & Configuration

### Backend `.env`
```
# App
NODE_ENV=development
PORT=3000
API_PREFIX=api/v1
CORS_ORIGINS=http://localhost:5173

# Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=postgres
DATABASE_NAME=<project>_dev
DB_SYNC=false

# Auth
JWT_SECRET=<random-256-bit>
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_SECRET=<random-256-bit>
JWT_REFRESH_EXPIRY=7d
BCRYPT_ROUNDS=10

# Crypto
ENCRYPTION_KEY=<32-byte-hex>

# Optional
REDIS_HOST=localhost
REDIS_PORT=6379
SWAGGER_ENABLED=true
```

### Frontend `.env`
```
VITE_API_URL=http://localhost:3000/api/v1
```

### Validation
Every backend env var is validated at boot with Joi in `config/config.validation.ts`. The app **refuses to start** if anything is missing or malformed.

---

## 9. Commands Reference

### Root
```bash
npm install            # installs all workspaces
npm run dev            # runs frontend + backend in parallel
```

### Backend (`cd backend`)
```bash
npm run start:dev                 # watch mode on :3000
npm run start:prod                # production
npm run lint                      # ESLint --fix
npm run format                    # Prettier
npm run test                      # Jest unit
npm run test:e2e                  # Jest + Supertest
npm run test:cov                  # coverage
npm run migration:generate -- src/database/migrations/<Name>
npm run migration:run
npm run migration:revert
npm run seed
```

### Frontend (`cd frontend`)
```bash
npm run dev                       # Vite dev on :5173
npm run build                     # production build → dist/
npm run preview                   # preview prod build
npm run lint                      # ESLint
npm run test                      # Vitest single run
npm run test:watch                # Vitest watch
```

### Infra
```bash
docker-compose up -d postgres redis pgadmin       # local DB services
docker-compose -f docker-compose.prod.yml up -d   # production stack
```

---

## 10. Testing Strategy

### Backend
- **Unit** (`src/**/*.spec.ts`) — Jest. Mock repositories via `getRepositoryToken()`; test service logic only.
- **E2E** (`test/**/*.e2e-spec.ts`) — Jest + Supertest. Boot the Nest app, hit real HTTP endpoints, use a throwaway test DB.
- **Coverage target**: ≥ 70% on services; controllers covered by E2E.

### Frontend
- **Unit/Component** (`src/**/*.test.ts(x)`) — Vitest + @testing-library/react. jsdom env, setup in `src/test/setup.ts`.
- **Hooks** — test via `renderHook` from `@testing-library/react`.
- Keep tests **deterministic** — mock `httpClient`, never hit real network.

### What to test (priority order)
1. Services (backend business logic) — **must**.
2. Hooks (frontend data flow) — **should**.
3. Critical UI components (forms, dialogs, guards) — **should**.
4. Pure utils (hash, encryption, pagination, `cn`) — **must**.

---

## 11. AI Agent Workflow (`.ai/` folder)

The `.ai/` directory is the contract between the human and the AI agent. It makes Claude Code (and similar agents) produce consistent output across sessions and across projects.

```
.ai/
├── ENTRYPOINT.md                # what to read first in a new session
├── context/                     # "what this project IS"
│   ├── project-overview.md
│   ├── architecture.md
│   ├── backend.md
│   ├── frontend.md
│   ├── infra.md
│   └── integrations.md
├── skills/                      # "how we write code" — coding standards per domain
│   ├── backend-api.skill.md
│   ├── frontend-feature.skill.md
│   ├── unit-test.skill.md
│   ├── docker.skill.md
│   └── integration-retry.skill.md
├── prompts/                     # reusable task templates
│   ├── create-module.md
│   ├── debug-error.md
│   ├── write-tests.md
│   └── optimize-performance.md
└── agents/                      # role definitions (do's / don'ts per role)
    ├── backend-agent.md
    ├── frontend-agent.md
    ├── devops-agent.md
    └── qa-agent.md
```

### `CLAUDE.md` (root)
A short, scannable briefing — phase status, commands, quick rules, pointers into `.ai/`. The AI reads this first on every session.

### Rules for keeping `.ai/` healthy
- **Update `.ai/context/` whenever architecture changes** (new module, new dependency, new pattern).
- **Never duplicate knowledge** — `CLAUDE.md` points to `.ai/`, `.ai/ENTRYPOINT.md` points to specific context files.
- **Skills describe the how, context describes the what, agents describe the who.**

---

## 12. Git & Workflow

- **Main branch**: `main`.
- **Feature branches**: `feature/<short-name>` or descriptive (`user-management`).
- **Commit style**: imperative, lowercase (`add login dialog`, `fix 401 refresh loop`).
- **PRs**: one concern per PR; include description, screenshots for UI changes, migration note if schema changed.
- **Never commit**: `.env`, `.env.production`, build outputs, `node_modules`, IDE state, auth keys.

---

## 13. Checklist — New Feature (end-to-end)

When adding a new domain feature (e.g. "Invoices"):

### Backend
- [ ] `src/modules/invoices/invoices.module.ts`
- [ ] `src/modules/invoices/invoices.controller.ts` (with `@ApiTags`, `@ApiBearerAuth`, `@Roles`)
- [ ] `src/modules/invoices/invoices.service.ts` (all business logic, throws `HttpException`)
- [ ] `src/modules/invoices/entities/invoice.entity.ts` (UUID PK, timestamps, soft delete)
- [ ] `src/modules/invoices/dto/create-invoice.dto.ts` + `update-invoice.dto.ts` + response DTO
- [ ] Register module in `app.module.ts`
- [ ] Migration: `npm run migration:generate -- src/database/migrations/AddInvoices`
- [ ] Unit tests for service
- [ ] E2E tests for controller

### Frontend
- [ ] `src/types/index.ts` — add `Invoice`, `CreateInvoiceDto`, etc.
- [ ] `src/services/modules/invoices.service.ts`
- [ ] `src/services/api.ts` — add `invoices` namespace
- [ ] `src/hooks/useInvoices.ts` — `useInvoices`, `useInvoice`, `useCreateInvoice`, `useUpdateInvoice`, `useDeleteInvoice`
- [ ] `src/pages/app/Invoices.tsx` (list) + `InvoiceDetail.tsx` (detail) if needed
- [ ] `src/components/invoices/CreateInvoiceDialog.tsx`, `EditInvoiceDialog.tsx`, `DeleteInvoiceDialog.tsx`
- [ ] Route in `App.tsx` under `/app/invoices`
- [ ] Sidebar link in `AppLayout`
- [ ] Loading / error / empty states
- [ ] Component test (smoke) + hook test

### Done when
- [ ] Swagger shows the new endpoints.
- [ ] Frontend feature works end-to-end against the real backend.
- [ ] Lint + tests pass on both sides.
- [ ] `.ai/context/` updated if the pattern changed anything.

---

## 14. Principles (TL;DR)

1. **Predictable wins over clever.** Always follow the folder/naming conventions — even if another way "feels nicer".
2. **Types are the contract.** Share them from one source (`src/types/index.ts`, backend DTOs).
3. **The envelope is sacred.** Backend wraps, frontend unwraps. Don't break the pattern.
4. **Every mutation invalidates.** Stale cache is the #1 bug generator.
5. **Every secret is in env, validated, and encrypted at rest if persisted.**
6. **Every list has loading + empty + error states.**
7. **Every action has user feedback.**
8. **Every agent session starts by reading `CLAUDE.md` → `.ai/ENTRYPOINT.md` → the relevant context/skill.**
