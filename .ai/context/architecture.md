# Architecture — TestFlow TCM

## System Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        MONOREPO ROOT                        │
│  ┌──────────────────────┐   ┌──────────────────────────┐   │
│  │   FRONTEND (React)   │   │    BACKEND (NestJS)       │   │
│  │   Vite · port 8080   │   │    REST API · port 3000   │   │
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
│                             │  auth / users / orgs      │   │
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
