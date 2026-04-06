# Prompt Template: Create Module

Use this template when adding a new full-stack feature module.

---

## Template

```
Context: See .ai/context/backend.md and .ai/context/frontend.md
Skills: backend-api.skill.md + frontend-feature.skill.md

## Task
Create the [MODULE_NAME] module end-to-end.

## Backend Entity Fields
- [field]: [type] [constraints]
- ...

## Relationships
- [Entity] → [Entity]: [ManyToOne/OneToMany]

## API Endpoints
- [METHOD] /[resource]  →  [description, auth, roles]
- ...

## Frontend Requirements
- Page: [page description]
- Dialogs: [list dialogs needed]
- Hooks: [list hooks needed]

## Constraints
- Org-scoped: all queries must filter by organizationId from the JWT user
- Soft delete on all entities
- Paginated list endpoints
- All routes protected except [list any public ones]
```

---

## Example — Projects Module

```
Context: See .ai/context/backend.md and .ai/context/frontend.md
Skills: backend-api.skill.md + frontend-feature.skill.md

## Task
Create the Projects module end-to-end.

## Backend Entity Fields
- name: varchar(255) NOT NULL
- description: text NULLABLE
- key: varchar(10) UNIQUE within org (e.g. 'SHOP')
- organizationId: UUID FK → Organization
- createdBy: UUID FK → User
- isArchived: boolean DEFAULT false
- settings: jsonb DEFAULT '{}'

## Relationships
- Organization → Project: OneToMany
- User → Project: OneToMany (createdBy)

## API Endpoints
- GET /projects?page&limit&search&isArchived  → paginated, org-scoped, roles: all
- GET /projects/:id                            → roles: all
- POST /projects                               → roles: admin, qa_lead
- PATCH /projects/:id                          → roles: admin, qa_lead
- DELETE /projects/:id                         → roles: admin (soft delete)

## Frontend Requirements
- Page: /app/projects — card grid with name, key, test case count, pass rate badge, created date
- Create dialog: name, key (auto-suggest from name), description
- Archive toggle action
- Delete confirmation dialog
- Hook: useProjects(), useProject(id), useCreateProject(), useUpdateProject(), useDeleteProject()

## Constraints
- All queries filter by req.user.organizationId
- key must be uppercase, 2-10 chars, unique per org
- Soft delete only
- Paginated list
```
