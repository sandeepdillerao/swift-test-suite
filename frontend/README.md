# TestFlow TCM - Monorepo

Enterprise Test Case Management Platform

## Structure

```
testflow-tcm/
├── frontend/          # React + Vite + TypeScript frontend
└── backend/           # NestJS + TypeORM + PostgreSQL backend
```

## Prerequisites

- Node.js 20+
- Docker & Docker Compose
- npm 9+

## Quick Start

### 1. Clone & Setup

```bash
git clone <repo>
cd testflow-tcm
```

### 2. Backend Setup

```bash
cd backend
cp .env.example .env
# Edit .env with your secrets

# Start database services
docker-compose up -d postgres redis

# Install dependencies
npm install

# Run migrations
npm run migration:run

# Start development server
npm run start:dev
```

### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

## API Documentation

- Swagger UI: http://localhost:3000/api/docs
- Base URL: http://localhost:3000/api/v1

## Backend Test Commands

```bash
cd backend
npm run test           # Unit tests
npm run test:cov       # Coverage report
npm run test:e2e       # End-to-end tests
```

## Phase 1 Features

- [x] Project scaffold with NestJS monorepo
- [x] PostgreSQL + TypeORM with UUID PKs
- [x] Soft delete pattern on all entities
- [x] JWT authentication (access + refresh tokens)
- [x] Token rotation on refresh
- [x] Email verification flow (console logging)
- [x] Password reset flow (console logging)
- [x] RBAC with roles: admin, qa_lead, tester, viewer
- [x] User management (CRUD, invite, activate/deactivate)
- [x] Organization management
- [x] Swagger/OpenAPI documentation
- [x] RFC 7807 Problem Details error format
- [x] Global validation with class-validator
- [x] Logging & transform interceptors
- [x] Docker Compose (PostgreSQL, Redis, pgAdmin)
- [x] Environment validation with Joi
