# Next.js Fullstack Project Blueprint

> A reusable architectural blueprint for building production-grade **fullstack** web apps in a **single Next.js codebase** (App Router) — frontend + backend API + PostgreSQL — using Claude Code (or any AI coding agent).
>
> Designed to start small (one developer, one app, one database) and scale up to many modules without rewrites. The "backend" inside Next.js is organized with clear, layered separation (module → controller → service → repository) so it stays readable as it grows.
>
> Copy this file into the root of any new Next.js project and adjust the "Product Scope" section. Everything else — stack, structure, conventions — stays stable across projects so the AI produces consistent code.

---

## 1. Overview

### Philosophy
- **One Next.js app, two clean halves**: a `src/app/` UI layer and a `src/server/` backend layer, fully separated in folder structure and imports.
- **App Router** for UI with Server Components by default; Client Components only at interactive leaves.
- **Route Handlers** (`src/app/api/**/route.ts`) are thin — they bind HTTP to a server module's controller. No business logic lives in a route handler.
- **Server Actions** are allowed, but only for internal form mutations where you don't need the endpoint to be consumed by a third party.
- **Typed end-to-end** — TypeScript strict mode; types inferred from the DB schema (Prisma/Drizzle) up through Zod DTOs.
- **Single source of truth** for types, for auth, for HTTP wiring.
- **Contract-first response envelope** — every API response is wrapped; the `httpClient` unwraps it automatically. Errors follow RFC 7807 with `detail` surfaced as `Error.message`.
- **Env-driven** — every configurable value comes from env vars, validated at boot with Zod.
- **Scales from small → large** — start with 2–3 modules; the same pattern holds at 30. No restructure needed.

### Product Scope (fill in per project)
```
Product name:   <e.g. Acme CRM>
Domain:         <e.g. customer relationship management>
Primary users:  <admin / ops / end-users>
Core modules:   <auth, users, projects, ...>
External APIs:  <Stripe, S3, SendGrid, ...>
```

---

## 2. Tech Stack

### Framework & Language
| Concern | Choice | Version |
|---|---|---|
| Framework | Next.js (App Router) | ^15.x |
| Runtime | React | ^19.x |
| Language | TypeScript (strict) | ^5.x |
| Linter / Formatter | ESLint (next/core-web-vitals) + Prettier | latest |

### Frontend
| Concern | Choice |
|---|---|
| Server state | TanStack React Query ^5.x |
| Client state | Zustand ^5.x (with persist) |
| HTTP (client → own API) | Axios ^1.x with interceptors |
| Forms | React Hook Form + Zod |
| Tables | TanStack Table ^8.x |
| Charts | Recharts |
| UI library | shadcn/ui (Radix primitives) |
| Styling | Tailwind CSS ^3.x (or ^4.x) |
| Icons | Lucide React |
| Theme | next-themes (light/dark) |
| Notifications | Sonner (toasts) |
| Animations | Framer Motion |

### Backend (inside the same Next.js app)
| Concern | Choice |
|---|---|
| Database | PostgreSQL 15+ |
| ORM | Prisma ^5.x (default) — or Drizzle if team prefers SQL-first |
| Migrations | `prisma migrate` |
| Validation | Zod (shared client/server) |
| Auth | Auth.js (NextAuth v5) with Credentials + OAuth providers — or custom JWT (cookie-based) |
| Password hashing | bcryptjs |
| Email | Resend / Nodemailer |
| File storage | S3-compatible (AWS S3 / R2 / MinIO) |
| Rate limiting | Upstash Ratelimit (Redis) or in-memory for small apps |
| Logging | pino |
| Testing (unit) | Vitest + @testing-library/react |
| Testing (e2e) | Playwright |

### Infra
| Concern | Choice |
|---|---|
| Local dev DB | Docker Compose (Postgres + optional Redis + pgAdmin) |
| Deploy (serverless) | Vercel |
| Deploy (containers) | Docker + any host (Railway, Fly.io, Render, self-hosted) |
| Secrets | `.env.local` / platform env injection |

---

## 3. Project Structure

```
<project-root>/
├── package.json
├── tsconfig.json
├── next.config.ts
├── next-env.d.ts
├── tailwind.config.ts
├── postcss.config.js
├── eslint.config.mjs
├── vitest.config.ts
├── playwright.config.ts
├── components.json                  # shadcn/ui CLI config
├── middleware.ts                    # edge auth gate, redirects, i18n
├── .env.local / .env.example
├── docker-compose.yml               # local postgres + redis + pgadmin
├── docker-compose.prod.yml          # optional
├── Dockerfile / .dockerignore       # optional
├── README.md
├── CLAUDE.md                        # AI agent entry point
├── frontend-project.md              # ← this file
│
├── prisma/
│   ├── schema.prisma                # single schema file
│   ├── migrations/                  # generated migrations
│   └── seed.ts                      # seed script
│
├── public/
│   ├── favicon.ico
│   └── images/
│
└── src/
    ├── app/                         # 🎨 UI LAYER (App Router)
    │   ├── layout.tsx               # root layout, fonts, Providers, Toaster
    │   ├── globals.css              # Tailwind directives + HSL CSS vars
    │   ├── page.tsx                 # landing / redirect
    │   ├── not-found.tsx
    │   ├── error.tsx
    │   ├── loading.tsx
    │   │
    │   ├── (auth)/                  # route group — unauth'd
    │   │   ├── layout.tsx
    │   │   ├── login/page.tsx
    │   │   ├── register/page.tsx
    │   │   └── forgot-password/page.tsx
    │   │
    │   ├── (app)/                   # route group — auth'd
    │   │   ├── layout.tsx           # AppShell (sidebar + navbar)
    │   │   ├── dashboard/page.tsx
    │   │   ├── projects/
    │   │   │   ├── page.tsx
    │   │   │   ├── loading.tsx
    │   │   │   ├── error.tsx
    │   │   │   └── [id]/page.tsx
    │   │   └── settings/page.tsx
    │   │
    │   └── api/                     # 🛰️  HTTP BOUNDARY — thin route handlers
    │       ├── auth/
    │       │   ├── login/route.ts
    │       │   ├── logout/route.ts
    │       │   ├── refresh/route.ts
    │       │   └── me/route.ts
    │       ├── projects/
    │       │   ├── route.ts         # GET (list), POST (create)
    │       │   └── [id]/route.ts    # GET, PATCH, DELETE
    │       └── health/route.ts
    │
    ├── server/                      # 🔧 BACKEND LAYER — framework-agnostic
    │   ├── config/
    │   │   └── env.ts               # Zod-validated env object
    │   │
    │   ├── db/
    │   │   ├── client.ts            # Prisma singleton
    │   │   └── seed-data.ts
    │   │
    │   ├── common/
    │   │   ├── errors.ts            # AppError, NotFoundError, UnauthorizedError, ...
    │   │   ├── http.ts              # ok(), created(), paginated(), handleRoute()
    │   │   ├── auth.ts              # getCurrentUser(), requireUser(), requireRole()
    │   │   ├── rate-limit.ts
    │   │   ├── encryption.ts        # AES for sensitive fields at rest
    │   │   ├── hash.ts              # SHA-256, generateToken, slugify
    │   │   ├── pagination.ts        # parseQuery, paginate
    │   │   └── logger.ts            # pino
    │   │
    │   └── modules/                 # 📦 FEATURE MODULES (one folder per domain)
    │       └── <feature>/
    │           ├── <feature>.controller.ts   # bridges HTTP ↔ service
    │           ├── <feature>.service.ts      # business logic
    │           ├── <feature>.repository.ts   # Prisma queries (only place that touches db)
    │           ├── <feature>.schema.ts       # Zod: CreateDto, UpdateDto, ResponseDto
    │           └── <feature>.types.ts        # derived TS types (z.infer)
    │
    ├── components/                  # UI components
    │   ├── ui/                      # shadcn/ui — DO NOT EDIT
    │   ├── layout/                  # AppShell, Sidebar, Navbar, ThemeToggle
    │   ├── auth/                    # LoginForm, etc.
    │   ├── providers/               # QueryProvider, ThemeProvider
    │   └── <feature>/               # per-domain components & dialogs
    │
    ├── hooks/                       # client hooks (React Query, Zustand wrappers)
    │   ├── useAuthStore.ts
    │   └── use<Feature>.ts
    │
    ├── services/                    # 🌐 CLIENT-SIDE HTTP — talks to /api/*
    │   ├── api.ts                   # facade
    │   ├── http-client.ts           # Axios + auth + refresh + unwrap envelope
    │   └── modules/
    │       └── <feature>.service.ts
    │
    ├── stores/                      # Zustand
    │   ├── authStore.ts
    │   └── uiStore.ts
    │
    ├── types/
    │   └── index.ts                 # shared FE-visible types (often imported from server module types)
    │
    ├── lib/
    │   ├── utils.ts                 # cn()
    │   └── constants.ts
    │
    └── test/
        └── setup.ts
```

### The Two Halves
- **`src/app/`** — Next.js-specific: pages, layouts, route handlers. Imports from `src/server/*`. **Never** imports Prisma directly from a page or component.
- **`src/server/`** — Framework-agnostic TypeScript. If we ever migrated away from Next.js, this folder would move to a new project almost untouched.

### Import Rules (enforced by ESLint boundaries if you want to harden it)
```
src/app/api/**/route.ts      → imports src/server/modules/**/*.controller.ts
src/server/modules/**        → may import src/server/{common,db,config}
src/server/modules/<A>       → MAY import src/server/modules/<B>/service.ts  (never repository.ts directly)

src/app/(ui)/**              → imports src/hooks, src/components, src/services, src/types
src/app/(ui)/**              → NEVER imports src/server/** or prisma  (exception: Server Components may import `src/server/modules/<x>/service.ts` when calling it directly)

src/services/**              → NEVER imports src/server/**   (goes over HTTP)
src/components/**            → NEVER imports src/server/**
```

---

## 4. Backend Architecture (inside `src/server/`)

A **feature module** is self-contained. Adding a new feature means creating one folder under `src/server/modules/<feature>/` with 4–5 files — same pattern every time.

### Layered responsibilities
```
┌──────────────────────────────────────────────────────────────┐
│  src/app/api/<resource>/route.ts                             │
│  └─ calls Controller, returns Response                       │
│                                                              │
│  src/server/modules/<feature>/<feature>.controller.ts        │
│  └─ parses input (Zod), calls Service, formats output         │
│                                                              │
│  src/server/modules/<feature>/<feature>.service.ts           │
│  └─ business logic, calls Repository, orchestrates other     │
│     services, throws domain errors                           │
│                                                              │
│  src/server/modules/<feature>/<feature>.repository.ts        │
│  └─ ONLY place that touches Prisma for this module           │
└──────────────────────────────────────────────────────────────┘
```

### Example — `projects` module

**`projects.schema.ts`**
```ts
import { z } from 'zod';

export const createProjectSchema = z.object({
  name: z.string().min(2).max(120),
  key:  z.string().regex(/^[A-Z][A-Z0-9_-]{1,19}$/),
  description: z.string().max(1000).optional(),
});

export const updateProjectSchema = createProjectSchema.partial();

export const listProjectsQuerySchema = z.object({
  page:  z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  q:     z.string().optional(),
});
```

**`projects.types.ts`**
```ts
import type { z } from 'zod';
import type { createProjectSchema, updateProjectSchema, listProjectsQuerySchema } from './projects.schema';
import type { Project as DbProject } from '@prisma/client';

export type Project           = DbProject;
export type CreateProjectDto  = z.infer<typeof createProjectSchema>;
export type UpdateProjectDto  = z.infer<typeof updateProjectSchema>;
export type ListProjectsQuery = z.infer<typeof listProjectsQuerySchema>;
```

**`projects.repository.ts`** — only file that touches Prisma
```ts
import { db } from '@/server/db/client';
import type { CreateProjectDto, UpdateProjectDto, ListProjectsQuery } from './projects.types';

export const projectsRepository = {
  list: ({ page, limit, q }: ListProjectsQuery, orgId: string) =>
    db.$transaction([
      db.project.findMany({
        where: { orgId, deletedAt: null, ...(q && { name: { contains: q, mode: 'insensitive' } }) },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      db.project.count({ where: { orgId, deletedAt: null } }),
    ]),

  findById: (id: string, orgId: string) =>
    db.project.findFirst({ where: { id, orgId, deletedAt: null } }),

  create: (data: CreateProjectDto, orgId: string, userId: string) =>
    db.project.create({ data: { ...data, orgId, createdById: userId } }),

  update: (id: string, data: UpdateProjectDto) =>
    db.project.update({ where: { id }, data }),

  softDelete: (id: string) =>
    db.project.update({ where: { id }, data: { deletedAt: new Date() } }),
};
```

**`projects.service.ts`** — business logic
```ts
import { NotFoundError, ConflictError } from '@/server/common/errors';
import { projectsRepository } from './projects.repository';
import type { CreateProjectDto, UpdateProjectDto, ListProjectsQuery } from './projects.types';

export const projectsService = {
  async list(query: ListProjectsQuery, orgId: string) {
    const [data, total] = await projectsRepository.list(query, orgId);
    return {
      data,
      meta: {
        total, page: query.page, limit: query.limit,
        totalPages: Math.ceil(total / query.limit),
        hasNextPage: query.page * query.limit < total,
        hasPrevPage: query.page > 1,
      },
    };
  },

  async getById(id: string, orgId: string) {
    const project = await projectsRepository.findById(id, orgId);
    if (!project) throw new NotFoundError('Project not found');
    return project;
  },

  async create(data: CreateProjectDto, orgId: string, userId: string) {
    const existing = await projectsRepository.findById(data.key, orgId);
    if (existing) throw new ConflictError('Project key already in use');
    return projectsRepository.create(data, orgId, userId);
  },

  async update(id: string, data: UpdateProjectDto, orgId: string) {
    await this.getById(id, orgId);
    return projectsRepository.update(id, data);
  },

  async remove(id: string, orgId: string) {
    await this.getById(id, orgId);
    return projectsRepository.softDelete(id);
  },
};
```

**`projects.controller.ts`** — glue between HTTP and service
```ts
import type { NextRequest } from 'next/server';
import { requireUser } from '@/server/common/auth';
import { ok, created, paginated, handleRoute } from '@/server/common/http';
import { createProjectSchema, updateProjectSchema, listProjectsQuerySchema } from './projects.schema';
import { projectsService } from './projects.service';

export const projectsController = {
  list: handleRoute(async (req: NextRequest) => {
    const user  = await requireUser(req);
    const query = listProjectsQuerySchema.parse(Object.fromEntries(req.nextUrl.searchParams));
    const result = await projectsService.list(query, user.orgId);
    return paginated(result);
  }),

  create: handleRoute(async (req: NextRequest) => {
    const user = await requireUser(req, ['admin', 'manager']);
    const body = createProjectSchema.parse(await req.json());
    const project = await projectsService.create(body, user.orgId, user.id);
    return created(project);
  }),

  getById: handleRoute(async (req: NextRequest, { params }: { params: { id: string } }) => {
    const user = await requireUser(req);
    return ok(await projectsService.getById(params.id, user.orgId));
  }),

  update: handleRoute(async (req: NextRequest, { params }: { params: { id: string } }) => {
    const user = await requireUser(req, ['admin', 'manager']);
    const body = updateProjectSchema.parse(await req.json());
    return ok(await projectsService.update(params.id, body, user.orgId));
  }),

  remove: handleRoute(async (req: NextRequest, { params }: { params: { id: string } }) => {
    const user = await requireUser(req, ['admin']);
    await projectsService.remove(params.id, user.orgId);
    return ok({ id: params.id });
  }),
};
```

**Route handlers** — trivially thin
```ts
// src/app/api/projects/route.ts
import { projectsController } from '@/server/modules/projects/projects.controller';
export const GET  = projectsController.list;
export const POST = projectsController.create;
```
```ts
// src/app/api/projects/[id]/route.ts
import { projectsController } from '@/server/modules/projects/projects.controller';
export const GET    = projectsController.getById;
export const PATCH  = projectsController.update;
export const DELETE = projectsController.remove;
```

### The `handleRoute` wrapper
Handles: Zod errors → 400, `AppError` subclasses → correct status, unknown → 500 with RFC 7807, and wraps all success bodies in the envelope.

```ts
// src/server/common/http.ts
import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { AppError } from './errors';
import { logger } from './logger';

const envelope = (data: unknown, status = 200) =>
  NextResponse.json({ success: true, data, timestamp: new Date().toISOString() }, { status });

export const ok        = (data: unknown) => envelope(data, 200);
export const created   = (data: unknown) => envelope(data, 201);
export const paginated = (result: unknown) => envelope(result, 200);

export const handleRoute = <T extends unknown[]>(
  fn: (...args: T) => Promise<Response>,
) => async (...args: T): Promise<Response> => {
  try {
    return await fn(...args);
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        { type: 'about:blank', title: 'Validation failed', status: 400,
          detail: err.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; '),
          instance: '', timestamp: new Date().toISOString() },
        { status: 400 },
      );
    }
    if (err instanceof AppError) {
      return NextResponse.json(
        { type: 'about:blank', title: err.title, status: err.status,
          detail: err.message, instance: '', timestamp: new Date().toISOString() },
        { status: err.status },
      );
    }
    logger.error({ err }, 'unhandled route error');
    return NextResponse.json(
      { type: 'about:blank', title: 'Internal Server Error', status: 500,
        detail: 'Something went wrong', instance: '', timestamp: new Date().toISOString() },
      { status: 500 },
    );
  }
};
```

### Domain errors
```ts
// src/server/common/errors.ts
export class AppError extends Error {
  constructor(public status: number, public title: string, message: string) {
    super(message);
  }
}
export class BadRequestError    extends AppError { constructor(m: string) { super(400, 'Bad Request', m); } }
export class UnauthorizedError  extends AppError { constructor(m='Unauthorized') { super(401, 'Unauthorized', m); } }
export class ForbiddenError     extends AppError { constructor(m='Forbidden') { super(403, 'Forbidden', m); } }
export class NotFoundError      extends AppError { constructor(m='Not found') { super(404, 'Not Found', m); } }
export class ConflictError      extends AppError { constructor(m: string) { super(409, 'Conflict', m); } }
```

---

## 5. Database (Prisma + PostgreSQL)

### `prisma/schema.prisma` conventions
```prisma
generator client { provider = "prisma-client-js" }
datasource db    { provider = "postgresql"; url = env("DATABASE_URL") }

model User {
  id        String    @id @default(uuid()) @db.Uuid
  email     String    @unique
  passwordHash String
  role      Role      @default(user)
  orgId     String    @db.Uuid
  org       Org       @relation(fields: [orgId], references: [id])
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  deletedAt DateTime?
  @@index([orgId, deletedAt])
}

enum Role { admin manager user viewer }
```

### Hard rules
| Rule | Standard |
|---|---|
| Primary key | UUID (`@default(uuid()) @db.Uuid`) |
| Timestamps | `createdAt` + `updatedAt` on every table |
| Delete strategy | Soft delete via nullable `deletedAt` — **never hard delete** |
| Sensitive fields | Never return raw — use mapper in repository / response DTO |
| Multi-tenant scoping | Every query filters by `orgId` (enforce in repository) |
| Indexes | Always index FK columns and common filter combos |
| Raw SQL | Forbidden except in `prisma/migrations/*.sql` |
| DB access | Only from `*.repository.ts` files |
| Migrations | `npx prisma migrate dev --name <desc>` in dev; `prisma migrate deploy` in CI |
| Seeds | `prisma/seed.ts`, run via `npx prisma db seed` |

### Prisma client singleton
```ts
// src/server/db/client.ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { db: PrismaClient | undefined };

export const db = globalForPrisma.db ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') globalForPrisma.db = db;
```

---

## 6. Auth

Two supported patterns — **pick one per project**:

### Pattern A — Auth.js (NextAuth v5) with credentials + OAuth (recommended for most apps)
- Sessions stored in Postgres via Prisma adapter.
- `auth()` helper usable in Server Components, Route Handlers, and middleware.
- Cookie is httpOnly; no token handling on the client.

### Pattern B — Custom JWT in httpOnly cookies (recommended when you need fine-grained control)
- `/api/auth/login` issues `accessToken` (15m) + `refreshToken` (7d, rotated, SHA-256 hashed in DB).
- Both set as **httpOnly, secure, sameSite=lax** cookies.
- `middleware.ts` reads the cookie and gates `(app)/*` routes server-side.
- Refresh flow: on 401, client hits `/api/auth/refresh`; dedupe concurrent refreshes in `httpClient`.

### Middleware (applies to both patterns)
```ts
// middleware.ts
import { NextResponse, type NextRequest } from 'next/server';

const PUBLIC = ['/login', '/register', '/forgot-password'];

export function middleware(req: NextRequest) {
  const token = req.cookies.get('session')?.value ?? req.cookies.get('accessToken')?.value;
  const { pathname } = req.nextUrl;
  const isPublic = PUBLIC.some((p) => pathname.startsWith(p));

  if (isPublic && token)  return NextResponse.redirect(new URL('/dashboard', req.url));
  if (!isPublic && !token) {
    const url = new URL('/login', req.url);
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|images|api/public).*)'],
};
```

### `requireUser` helper (used by every controller)
```ts
// src/server/common/auth.ts
import type { NextRequest } from 'next/server';
import { UnauthorizedError, ForbiddenError } from './errors';

export async function requireUser(req: NextRequest, roles?: string[]) {
  const user = await getCurrentUser(req);         // reads cookie, verifies, loads user
  if (!user) throw new UnauthorizedError();
  if (roles && !roles.includes(user.role)) throw new ForbiddenError();
  return user;
}
```

### Role hierarchy (default — adjust per project)
```
admin    → full org access
manager  → manage domain resources, manage users below
user     → CRUD on own work
viewer   → read-only
```

---

## 7. Frontend Conventions (client side of the same app)

### Layer Stack (client → own API)
```
Page / Component ("use client")
  └─ Hook (useQuery | useMutation)
      └─ api.<namespace>.<method>()             (services/api.ts facade)
          └─ <feature>Service.<method>()        (services/modules/*.service.ts)
              └─ httpClient.<verb>('/projects') (services/http-client.ts)
                  └─ /api/projects route handler
                      └─ controller → service → repository → db
```

### When to use what
| Scenario | Approach |
|---|---|
| Public, cacheable data (marketing page, docs) | Server Component + `fetch()` with `{ next: { revalidate } }` |
| Public, cacheable data sourced from our DB | Server Component that calls `projectsService` directly (skip HTTP) |
| User-specific dynamic UI (dashboard, lists) | Client Component + React Query via `/api/*` |
| Mutations (forms) | Prefer React Query mutations via `/api/*` for full reuse; use Server Actions only if the action is strictly internal and never needs API access |

### Hard rules
| Rule | Standard |
|---|---|
| Default component type | Server Component |
| `"use client"` | Only at leaves that need interactivity/state |
| API calls (client) | **Only** through hooks → facade → service → httpClient |
| API calls (server component) | May call `src/server/modules/<x>/service.ts` directly — never repositories, never Prisma |
| Direct Prisma in UI | Forbidden |
| Direct `api.*` in pages | Forbidden — use hooks |
| Server state (client) | React Query |
| Client state | Zustand (global) / `useState` (local) |
| Auth tokens | httpOnly cookies — never readable from JS |
| `localStorage` direct | Forbidden — use Zustand `persist` |
| UI components | shadcn/ui — never modify `components/ui/` files |
| Styling | Tailwind only; dark via `dark:` variant |
| Conditional classes | `cn()` from `lib/utils.ts` |
| Types | Shared types in `src/types/index.ts`, often re-exported from `src/server/modules/<x>/types.ts` |
| `any` | Forbidden |
| Env vars (client) | Must be prefixed `NEXT_PUBLIC_` |
| Hook naming | `use<Domain>` — `useProjects`, `useCreateProject` |
| Query keys | Lists: `['<resource>', { filters }]` — Singles: `['<resource>', id]` |
| Mutations | Always `queryClient.invalidateQueries` on success |
| Detail queries | Guard with `enabled: !!id` |
| Forms | React Hook Form + Zod (reuse schema from `src/server/modules/<x>/*.schema.ts`) |
| User feedback | `toast.success` / `toast.error` from Sonner |
| Images | `next/image` always |
| Links | `next/link` always |
| Fonts | `next/font` in `app/layout.tsx` |

### httpClient
```ts
// src/services/http-client.ts
import axios, { type AxiosError } from 'axios';

export const httpClient = axios.create({
  baseURL: '/api',                  // same-origin — no CORS
  withCredentials: true,            // cookies
  timeout: 60_000,
});

httpClient.interceptors.response.use(
  (res) => res.data?.data ?? res.data,
  (err: AxiosError<{ detail?: string; title?: string }>) => {
    const msg = err.response?.data?.detail ?? err.response?.data?.title ?? err.message;
    return Promise.reject(new Error(msg));
  },
);
```

### Reusing Zod schemas on both sides
```ts
// src/app/(app)/projects/components/CreateProjectDialog.tsx
'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createProjectSchema } from '@/server/modules/projects/projects.schema';
import type { CreateProjectDto } from '@/server/modules/projects/projects.types';
```
The same Zod schema validates:
- the form on the client,
- the request body on the server (`controller.parse(await req.json())`).

---

## 8. Design Language & UI System

### Theming
- HSL CSS variables in `src/app/globals.css` under `:root` and `.dark`.
- `next-themes` toggles the `dark` class on `<html>`.
- All shadcn/ui components consume these tokens — never hard-code hex.

### Token Set
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
--radius
```

### Typography
- **Primary font**: `Inter` (variable), loaded via `next/font/google` in `app/layout.tsx` and exposed as the CSS variable `--font-sans`. Swap per project if brand dictates (e.g. `Geist`, `Satoshi`, `DM Sans`) — but keep the `--font-sans` variable name stable so Tailwind and shadcn consume it consistently.
- **Base size**: `1rem = 14px` project-wide. Enforced in `globals.css` by setting `html { font-size: 87.5% }` (14 / 16). All Tailwind spacing and font-size utilities inherit this, so the entire UI scales together — **never override individual elements' `rem` to compensate**.
- Scale (after the 14px base): `text-xs` 10.5px → `text-sm` 12.25px → `text-base` 14px → `text-lg` 15.75px → `text-xl` 17.5px → `text-2xl` 21px → `text-3xl` 26.25px.
- Headings `font-semibold`/`font-bold`; body `font-normal`; captions `text-muted-foreground`.

```css
/* src/app/globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  html {
    font-size: 87.5%;                     /* 1rem = 14px */
    font-family: var(--font-sans), system-ui, -apple-system, sans-serif;
  }
  body { @apply bg-background text-foreground antialiased; }
}
```

```tsx
// src/app/layout.tsx
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
```

### Spacing & Layout
- Tailwind 4px base.
- Page padding: `p-6` desktop, `p-4` mobile.
- Card padding: `p-4`–`p-6`.
- `flex` for 1-D, `grid-cols-*` for 2-D.

### Components (shadcn/ui catalogue)
- **Structure**: Card, Sheet, Dialog, Drawer, Tabs, Accordion, Separator.
- **Inputs**: Input, Textarea, Select, Checkbox, RadioGroup, Switch, Slider, DatePicker, Command.
- **Feedback**: Toast (Sonner), Alert, AlertDialog, Skeleton, Progress, Badge.
- **Data**: Table (TanStack), DataTable wrapper, Pagination, DropdownMenu, ContextMenu.
- **Navigation**: Sidebar, NavigationMenu, Breadcrumb, Tabs.

### Interaction Patterns
- Destructive → AlertDialog with explicit action label.
- Forms → field-level errors (RHF + Zod) + loading state on submit.
- Mutations → Sonner toast on success/error.
- Empty states → icon + headline + subcopy + primary CTA.
- Loading → shadcn `Skeleton` or a route-level `loading.tsx`.
- Errors → route-level `error.tsx` boundary + inline retry.

### Accessibility
- Radix gives keyboard a11y free.
- Icon-only buttons require `aria-label`.
- Use token pairs for contrast (`foreground` on `background`).

### Metadata & SEO
- Every route exports `metadata` (or `generateMetadata`).
- `app/sitemap.ts`, `app/robots.ts`, root `metadataBase` + OG/Twitter cards.

---

## 9. Environment & Configuration

### `.env.example`
```
# --- PUBLIC (bundled into client) ---
NEXT_PUBLIC_APP_NAME=Acme
NEXT_PUBLIC_APP_URL=http://localhost:3000

# --- SERVER-ONLY ---
NODE_ENV=development

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/acme_dev?schema=public

# Auth
AUTH_SECRET=<openssl rand -hex 32>
JWT_ACCESS_SECRET=<openssl rand -hex 32>
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_SECRET=<openssl rand -hex 32>
JWT_REFRESH_EXPIRY=7d
BCRYPT_ROUNDS=10

# Crypto (AES for sensitive fields at rest)
ENCRYPTION_KEY=<openssl rand -hex 32>

# Optional
REDIS_URL=
RESEND_API_KEY=
S3_BUCKET=
S3_REGION=
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
```

### Validation — `src/server/config/env.ts`
```ts
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().url(),
  AUTH_SECRET: z.string().min(32),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),
  BCRYPT_ROUNDS: z.coerce.number().int().min(4).max(15).default(10),
  ENCRYPTION_KEY: z.string().length(64),
  NEXT_PUBLIC_APP_NAME: z.string(),
  NEXT_PUBLIC_APP_URL: z.string().url(),
});

export const env = schema.parse(process.env);
```
The app **refuses to start** if any required var is missing.

### Rules
- Client-visible vars prefixed `NEXT_PUBLIC_`.
- Server-only vars: no prefix.
- Never commit `.env.local` / `.env.production` — only `.env.example`.

---

## 10. Commands Reference

```bash
# Install
npm install

# Development
npm run dev                       # Next.js dev :3000 (Turbopack)
docker-compose up -d postgres     # local DB

# Database
npx prisma migrate dev --name <desc>   # create + apply migration in dev
npx prisma migrate deploy              # apply in CI/prod
npx prisma generate                    # regenerate client
npx prisma db seed                     # run prisma/seed.ts
npx prisma studio                      # visual DB browser

# Build & run
npm run build
npm run start
npm run analyze                   # optional bundle analyzer

# Code quality
npm run lint
npm run format
npm run typecheck                 # tsc --noEmit

# Testing
npm run test                      # Vitest
npm run test:watch
npm run test:e2e                  # Playwright
```

### Suggested `package.json` scripts
```json
{
  "scripts": {
    "dev": "next dev --turbo",
    "build": "prisma generate && next build",
    "start": "next start",
    "lint": "next lint",
    "format": "prettier --write .",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "db:migrate": "prisma migrate dev",
    "db:deploy": "prisma migrate deploy",
    "db:seed": "prisma db seed",
    "db:studio": "prisma studio"
  },
  "prisma": { "seed": "tsx prisma/seed.ts" }
}
```

---

## 11. Testing Strategy

### Unit — services & repositories (Vitest)
- `src/server/modules/**/*.service.spec.ts` — mock repository, test business logic.
- `src/server/modules/**/*.repository.spec.ts` — run against a test Postgres (Testcontainers / dedicated test DB).

```ts
// example
import { projectsService } from './projects.service';
vi.mock('./projects.repository', () => ({ projectsRepository: { findById: vi.fn(), create: vi.fn() } }));

it('throws NotFound when project missing', async () => {
  (projectsRepository.findById as any).mockResolvedValue(null);
  await expect(projectsService.getById('x', 'org')).rejects.toThrow('Project not found');
});
```

### Integration — route handlers
- `src/app/api/**/__tests__/*.test.ts` — spin up handler, invoke with a mocked `NextRequest`, assert envelope + status.

### Component / hook — Vitest + Testing Library
- `src/**/*.test.tsx` — mock `httpClient`, wrap with `QueryClientProvider`.

### E2E — Playwright
- `e2e/*.spec.ts` — login → create → edit → delete a resource against a seeded test DB.

### Priority
1. Services & critical utils — **must**.
2. Route handlers (integration) — **should**.
3. Hooks — **should**.
4. Pages — smoke only.

---

## 12. AI Agent Workflow (`.ai/` folder)

```
.ai/
├── ENTRYPOINT.md
├── context/
│   ├── project-overview.md
│   ├── architecture.md          # this blueprint, per-project adjustments
│   ├── backend.md               # server/ layer details
│   └── frontend.md              # app/ (ui) + hooks + services
├── skills/
│   ├── create-module.skill.md          # end-to-end: schema → repo → service → controller → route → hook → page
│   ├── server-component.skill.md
│   ├── client-component.skill.md
│   ├── ui-component.skill.md
│   ├── prisma-migration.skill.md
│   └── unit-test.skill.md
├── prompts/
│   ├── add-feature.md
│   ├── debug-error.md
│   ├── write-tests.md
│   └── optimize-performance.md
└── agents/
    ├── fullstack-agent.md
    └── qa-agent.md
```

### `CLAUDE.md` (root)
Short scannable briefing — product scope, commands, quick rules, pointers into `.ai/`. Read first every session.

### Rules for keeping `.ai/` healthy
- Update `.ai/context/` whenever architecture changes.
- Don't duplicate knowledge — `CLAUDE.md` → `.ai/ENTRYPOINT.md` → specific files.
- **Skills describe HOW, context describes WHAT, agents describe WHO.**

---

## 13. Git & Workflow

- **Main**: `main`.
- **Feature branches**: `feature/<short-name>`.
- **Commit style**: imperative, lowercase.
- **PRs**: one concern per PR; include migration note if `prisma/schema.prisma` changed.
- **Never commit**: `.env.local`, `.env.production`, `.next/`, `node_modules`, auth keys.

---

## 14. Checklist — New Feature (end-to-end)

When adding a new domain (e.g. "invoices"):

### Database
- [ ] Add `model Invoice` (and related) to `prisma/schema.prisma`.
- [ ] `npx prisma migrate dev --name add_invoices`
- [ ] Add seed data to `prisma/seed.ts` if useful.

### Backend module — `src/server/modules/invoices/`
- [ ] `invoices.schema.ts` — Zod schemas (create, update, list query).
- [ ] `invoices.types.ts` — TS types via `z.infer`.
- [ ] `invoices.repository.ts` — Prisma queries, scoped by `orgId`, soft-delete aware.
- [ ] `invoices.service.ts` — business logic, throws domain errors.
- [ ] `invoices.controller.ts` — Zod-parse input, call service, return envelope via `ok/created/paginated`.

### HTTP boundary — `src/app/api/invoices/`
- [ ] `route.ts` — `GET`, `POST`.
- [ ] `[id]/route.ts` — `GET`, `PATCH`, `DELETE`.

### Frontend
- [ ] `src/types/index.ts` — re-export `Invoice`, `CreateInvoiceDto`, etc.
- [ ] `src/services/modules/invoices.service.ts`
- [ ] `src/services/api.ts` — add `invoices` namespace.
- [ ] `src/hooks/useInvoices.ts` — `useInvoices`, `useInvoice`, `useCreateInvoice`, `useUpdateInvoice`, `useDeleteInvoice`.
- [ ] `src/app/(app)/invoices/page.tsx` — list.
- [ ] `src/app/(app)/invoices/[id]/page.tsx` — detail.
- [ ] `src/app/(app)/invoices/loading.tsx`, `error.tsx`.
- [ ] `src/components/invoices/CreateInvoiceDialog.tsx`, `EditInvoiceDialog.tsx`, `DeleteInvoiceDialog.tsx`.
- [ ] Sidebar link.
- [ ] Loading/error/empty states.
- [ ] `metadata` export on each page.

### Tests
- [ ] Service unit tests.
- [ ] Route handler integration test (at least happy path + 401 + 404).
- [ ] Hook test.

### Done when
- [ ] Feature works end-to-end against seeded DB.
- [ ] `npm run typecheck && npm run lint && npm run test` pass.
- [ ] `.ai/context/` updated if a new pattern was introduced.

---

## 15. Performance Defaults

- **Images**: `next/image` with explicit sizes.
- **Fonts**: `next/font` — no external `<link>` fetches.
- **Route splitting**: automatic; push `"use client"` to leaves to shrink client bundles.
- **Server-rendered data**: `fetch(url, { next: { revalidate: 60 } })` for public; RSC calling a service directly for internal DB reads.
- **React Query defaults**: `staleTime: 60s`, `refetchOnWindowFocus: false` unless the page demands freshness.
- **Streaming**: wrap slow server data in `<Suspense>` + `loading.tsx` to stream fast shell first.
- **DB**: always index FKs and common filters; use `select`/`include` to avoid over-fetch; paginate every list.
- **Prisma in serverless**: the singleton in §5 avoids connection storms; use connection pooling (PgBouncer / Neon / Prisma Accelerate) when deploying to Vercel.

---

## 16. Principles (TL;DR)

1. **Two halves, one app.** `src/app/` = UI; `src/server/` = backend. They cross only through route handlers or service imports in Server Components.
2. **Default to Server Components.** Push `"use client"` to the leaves.
3. **Modules are self-contained.** One folder per domain, five files, same pattern every time — scales from 3 modules to 50.
4. **Only repositories touch the DB.** Services orchestrate, controllers translate HTTP, route handlers are one line.
5. **One Zod schema, two sides.** Define in the server module, reuse on the client form.
6. **Types are the contract.** Shared types live in the server module and are re-exported to the client.
7. **The envelope is sacred.** Backend wraps (`{ success, data, timestamp }`); `httpClient` unwraps. Errors are RFC 7807.
8. **Every mutation invalidates.** Stale cache is the #1 bug generator.
9. **Every secret is server-only.** If it isn't `NEXT_PUBLIC_`, it stays on the server.
10. **Every list has loading + empty + error states. Every action has toast feedback. Every page has metadata.**
11. **Every agent session starts**: `CLAUDE.md` → `.ai/ENTRYPOINT.md` → relevant context/skill.
