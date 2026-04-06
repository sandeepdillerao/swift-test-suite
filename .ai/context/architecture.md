# Architecture — TestFlow TCM

## System Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        MONOREPO ROOT                        │
│  ┌──────────────────────┐   ┌──────────────────────────┐   │
│  │   FRONTEND (React)   │   │    BACKEND (NestJS)       │   │
│  │   Vite · port 5173   │   │    REST API · port 3000   │   │
│  │                      │   │                           │   │
│  │  React Query Cache   │◄──┤  /api/v1 prefix           │   │
│  │  Zustand Stores      │   │  Swagger at /api/docs     │   │
│  │  Axios httpClient    │──►│                           │   │
│  └──────────────────────┘   │  ┌─────────────────────┐ │   │
│                             │  │  Global Providers    │ │   │
│                             │  │  - JwtAuthGuard      │ │   │
│                             │  │  - RolesGuard        │ │   │
│                             │  │  - TransformInterceptor│ │  │
│                             │  │  - LoggingInterceptor │ │   │
│                             │  │  - HttpExceptionFilter│ │   │
│                             │  └─────────────────────┘ │   │
│                             │                           │   │
│                             │  Modules:                 │   │
│                             │  auth / users / orgs /    │   │
│                             │  projects / test-suites / │   │
│                             │  test-cases / test-runs / │   │
│                             │  releases / dashboard /   │   │
│                             │  settings / integrations /│   │
│                             │  automation / rbac        │   │
│                             └──────────┬────────────────┘   │
│                                        │                    │
│                             ┌──────────▼────────────────┐   │
│                             │       PostgreSQL 15        │   │
│                             │   (Docker · port 5432)    │   │
│                             └───────────────────────────┘   │
│                             ┌───────────────────────────┐   │
│                             │     Redis 7 (Docker)      │   │
│                             │   port 6379 (future use)  │   │
│                             └───────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## Module Interaction

```
AuthModule
  └── uses UsersModule (circular-safe via forwardRef pattern if needed)
  └── owns RefreshToken entity

UsersModule
  └── owns User entity
  └── references Organization entity (read-only cross-module)

OrganizationsModule
  └── owns Organization entity
  └── references User entity for member queries

ProjectsModule
  └── owns Project entity
  └── references Organization for scoping

TestSuitesModule
  └── owns TestSuite entity (hierarchical with parentId)
  └── references Project

TestCasesModule
  └── owns TestCase + TestStep entities
  └── references TestSuite, Project

TestRunsModule
  └── owns TestRun + TestRunCase entities
  └── references TestCase, Release, Project

ReleasesModule
  └── owns Release entity
  └── references Project

DashboardModule
  └── reads from Projects, TestCases, TestRuns, Releases (cross-module queries)

IntegrationsModule
  └── jira/ — Jira API integration (search, link, sync)
  └── ai-generation/ — AI test case generation (OpenAI, Anthropic, Gemini)
  └── uses SettingsModule for encrypted API keys

AutomationModule
  └── Playwright browser automation (recording, codegen)

RbacModule
  └── owns Role, Permission, RolePermission entities
  └── Custom roles & fine-grained permissions

SettingsModule
  └── owns Setting entity
  └── Encrypted API key storage per user/org

AiAuditModule (common/modules/)
  └── owns ApiAuditLog entity
  └── Logs all AI provider calls
```

---

## Backend Layer Pattern (per module)

```
Request
  → Controller   (routing, Swagger decorators, DTO binding)
  → Service      (business logic, transactions)
  → Repository   (TypeORM, injected via @InjectRepository)
  → Entity       (TypeORM mapped class, UUID PK, soft-delete)
```

---

## Auth Flow

```
POST /auth/login
  → LocalStrategy (passport-local) validates credentials
  → AuthService.login() generates accessToken (15m) + refreshToken (7d)
  → RefreshToken record saved to DB (hashed, with userAgent + IP)
  → Response: { accessToken, refreshToken, user }

Authenticated Request
  → JwtAuthGuard → JwtStrategy.validate() → attaches User to request
  → RolesGuard checks @Roles() decorator

POST /auth/refresh
  → Verifies JWT with JWT_REFRESH_SECRET
  → Finds non-revoked RefreshToken record
  → Revokes old → issues new pair (rotation)

POST /auth/logout
  → Marks RefreshToken.revokedAt = now()
```

---

## Frontend State / Data Flow

```
Component
  → TanStack Query hook (useProjects, useTestRuns, etc.)
  → api.{module}.{method}()        ← api.ts facade
  → {module}.service.ts            ← modular service
  → httpClient (Axios instance)    ← interceptors
    → Request: injects Bearer from authStore.getState().accessToken
    → Response: unwraps { success, data, timestamp } envelope
    → 401: auto-refresh → retry queue → or logout + redirect
```

---

## Error Handling Pattern

**Backend** — `GlobalHttpExceptionFilter` catches all exceptions:
```json
{
  "type": "https://httpstatuses.com/400",
  "title": "Bad Request",
  "status": 400,
  "detail": "email must be an email",
  "instance": "/api/v1/auth/register",
  "timestamp": "2026-03-18T10:00:00Z",
  "path": "/api/v1/auth/register"
}
```

**Frontend** — Axios response interceptor extracts `error.response.data.detail` and rejects with a plain `Error`. React Query surfaces via `error.message`.

---

## Soft Delete Pattern
All entities have `@DeleteDateColumn() deletedAt`. TypeORM automatically filters `WHERE deletedAt IS NULL` on all queries. Hard delete never used.

---

## Response Envelope
`TransformInterceptor` wraps every successful response:
```json
{ "success": true, "data": <T>, "timestamp": "..." }
```
Frontend `httpClient` unwraps this — callers receive `T` directly.

---

## Pagination Contract
All list endpoints accept: `?page=1&limit=20&sortBy=createdAt&sortOrder=DESC`
Response shape:
```json
{ "data": [], "meta": { "total": 0, "page": 1, "limit": 20, "totalPages": 0, "hasNextPage": false, "hasPrevPage": false } }
```

---

## Logging
`LoggingInterceptor` logs: `METHOD /path STATUS DURATIONms userId=<uuid>`
Errors logged by `GlobalHttpExceptionFilter` with stack trace for 5xx.

---

## Queue / Async
Redis is provisioned but not yet consumed. Planned for: email sending, Jira sync jobs, notification workers.

---

## Core Entities

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

### Entity Naming Conventions
- **Primary Keys**: `id` (UUID, generated by `uuid_generate_v4()`)
- **Timestamps**: `createdAt`, `updatedAt` (auto-managed)
- **Soft Delete**: `deletedAt` (nullable) — never hard delete
- **Foreign Keys**: `entityId` (e.g., `userId`, `projectId`)
