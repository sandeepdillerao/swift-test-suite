import { httpClient } from '../http-client';
import type { Permission, Role, ProjectMember } from '@/types';

export const rbacService = {
  // ── Current user's own permissions (bootstrap — no permission guard) ───────
  getMyPermissions: () => httpClient.get<string[]>('/rbac/my-permissions').then((r) => r.data),

  // ── Permissions catalog ─────────────────────────────────────────────────────
  getPermissions: () => httpClient.get<Permission[]>('/rbac/permissions').then((r) => r.data),

  // ── Roles CRUD ──────────────────────────────────────────────────────────────
  getRoles: () => httpClient.get<Role[]>('/rbac/roles').then((r) => r.data),
  getRole: (id: string) => httpClient.get<Role>(`/rbac/roles/${id}`).then((r) => r.data),
  createRole: (data: { name: string; slug: string; description?: string }) =>
    httpClient.post<Role>('/rbac/roles', data).then((r) => r.data),
  updateRole: (id: string, data: { name?: string; description?: string; isDefault?: boolean }) =>
    httpClient.patch<Role>(`/rbac/roles/${id}`, data).then((r) => r.data),
  deleteRole: (id: string) => httpClient.delete(`/rbac/roles/${id}`),

  // ── Role permissions ────────────────────────────────────────────────────────
  getRolePermissions: (roleId: string) =>
    httpClient.get<string[]>(`/rbac/roles/${roleId}/permissions`).then((r) => r.data),
  setRolePermissions: (roleId: string, permissions: string[]) =>
    httpClient.put<string[]>(`/rbac/roles/${roleId}/permissions`, { permissions }).then((r) => r.data),

  // ── Project members ─────────────────────────────────────────────────────────
  getProjectMembers: (projectId: string) =>
    httpClient.get<ProjectMember[]>(`/rbac/projects/${projectId}/members`).then((r) => r.data),
  addProjectMember: (projectId: string, userId: string, roleId: string) =>
    httpClient.post<ProjectMember>(`/rbac/projects/${projectId}/members`, { userId, roleId }).then((r) => r.data),
  updateProjectMemberRole: (projectId: string, userId: string, roleId: string) =>
    httpClient.patch<ProjectMember>(`/rbac/projects/${projectId}/members/${userId}`, { roleId }).then((r) => r.data),
  removeProjectMember: (projectId: string, userId: string) =>
    httpClient.delete(`/rbac/projects/${projectId}/members/${userId}`),
};
