import { useState, useEffect, useMemo } from 'react';
import {
  Shield, Plus, Pencil, Trash2, Check, X, ChevronRight, Lock, Star,
  ChevronDown, LayoutDashboard, FolderKanban, TestTube2, FolderTree,
  Play, Tag, Zap, Users, Building2, Settings2, Link2, ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { PermissionGuard } from '@/components/auth/PermissionGuard';
import { usePermissions } from '@/hooks/usePermissions';
import { useAuthStore } from '@/stores/authStore';
import {
  useRoles, usePermissionsCatalog, useRolePermissions,
  useCreateRole, useUpdateRole, useDeleteRole, useSetRolePermissions,
} from '@/hooks/useRbac';
import type { Role, Permission } from '@/types';

// ─── Module definitions ──────────────────────────────────────────────────────

interface ModuleDef {
  key: string;
  label: string;
  description: string;
  icon: typeof Shield;
  categories: string[];   // permission categories that belong to this module
}

const MODULES: ModuleDef[] = [
  { key: 'dashboard',     label: 'Dashboard',           description: 'Analytics and overview dashboard',              icon: LayoutDashboard, categories: ['dashboard'] },
  { key: 'projects',      label: 'Projects',            description: 'Project management and organization',           icon: FolderKanban,    categories: ['projects'] },
  { key: 'test_cases',    label: 'Test Cases',          description: 'Create, edit, and manage test cases',           icon: TestTube2,       categories: ['test_cases'] },
  { key: 'test_suites',   label: 'Test Suites',         description: 'Organize test cases into groups',               icon: FolderTree,      categories: ['test_suites'] },
  { key: 'test_runs',     label: 'Test Runs',           description: 'Execute and track test execution',              icon: Play,            categories: ['test_runs'] },
  { key: 'releases',      label: 'Releases',            description: 'Release management and tracking',               icon: Tag,             categories: ['releases'] },
  { key: 'automation',    label: 'Automation',           description: 'Script generation and execution',               icon: Zap,             categories: ['automation'] },
  { key: 'integrations',  label: 'Integrations',        description: 'Jira, AI generation, and third-party tools',    icon: Link2,           categories: ['integrations'] },
  { key: 'users',         label: 'User Management',     description: 'Invite users, manage roles and activation',     icon: Users,           categories: ['users'] },
  { key: 'organization',  label: 'Organization',        description: 'Organization settings and member management',   icon: Building2,       categories: ['organization'] },
  { key: 'settings',      label: 'Settings',            description: 'Application and notification settings',         icon: Settings2,       categories: ['settings'] },
  { key: 'roles',         label: 'Roles & Permissions', description: 'View and manage role-based access control',     icon: ShieldCheck,     categories: ['roles'] },
];

// ─── Page wrapper ────────────────────────────────────────────────────────────

export function RolesPermissions() {
  return (
    <PermissionGuard permissions="roles:read" redirect>
      <RolesPermissionsContent />
    </PermissionGuard>
  );
}

function RolesPermissionsContent() {
  const { can } = usePermissions();
  const { data: roles = [], isLoading: rolesLoading } = useRoles();
  const { data: allPermissions = [] } = usePermissionsCatalog();
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  // Get current user's role to hide it from the list (prevent self-lockout)
  const currentUser = useAuthStore((s) => s.user);
  const currentUserRoleId = currentUser?.roleId;

  // Filter out the admin's own role so they can't modify it
  const editableRoles = useMemo(
    () => roles.filter((r) => r.id !== currentUserRoleId),
    [roles, currentUserRoleId],
  );

  const selectedRole = editableRoles.find((r) => r.id === selectedRoleId) ?? null;

  // Auto-select first editable role
  if (!selectedRoleId && editableRoles.length > 0) {
    setSelectedRoleId(editableRoles[0].id);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6" /> Roles & Permissions
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage roles and control feature access for your organization
          </p>
        </div>
        {can('roles:create') && (
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Create Role
          </Button>
        )}
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Roles List */}
        <div className="col-span-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Organization Roles</CardTitle>
              <CardDescription>{editableRoles.length} roles configured</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {rolesLoading ? (
                <div className="p-4 text-sm text-muted-foreground">Loading...</div>
              ) : (
                <div className="divide-y">
                  {editableRoles.map((role) => (
                    <button
                      key={role.id}
                      onClick={() => setSelectedRoleId(role.id)}
                      className={cn(
                        'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50',
                        selectedRoleId === role.id && 'bg-primary/5 border-l-2 border-l-primary',
                      )}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{role.name}</span>
                          {role.isSystem && <Lock className="h-3 w-3 text-muted-foreground" />}
                          {role.isDefault && (
                            <Badge variant="secondary" className="text-[10px] px-1 py-0">Default</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {role.description || role.slug}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Role Detail / Permissions Editor */}
        <div className="col-span-8">
          {selectedRole ? (
            <RoleDetail
              role={selectedRole}
              allPermissions={allPermissions}
              canEdit={can('roles:update')}
              canDelete={can('roles:delete')}
              onDeleted={() => setSelectedRoleId(null)}
            />
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Shield className="h-10 w-10 mb-3 opacity-40" />
                <p>Select a role to view and edit permissions</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <CreateRoleDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}

// ─── Role Detail Panel ────────────────────────────────────────────────────────

function RoleDetail({
  role, allPermissions, canEdit, canDelete, onDeleted,
}: {
  role: Role;
  allPermissions: Permission[];
  canEdit: boolean;
  canDelete: boolean;
  onDeleted: () => void;
}) {
  const { data: rolePerms = [], isLoading } = useRolePermissions(role.id);
  const setPermissions = useSetRolePermissions();
  const updateRole = useUpdateRole();
  const deleteRole = useDeleteRole();
  const [editName, setEditName] = useState(false);
  const [name, setName] = useState(role.name);
  const [desc, setDesc] = useState(role.description || '');
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  // Optimistic local state — keeps UI in sync instantly on toggle
  const [localPerms, setLocalPerms] = useState<Set<string>>(new Set(rolePerms));

  // Sync from server whenever query data changes (initial load, refetch, role switch)
  useEffect(() => {
    setLocalPerms(new Set(rolePerms));
  }, [rolePerms]);

  const activePerms = localPerms;

  // Group permissions by category
  const grouped = useMemo(() => {
    const map = new Map<string, Permission[]>();
    for (const p of allPermissions) {
      if (!map.has(p.category)) map.set(p.category, []);
      map.get(p.category)!.push(p);
    }
    return map;
  }, [allPermissions]);

  // Helpers to get module permission state
  const getModulePerms = (mod: ModuleDef): Permission[] =>
    mod.categories.flatMap((cat) => grouped.get(cat) || []);

  const isModuleEnabled = (mod: ModuleDef): boolean => {
    const perms = getModulePerms(mod);
    return perms.length > 0 && perms.some((p) => activePerms.has(p.code));
  };

  const isModuleFullyEnabled = (mod: ModuleDef): boolean => {
    const perms = getModulePerms(mod);
    return perms.length > 0 && perms.every((p) => activePerms.has(p.code));
  };

  const getModuleActiveCount = (mod: ModuleDef): [number, number] => {
    const perms = getModulePerms(mod);
    return [perms.filter((p) => activePerms.has(p.code)).length, perms.length];
  };

  const toggleModule = (mod: ModuleDef) => {
    if (!canEdit) return;
    const perms = getModulePerms(mod);
    const codes = perms.map((p) => p.code);
    const anyActive = codes.some((c) => activePerms.has(c));
    const next = new Set(activePerms);
    if (anyActive) {
      // Disable: remove ALL permissions for this module
      codes.forEach((c) => next.delete(c));
    } else {
      // Enable: grant ALL permissions for this module
      codes.forEach((c) => next.add(c));
    }
    setLocalPerms(next);
    setPermissions.mutate({ roleId: role.id, permissions: Array.from(next) });
  };

  const togglePermission = (code: string) => {
    if (!canEdit) return;
    const next = new Set(activePerms);
    if (next.has(code)) next.delete(code); else next.add(code);
    setLocalPerms(next);
    setPermissions.mutate({ roleId: role.id, permissions: Array.from(next) });
  };

  const handleSaveName = () => {
    updateRole.mutate({ id: role.id, name, description: desc });
    setEditName(false);
  };

  const handleDelete = () => {
    deleteRole.mutate(role.id, { onSuccess: () => { setDeleteConfirm(false); onDeleted(); } });
  };

  // Reset state when role changes
  if (name !== role.name && !editName) {
    setName(role.name);
    setDesc(role.description || '');
  }

  return (
    <Card>
      {/* Role Header */}
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            {editName ? (
              <div className="space-y-2">
                <Input value={name} onChange={(e) => setName(e.target.value)} className="text-lg font-semibold h-9" />
                <Input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Description" className="text-sm h-8" />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSaveName}><Check className="h-3 w-3 mr-1" /> Save</Button>
                  <Button size="sm" variant="ghost" onClick={() => { setEditName(false); setName(role.name); setDesc(role.description || ''); }}>
                    <X className="h-3 w-3 mr-1" /> Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <CardTitle>{role.name}</CardTitle>
                  {role.isSystem && <Badge variant="outline"><Lock className="h-3 w-3 mr-1" />System</Badge>}
                  {role.isDefault && <Badge variant="secondary"><Star className="h-3 w-3 mr-1" />Default</Badge>}
                  <Badge variant="outline" className="font-mono text-xs">{role.slug}</Badge>
                </div>
                <CardDescription className="mt-1">{role.description || 'No description'}</CardDescription>
              </>
            )}
          </div>
          {canEdit && !editName && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setEditName(true)}>
                <Pencil className="h-3 w-3 mr-1" /> Edit
              </Button>
              {canDelete && !role.isSystem && (
                <Button variant="destructive" size="sm" onClick={() => setDeleteConfirm(true)}>
                  <Trash2 className="h-3 w-3 mr-1" /> Delete
                </Button>
              )}
            </div>
          )}
        </div>
      </CardHeader>

      <Separator />

      {isLoading ? (
        <CardContent className="py-8">
          <div className="text-sm text-muted-foreground text-center">Loading permissions...</div>
        </CardContent>
      ) : (
        <CardContent className="pt-4">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs text-muted-foreground">
              {activePerms.size} / {allPermissions.length} permissions enabled
            </span>
          </div>

          <Tabs defaultValue="modules">
            <TabsList className="mb-4">
              <TabsTrigger value="modules">Module Access</TabsTrigger>
              <TabsTrigger value="granular">Granular Permissions</TabsTrigger>
            </TabsList>

            {/* ── Module Access Tab ─────────────────────────────────────── */}
            <TabsContent value="modules">
              <p className="text-sm text-muted-foreground mb-4">
                Enable or disable entire feature modules for this role. Disabling a module removes all its permissions including sidebar visibility.
              </p>
              <div className="grid gap-3 md:grid-cols-2">
                {MODULES.map((mod) => {
                  const enabled = isModuleEnabled(mod);
                  const fullyEnabled = isModuleFullyEnabled(mod);
                  const [active, total] = getModuleActiveCount(mod);
                  const Icon = mod.icon;

                  return (
                    <div
                      key={mod.key}
                      className={cn(
                        'flex items-center gap-4 p-4 rounded-lg border transition-colors',
                        enabled ? 'bg-primary/5 border-primary/20' : 'bg-muted/30 border-transparent',
                      )}
                    >
                      <div className={cn(
                        'p-2 rounded-lg',
                        enabled ? 'bg-primary/10' : 'bg-muted',
                      )}>
                        <Icon className={cn('h-5 w-5', enabled ? 'text-primary' : 'text-muted-foreground')} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{mod.label}</span>
                          {enabled && (
                            <Badge
                              variant={fullyEnabled ? 'default' : 'secondary'}
                              className="text-[10px] px-1.5 py-0"
                            >
                              {active}/{total}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{mod.description}</p>
                      </div>
                      <Switch
                        checked={enabled}
                        onCheckedChange={() => toggleModule(mod)}
                        disabled={!canEdit}
                      />
                    </div>
                  );
                })}
              </div>
            </TabsContent>

            {/* ── Granular Permissions Tab ──────────────────────────────── */}
            <TabsContent value="granular">
              <p className="text-sm text-muted-foreground mb-4">
                Fine-tune individual permissions within each module.
              </p>
              <div className="space-y-3">
                {MODULES.map((mod) => {
                  const perms = getModulePerms(mod);
                  if (perms.length === 0) return null;
                  const enabled = isModuleEnabled(mod);
                  const fullyEnabled = isModuleFullyEnabled(mod);
                  const [active, total] = getModuleActiveCount(mod);
                  const Icon = mod.icon;

                  return (
                    <Collapsible key={mod.key} defaultOpen={enabled && !fullyEnabled}>
                      <div className="border rounded-lg">
                        {/* Module header */}
                        <div className="flex items-center justify-between px-4 py-2.5 bg-muted/30">
                          <div className="flex items-center gap-3">
                            <Switch
                              checked={fullyEnabled}
                              onCheckedChange={() => toggleModule(mod)}
                              disabled={!canEdit}
                              className="scale-90"
                            />
                            <Icon className={cn('h-4 w-4', enabled ? 'text-primary' : 'text-muted-foreground')} />
                            <span className="font-medium text-sm">{mod.label}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={fullyEnabled ? 'default' : enabled ? 'secondary' : 'outline'}
                              className="text-[10px]"
                            >
                              {active}/{total}
                            </Badge>
                            <CollapsibleTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7">
                                <ChevronDown className="h-4 w-4" />
                              </Button>
                            </CollapsibleTrigger>
                          </div>
                        </div>

                        {/* Individual permissions */}
                        <CollapsibleContent>
                          <div className="divide-y">
                            {perms.map((perm) => {
                              const active = activePerms.has(perm.code);
                              return (
                                <div key={perm.id} className="flex items-center justify-between px-4 py-2 hover:bg-muted/20">
                                  <div className="flex-1 min-w-0 mr-4">
                                    <div className="flex items-center gap-2">
                                      <code className="text-xs font-mono text-muted-foreground">{perm.code}</code>
                                    </div>
                                    <p className="text-xs text-muted-foreground">{perm.description}</p>
                                  </div>
                                  <Switch
                                    checked={active}
                                    onCheckedChange={() => togglePermission(perm.code)}
                                    disabled={!canEdit}
                                    className="scale-90"
                                  />
                                </div>
                              );
                            })}
                          </div>
                        </CollapsibleContent>
                      </div>
                    </Collapsible>
                  );
                })}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      )}

      {/* Delete confirmation */}
      <Dialog open={deleteConfirm} onOpenChange={setDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Role "{role.name}"?</DialogTitle>
            <DialogDescription>
              This cannot be undone. Users assigned to this role will lose access. Make sure to reassign them first.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteRole.isPending}>
              {deleteRole.isPending ? 'Deleting...' : 'Delete Role'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ─── Create Role Dialog ───────────────────────────────────────────────────────

function CreateRoleDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const createRole = useCreateRole();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');

  const handleNameChange = (val: string) => {
    setName(val);
    setSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''));
  };

  const handleSubmit = () => {
    createRole.mutate(
      { name, slug, description: description || undefined },
      { onSuccess: () => { onOpenChange(false); setName(''); setSlug(''); setDescription(''); } },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Custom Role</DialogTitle>
          <DialogDescription>
            Create a new role with custom permissions for your organization.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Role Name</Label>
            <Input value={name} onChange={(e) => handleNameChange(e.target.value)} placeholder="e.g. Senior Tester" />
          </div>
          <div className="space-y-2">
            <Label>Slug</Label>
            <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="e.g. senior_tester" className="font-mono text-sm" />
            <p className="text-xs text-muted-foreground">Lowercase letters, numbers, and underscores</p>
          </div>
          <div className="space-y-2">
            <Label>Description (optional)</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What does this role do?" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!name || !slug || createRole.isPending}>
            {createRole.isPending ? 'Creating...' : 'Create Role'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
