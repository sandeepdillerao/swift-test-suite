# Infrastructure Context — TestFlow TCM

## Docker Services (`backend/docker-compose.yml`)

| Service | Image | Port | Volume |
|---|---|---|---|
| postgres | postgres:15-alpine | 5432 | `postgres_data` |
| redis | redis:7-alpine | 6379 | `redis_data` |
| pgadmin | dpage/pgadmin4:latest | 5050 | `pgadmin_data` |

All services on shared `testflow_network` bridge.

Postgres initialized with `src/database/init.sql`:
```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
```

---

## Environment Variables

### Backend (`backend/.env` — copy from `.env.example`)
```
NODE_ENV=development
PORT=3000
API_PREFIX=api/v1
CORS_ORIGINS=http://localhost:5173,https://swifttestsuit.lovable.app

DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=testflow
DB_PASSWORD=testflow_secret
DB_NAME=testflow_db
DB_SYNC=false
DB_LOGGING=true

JWT_SECRET=<32+ char secret>
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_SECRET=<32+ char secret>
JWT_REFRESH_EXPIRY=7d

REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

BCRYPT_ROUNDS=12
FRONTEND_URL=http://localhost:5173
SWAGGER_ENABLED=true
```

### Frontend (`frontend/.env`)
```
VITE_API_URL=http://localhost:3000/api/v1
```
All frontend env vars must be prefixed `VITE_` to be exposed by Vite.

---

## Local Dev Setup

```bash
# 1. Start database services
cd backend
cp .env.example .env       # fill in JWT_SECRET, JWT_REFRESH_SECRET
docker-compose up -d postgres redis

# 2. Run migrations
npm install
npm run migration:run

# 3. Seed test data
npm run seed
# Creates 4 users: admin@testflow.dev / qalead@testflow.dev / tester@testflow.dev / viewer@testflow.dev
# Password pattern: Role@1234 (e.g. Admin@1234)

# 4. Start backend
npm run start:dev          # http://localhost:3000

# 5. Start frontend (separate terminal)
cd ../frontend
cp .env.example .env
npm install
npm run dev                # http://localhost:8080
```

---

## Migration Commands

```bash
cd backend

# Generate new migration from entity changes
npm run migration:generate -- src/database/migrations/MigrationName

# Apply pending migrations
npm run migration:run

# Rollback last migration
npm run migration:revert

# Show migration status
npm run migration:show
```

DataSource config: `backend/src/database/data-source.ts`

---

## Production Dockerfile
Multi-stage build in `backend/Dockerfile`:
1. `builder` stage — installs all deps, runs `nest build`
2. `production` stage — installs prod-only deps, copies `dist/`

```bash
docker build -t testflow-backend .
docker run -p 3000:3000 --env-file .env testflow-backend
```

---

## Environments

| Env | Backend URL | DB_SYNC | SWAGGER_ENABLED | DB_LOGGING |
|---|---|---|---|---|
| development | localhost:3000 | false | true | true |
| staging | TBD | false | true | false |
| production | TBD | false | false | false |

---

## Redis Usage
Currently provisioned, not yet consumed. Planned use:
- Refresh token blacklist (fast lookup)
- Email job queue (Bull/BullMQ)
- Jira sync jobs

---

## pgAdmin Access
URL: `http://localhost:5050`
Login: `admin@testflow.com` / `admin`
Connect to server: host=`postgres`, port=`5432`, user=`testflow`, pass=`testflow_secret`
