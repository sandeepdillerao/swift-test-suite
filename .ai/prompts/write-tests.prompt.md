# Prompt Template: Write Tests

Use this template when writing unit or E2E tests.

---

## Unit Test Template

```
Context: See .ai/context/backend.md
Skill: unit-test.skill.md

## Task
Write unit tests for [ServiceName].

## Service location
backend/src/modules/[name]/[name].service.ts

## Methods to test
- [methodName]: [what it does, inputs, expected outcomes]
- ...

## Key edge cases
- [case description]
- ...
```

---

## E2E Test Template

```
Context: See .ai/context/architecture.md

## Task
Write E2E tests for the [feature] endpoints.

## Endpoints to cover
- [METHOD] /[path]: [success case] → [status]
- [METHOD] /[path]: [error case] → [status]
- ...

## Auth scenarios
- Unauthenticated request → 401
- Wrong role → 403
- [Specific role] succeeds → [status]
```

---

## Examples

### Unit: AuthService.login
```
Skill: unit-test.skill.md

Write unit tests for AuthService.login():
- Happy path: verified + active user → returns tokens + user
- Not email verified → UnauthorizedException
- Not active → UnauthorizedException
- Invalid password (handled in validateUser) → returns null from LocalStrategy
```

### E2E: User invite flow
```
Write E2E tests for the user invite flow:

POST /api/v1/users/invite
  - admin token + valid email + role → 201, user created with isActive=false
  - tester token → 403
  - duplicate email in org → 409
  - invalid role value → 400

POST /api/v1/users/accept-invite
  - valid token + password → 200, user isActive=true
  - expired token → 400
  - invalid token → 400
```

---

## Test Data Strategy
- Use `npm run seed` to populate DB before E2E tests
- Seed credentials: admin@testflow.dev / Admin@1234
- Each E2E test should be independent — create fresh resources per test
- Clean up created resources in `afterEach` or use unique identifiers
