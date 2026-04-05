import React from 'react';
import { Navigate } from 'react-router-dom';
import { usePermissions } from '@/hooks/usePermissions';
import { ShieldX } from 'lucide-react';

interface PermissionGuardProps {
  /** Required permission(s). If multiple, user needs ANY of them (OR). */
  permissions: string | string[];
  /** If true, user must have ALL listed permissions (AND). Default: false (OR). */
  requireAll?: boolean;
  /** What to render when access is denied. Defaults to a styled access denied card. */
  fallback?: React.ReactNode;
  /** If true, redirect to /app instead of showing fallback. */
  redirect?: boolean;
  children: React.ReactNode;
}

/**
 * Declarative permission guard for wrapping UI sections.
 *
 * Usage:
 *   <PermissionGuard permissions="projects:create">
 *     <CreateProjectButton />
 *   </PermissionGuard>
 *
 *   <PermissionGuard permissions={['users:invite', 'users:update_role']}>
 *     <UserManagementPanel />
 *   </PermissionGuard>
 */
export function PermissionGuard({ permissions, requireAll = false, fallback, redirect, children }: PermissionGuardProps) {
  const { can, canAny, canAll, loaded } = usePermissions();

  // While loading, render nothing to avoid flash
  if (!loaded) return null;

  const codes = Array.isArray(permissions) ? permissions : [permissions];
  const hasAccess = requireAll ? canAll(...codes) : canAny(...codes);

  if (!hasAccess) {
    if (redirect) return <Navigate to="/app" replace />;
    if (fallback !== undefined) return <>{fallback}</>;
    return <AccessDenied />;
  }

  return <>{children}</>;
}

/**
 * Inline conditional component — renders children only if user has permission.
 * Cleaner syntax than `{can('x') && <Button />}` for JSX.
 *
 * Usage:
 *   <CanShow permission="test_cases:create">
 *     <Button>New Test Case</Button>
 *   </CanShow>
 *
 *   <CanShow permission={['users:invite', 'users:update_role']}>
 *     <AdminPanel />
 *   </CanShow>
 */
export function CanShow({ permission, requireAll, children }: { permission: string | string[]; requireAll?: boolean; children: React.ReactNode }) {
  const { can, canAny, canAll, loaded } = usePermissions();
  if (!loaded) return null;
  const codes = Array.isArray(permission) ? permission : [permission];
  const allowed = requireAll ? canAll(...codes) : (codes.length === 1 ? can(codes[0]) : canAny(...codes));
  return allowed ? <>{children}</> : null;
}

/**
 * Render-prop variant for inline conditional rendering.
 *
 * Usage:
 *   <Can permission="test_cases:delete">
 *     {(allowed) => allowed && <DeleteButton />}
 *   </Can>
 */
export function Can({ permission, children }: { permission: string | string[]; children: (allowed: boolean) => React.ReactNode }) {
  const { can, canAny, loaded } = usePermissions();
  if (!loaded) return null;
  const codes = Array.isArray(permission) ? permission : [permission];
  const allowed = codes.length === 1 ? can(codes[0]) : canAny(...codes);
  return <>{children(allowed)}</>;
}

/** Default access denied card */
function AccessDenied() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
        <ShieldX className="h-8 w-8 text-destructive" />
      </div>
      <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
      <p className="text-muted-foreground max-w-md">
        You don't have permission to access this section. Contact your organization admin to request access.
      </p>
    </div>
  );
}
