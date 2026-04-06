# Backend Context — TestFlow TCM

## Stack
- **Framework**: NestJS 10.3.0 (TypeScript strict mode)
- **ORM**: TypeORM 0.3.20
- **Database**: PostgreSQL 15-alpine
- **Auth**: Passport.js 10.0.3 + JWT 10.2.0 (Local + JWT strategies)
- **Validation**: class-validator 0.14.1 + class-transformer
- **Docs**: @nestjs/swagger 7.3.0 (OpenAPI 3)
- **Config**: @nestjs/config 3.1.1 + Joi 17.12.2 schema validation
- **Hashing**: bcryptjs (rounds from `BCRYPT_ROUNDS` env)
- **HTTP Client**: Axios 1.14.0 (for 3rd party APIs: Jira, AI)
- **Testing**: Jest 29.7.0 + Supertest 7.0.0
- **Browser Automation**: Playwright 1.59.1

---

## Directory Structure

```
backend/
├── package.json
├── tsconfig.json              # ES2021, decorators enabled
├── nest-cli.json
├── .env / .env.example
├── docker-compose.yml         # PostgreSQL, Redis, pgAdmin
├── Dockerfile
│
├── src/
│   ├── main.ts                # Entry point (bootstrap, CORS, validation, Swagger)
│   ├── app.module.ts          # Root module (imports all, global providers)
│   │
│   ├── config/
│   │   ├── app.config.ts      # port, apiPrefix, corsOrigins, swaggerEnabled
│   │   ├── database.config.ts
│   │   ├── jwt.config.ts
│   │   └── config.validation.ts  # Joi schema
│   │
│   ├── database/
│   │   ├── data-source.ts     # TypeORM DataSource config
│   │   ├── init.sql           # uuid-ossp + pg_trgm extensions
│   │   ├── migrations/
│   │   └── seeds/
│   │
│   ├── common/
│   │   ├── decorators/
│   │   │   ├── public.decorator.ts       # @Public() — skip auth
│   │   │   ├── roles.decorator.ts        # @Roles('admin', 'qa_lead')
│   │   │   ├── permissions.decorator.ts  # @Permissions('manage:projects')
│   │   │   └── current-user.decorator.ts # @CurrentUser() — injects request.user
│   │   ├── guards/
│   │   │   ├── jwt-auth.guard.ts         # JWT validation (global)
│   │   │   └── roles.guard.ts            # Role-based access (global)
│   │   ├── interceptors/
│   │   │   ├── transform.interceptor.ts  # Wraps in { success, data, timestamp }
│   │   │   └── logging.interceptor.ts
│   │   ├── filters/
│   │   │   └── http-exception.filter.ts  # RFC 7807 error format
│   │   ├── utils/
│   │   │   ├── hash.util.ts              # SHA-256 hashing, generateSecureToken, slugify
│   │   │   ├── encryption.util.ts        # AES encryption for sensitive data
│   │   │   └── pagination.util.ts        # getPaginationParams, paginate helper
│   │   └── modules/
│   │       └── ai-audit/                 # AI call logging and audit trail
│   │
│   └── modules/                          # Feature modules (14 total)
│       ├── auth/              # login, refresh, password reset, email verify
│       ├── users/             # CRUD, invite, activate/deactivate
│       ├── organizations/     # org CRUD, member management, settings
│       ├── projects/          # project CRUD, team assignment
│       ├── test-suites/       # suite CRUD, hierarchical nesting
│       ├── test-cases/        # case CRUD, steps, status, priority
│       ├── test-runs/         # run execution, history, case status updates
│       ├── releases/          # release management, versioning
│       ├── dashboard/         # stats, aggregations
│       ├── settings/          # API key management, encrypted storage
│       ├── integrations/      # Jira + AI generation
│       ├── automation/        # Playwright test recording, codegen
│       └── rbac/              # custom roles & permissions
│
├── dist/
├── test/
│   └── jest-e2e.json
└── uploads/
```

---

## Folder Convention (per module)

```
src/modules/{name}/
  {name}.module.ts       ← imports, providers, exports
  {name}.controller.ts   ← routes, decorators, DTO binding
  {name}.service.ts      ← all business logic
  dto/
    create-{name}.dto.ts
    update-{name}.dto.ts
    {name}-response.dto.ts
  entities/
    {name}.entity.ts
  (optional) strategies/, guards/
```

---

## Entity Rules
- UUID primary key: `@PrimaryGeneratedColumn('uuid')`
- Timestamps: `@CreateDateColumn() createdAt`, `@UpdateDateColumn() updatedAt`
- Soft delete: `@DeleteDateColumn() deletedAt` — **never hard delete**
- JSONB settings field on major entities: `@Column({ type: 'jsonb', default: '{}' })`
- Sensitive fields use `@Exclude()` from class-transformer (passwordHash, tokens)
- All FK columns are explicit UUID columns + `@JoinColumn({ name: 'xyzId' })`

---

## DTO Rules
- Every input DTO uses `class-validator` decorators
- Every response DTO never exposes `passwordHash`, `inviteToken`, `passwordResetToken`, `refreshTokenHash`
- Password validation pattern: min 8 chars, uppercase + lowercase + digit + special char
- `@ApiProperty()` on all DTO fields for Swagger

---

## Validation Approach
Global `ValidationPipe` in `main.ts`:
```ts
new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })
```
- `whitelist: true` strips unknown properties
- `forbidNonWhitelisted: true` throws on extra fields
- `transform: true` auto-converts query params (string → number/boolean)

---

## Auth Strategy
- **Access token**: JWT signed with `JWT_SECRET`, expiry `JWT_ACCESS_EXPIRY` (15m)
  - Payload: `{ sub, email, role, orgId, type: 'access' }`
- **Refresh token**: JWT signed with `JWT_REFRESH_SECRET`, expiry `JWT_REFRESH_EXPIRY` (7d)
  - Payload: `{ sub, type: 'refresh', jti: uuid }`
  - Stored hashed (SHA-256) in `refresh_tokens` table
  - Rotated on every `/auth/refresh` call
- **`@Public()`** decorator bypasses `JwtAuthGuard` for open endpoints
- **`@Roles(...)`** decorator + `RolesGuard` for role-based access
- **`@Permissions(...)`** decorator for fine-grained RBAC

## Role Hierarchy
```
admin    → full org access
qa_lead  → manage projects, suites, cases, runs; manage testers
tester   → execute runs, view all, create test cases
viewer   → read-only
```

### RBAC Module (Custom Roles)
- **Role** entity: Custom role with permissions
- **Permission** entity: Fine-grained permission codes (manage:projects, execute:runs, etc.)
- **RolePermission** join table: Links roles to permissions
- **RolesGuard** checks decorators against user's role permissions

---

## DB Access Strategy
- Repositories injected via `@InjectRepository(Entity)`
- No raw SQL except in `init.sql` (extension setup)
- Use `findOne({ where: { id } })` — never `findOneById`
- Cross-module entity access: import the entity in the consuming module's `TypeOrmModule.forFeature([...])`
- Migrations via TypeORM CLI: `npm run migration:generate`, `migration:run`
- `DB_SYNC=false` always in production

---

## API Versioning
- Global prefix: `/api/v1` (set in `main.ts`)
- Version in prefix, not URL segments or headers

---

## Swagger Convention
Every controller:
```ts
@ApiTags('ModuleName')
@ApiBearerAuth()        // if protected
```
Every endpoint:
```ts
@ApiOperation({ summary: '...' })
@ApiResponse({ status: 200, ... })
@ApiResponse({ status: 401, ... })
```

---

## Config Pattern
Whenever you find a configurable variable, take it from env file.
All config via `@nestjs/config` with `registerAs`:
```ts
// config/app.config.ts
export default registerAs('app', () => ({ port: parseInt(process.env.PORT) }));

// Usage in service
constructor(private configService: ConfigService) {}
this.configService.get<number>('app.port')
```
Joi validation schema in `config/config.validation.ts` — all required vars validated at startup.

---

## Token Hashing
`src/common/utils/hash.util.ts`:
- `hashToken(token)` → SHA-256 hex — used for all stored tokens
- `generateSecureToken()` → 32-byte random hex — used to generate raw tokens
- `slugify(text)` → URL-safe slug

---

## Encryption
`src/common/utils/encryption.util.ts`:
- AES encryption for API keys, tokens, sensitive data
- Encrypt on write, decrypt on read
- Used by Settings module and Organization settings

---

## Pagination Utility
`src/common/utils/pagination.util.ts`:
- `getPaginationParams(page, limit)` → `{ skip, take }` for TypeORM
- `paginate(data, total, page, limit)` → `PaginatedResult<T>`

---

## Testing

### Unit Tests
- Location: `src/**/*.spec.ts`
- Framework: Jest
- Pattern: Mock repositories via `getRepositoryToken()`, test service logic

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
  });

  it('should list projects', async () => {
    jest.spyOn(repository, 'find').mockResolvedValue([mockProject]);
    expect(await service.list()).toEqual([mockProject]);
  });
});
```

### E2E Tests
- Location: `test/**/*.e2e-spec.ts`
- Config: `test/jest-e2e.json`
- Framework: Jest + Supertest (full HTTP stack)

### Commands
```bash
npm run test              # Unit tests
npm run test:watch       # Watch mode
npm run test:cov         # Coverage report
npm run test:e2e         # E2E tests
```

---

## Commands Reference

```bash
# Development
npm run start:dev          # Watch mode
npm run start:debug       # Debug mode
npm run start:prod        # Production

# Database
npm run migration:generate -- src/database/migrations/Name
npm run migration:run
npm run migration:revert
npm run migration:show
npm run seed

# Code quality
npm run lint             # ESLint with --fix
npm run format           # Prettier reformat
npm run build            # Compile TypeScript
```
