# Prompt Template: Optimize Performance

Use this template when addressing performance issues.

---

## Template

```
Context: See .ai/context/architecture.md + .ai/context/backend.md

## Task
Optimize [feature/endpoint/component] for performance.

## Current issue
- [slow query / high memory / re-renders / large bundle]
- Observed metric: [e.g. query takes 3s, component re-renders 40x]

## Location
- [file path or endpoint]

## Constraints
- Must not change public API contract
- Must maintain soft-delete behavior
- Must maintain existing pagination contract
```

---

## Backend Optimization Patterns

### Slow list queries
- Add index on frequently filtered columns (organizationId, role, isActive)
- Use `SELECT` specific columns instead of `SELECT *` on large entities
- Use `loadRelationIds: true` instead of full relation loads when only IDs needed

### N+1 problem
- Use `relations: ['organization']` in `findAndCount` instead of separate queries
- Or use QueryBuilder with `.leftJoinAndSelect()`

### Paginated responses
- Always use `getPaginationParams()` → TypeORM `skip/take`
- Never load all records then slice in memory

### TypeORM QueryBuilder example
```ts
const [items, total] = await this.repo
  .createQueryBuilder('tc')
  .where('tc.organizationId = :orgId', { orgId })
  .andWhere('tc.deletedAt IS NULL')
  .leftJoinAndSelect('tc.suite', 'suite')
  .skip(skip)
  .take(take)
  .orderBy(`tc.${sortBy}`, sortOrder)
  .getManyAndCount();
```

---

## Frontend Optimization Patterns

### Unnecessary re-renders
- Wrap expensive components in `React.memo()`
- Use `useCallback` for handlers passed as props
- Split large components — isolate query consumers

### React Query cache tuning
```ts
useQuery({
  queryKey: ['testCases', { projectId }],
  queryFn: ...,
  staleTime: 30_000,      // don't refetch for 30s
  gcTime: 5 * 60_000,    // keep in cache 5min
})
```

### Bundle size
- Check with `npm run build -- --analyze` (add vite-bundle-analyzer if needed)
- Lazy-load heavy pages: `const Dashboard = React.lazy(() => import('./pages/app/Dashboard'))`
- Don't import entire icon libraries — use named imports from lucide-react

### Table performance (large datasets)
- TanStack Table with virtualization for >200 rows
- Server-side pagination — never load all records client-side
