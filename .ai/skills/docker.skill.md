# Skill: Docker & Infrastructure

## Purpose
Modify or extend Docker configuration, add new services, or update deployment setup.

## When to Use
- Adding a new backing service (e.g. Redis worker, S3-compatible storage, ElasticSearch)
- Adding a new environment (staging)
- Creating a production docker-compose override

---

## Strict Rules

### docker-compose.yml
- All services on `testflow_network` bridge
- All credentials reference env vars: `${VARIABLE:-default}`
- All stateful services have named volumes
- Depends_on for ordering
- `restart: unless-stopped` on all services
- Never hardcode passwords

### Dockerfile (backend)
- Multi-stage: `builder` (full deps + compile) → `production` (prod deps + dist only)
- Base: `node:20-alpine`
- WORKDIR `/app`
- `npm ci` (not `npm install`) for reproducible builds
- EXPOSE the PORT env var value (default 3000)
- CMD: `["node", "dist/main"]`

### Environment Variables
- Backend: use `@nestjs/config` + Joi validation — all new vars must be added to `config/config.validation.ts`
- Frontend: prefix with `VITE_` — add to `frontend/.env.example`
- Never commit `.env` — only `.env.example`

---

## Adding a New Service (Template)
```yaml
new-service:
  image: service:version-alpine
  container_name: testflow_newservice
  restart: unless-stopped
  environment:
    SERVICE_VAR: ${ENV_VAR:-default}
  ports:
    - '${SERVICE_PORT:-XXXX}:XXXX'
  volumes:
    - newservice_data:/data/path
  networks:
    - testflow_network

volumes:
  newservice_data:
```

---

## Output Expectations
- Updated `docker-compose.yml` with new service
- Updated `.env.example` with new variables
- Updated `config/config.validation.ts` Joi schema if backend consumes new vars
- Updated `config/{name}.config.ts` if new `registerAs` block needed
