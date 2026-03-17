# Backend Context — TestFlow TCM

## Stack
- **Framework**: NestJS 10 (TypeScript strict mode)
- **ORM**: TypeORM 0.3
- **Database**: PostgreSQL 15
- **Auth**: passport-jwt + passport-local, @nestjs/jwt
- **Validation**: class-validator + class-transformer
- **Docs**: @nestjs/swagger (OpenAPI 3)
- **Config**: @nestjs/config + Joi schema validation
- **Hashing**: bcryptjs (rounds from `BCRYPT_ROUNDS` env)

---

## Folder Convention

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
- JSONB settings field on all major entities: `@Column({ type: 'jsonb', default: '{}' })`
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

## Role Hierarchy
```
admin    → full org access
qa_lead  → manage projects, suites, cases, runs; manage testers
tester   → execute runs, view all, create test cases
viewer   → read-only
```

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

## Pagination Utility
`src/common/utils/pagination.util.ts`:
- `getPaginationParams(page, limit)` → `{ skip, take }` for TypeORM
- `paginate(data, total, page, limit)` → `PaginatedResult<T>`
