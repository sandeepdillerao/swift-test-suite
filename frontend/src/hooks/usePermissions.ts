import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { usePermissionStore } from '@/stores/permissionStore';
import { api } from '@/services/api';

/**
 * Loads the current user's permissions via the dedicated /rbac/my-permissions
 * endpoint (no permission guard — safe for bootstrap). Call once at the app
 * root (inside ProtectedRoute).
 */
export function useLoadPermissions() {
  const { isAuthenticated } = useAuthStore();
  const { setPermissions, clear } = usePermissionStore();

  const { data, isError } = useQuery({
    queryKey: ['rbac', 'my-permissions'],
    queryFn: () => api.rbac.getMyPermissions(),
    enabled: !!isAuthenticated,
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });

  // Populate store when data arrives
  useEffect(() => {
    if (data) {
      setPermissions(data);
    }
  }, [data, setPermissions]);

  // If the request failed, mark as loaded with empty perms so the UI
  // doesn't stay in skeleton/loading state forever.
  useEffect(() => {
    if (isError) {
      setPermissions([]);
    }
  }, [isError, setPermissions]);

  // Clear on logout
  useEffect(() => {
    if (!isAuthenticated) clear();
  }, [isAuthenticated, clear]);
}

/**
 * Primary hook for checking permissions in components.
 *
 * Usage:
 *   const { can, canAny, canAll } = usePermissions();
 *   if (can('projects:create')) { ... }
 *   if (canAny('users:invite', 'users:update_role')) { ... }
 */
export function usePermissions() {
  const { has, hasAny, hasAll, loaded, permissions } = usePermissionStore();

  return {
    /** Check a single permission */
    can: has,
    /** Check if user has ANY of the listed permissions */
    canAny: hasAny,
    /** Check if user has ALL of the listed permissions */
    canAll: hasAll,
    /** Whether permission data has loaded */
    loaded,
    /** Raw set of permission codes */
    permissions,
  };
}
