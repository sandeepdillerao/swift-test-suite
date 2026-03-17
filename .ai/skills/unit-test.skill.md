# Skill: Unit Tests

## Purpose
Write focused unit tests for NestJS services and guards.

## When to Use
- Testing a service method in isolation
- Testing guard/decorator behavior
- Verifying edge cases and error paths

---

## Strict Rules

### Do NOT
- Do not mock the database with in-memory stores — test service logic with mocked repository methods
- Do not write tests for DTOs (validation is framework-handled)
- Do not test TypeORM internals
- Do not use `jest.useFakeTimers()` unless testing time-sensitive token expiry

### Do
- Mock `Repository<Entity>` methods: `findOne`, `save`, `update`, `softDelete`, `findAndCount`
- Use `jest.fn()` for all injected dependencies
- Test: happy path, not-found error, conflict error, forbidden error
- Cover token hashing, invite flows, and role-change restrictions

---

## Test File Location
`src/modules/{name}/{name}.service.spec.ts`

---

## Setup Pattern
```ts
describe('UsersService', () => {
  let service: UsersService;
  let userRepo: jest.Mocked<Repository<User>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: createMockRepository() },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue(12) } },
      ],
    }).compile();

    service = module.get(UsersService);
    userRepo = module.get(getRepositoryToken(User));
  });
});

function createMockRepository<T>() {
  return {
    findOne: jest.fn(),
    findAndCount: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
}
```

---

## Cases to Cover Per Service

### AuthService
- `register`: creates org + user when organizationName provided
- `register`: throws ConflictException for duplicate email
- `register`: validates invite token expiry
- `login`: throws UnauthorizedException if not email-verified
- `login`: throws UnauthorizedException if not active
- `refresh`: throws on expired/revoked token
- `forgotPassword`: returns same message whether email exists or not

### UsersService
- `invite`: throws ConflictException if email exists in org
- `updateRole`: throws ForbiddenException if admin downgrades self
- `changePassword`: throws BadRequestException on wrong current password
- `softDelete`: calls repository.softDelete (not delete)

### RolesGuard
- Returns true when no roles required
- Returns true when user role matches
- Throws ForbiddenException when role doesn't match

---

## Output Expectations
- One `*.spec.ts` file per service
- All methods have at least: happy path + primary error path
- Tests are deterministic, no network calls, no real bcrypt (mock it)
