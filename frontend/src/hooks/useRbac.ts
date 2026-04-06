import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { toast } from 'sonner';

// ─── Query keys ──────────────────────────────────────────────────────────────
const keys = {
  permissions: ['rbac', 'permissions'] as const,
  roles: ['rbac', 'roles'] as const,
  rolePermissions: (roleId: string) => ['rbac', 'roles', roleId, 'permissions'] as const,
  projectMembers: (projectId: string) => ['rbac', 'projects', projectId, 'members'] as const,
};

// ─── Queries ─────────────────────────────────────────────────────────────────

export function usePermissionsCatalog() {
  return useQuery({ queryKey: keys.permissions, queryFn: api.rbac.getPermissions, staleTime: 10 * 60 * 1000 });
}

export function useRoles() {
  return useQuery({ queryKey: keys.roles, queryFn: api.rbac.getRoles });
}

export function useRolePermissions(roleId: string | null) {
  return useQuery({
    queryKey: keys.rolePermissions(roleId!),
    queryFn: () => api.rbac.getRolePermissions(roleId!),
    enabled: !!roleId,
  });
}

export function useProjectMembers(projectId: string | null) {
  return useQuery({
    queryKey: keys.projectMembers(projectId!),
    queryFn: () => api.rbac.getProjectMembers(projectId!),
    enabled: !!projectId,
  });
}

// ─── Mutations ───────────────────────────────────────────────────────────────

export function useCreateRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; slug: string; description?: string }) => api.rbac.createRole(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: keys.roles }); toast.success('Role created'); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to create role'),
  });
}

export function useUpdateRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; name?: string; description?: string; isDefault?: boolean }) =>
      api.rbac.updateRole(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: keys.roles }); toast.success('Role updated'); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to update role'),
  });
}

export function useDeleteRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.rbac.deleteRole(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: keys.roles }); toast.success('Role deleted'); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to delete role'),
  });
}

export function useSetRolePermissions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ roleId, permissions }: { roleId: string; permissions: string[] }) =>
      api.rbac.setRolePermissions(roleId, permissions),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: keys.rolePermissions(vars.roleId) });
      // Also refresh the current user's own permission set so the sidebar updates instantly
      qc.invalidateQueries({ queryKey: ['rbac', 'my-permissions'] });
      toast.success('Permissions updated');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to update permissions'),
  });
}

export function useAddProjectMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, userId, roleId }: { projectId: string; userId: string; roleId: string }) =>
      api.rbac.addProjectMember(projectId, userId, roleId),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: keys.projectMembers(vars.projectId) });
      toast.success('Member added');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to add member'),
  });
}

export function useUpdateProjectMemberRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, userId, roleId }: { projectId: string; userId: string; roleId: string }) =>
      api.rbac.updateProjectMemberRole(projectId, userId, roleId),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: keys.projectMembers(vars.projectId) });
      toast.success('Member role updated');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to update role'),
  });
}

export function useRemoveProjectMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, userId }: { projectId: string; userId: string }) =>
      api.rbac.removeProjectMember(projectId, userId),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: keys.projectMembers(vars.projectId) });
      toast.success('Member removed');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to remove member'),
  });
}
