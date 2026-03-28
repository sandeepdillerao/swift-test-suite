# TestFlow TCM — Master Context

## What This Is
Enterprise Test Case Management platform. Monorepo: `frontend/` (React SPA) + `backend/` (NestJS REST API).

---

## Architecture Summary

```
frontend/ (React 18, Vite, port 8080)
  Zustand stores → TanStack Query hooks → api.ts facade
  → modules/{name}.service.ts → Axios httpClient
  → auto JWT injection + 401 refresh + envelope unwrap

backend/ (NestJS 10, port 3000, prefix /api/v1)
  JwtAuthGuard (global) → RolesGuard (global)
  → Controller → Service → TypeORM Repository
  → PostgreSQL 15

Infrastructure (Docker):
  postgres:15-alpine  (5432)
  redis:7-alpine      (6379, reserved)
  pgadmin             (5050)
```

**Response format**: `{ success: true, data: T, timestamp }` — frontend unwraps automatically.
**Errors**: RFC 7807 `{ type, title, status, detail, instance, timestamp, path }`.
**Pagination**: `?page=1&limit=20&sortBy=createdAt&sortOrder=DESC` → `{ data: T[], meta: { total, page, limit, totalPages, hasNextPage, hasPrevPage } }`.

---

## Coding Standards

### Backend (NestJS)
| Rule | Value |
|---|---|
| PK type | UUID (`uuid_generate_v4()`) |
| Soft delete | `@DeleteDateColumn() deletedAt` — never hard delete |
| Auth | JWT Bearer, `@Public()` to bypass, `@Roles(...)` for RBAC |
| Token storage | SHA-256 hash via `hashToken()` in `common/utils/hash.util.ts` |
| Validation | `class-validator` on all DTOs; global `ValidationPipe(whitelist: true)` |
| Config | `@nestjs/config` + Joi schema in `config/config.validation.ts` |
| Response | `TransformInterceptor` wraps all; `GlobalHttpExceptionFilter` for errors |
| DB access | TypeORM repositories only; no `DB_SYNC` in prod |

### Frontend (React)
| Rule | Value |
|---|---|
| API calls | Only through hooks → `api.ts` → `modules/*.service.ts` → `httpClient` |
| State | Remote data: React Query. Client state: Zustand |
| Auth tokens | `useAuthStore` (Zustand, persisted). Read with `getState()` outside React |
| Styling | Tailwind + shadcn/ui. Never modify `src/components/ui/` |
| Types | All in `src/types/index.ts` |
| Env vars | Prefix `VITE_` for Vite exposure |

### Roles
```
admin    → full org access
qa_lead  → manage projects, suites, cases, runs
tester   → execute runs, view all, create cases
viewer   → read-only
```

---

## Key Commands

```bash
# Backend
cd backend
docker-compose up -d postgres redis   # start DB
npm run migration:run                  # apply migrations
npm run seed                           # seed test users
npm run start:dev                      # http://localhost:3000
npm run migration:generate -- src/database/migrations/Name
npm test                               # unit tests
npm run test:e2e                       # e2e tests

# Frontend
cd frontend
npm run dev                            # http://localhost:8080
npm test                               # vitest
npm run build                          # production build
```

---

## Important Modules (Phase 1 — Implemented)

| Module | Backend path | Frontend path |
|---|---|---|
| Auth | `backend/src/modules/auth/` | `services/modules/auth.service.ts` |
| Users | `backend/src/modules/users/` | `services/modules/users.service.ts` + `hooks/useUsers*` |
| Organizations | `backend/src/modules/organizations/` | `services/modules/organizations.service.ts` |

## Phase 2 Modules (Frontend exists, Backend pending)
Projects · TestSuites · TestCases · TestRuns · Releases · Dashboard

---

## Integration Points

| Integration | Status | Location |
|---|---|---|
| Jira | Fully implemented | `backend/src/modules/integrations/jira/`, `GenerateFromJiraDialog.tsx`, `JiraLinkDialog.tsx` |
| AI Generation | Fully implemented | `backend/src/modules/integrations/ai-generation/`, `stores/aiConfigStore.ts` |
| Settings (API Keys) | Fully implemented | `backend/src/modules/settings/`, encrypted key storage |
| GitLab | UI exists, API pending | `pages/app/Integrations.tsx` |
| Email | Console logging only | `AuthService` — log token to console |
| Redis | Provisioned, unused | Docker service ready |

### Jira Integration Details
- Config stored encrypted in `organization.settings.jira`
- Searchable issue picker (project + issue search + type filters)
- Link test cases to Jira issues with optional subtask creation
- Status sync: Pass→Done, Fail→To Do, In Progress→In Progress
- AI generates 3-6 test cases from Jira issue using LLM (OpenAI/Anthropic/Gemini)
- Generated test cases auto-populate editable create form with Jira ticket mapping
- See `.ai/context/integrations.md` for full details

---

## Test Seed Credentials
| Role | Email | Password |
|---|---|---|
| admin | admin@testflow.dev | Admin@1234 |
| qa_lead | qalead@testflow.dev | QaLead@1234 |
| tester | tester@testflow.dev | Tester@1234 |
| viewer | viewer@testflow.dev | Viewer@1234 |

Org: `TestFlow Demo` (slug: `testflow-demo`)

---

## AI Support Files
```
.ai/
  context/    project-overview · architecture · backend · frontend · infra · integrations
  skills/     backend-api · frontend-feature · unit-test · docker · integration-retry
  prompts/    create-module · debug-error · write-tests · optimize-performance
  agents/     backend-agent · frontend-agent · qa-agent · devops-agent
```
