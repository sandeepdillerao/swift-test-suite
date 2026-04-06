# Skill: Backend API Module

## Purpose
Generate a complete NestJS module with entity, DTOs, service, controller, and module wiring.

## When to Use
- Adding a new domain entity (e.g. Project, TestSuite, TestCase)
- Adding new endpoints to an existing module
- Extending existing entity with new fields

---

## Strict Coding Rules

### Entity
- UUID PK: `@PrimaryGeneratedColumn('uuid')`
- Always include: `createdAt`, `updatedAt`, `deletedAt` (soft delete)
- JSONB settings field if entity has configurable behavior
- All FK columns: explicit UUID column + `@JoinColumn({ name: 'xyzId' })`
- Sensitive fields: `@Exclude()` decorator
- Location: `src/modules/{name}/entities/{name}.entity.ts`

### DTOs
- Input DTOs: `class-validator` decorators on every field
- Response DTOs: never expose `passwordHash`, token fields
- All fields annotated with `@ApiProperty()` or `@ApiPropertyOptional()`
- Password fields: `@Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/, ...)`

### Service
- Constructor injects via `@InjectRepository(Entity)`
- Use `getPaginationParams()` + `paginate()` from `common/utils/pagination.util.ts`
- Use `hashToken()` / `generateSecureToken()` from `common/utils/hash.util.ts`
- No raw SQL — TypeORM QueryBuilder for complex queries
- Soft delete: `repository.softDelete(id)` — never `repository.delete()`

### Controller
- Decorators: `@ApiTags('Name')`, `@ApiBearerAuth()`, `@UseGuards(JwtAuthGuard, RolesGuard)`
- Every endpoint: `@ApiOperation({ summary })` + relevant `@ApiResponse`
- Route params: `@Param('id', ParseUUIDPipe)`
- Current user: `@CurrentUser() user: User`
- Role restriction: `@Roles(UserRole.ADMIN, ...)`
- Public endpoints: `@Public()` decorator

### Module
- Register entity in `TypeOrmModule.forFeature([Entity])`
- Export service if other modules need it
- Import cross-module entities (don't import full modules unless needed)

---

## Output Expectations
- `{name}.entity.ts` — complete entity with all columns
- `dto/create-{name}.dto.ts` — create DTO
- `dto/update-{name}.dto.ts` — update DTO (all fields optional via PartialType)
- `dto/{name}-response.dto.ts` — response DTO (safe, no secrets)
- `{name}.service.ts` — CRUD + business logic
- `{name}.controller.ts` — all endpoints with Swagger
- `{name}.module.ts` — module wiring

---

## Example Prompt
```
Using the backend-api skill, create the Projects module.

Entity fields:
- name: varchar(255) NOT NULL
- description: text NULLABLE
- key: varchar(10) UNIQUE (e.g. 'PRJ-1')
- organizationId: UUID FK → Organization
- createdBy: UUID FK → User
- isArchived: boolean DEFAULT false
- settings: jsonb

Endpoints:
- GET /projects (paginated, org-scoped, search by name)
- GET /projects/:id
- POST /projects (admin, qa_lead)
- PATCH /projects/:id (admin, qa_lead)
- DELETE /projects/:id (admin) — soft delete
```
