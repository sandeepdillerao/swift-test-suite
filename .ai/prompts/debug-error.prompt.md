# Prompt Template: Debug Error

Use this template when diagnosing a bug or unexpected behavior.

---

## Template

```
Context: See .ai/context/architecture.md

## Error
[Paste full error message, stack trace, or unexpected behavior description]

## Where it occurs
- Layer: [Frontend / Backend / Database / Docker]
- File: [file path if known]
- Endpoint or component: [e.g. POST /auth/login or TestCases.tsx]

## Steps to reproduce
1. [step]
2. [step]

## Expected behavior
[What should happen]

## Actual behavior
[What actually happens]

## Already tried
[What debugging steps have been attempted]
```

---

## Common Error Patterns

### Backend 401 on authenticated endpoints
→ Check: is `@Public()` missing? Is JWT_SECRET matching between sign and verify?
→ Check: `JwtStrategy.validate()` — is user `isActive=true`?

### Backend 403 on role-protected route
→ Check: `@Roles(...)` decorator — does the user's role match?
→ Check: `RolesGuard` is registered globally in `app.module.ts`

### TypeORM entity not found after save
→ Check: is `autoLoadEntities: true` in TypeOrmModule config?
→ Check: is entity registered in the correct module's `TypeOrmModule.forFeature([...])`?

### Frontend 401 loop (infinite refresh)
→ Check: `/auth/refresh` endpoint is returning a 401 itself
→ Check: `originalRequest.url?.includes('/auth/refresh')` guard in httpClient interceptor

### Frontend data not updating after mutation
→ Check: mutation's `onSuccess` calls `queryClient.invalidateQueries({ queryKey: ['resource'] })`
→ Check: query key in list hook matches the key being invalidated

### Migration failing
→ Check: `uuid-ossp` extension created via `init.sql`
→ Check: `data-source.ts` entity glob path matches compiled output

### CORS error in browser
→ Check: `CORS_ORIGINS` in `.env` includes the frontend origin
→ Check: `app.enableCors()` in `main.ts`
