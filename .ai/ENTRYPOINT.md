# TestFlow TCM — AI Entrypoint

Welcome. This is the AI engineering support structure for the TestFlow TCM monorepo.
Load this file at the start of every session to orient yourself before doing any work.

---

## Step 1 — Read Master Context First

Always start here:
→ [`../CONTEXT.md`](../CONTEXT.md) — 2-page architecture + standards + key commands summary

---

## Step 2 — Load Relevant Context File

Pick based on what you're working on:

| Task area | Load this |
|---|---|
| Understanding the project | [`context/project-overview.md`](context/project-overview.md) |
| Cross-cutting concerns, flows, error handling | [`context/architecture.md`](context/architecture.md) |
| Backend (NestJS, TypeORM, auth, RBAC) | [`context/backend.md`](context/backend.md) |
| Frontend (React, Zustand, hooks, API layer) | [`context/frontend.md`](context/frontend.md) |
| Docker, env vars, local setup, migrations | [`context/infra.md`](context/infra.md) |

---

## Step 3 — Use the Right Skill

Skills define strict coding rules for generating code:

| Skill | Use when |
|---|---|
| [`skills/backend-api.skill.md`](skills/backend-api.skill.md) | Creating or extending a NestJS module |
| [`skills/frontend-feature.skill.md`](skills/frontend-feature.skill.md) | Building a page, hook, service, or dialog |
| [`skills/unit-test.skill.md`](skills/unit-test.skill.md) | Writing NestJS service/guard unit tests |
| [`skills/docker.skill.md`](skills/docker.skill.md) | Adding Docker services or infra config |
| [`skills/integration-retry.skill.md`](skills/integration-retry.skill.md) | Jira, GitLab, AI provider integrations |

---

## Step 4 — Use a Prompt Template

Fill in the template for your task type:

| Template | Use when |
|---|---|
| [`prompts/create-module.prompt.md`](prompts/create-module.prompt.md) | Adding a full-stack feature module |
| [`prompts/debug-error.prompt.md`](prompts/debug-error.prompt.md) | Diagnosing a bug or unexpected behavior |
| [`prompts/write-tests.prompt.md`](prompts/write-tests.prompt.md) | Writing unit or E2E tests |
| [`prompts/optimize-performance.prompt.md`](prompts/optimize-performance.prompt.md) | Addressing slow queries or re-renders |

---

## Step 5 — Activate the Right Agent

Agents define role, decision boundaries, and output style:

| Agent | Activate when |
|---|---|
| [`agents/backend-agent.md`](agents/backend-agent.md) | Working on NestJS API, entities, auth |
| [`agents/frontend-agent.md`](agents/frontend-agent.md) | Working on React UI, hooks, stores |
| [`agents/qa-agent.md`](agents/qa-agent.md) | Writing or reviewing tests |
| [`agents/devops-agent.md`](agents/devops-agent.md) | Docker, migrations, environments |

---

## Quick Reference

### Project structure
```
swift-test-suite/
├── frontend/          React 18 + Vite + Tailwind + shadcn/ui (port 8080)
├── backend/           NestJS 10 + TypeORM + PostgreSQL 15 (port 3000)
├── CONTEXT.md         Master context summary
└── .ai/               This folder
```

### Phase status
| Phase | Status |
|---|---|
| Phase 1 — Auth, Users, Organizations | ✅ Done |
| Phase 2 — Projects, TestSuites, TestCases, TestRuns, Releases, Dashboard | ⏳ Backend pending (frontend UI exists) |
| Phase 3 — Jira/GitLab integration, AI generation, Email, Redis queues | 🔲 Not started |

### Seed credentials (local dev)
```
admin@testflow.dev   /  Admin@1234
qalead@testflow.dev  /  QaLead@1234
tester@testflow.dev  /  Tester@1234
viewer@testflow.dev  /  Viewer@1234
```

### Key URLs (local)
```
Frontend:  http://localhost:8080
API:       http://localhost:3000/api/v1
Swagger:   http://localhost:3000/api/docs
pgAdmin:   http://localhost:5050
```
