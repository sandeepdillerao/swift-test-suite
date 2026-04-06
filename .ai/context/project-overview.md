# Project Overview — TestFlow TCM

## Purpose
Enterprise Test Case Management platform. Enables QA teams to author, organize, execute, and report on test cases across projects and releases.

## Business Domain
Software Quality Assurance. Core domain entities: Organizations → Projects → TestSuites → TestCases → TestRuns → Releases.

## Architecture Style
**Monorepo** — npm workspaces. Two apps: `frontend/` (React SPA) and `backend/` (NestJS REST API).

---

## Main Modules

| Module | Backend path | Frontend path | Status |
|---|---|---|---|
| Auth | `backend/src/modules/auth/` | `services/modules/auth.service.ts` | ✅ Complete |
| Users | `backend/src/modules/users/` | `services/modules/users.service.ts` + `hooks/useUsers*` | ✅ Complete |
| Organizations | `backend/src/modules/organizations/` | `services/modules/organizations.service.ts` | ✅ Complete |
| Projects | `backend/src/modules/projects/` | `services/modules/projects.service.ts` + `hooks/useProjects.ts` | ✅ Complete |
| Test Suites | `backend/src/modules/test-suites/` | `services/modules/test-suites.service.ts` + `hooks/useTestSuites.ts` | ✅ Complete |
| Test Cases | `backend/src/modules/test-cases/` | `services/modules/test-cases.service.ts` + `hooks/useTestCases.ts` | ✅ Complete |
| Test Runs | `backend/src/modules/test-runs/` | `services/modules/test-runs.service.ts` + `hooks/useTestRuns.ts` | ✅ Complete |
| Releases | `backend/src/modules/releases/` | `services/modules/releases.service.ts` + `hooks/useReleases.ts` | ✅ Complete |
| Dashboard | `backend/src/modules/dashboard/` | `services/modules/dashboard.service.ts` + `hooks/useDashboard.ts` | ✅ Complete |
| Settings | `backend/src/modules/settings/` | `services/modules/settings.service.ts` | ✅ Complete |
| Integrations (Jira + AI) | `backend/src/modules/integrations/` | `services/modules/integrations.service.ts` + `hooks/useIntegrations.ts` | ✅ Complete |
| Automation (Playwright) | `backend/src/modules/automation/` | `services/modules/automation.service.ts` + `hooks/useAutomation.ts` | ✅ Complete |
| RBAC | `backend/src/modules/rbac/` | `services/modules/rbac.service.ts` + `hooks/useRbac.ts` | ✅ Complete |
| AI Audit | `backend/src/common/modules/ai-audit/` | `pages/app/AiReviewPage.tsx` | ✅ Complete |

---

## Integrations
- **Jira** — Fully implemented: config, search, link test cases, sync status, generate from issues
- **AI Providers** — Fully implemented: OpenAI, Anthropic, Gemini (API keys encrypted in DB via Settings module)
- **Playwright** — Fully implemented: test recording, codegen
- **GitLab** — UI exists, backend API pending
- **Email** — Console logging only (no SMTP configured)
- **Redis** — Provisioned but not yet consumed

---

## Phase Status

| Phase | Status |
|---|---|
| Phase 1 — Auth, Users, Organizations | ✅ Complete |
| Phase 2 — Projects, TestSuites, TestCases, TestRuns, Releases, Dashboard | ✅ Complete (backend + frontend) |
| Phase 3 — Integrations, AI, Automation, RBAC, Settings | 🟢 Mostly complete (GitLab/Email/Redis pending) |

---

## High-Level Request Flow
```
Browser → React SPA (Vite, port 5173)
  → Axios httpClient (JWT Bearer injected, auto-refresh on 401)
  → NestJS API (port 3000, prefix /api/v1)
    → JwtAuthGuard → RolesGuard
    → Controller → Service → TypeORM Repository
    → PostgreSQL 15
```

## Key URLs (local)
- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:3000/api/v1`
- Swagger: `http://localhost:3000/api/docs`
- pgAdmin: `http://localhost:5050`
