# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## 1. Project Overview

**TestFlow TCM** is an enterprise test case management system with a **monorepo structure**:

- **Frontend**: React 18 + Vite + TypeScript + TailwindCSS + shadcn/ui (port 5173/8080)
- **Backend**: NestJS 10 + TypeORM + PostgreSQL 15 (port 3000, API prefix `/api/v1`)
- **Infrastructure**: Docker Compose (PostgreSQL, Redis, pgAdmin)
- **Package Manager**: npm workspaces (root `package.json` coordinates both frontend and backend)

**Key Status**:
- Phase 1 (Auth, Users, Organizations): ✅ Complete
- Phase 2 (Projects, TestSuites, TestCases, TestRuns, Releases, Dashboard): ⏳ Backend pending (frontend UI exists)
- Phase 3 (Integrations, AI, Email, Redis): 🔲 Partially started (Jira + AI generation working)

---

## 2. Directory Structure

```
swift-test-suite/
├── CLAUDE.md                      # This file
├── package.json                   # Root workspace config
├── .ai/                           # AI support structure
│   ├── ENTRYPOINT.md              # AI orientation guide
│   ├── context/                   # Deep-dive domain docs
│   │   ├── project-overview.md
│   │   ├── architecture.md
│   │   ├── backend.md
│   │   ├── frontend.md
│   │   ├── infra.md
│   │   └── integrations.md
│   ├── skills/                    # Coding standards per domain
│   │   ├── backend-api.skill.md
│   │   ├── frontend-feature.skill.md
│   │   ├── unit-test.skill.md
│   │   ├── docker.skill.md
│   │   └── integration-retry.skill.md
│   ├── prompts/                   # Task templates
│   │   ├── create-module.prompt.md
│   │   ├── debug-error.prompt.md
│   │   ├── write-tests.prompt.md
│   │   └── optimize-performance.prompt.md
│   └── agents/                    # Role definitions
│       ├── backend-agent.md
│       ├── frontend-agent.md
│       ├── qa-agent.md
│       └── devops-agent.md
│
├── backend/
│   ├── package.json               # Backend deps (NestJS, TypeORM, etc.)
│   ├── tsconfig.json              # TypeScript config (ES2021, decorators enabled)
│   ├── nest-cli.json              # NestJS scaffolding config
│   ├── .env                       # Backend env vars (DATABASE, JWT, REDIS, etc.)
│   ├── .env.example               # Template for .env
│   ├── docker-compose.yml         # PostgreSQL, Redis, pgAdmin services
│   ├── Dockerfile                 # Backend container image
│   │
│   ├── src/
│   │   ├── main.ts                # Entry point (NestFactory bootstrap, CORS, validation, Swagger)
│   │   ├── app.module.ts          # Root module (imports all feature modules, global providers)
│   │   │
│   │   ├── config/                # Environment configuration
│   │   │   ├── app.config.ts      # App settings (port, apiPrefix, corsOrigins, swaggerEnabled)
│   │   │   ├── database.config.ts # Database connection config
│   │   │   ├── jwt.config.ts      # JWT secret and expiry settings
│   │   │   └── config.validation.ts # Joi schema validation
│   │   │
│   │   ├── database/              # Database setup, migrations, seeds
│   │   │   ├── data-source.ts     # TypeORM DataSource configuration
│   │   │   ├── init.sql           # Initial SQL (UUIDs extension)
│   │   │   ├── migrations/        # TypeORM migrations (*.ts files)
│   │   │   └── seeds/             # Data seeding scripts
│   │   │
│   │   ├── common/                # Cross-cutting concerns (guards, interceptors, decorators, utils)
│   │   │   ├── decorators/        # Custom decorators
│   │   │   │   ├── public.decorator.ts       # Skip auth
│   │   │   │   ├── roles.decorator.ts        # RBAC @Roles('admin', 'qa_lead')
│   │   │   │   ├── permissions.decorator.ts  # Fine-grained @Permissions(...)
│   │   │   │   └── current-user.decorator.ts # @CurrentUser() injects request.user
│   │   │   │
│   │   │   ├── guards/            # Authentication & authorization
│   │   │   │   ├── jwt-auth.guard.ts # JWT validation (global)
│   │   │   │   └── roles.guard.ts    # Role-based access (global)
│   │   │   │
│   │   │   ├── interceptors/      # Request/response processing
│   │   │   │   ├── transform.interceptor.ts # Wraps response in { success, data, timestamp }
│   │   │   │   └── logging.interceptor.ts   # Logs requests
│   │   │   │
│   │   │   ├── filters/           # Exception handling
│   │   │   │   └── http-exception.filter.ts # RFC 7807 error format
│   │   │   │
│   │   │   ├── utils/             # Utility functions
│   │   │   │   ├── hash.util.ts          # SHA-256 token hashing
│   │   │   │   ├── encryption.util.ts    # AES encryption for sensitive data
│   │   │   │   └── pagination.util.ts    # Pagination helpers
│   │   │   │
│   │   │   └── modules/           # Reusable feature modules
│   │   │       └── ai-audit/      # AI call logging and audit trail
│   │   │
│   │   └── modules/               # Feature modules (organized by domain)
│   │       ├── auth/              # Authentication (login, refresh, password reset, email verify)
│   │       │   ├── auth.module.ts
│   │       │   ├── auth.controller.ts
│   │       │   ├── auth.service.ts
│   │       │   ├── entities/      # RefreshToken, User reference
│   │       │   ├── dto/           # LoginDto, RegisterDto, RefreshDto, etc.
│   │       │   ├── guards/        # LocalStrategy (passport-local)
│   │       │   └── strategies/    # JWT Strategy, Local Strategy
│   │       │
│   │       ├── users/             # User CRUD, invite, activate/deactivate
│   │       │   ├── users.module.ts
│   │       │   ├── users.controller.ts
│   │       │   ├── users.service.ts
│   │       │   ├── entities/      # User entity (UUID, soft-delete, role)
│   │       │   └── dto/           # CreateUserDto, UpdateUserDto, etc.
│   │       │
│   │       ├── organizations/     # Org CRUD, member management, settings
│   │       │   ├── organizations.module.ts
│   │       │   ├── organizations.controller.ts
│   │       │   ├── organizations.service.ts
│   │       │   ├── entities/      # Organization, OrganizationSettings
│   │       │   └── dto/
│   │       │
│   │       ├── projects/          # Project CRUD, team assignment
│   │       │   ├── projects.module.ts
│   │       │   ├── projects.controller.ts
│   │       │   ├── projects.service.ts
│   │       │   ├── entities/
│   │       │   └── dto/
│   │       │
│   │       ├── test-suites/       # Test suite CRUD, nesting
│   │       │   ├── test-suites.module.ts
│   │       │   ├── test-suites.controller.ts
│   │       │   ├── test-suites.service.ts
│   │       │   ├── entities/      # TestSuite entity
│   │       │   └── dto/
│   │       │
│   │       ├── test-cases/        # Test case CRUD, steps, status, priority
│   │       │   ├── test-cases.module.ts
│   │       │   ├── test-cases.controller.ts
│   │       │   ├── test-cases.service.ts
│   │       │   ├── entities/      # TestCase, TestStep
│   │       │   └── dto/
│   │       │
│   │       ├── test-runs/         # Test run execution, history, case status updates
│   │       │   ├── test-runs.module.ts
│   │       │   ├── test-runs.controller.ts
│   │       │   ├── test-runs.service.ts
│   │       │   ├── entities/      # TestRun, TestRunCase
│   │       │   └── dto/
│   │       │
│   │       ├── releases/          # Release management, versioning
│   │       │   ├── releases.module.ts
│   │       │   ├── releases.controller.ts
│   │       │   ├── releases.service.ts
│   │       │   ├── entities/      # Release entity
│   │       │   └── dto/
│   │       │
│   │       ├── dashboard/         # Dashboard stats, aggregations
│   │       │   ├── dashboard.module.ts
│   │       │   ├── dashboard.controller.ts
│   │       │   └── dashboard.service.ts
│   │       │
│   │       ├── settings/          # API key management, encrypted storage
│   │       │   ├── settings.module.ts
│   │       │   ├── settings.controller.ts
│   │       │   ├── settings.service.ts
│   │       │   ├── entities/
│   │       │   └── dto/
│   │       │
│   │       ├── integrations/      # Third-party integrations (Jira, GitLab, AI)
│   │       │   ├── integrations.module.ts
│   │       │   ├── integrations.controller.ts
│   │       │   ├── integrations.service.ts
│   │       │   ├── jira/          # Jira integration (search, link, sync)
│   │       │   ├── ai-generation/ # AI test case generation (OpenAI, Anthropic, Gemini)
│   │       │   ├── entities/
│   │       │   └── dto/
│   │       │
│   │       ├── automation/        # Playwright test recording, codegen
│   │       │   ├── automation.module.ts
│   │       │   ├── automation.controller.ts
│   │       │   ├── automation.service.ts
│   │       │   ├── entities/
│   │       │   └── dto/
│   │       │
│   │       └── rbac/              # Role-Based Access Control (custom roles, permissions)
│   │           ├── rbac.module.ts
│   │           ├── rbac.controller.ts
│   │           ├── rbac.service.ts
│   │           ├── entities/      # Role, Permission, RolePermission
│   │           └── dto/
│   │
│   ├── dist/                      # Compiled output (build artifact)
│   ├── test/                      # E2E test configuration
│   │   └── jest-e2e.json
│   └── uploads/                   # File uploads directory

│
└── frontend/
    ├── package.json               # Frontend deps (React, Vite, TailwindCSS, etc.)
    ├── tsconfig.json              # Root TS config (references app.json and node.json)
    ├── tsconfig.app.json          # App TS config (strict, jsx: react-jsx)
    ├── tsconfig.node.json         # Build tool TS config
    ├── vite.config.ts             # Vite bundler config (React SWC, alias @/, port 5173)
    ├── vitest.config.ts           # Vitest unit test config (jsdom, setupFiles)
    ├── tailwind.config.ts          # TailwindCSS config (shadcn/ui integration)
    ├── postcss.config.js          # PostCSS config (tailwind processor)
    ├── eslint.config.js           # ESLint config
    ├── .env.example               # Template (VITE_API_URL)
    ├── components.json            # shadcn/ui CLI config
    ├── index.html                 # HTML entry point
    │
    ├── src/
    │   ├── main.tsx               # React entry point (ReactDOM.createRoot)
    │   ├── App.tsx                # Root component (routes, providers, theme)
    │   ├── App.css                # Global app styles
    │   ├── index.css              # Base styles (Tailwind directives, custom vars)
    │   │
    │   ├── pages/                 # Page components (one per route)
    │   │   ├── Login.tsx          # Public login page
    │   │   ├── NotFound.tsx       # 404 page
    │   │   └── app/               # Protected routes (inside AppLayout)
    │   │       ├── Dashboard.tsx
    │   │       ├── Projects.tsx
    │   │       ├── TestCases.tsx
    │   │       ├── TestCaseDetail.tsx
    │   │       ├── TestSuites.tsx
    │   │       ├── TestSuiteDetail.tsx
    │   │       ├── TestRuns.tsx
    │   │       ├── TestRunDetail.tsx
    │   │       ├── Releases.tsx
    │   │       ├── Integrations.tsx (Jira, GitLab, AI config)
    │   │       ├── UserManagement.tsx
    │   │       ├── RolesPermissions.tsx (RBAC admin)
    │   │       ├── AiReviewPage.tsx (AI audit log)
    │   │       └── Settings.tsx (API keys, org settings)
    │   │
    │   ├── components/            # Reusable UI components
    │   │   ├── ui/                # shadcn/ui primitives (button, dialog, form, etc.)
    │   │   │   └── *.tsx          # 50+ component files (auto-generated, don't edit)
    │   │   │
    │   │   ├── layout/            # Layout components
    │   │   │   ├── AppLayout.tsx  # Main app layout (sidebar, navbar, outlet)
    │   │   │   └── ...
    │   │   │
    │   │   ├── auth/              # Auth-related components
    │   │   │   ├── LoginForm.tsx
    │   │   │   ├── ProtectedRoute.tsx (wraps routes with auth check)
    │   │   │   └── ...
    │   │   │
    │   │   ├── projects/          # Project feature components
    │   │   ├── testcases/         # Test case components (form, list, detail)
    │   │   ├── testsuites/        # Test suite components
    │   │   ├── testruns/          # Test run execution components
    │   │   ├── releases/          # Release management components
    │   │   ├── automation/        # Playwright automation components
    │   │   ├── landing/           # Public landing page sections
    │   │   ├── StatusBadge.tsx    # Shared status badge
    │   │   ├── NavLink.tsx        # Shared nav link
    │   │   ├── ThemeToggle.tsx    # Dark/light mode toggle
    │   │   └── ...
    │   │
    │   ├── hooks/                 # Custom React hooks
    │   │   ├── use-mobile.tsx     # Mobile breakpoint detection
    │   │   ├── use-toast.ts       # Toast notifications (sonner integration)
    │   │   ├── useAuthStore.ts    # Auth store hook (Zustand)
    │   │   ├── usePermissions.ts  # Permission checking
    │   │   ├── useRbac.ts         # RBAC queries and mutations
    │   │   ├── useProjects.ts     # Project queries/mutations (React Query)
    │   │   ├── useTestCases.ts    # Test case Q/M
    │   │   ├── useTestSuites.ts   # Test suite Q/M
    │   │   ├── useTestRuns.ts     # Test run Q/M
    │   │   ├── useReleases.ts     # Release Q/M
    │   │   ├── useDashboard.ts    # Dashboard stats
    │   │   ├── useIntegrations.ts # Jira, AI config, API keys
    │   │   ├── useAutomation.ts   # Playwright recording/codegen
    │   │   └── useUsers.ts        # User management Q/M
    │   │
    │   ├── services/              # API client layer
    │   │   ├── api.ts             # Single import point (aggregates all service modules)
    │   │   ├── http-client.ts     # Axios instance with JWT, refresh, envelope unwrap
    │   │   └── modules/           # Service modules (one per backend domain)
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
    │   │   ├── authStore.ts       # Auth (tokens, user, logout)
    │   │   ├── uiStore.ts         # UI (theme, sidebar open, etc.)
    │   │   ├── projectStore.ts    # Current project context
    │   │   ├── permissionStore.ts # User permissions cache
    │   │   ├── aiConfigStore.ts   # AI provider config (OpenAI, Anthropic, Gemini)
    │   │   └── aiGenerationStore.ts # AI generation state
    │   │
    │   ├── types/                 # Shared TypeScript types
    │   │   └── index.ts           # All types (User, Project, TestCase, TestRun, Release, etc.)
    │   │
    │   ├── lib/                   # Utility libraries
    │   │   └── ...                # Helper functions (form validation, formatting, etc.)
    │   │
    │   ├── test/                  # Test setup and example tests
    │   │   ├── setup.ts           # Vitest setup (mocks, globals)
    │   │   └── example.test.ts    # Example unit test
    │   │
    │   ├── vite-env.d.ts          # Vite global type definitions
    │   └── index.css              # Entry stylesheet
    │
    ├── public/                    # Static assets (favicon, images, etc.)
    ├── dist/                      # Built output (production bundle)
    └── node_modules/
```

---

## 3. Core Technologies

### Backend Stack
| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| Framework | NestJS | 10.3.0 | TypeScript REST framework with decorators |
| Database ORM | TypeORM | 0.3.20 | PostgreSQL mapping, migrations, repositories |
| Database | PostgreSQL | 15-alpine | Primary data store |
| Authentication | Passport.js + JWT | 10.0.3, 10.2.0 | User auth (Local + JWT strategies) |
| Validation | class-validator | 0.14.1 | DTO validation with decorators |
| Config | @nestjs/config + Joi | 3.1.1, 17.12.2 | Environment config with schema validation |
| Docs | Swagger/OpenAPI | 7.3.0 | Auto-generated API documentation |
| HTTP Client | Axios | 1.14.0 | For calling 3rd party APIs (Jira, AI) |
| Cache | Redis | 7-alpine | Provisioned but unused (reserved for queues) |
| Testing | Jest + Supertest | 29.7.0, 7.0.0 | Unit and E2E tests |
| Test Browser | Playwright | 1.59.1 | Browser automation testing |

### Frontend Stack
| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| Framework | React | 18.3.1 | UI library with hooks |
| Build Tool | Vite | 5.4.19 | Fast bundler (5173 default port) |
| Routing | React Router | 6.30.1 | Client-side routing |
| State (Remote) | React Query (TanStack Query) | 5.83.0 | Server state, caching, sync |
| State (Local) | Zustand | 5.0.10 | Simple global state (auth, UI, config) |
| HTTP Client | Axios | 1.7.9 | API calls with JWT interceptor |
| UI Framework | shadcn/ui | Latest | Accessible Radix UI + Tailwind components |
| Styling | TailwindCSS | 3.4.17 | Utility-first CSS |
| Form Library | React Hook Form | 7.61.1 | Efficient form state management |
| Notifications | Sonner | 1.7.4 | Toast notifications |
| Tables | TanStack Table | 8.21.3 | Headless table component |
| Charts | Recharts | 2.15.4 | Data visualization |
| Date Picker | react-day-picker | 8.10.1 | Calendar date selection |
| Icons | Lucide React | 0.462.0 | Modern icon library |
| Theme | next-themes | 0.3.0 | Dark/light mode toggle |
| Testing | Vitest | 3.2.4 | Fast unit test runner |
| Testing | @testing-library/react | 16.0.0 | Component testing utilities |

### DevOps Stack
| Component | Technology | Version | Purpose |
|-----------|-----------|---------|---------|
| Containerization | Docker | - | Application container |
| Orchestration | Docker Compose | Latest | Local multi-service setup |
| Task Runner | npm workspaces | - | Root coordination of frontend/backend |

---

## 4. Build & Development Workflow

### Root Workspace Commands
```bash
# Start both frontend (Vite dev) and backend (NestJS watch)
npm run dev

# Build both for production
npm run build:frontend
npm run build:backend

# Test backend only
npm run test:backend
npm run test:e2e
```

### Backend Commands
```bash
cd backend

# Development
npm run start:dev          # Watch mode (NestJS nest start --watch)
npm run start:debug       # Debug mode
npm run start:prod        # Production (node dist/main)

# Database
npm run migration:generate -- src/database/migrations/Name  # Create new migration
npm run migration:run                                       # Apply migrations
npm run migration:revert                                    # Rollback one migration
npm run migration:show                                      # List migration status
npm run seed                                                # Seed test data

# Testing
npm run test              # Jest unit tests (src/**/*.spec.ts)
npm run test:watch       # Watch mode
npm run test:cov         # Coverage report
npm run test:e2e         # E2E tests (test/jest-e2e.json config)

# Code quality
npm run lint             # ESLint with --fix
npm run format           # Prettier reformat
npm run build            # Compile TypeScript (tsc via nest build)
```

### Frontend Commands
```bash
cd frontend

# Development
npm run dev              # Vite dev server (http://localhost:5173)
npm run preview          # Preview production build locally

# Building
npm run build            # Production build (dist/)
npm run build:dev       # Development build with source maps

# Testing
npm run test            # Vitest run (single run)
npm run test:watch      # Vitest watch mode

# Code quality
npm run lint            # ESLint check
```

### Local Infrastructure
```bash
cd backend

# Start PostgreSQL + Redis + pgAdmin
docker-compose up -d postgres redis pgadmin

# Stop services
docker-compose down

# Access pgAdmin: http://localhost:5050 (admin@pgadmin.org / admin)
```

---

## 5. API Architecture & Response Format

### Request/Response Envelope
**All API responses wrapped by backend (`TransformInterceptor`):**
```typescript
interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  timestamp: string;
}

// Frontend unwraps automatically (http-client.ts interceptor)
// So hooks receive T directly
```

### Authentication
**JWT Bearer tokens** with automatic refresh:
```
Authorization: Bearer <accessToken>
```
- **Access token**: 15 minutes
- **Refresh token**: 7 days (stored in DB as hashed RefreshToken entity)
- **Token refresh flow**: On 401, frontend calls `/auth/refresh` with refreshToken
- **Queue mechanism**: Multiple concurrent 401s deduplicated to single refresh call

### Error Format (RFC 7807)
**All errors use RFC 7807 Problem Details:**
```typescript
interface ApiError {
  type: string;              // e.g., "https://api.example.com/errors/validation"
  title: string;             // e.g., "Validation Failed"
  status: number;            // HTTP status code
  detail: string;            // Error message
  instance: string;          // Affected resource URI
  timestamp: string;         // ISO timestamp
  path: string;              // Request path
}
```

### Pagination (List Endpoints)
**Query parameters:**
```
?page=1&limit=20&sortBy=createdAt&sortOrder=DESC
```
**Response shape:**
```typescript
{
  success: true,
  data: T[],
  meta: {
    total: number,           // Total records
    page: number,
    limit: number,
    totalPages: number,
    hasNextPage: boolean,
    hasPrevPage: boolean
  },
  timestamp: string
}
```

### Global Guards & Interceptors
All applied globally via app.module.ts:
1. **JwtAuthGuard** — Validates Bearer token (skip with `@Public()`)
2. **RolesGuard** — Checks `@Roles()` decorators
3. **TransformInterceptor** — Wraps responses in { success, data, timestamp }
4. **LoggingInterceptor** — Logs all requests
5. **GlobalHttpExceptionFilter** — RFC 7807 error formatting

---

## 6. Authentication & Authorization

### Decorators
```typescript
@Public()                              // Skip JwtAuthGuard
@Roles('admin', 'qa_lead')            // Require role
@Permissions('manage:projects')        // Require permission (fine-grained)
@CurrentUser()                         // Inject authenticated user
```

### Roles (System Roles)
| Role | Access Level | Purpose |
|------|--------------|---------|
| admin | Full organization | Create/manage all users, organizations, settings |
| qa_lead | Projects & test cases | Manage projects, suites, cases, runs |
| tester | Execute tests | Create test cases, execute runs, view all |
| viewer | Read-only | View projects, cases, runs (no create/edit) |

### RBAC Module
Custom roles & permissions system (Phase 3):
- **Role** entity: Custom role with permissions
- **Permission** entity: Fine-grained permission codes (manage:projects, execute:runs, etc.)
- **RolePermission** join table: Links roles to permissions
- **RolesGuard** checks decorators against user's role permissions

### Test Credentials (Local Dev)
```
admin@testflow.dev      / Admin@1234
qalead@testflow.dev     / QaLead@1234
tester@testflow.dev     / Tester@1234
viewer@testflow.dev     / Viewer@1234
```
**Organization**: TestFlow Demo (slug: `testflow-demo`)

---

## 7. Database Schema & TypeORM Patterns

### Naming Conventions
- **Primary Keys**: `id` (UUID, generated by `uuid_generate_v4()`)
- **Timestamps**: `createdAt`, `updatedAt` (auto-managed)
- **Soft Delete**: `deletedAt` (nullable) — never hard delete
- **Foreign Keys**: `entityId` (e.g., `userId`, `projectId`)

### Core Entities
- **User** — Email, hashed password, role, org membership
- **Organization** — Company/workspace container, encryption key for settings
- **Project** — Belongs to org, has test suites and test runs
- **TestSuite** — Organizes test cases (hierarchical with `parentId`)
- **TestCase** — Individual test with steps, status, priority, type
- **TestStep** — Array of steps in a test case
- **TestRun** — Execution batch of test cases (references Release)
- **TestRunCase** — Individual case result in a run (status, notes, duration)
- **Release** — Version for grouping test runs
- **RefreshToken** — Hashed JWT refresh token with user agent tracking
- **Role** — Custom role (system or custom)
- **Permission** — Codified permission (e.g., `manage:projects`)
- **RolePermission** — Join table
- **Setting** — Encrypted API keys (Jira, OpenAI, etc.)
- **ApiAuditLog** — AI call auditing

### Soft Delete Pattern
```typescript
@DeleteDateColumn()
deletedAt?: Date;

// TypeORM queries automatically filter out soft-deleted rows
// To include deleted: repo.find({ withDeleted: true })
```

### Migrations
All schema changes via TypeORM migrations:
```bash
npm run migration:generate -- src/database/migrations/AddColumnName
npm run migration:run          # Apply pending
npm run migration:revert       # Undo one
npm run migration:show         # Status
```

### Pagination Utility
```typescript
// Helper from @/common/utils/pagination.util.ts
export function paginate<T>(items: T[], page: number, limit: number) {
  const total = items.length;
  const offset = (page - 1) * limit;
  return {
    data: items.slice(offset, offset + limit),
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page < Math.ceil(total / limit),
      hasPrevPage: page > 1
    }
  };
}
```

---

## 8. Frontend Architecture

### Routing Structure
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

### State Management Patterns

**Remote Data (React Query)**:
```typescript
// In a hook
const { data: projects, isLoading, error } = useQuery({
  queryKey: ['projects', projectId],
  queryFn: () => api.projects.list(projectId)
});
```

**Local/Global State (Zustand)**:
```typescript
// In a store
export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  refreshToken: null,
  user: null,
  isAuthenticated: false,
  setTokens: (access, refresh) => set({ accessToken: access, refreshToken: refresh }),
  logout: () => set({ accessToken: null, refreshToken: null, user: null, isAuthenticated: false })
}));

// In a component
const { user, logout } = useAuthStore();
```

### HTTP Client Layer
**Single import point for all API calls:**
```typescript
import { api } from '@/services/api';

// All calls routed through api.<domain>.<method>()
// → service module → httpClient (with JWT + refresh + envelope unwrap)
// → Backend endpoint
```

**httpClient features** (http-client.ts):
1. Automatic JWT Bearer token injection
2. Token refresh on 401 (with queue deduplication)
3. Envelope unwrapping ({ success, data, timestamp } → T)
4. RFC 7807 error detail extraction
5. 2-minute timeout

### Service Module Pattern
```typescript
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

### Hook Pattern
```typescript
// hooks/useProjects.ts
export const useProjects = (projectId?: string) => {
  const { data: projects, ...query } = useQuery({
    queryKey: ['projects', projectId],
    queryFn: () => api.projects.list(projectId)
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<Project>) => api.projects.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projects'] })
  });

  return { projects, ...query, create: createMutation.mutate };
};
```

### Styling with TailwindCSS + shadcn/ui
- **shadcn/ui components**: `src/components/ui/` (read-only, auto-generated)
- **Custom components**: Use shadcn primitives + TailwindCSS utilities
- **Dark mode**: `next-themes` (toggles class on `<html>`)
- **Type-safe colors**: Extend tailwind.config.ts for custom palettes

---

## 9. Key Features & Integrations

### Phase 1 — Implemented
- ✅ User authentication (login, register, password reset, email verify)
- ✅ User management (CRUD, invite, activate/deactivate)
- ✅ Organization management
- ✅ JWT + refresh token rotation
- ✅ RBAC with 4 system roles
- ✅ Soft delete on all entities
- ✅ UUID primary keys
- ✅ Swagger/OpenAPI docs
- ✅ RFC 7807 error format

### Phase 2 — Backend Pending (Frontend UI Ready)
- ⏳ Projects
- ⏳ Test Suites (hierarchical)
- ⏳ Test Cases (with steps, priority, type)
- ⏳ Test Runs (execution batches)
- ⏳ Releases (version management)
- ⏳ Dashboard (stats, charts)

### Phase 3 — Integrations
- 🟢 **Jira Integration**: Search issues, link test cases, sync status, create subtasks
- 🟢 **AI Generation**: Generate test cases from Jira issues (OpenAI, Anthropic, Gemini)
- 🟢 **Playwright Automation**: Record test interactions, generate test code
- 🟢 **Settings Module**: Encrypted API key storage
- 🟢 **AI Audit**: Log all LLM calls with context
- 🟢 **RBAC Module**: Custom roles & permissions
- 🔴 **GitLab Integration**: UI exists, backend pending
- 🔴 **Email**: Console logging only (no SMTP configured)
- 🔴 **Redis Queues**: Reserved, not yet implemented

### Integration Points
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

## 10. Testing Strategy

### Backend Testing
**Jest + Supertest**:
- **Unit tests**: `src/**/*.spec.ts`
- **E2E tests**: `test/**/*.e2e-spec.ts` (full HTTP stack)
- **Config**: `backend/package.json` (jest section) + `test/jest-e2e.json`

**Run tests**:
```bash
npm run test              # Unit tests
npm run test:watch       # Watch mode
npm run test:cov         # Coverage report
npm run test:e2e         # E2E tests
```

**Example unit test**:
```typescript
describe('ProjectsService', () => {
  let service: ProjectsService;
  let repository: Repository<Project>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsService,
        { provide: getRepositoryToken(Project), useValue: mockRepository }
      ]
    }).compile();

    service = module.get<ProjectsService>(ProjectsService);
    repository = module.get<Repository<Project>>(getRepositoryToken(Project));
  });

  it('should list projects', async () => {
    jest.spyOn(repository, 'find').mockResolvedValue([mockProject]);
    expect(await service.list()).toEqual([mockProject]);
  });
});
```

### Frontend Testing
**Vitest + React Testing Library**:
- **Unit/component tests**: `src/**/*.test.ts` / `src/**/*.spec.tsx`
- **Config**: `vitest.config.ts` (jsdom environment, setupFiles: `src/test/setup.ts`)

**Run tests**:
```bash
npm run test              # Single run
npm run test:watch       # Watch mode
```

**Example component test**:
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

---

## 11. Coding Standards

### Backend (NestJS)
| Rule | Standard |
|------|----------|
| **Files** | `entity.ts`, `service.ts`, `controller.ts`, `module.ts`, `dto.ts` per feature |
| **Imports** | Use `@/` path alias for absolute imports from src/ |
| **DTO Validation** | Use `class-validator` decorators on all input DTOs |
| **Decorators** | Use `@Public()`, `@Roles()`, `@Permissions()`, `@CurrentUser()` |
| **Responses** | Return plain objects; `TransformInterceptor` wraps them |
| **Errors** | Throw NestJS `HttpException` or custom filters handle them |
| **Transactions** | Use `DataSource.transaction()` for multi-table ops |
| **Pagination** | Always return `{ data: T[], meta: PaginationMeta }` for lists |
| **Soft Delete** | Never hard-delete; filter via `deletedAt IS NULL` |
| **Logging** | Use `Logger.log()` or inject `LoggerService` |
| **PK type** | UUID (`uuid_generate_v4()`) |
| **Token storage** | SHA-256 hash via `hashToken()` in `common/utils/hash.util.ts` |
| **Validation** | `class-validator` on all DTOs; global `ValidationPipe(whitelist: true)` |
| **Config** | `@nestjs/config` + Joi schema in `config/config.validation.ts` |
| **Response** | `TransformInterceptor` wraps all; `GlobalHttpExceptionFilter` for errors |
| **DB access** | TypeORM repositories only; no `DB_SYNC` in prod |

**Example service**:
```typescript
@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project) private projectRepo: Repository<Project>,
    private logger: Logger
  ) {}

  async list(orgId: string) {
    this.logger.log(`Listing projects for org ${orgId}`);
    return this.projectRepo.find({ where: { organizationId: orgId, deletedAt: IsNull() } });
  }
}
```

### Frontend (React)
| Rule | Standard |
|------|----------|
| **Files** | Components: `.tsx`, utilities: `.ts`, hooks: `.ts`, stores: `.ts` |
| **Imports** | Use `@/` path alias for absolute imports from src/ |
| **Components** | Functional components with hooks, named exports |
| **Hooks** | Custom hooks in `hooks/` (useXxx pattern), use React Query for server state |
| **State** | Remote: React Query. Local: Zustand stores or useState. |
| **API Calls** | Only through `services/api.ts` and hooks (never direct axios) |
| **Types** | All shared types in `src/types/index.ts` |
| **Styling** | TailwindCSS utilities + shadcn/ui components (don't modify ui/) |
| **Environment** | Prefix with `VITE_` for Vite exposure (e.g., `VITE_API_URL`) |
| **Error Handling** | Use `toast.error()` for user-facing messages |
| **Auth tokens** | `useAuthStore` (Zustand, persisted). Read with `getState()` outside React |

**Example hook**:
```typescript
export const useProjects = (projectId?: string) => {
  const queryClient = useQueryClient();

  const { data: projects, isLoading } = useQuery({
    queryKey: ['projects', projectId],
    queryFn: () => api.projects.list(projectId)
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<Project>) => api.projects.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Project created');
    },
    onError: (error) => toast.error(error.message)
  });

  return { projects, isLoading, create: createMutation.mutate };
};
```

**Example component**:
```typescript
import { Button } from '@/components/ui/button';
import { useProjects } from '@/hooks/useProjects';

export const ProjectList = ({ organizationId }: { organizationId: string }) => {
  const { projects, isLoading, create } = useProjects(organizationId);

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="space-y-4">
      {projects?.map((p) => (
        <div key={p.id} className="p-4 border rounded">
          <h3 className="font-bold">{p.name}</h3>
          <p className="text-sm text-gray-600">{p.description}</p>
        </div>
      ))}
      <Button onClick={() => create({ name: 'New Project' })}>Add Project</Button>
    </div>
  );
};
```

---

## 12. AI Support Structure

All AI context and guidance is in `.ai/`:

### Entry Point
→ **`.ai/ENTRYPOINT.md`** — Start here for orientation, seed credentials, key URLs

### Context Files (Read Based on Task)
| File | When to Read |
|------|--------------|
| `context/project-overview.md` | Understanding the product vision |
| `context/architecture.md` | System design, data flows, auth/error handling |
| `context/backend.md` | Building NestJS modules, entities, services |
| `context/frontend.md` | Building React pages, hooks, stores |
| `context/infra.md` | Docker, env vars, migrations, local setup |
| `context/integrations.md` | Jira, AI generation, settings encryption |

### Skills (Coding Standards per Domain)
| Skill | Use When |
|------|----------|
| `skills/backend-api.skill.md` | Creating NestJS modules, CRUD endpoints |
| `skills/frontend-feature.skill.md` | Building UI pages, components, hooks |
| `skills/unit-test.skill.md` | Writing Jest or Vitest tests |
| `skills/docker.skill.md` | Adding services, env config |
| `skills/integration-retry.skill.md` | Integrating 3rd party APIs |

### Prompts (Task Templates)
| Prompt | Use When |
|--------|----------|
| `prompts/create-module.prompt.md` | Building full-stack feature (backend + frontend) |
| `prompts/debug-error.prompt.md` | Troubleshooting bugs |
| `prompts/write-tests.prompt.md` | Writing tests |
| `prompts/optimize-performance.prompt.md` | Improving speed/UX |

### Agents (Role Definitions)
| Agent | Activate When |
|-------|---------------|
| `agents/backend-agent.md` | Working on NestJS, TypeORM, auth |
| `agents/frontend-agent.md` | Working on React, hooks, stores |
| `agents/qa-agent.md` | Writing tests, QA |
| `agents/devops-agent.md` | Docker, infra, deployments |

---

## 13. Git Workflow

### Branch Strategy
- **Main branch**: `main` (production-ready)
- **Feature branches**: `feature/<name>` or `user-management` (development)
- **Naming**: Descriptive, lowercase, hyphens (e.g., `feature/jira-integration`)

---

## 14. Environment Variables

### Backend (.env)
```env
# App
NODE_ENV=development
PORT=3000
API_PREFIX=api/v1
CORS_ORIGINS=http://localhost:5173,https://swifttestsuit.lovable.app
SWAGGER_ENABLED=true

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=testflow
DB_PASSWORD=testflow_secret
DB_NAME=testflow_db
DB_SYNC=false              # Never auto-sync in prod
DB_LOGGING=true            # Log SQL queries

# JWT
JWT_SECRET=your-256-bit-secret-here
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_SECRET=your-refresh-256-bit-secret-here
JWT_REFRESH_EXPIRY=7d

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Security
BCRYPT_ROUNDS=12
FRONTEND_URL=http://localhost:5173
```

### Frontend (.env)
```env
VITE_API_URL=http://localhost:3000/api/v1
```

---

## 15. Local Development Quick Start

### 1. Clone & Install
```bash
git clone <repo>
cd swift-test-suite

# Install root, frontend, backend deps
npm install
```

### 2. Backend Setup
```bash
cd backend
cp .env.example .env
# Edit .env with your secrets (or use defaults for local dev)

# Start PostgreSQL + Redis
docker-compose up -d postgres redis pgadmin

# Run migrations
npm run migration:run

# Seed test data
npm run seed

# Start dev server
npm run start:dev
# → http://localhost:3000/api/v1
# → Swagger: http://localhost:3000/api/docs
```

### 3. Frontend Setup
```bash
cd frontend

# Start dev server
npm run dev
# → http://localhost:5173
```

### 4. Login
Use seed credentials:
- Email: `admin@testflow.dev` / Password: `Admin@1234`

### 5. Test
```bash
# Backend unit tests
cd backend && npm run test

# Backend E2E
npm run test:e2e

# Frontend tests
cd frontend && npm run test
```

---

## 16. File Organization Best Practices

### When Adding a New Backend Module
1. Create `src/modules/<feature>/`
2. Add `<feature>.module.ts` (imports & exports)
3. Add `<feature>.controller.ts` (routing, Swagger)
4. Add `<feature>.service.ts` (business logic)
5. Add `dto/` subfolder (input DTOs with validation)
6. Add `entities/` subfolder (TypeORM entities)
7. Import module into `app.module.ts`
8. Export service from module for cross-module use

### When Adding a New Frontend Page
1. Create `src/pages/app/<PageName>.tsx`
2. Add route in `App.tsx`
3. Create accompanying `src/hooks/use<Domain>.ts` (or reuse existing)
4. Create `src/services/modules/<domain>.service.ts` (if new domain)
5. Create `src/components/<domain>/` for feature components
6. Update `src/types/index.ts` with any new types

---

## 17. Common Patterns & Gotchas

### JWT Token Refresh
- On 401 response, frontend automatically calls `/auth/refresh`
- Multiple concurrent 401s deduplicated to single refresh call
- Failed refresh redirects to `/login`

### Soft Delete
- All entities have `@DeleteDateColumn() deletedAt?: Date`
- TypeORM filters deleted rows by default
- To include deleted: `repo.find({ withDeleted: true })`

### UUID Primary Keys
- Generated by PostgreSQL via `uuid_generate_v4()`
- Set in TypeORM entity: `@PrimaryGeneratedColumn('uuid')`
- Migrations initialize: `CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`

### Service Module Pattern
- Services live in `services/modules/`
- Each module handles one domain's API calls
- All exported via `api.ts` for single import point
- httpClient interceptors handle JWT, refresh, envelope unwrap

### React Query Invalidation
- Always invalidate cache after mutations:
```typescript
onSuccess: () => queryClient.invalidateQueries({ queryKey: ['domain'] })
```

### Form Validation
- Frontend: React Hook Form + Zod
- Backend: class-validator + DTOs
- Both validate; backend is authoritative

### Encryption for Sensitive Data
- Use `encryption.util.ts` for API keys, tokens
- Store in `OrganizationSettings.jira` or `Settings` entity
- Decrypt on read, encrypt on write

---

## 18. Deployment Considerations

- **Environment**: Set `NODE_ENV=production` in backend
- **Database**: Use cloud PostgreSQL, run migrations with `npm run migration:run`
- **Secrets**: Store JWT_SECRET, BCRYPT_ROUNDS, etc. in secrets manager
- **Frontend**: Build with `npm run build`, deploy dist/ to CDN
- **Backend**: Build with `npm run build`, deploy dist/ + node_modules
- **CORS**: Configure CORS_ORIGINS for frontend domain
- **Redis**: Optional (reserved for future queues)

---

## 19. Key Contacts & Documentation

- **.ai/ENTRYPOINT.md**: AI orientation guide
- **.ai/context/**: Deep-dive domain docs
- **.ai/skills/**: Coding standards per domain
- **Swagger/OpenAPI**: http://localhost:3000/api/docs (auto-generated)

---

## 20. Next Steps for Development

### If Adding a New Feature
1. Read `.ai/ENTRYPOINT.md` for context
2. Load relevant `.ai/context/` file
3. Use appropriate `.ai/skills/` for coding standards
4. Follow `.ai/prompts/create-module.prompt.md` for full-stack work

### If Debugging
1. Check backend logs: `npm run start:dev` output
2. Check frontend console: Browser DevTools
3. Check database: pgAdmin http://localhost:5050
4. Check Swagger: http://localhost:3000/api/docs

### If Running Tests
```bash
# Backend
cd backend && npm run test:cov        # Unit test coverage
npm run test:e2e                      # E2E tests

# Frontend
cd frontend && npm run test:watch     # Watch tests
```
