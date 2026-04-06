# Project Overview — TestFlow TCM

## Purpose
Enterprise Test Case Management platform. Enables QA teams to author, organize, execute, and report on test cases across projects and releases.

## Business Domain
Software Quality Assurance. Core domain entities: Organizations → Projects → TestSuites → TestCases → TestRuns → Releases.

## Architecture Style
**Monorepo** — npm workspaces. Two apps: `frontend/` (React SPA) and `backend/` (NestJS REST API).

---

## Main Modules

| Module | Location | Responsibility |
|---|---|---|
| Auth | `backend/src/modules/auth/` | JWT login, refresh rotation, password reset, email verify, invites |
| Users | `backend/src/modules/users/` | CRUD, RBAC roles, invite flow, activate/deactivate |
| Organizations | `backend/src/modules/organizations/` | Org management, member listing, stats |
| Projects | _(Phase 2)_ | Multi-project per org |
| Test Suites | _(Phase 2)_ | Hierarchical test case grouping |
| Test Cases | _(Phase 2)_ | Authoring, steps, Jira linking, import/export |
| Test Runs | _(Phase 2)_ | Execution tracking per case, pass rate, env/build |
| Releases | _(Phase 2)_ | Release gates linked to test runs |
| Dashboard | _(Phase 2)_ | Aggregate stats, activity feed |
| AI Config | `frontend/src/stores/aiConfigStore.ts` | Multi-provider AI key management (Gemini, OpenAI, Anthropic) |

---

## Integrations
- **Jira** — test case generation from tickets, subtask sync (`jiraSyncStatus` field on TestCase)
- **GitLab** — planned integration (Integrations page exists)
- **AI Providers** — Gemini 2.5, GPT-4o, Claude Sonnet (API keys stored in Zustand, persisted to localStorage)
- **Email** — not yet wired; all flows log tokens to console

---

## High-Level Request Flow
```
Browser → React SPA (Vite, port 8080)
  → Axios httpClient (JWT Bearer injected, auto-refresh on 401)
  → NestJS API (port 3000, prefix /api/v1)
    → JwtAuthGuard → RolesGuard
    → Controller → Service → TypeORM Repository
    → PostgreSQL 15
```

## Key URLs (local)
- Frontend: `http://localhost:8080`
- Backend API: `http://localhost:3000/api/v1`
- Swagger: `http://localhost:3000/api/docs`
- pgAdmin: `http://localhost:5050`
