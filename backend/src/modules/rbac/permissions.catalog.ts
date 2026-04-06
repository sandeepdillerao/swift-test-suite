/**
 * Platform permission catalog.
 * Each entry becomes a row in the `permissions` table.
 * Format: { code: 'resource:action', category, description }
 */
export interface PermissionDef {
  code: string;
  category: string;
  description: string;
}

export const PERMISSION_CATALOG: PermissionDef[] = [
  // ─── Projects ──────────────────────────────────────────────────────────────
  { code: 'projects:read', category: 'projects', description: 'View projects' },
  { code: 'projects:create', category: 'projects', description: 'Create new projects' },
  { code: 'projects:update', category: 'projects', description: 'Edit project settings' },
  { code: 'projects:delete', category: 'projects', description: 'Delete projects' },

  // ─── Test Suites ───────────────────────────────────────────────────────────
  { code: 'test_suites:read', category: 'test_suites', description: 'View test suites' },
  { code: 'test_suites:create', category: 'test_suites', description: 'Create test suites' },
  { code: 'test_suites:update', category: 'test_suites', description: 'Edit test suites' },
  { code: 'test_suites:delete', category: 'test_suites', description: 'Delete test suites' },

  // ─── Test Cases ────────────────────────────────────────────────────────────
  { code: 'test_cases:read', category: 'test_cases', description: 'View test cases' },
  { code: 'test_cases:create', category: 'test_cases', description: 'Create test cases' },
  { code: 'test_cases:update', category: 'test_cases', description: 'Edit test cases' },
  { code: 'test_cases:delete', category: 'test_cases', description: 'Delete test cases' },

  // ─── Test Runs ─────────────────────────────────────────────────────────────
  { code: 'test_runs:read', category: 'test_runs', description: 'View test runs' },
  { code: 'test_runs:create', category: 'test_runs', description: 'Create test runs' },
  { code: 'test_runs:update', category: 'test_runs', description: 'Update test run results' },
  { code: 'test_runs:delete', category: 'test_runs', description: 'Delete test runs' },
  { code: 'test_runs:execute', category: 'test_runs', description: 'Execute test runs' },

  // ─── Releases ──────────────────────────────────────────────────────────────
  { code: 'releases:read', category: 'releases', description: 'View releases' },
  { code: 'releases:create', category: 'releases', description: 'Create releases' },
  { code: 'releases:update', category: 'releases', description: 'Edit releases' },
  { code: 'releases:delete', category: 'releases', description: 'Delete releases' },

  // ─── Automation ────────────────────────────────────────────────────────────
  { code: 'automation:read', category: 'automation', description: 'View automation scripts' },
  { code: 'automation:create', category: 'automation', description: 'Generate/import automation scripts' },
  { code: 'automation:update', category: 'automation', description: 'Edit automation scripts' },
  { code: 'automation:delete', category: 'automation', description: 'Delete automation scripts' },
  { code: 'automation:execute', category: 'automation', description: 'Execute automation scripts' },

  // ─── Users ─────────────────────────────────────────────────────────────────
  { code: 'users:read', category: 'users', description: 'View organization members' },
  { code: 'users:invite', category: 'users', description: 'Invite new users' },
  { code: 'users:update_role', category: 'users', description: 'Change user roles' },
  { code: 'users:activate', category: 'users', description: 'Activate/deactivate users' },
  { code: 'users:delete', category: 'users', description: 'Remove users from organization' },

  // ─── Organization ──────────────────────────────────────────────────────────
  { code: 'organization:read', category: 'organization', description: 'View organization info' },
  { code: 'organization:update', category: 'organization', description: 'Update organization settings' },
  { code: 'organization:view_members', category: 'organization', description: 'View member list' },
  { code: 'organization:view_stats', category: 'organization', description: 'View organization statistics' },

  // ─── Settings ──────────────────────────────────────────────────────────────
  { code: 'settings:read', category: 'settings', description: 'View settings' },
  { code: 'settings:manage', category: 'settings', description: 'Manage organization and AI settings' },

  // ─── Integrations ──────────────────────────────────────────────────────────
  { code: 'integrations:read', category: 'integrations', description: 'View integration status' },
  { code: 'integrations:manage', category: 'integrations', description: 'Configure integrations' },
  { code: 'integrations:jira_manage', category: 'integrations', description: 'Manage Jira connection' },
  { code: 'integrations:ai_generate', category: 'integrations', description: 'Use AI test generation' },

  // ─── Roles & Permissions ───────────────────────────────────────────────────
  { code: 'roles:read', category: 'roles', description: 'View roles and permissions' },
  { code: 'roles:create', category: 'roles', description: 'Create custom roles' },
  { code: 'roles:update', category: 'roles', description: 'Edit role permissions' },
  { code: 'roles:delete', category: 'roles', description: 'Delete custom roles' },

  // ─── Dashboard ─────────────────────────────────────────────────────────────
  { code: 'dashboard:read', category: 'dashboard', description: 'View dashboard' },
];

/** All permission codes as a readonly set for validation */
export const ALL_PERMISSION_CODES = new Set(PERMISSION_CATALOG.map((p) => p.code));

/**
 * Default permission sets for the 4 system roles.
 * These are applied when an organization is first created.
 */
export const DEFAULT_ROLE_PERMISSIONS: Record<string, { name: string; description: string; permissions: string[] }> = {
  admin: {
    name: 'Admin',
    description: 'Full access to everything in the organization',
    permissions: PERMISSION_CATALOG.map((p) => p.code), // ALL permissions
  },
  qa_lead: {
    name: 'QA Lead',
    description: 'Manage projects, suites, cases, runs; read-only admin areas',
    permissions: [
      // Core QA — full access
      'dashboard:read',
      'projects:read', 'projects:create', 'projects:update', 'projects:delete',
      'test_suites:read', 'test_suites:create', 'test_suites:update', 'test_suites:delete',
      'test_cases:read', 'test_cases:create', 'test_cases:update', 'test_cases:delete',
      'test_runs:read', 'test_runs:create', 'test_runs:update', 'test_runs:delete', 'test_runs:execute',
      'releases:read', 'releases:create', 'releases:update', 'releases:delete',
      'automation:read', 'automation:create', 'automation:update', 'automation:delete', 'automation:execute',
      // Integrations — full access
      'integrations:read', 'integrations:manage', 'integrations:jira_manage', 'integrations:ai_generate',
      // Users — read only
      'users:read',
      // Org/Settings — read only
      'organization:read', 'organization:view_members', 'organization:view_stats',
      'settings:read',
    ],
  },
  tester: {
    name: 'Tester',
    description: 'Execute test runs, create and edit test cases',
    permissions: [
      // Core QA — create/execute, no delete
      'dashboard:read',
      'projects:read',
      'test_suites:read', 'test_suites:create', 'test_suites:update',
      'test_cases:read', 'test_cases:create', 'test_cases:update',
      'test_runs:read', 'test_runs:create', 'test_runs:update', 'test_runs:execute',
      'releases:read',
      // Automation — use but not delete
      'automation:read', 'automation:create', 'automation:update', 'automation:execute',
    ],
  },
  viewer: {
    name: 'Viewer',
    description: 'Read-only access to core QA modules',
    permissions: [
      'dashboard:read',
      'projects:read',
      'test_suites:read',
      'test_cases:read',
      'test_runs:read',
      'releases:read',
    ],
  },
};
