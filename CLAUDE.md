# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Project

**TestFlow TCM** — Enterprise Test Case Management platform.
Monorepo with npm workspaces: `frontend/` (React 18 + Vite + shadcn/ui) and `backend/` (NestJS 10 + TypeORM + PostgreSQL 15).

### Phase Status
| Phase | Status |
|---|---|
| Phase 1 — Auth, Users, Organizations | ✅ Complete |
| Phase 2 — Projects, TestSuites, TestCases, TestRuns, Releases, Dashboard | ✅ Complete |
| Phase 3 — Jira, AI generation, Playwright, RBAC, Settings, AI Audit | 🟢 Mostly done (GitLab/Email/Redis pending) |

---

## Deep-Dive Context (`.ai/` folder)

For detailed architecture, coding patterns, directory structures, and module specs, read the relevant file:

| File | When to read |
|---|---|
| [`.ai/ENTRYPOINT.md`](.ai/ENTRYPOINT.md) | Start of session — orientation, quick ref |
| [`.ai/context/project-overview.md`](.ai/context/project-overview.md) | Product vision, module inventory, phase status |
| [`.ai/context/architecture.md`](.ai/context/architecture.md) | System diagram, data flows, auth flow, entities, error/pagination patterns |
| [`.ai/context/backend.md`](.ai/context/backend.md) | NestJS modules, entity rules, DTOs, auth strategy, directory structure |
| [`.ai/context/frontend.md`](.ai/context/frontend.md) | React pages, hooks, stores, services, routing, directory structure |
| [`.ai/context/infra.md`](.ai/context/infra.md) | Docker, env vars, migrations, local setup, deployment |
| [`.ai/context/integrations.md`](.ai/context/integrations.md) | Jira, AI generation, settings encryption, Playwright automation |
| [`.ai/skills/`](.ai/skills/) | Coding standards per domain (backend-api, frontend-feature, unit-test, docker, integration-retry) |
| [`.ai/prompts/`](.ai/prompts/) | Task templates (create-module, debug-error, write-tests, optimize-performance) |

---

## Commands

```bash
# Root — run both frontend and backend
npm run dev

# Backend (from backend/)
npm run start:dev                                          # dev server (port 3000)
npm run test                                               # Jest unit tests
npm run test:e2e                                           # E2E tests (Supertest)
npm run test:cov                                           # coverage
npm run lint                                               # ESLint --fix
npm run format                                             # Prettier
npm run migration:run                                      # apply migrations
npm run migration:generate -- src/database/migrations/Name # new migration
npm run seed                                               # seed test data

# Frontend (from frontend/)
npm run dev                                                # Vite dev server (port 5173)
npm run test                                               # Vitest
npm run test:watch                                         # Vitest watch
npm run lint                                               # ESLint
npm run build                                              # production build

# Infrastructure (from backend/)
docker-compose up -d postgres redis pgadmin                # start DB services
```

---

## Architecture (Quick Reference)

```
Frontend: Pages → Hooks (React Query) → services/api.ts → modules/*.service.ts → httpClient (Axios)
  - httpClient auto-injects JWT, refreshes on 401 (queue dedup), unwraps { success, data, timestamp }
  - State: React Query for server data, Zustand for client (auth, UI, config, permissions)
  - Styling: TailwindCSS + shadcn/ui (NEVER edit src/components/ui/)
  - Types: all shared types in src/types/index.ts
  - Path alias: @/ → src/

Backend: Controller → Service → TypeORM Repository → PostgreSQL
  - Global: JwtAuthGuard (@Public() to skip) → RolesGuard (@Roles()) → TransformInterceptor → LoggingInterceptor → HttpExceptionFilter
  - Response envelope: { success, data, timestamp } — frontend unwraps automatically
  - Errors: RFC 7807 format { type, title, status, detail, instance, timestamp, path }
  - All entities: UUID PKs, soft delete (@DeleteDateColumn), timestamps
  - Validation: class-validator on DTOs, global ValidationPipe(whitelist, forbidNonWhitelisted, transform)
  - Config: @nestjs/config + Joi schema validation
  - Pagination: ?page=&limit=&sortBy=&sortOrder= → { data[], meta: { total, page, limit, totalPages, hasNextPage, hasPrevPage } }
```

---

## Coding Standards

### Backend (NestJS)
| Rule | Standard |
|---|---|
| PK type | UUID (`uuid_generate_v4()`) |
| Soft delete | `@DeleteDateColumn() deletedAt` — never hard delete |
| Auth decorators | `@Public()`, `@Roles(...)`, `@Permissions(...)`, `@CurrentUser()` |
| Token storage | SHA-256 hash via `hashToken()` in `common/utils/hash.util.ts` |
| Sensitive data | AES encryption via `common/utils/encryption.util.ts` |
| Validation | `class-validator` on all DTOs; `@ApiProperty()` for Swagger |
| Config | `@nestjs/config` + Joi; configurable vars always from env |
| DB access | TypeORM repositories only; no raw SQL; no `DB_SYNC` in prod |
| Responses | Return plain objects; `TransformInterceptor` wraps them |
| Errors | Throw NestJS `HttpException`; filter formats as RFC 7807 |
| Transactions | Use `DataSource.transaction()` for multi-table ops |
| Pagination | Always return `{ data: T[], meta: PaginationMeta }` for lists |

### Frontend (React)
| Rule | Standard |
|---|---|
| API calls | Only through hooks → `api.ts` → `modules/*.service.ts` → `httpClient` |
| State | Remote: React Query. Client: Zustand stores or useState |
| Auth tokens | `useAuthStore` (Zustand, persisted). `getState()` outside React |
| Styling | Tailwind + shadcn/ui. Never modify `src/components/ui/` |
| Types | All in `src/types/index.ts` |
| Env vars | Prefix `VITE_` for Vite exposure |
| Hooks | `hooks/use<Domain>.ts` pattern; React Query for server state |
| Error handling | Use `toast.error()` for user-facing messages |
| Imports | `@/` path alias for absolute imports from src/ |

### Roles
```
admin    → full org access
qa_lead  → manage projects, suites, cases, runs
tester   → execute runs, view all, create cases
viewer   → read-only
```

---

## Key Patterns

- **New backend module**: Create `src/modules/<feature>/` with module, controller, service, dto/, entities/. Import in `app.module.ts`.
- **New frontend page**: Add page in `src/pages/app/`, route in `App.tsx`, hook in `hooks/`, service in `services/modules/`, types in `types/index.ts`.
- **JWT refresh**: On 401, frontend auto-calls `/auth/refresh`. Concurrent 401s deduplicated. Failed refresh → logout.
- **React Query invalidation**: Always `queryClient.invalidateQueries({ queryKey: ['domain'] })` after mutations.
- **Form validation**: Frontend (React Hook Form + Zod) + Backend (class-validator). Backend is authoritative.
- **Soft delete**: `repo.softDelete()`. Include deleted: `repo.find({ withDeleted: true })`.

---

## Test Seed Credentials (Local Dev)
```
admin@testflow.dev      / Admin@1234
qalead@testflow.dev     / QaLead@1234
tester@testflow.dev     / Tester@1234
viewer@testflow.dev     / Viewer@1234
```
Organization: `TestFlow Demo` (slug: `testflow-demo`)

---

## Test Files
- Backend unit: `src/**/*.spec.ts` (Jest)
- Backend E2E: `test/**/*.e2e-spec.ts` (Jest + Supertest)
- Frontend: `src/**/*.test.ts` or `src/**/*.spec.tsx` (Vitest + @testing-library/react)

---

## Git Workflow
- **Main branch**: `main`
- **Feature branches**: `feature/<name>` or descriptive names (e.g., `user-management`)
- Lowercase, hyphens
