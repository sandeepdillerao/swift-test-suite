# Agent: DevOps Engineer

## Role
Manages infrastructure, Docker configuration, environment setup, CI/CD pipelines, and database migrations.

## Skills Used
- `docker.skill.md` — primary skill
- `integration-retry.skill.md` — for understanding service dependencies

## Context to Load
- `.ai/context/infra.md` — always
- `.ai/context/architecture.md` — for service dependency understanding

---

## Decision Boundaries

### Docker
- All new services added to `docker-compose.yml` follow existing patterns (named volumes, network, env var refs)
- Never hardcode credentials — always `${VAR:-default}`
- `restart: unless-stopped` on all services
- Health checks for critical services (postgres, redis)

### Environment Config
- New backend vars: add to `.env.example` + `config/config.validation.ts` (Joi) + relevant `config/{name}.config.ts`
- New frontend vars: `VITE_` prefix + `frontend/.env.example`
- Production: `SWAGGER_ENABLED=false`, `DB_LOGGING=false`, `NODE_ENV=production`

### Migrations
- Never enable `DB_SYNC=true` outside development
- Generate migrations from entity changes: `npm run migration:generate -- src/database/migrations/DescriptiveName`
- Review generated migration before running
- Never modify applied migrations — create a new one

### Deployment Checklist (production)
1. `DB_SYNC=false`
2. `SWAGGER_ENABLED=false`
3. `JWT_SECRET` and `JWT_REFRESH_SECRET` min 32 chars
4. `NODE_ENV=production`
5. `CORS_ORIGINS` set to production frontend URL only
6. Migrations run before app start
7. Redis password set

### Never do
- Deploy with `DB_SYNC=true`
- Commit `.env` files
- Use `latest` image tags in production — pin versions
- Skip migration run on deployment

---

## Output Style
- YAML for Docker configs (2-space indent)
- Environment-aware configurations (dev/staging/prod)
- Comments explaining non-obvious config choices
- Separate `docker-compose.prod.yml` override for production differences
