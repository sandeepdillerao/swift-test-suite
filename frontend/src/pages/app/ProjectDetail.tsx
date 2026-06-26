import { useState, useMemo, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Users, Settings, Plus, Trash2, UserPlus, Shield, Link2,
  Clock, Key, Loader2, MoreHorizontal, FolderKanban, Check, ChevronsUpDown, X,
  Pencil, Archive, ArchiveRestore, Server, Camera, RotateCcw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { DeleteConfirmDialog } from '@/components/testcases/DeleteConfirmDialog';
import { useProject, useUpdateProject, useDeleteProject } from '@/hooks/useProjects';
import { ProjectDialog } from '@/components/projects/ProjectDialog';
import { EnvironmentsPanel } from '@/components/environments/EnvironmentsPanel';
import { useProjectMembers, useAddProjectMember, useRemoveProjectMember, useRoles } from '@/hooks/useRbac';
import { useUsers } from '@/hooks/useUsers';
import { useJiraConfig, useJiraProjects } from '@/hooks/useIntegrations';
import { usePermissions } from '@/hooks/usePermissions';
import { useProjectStore } from '@/stores/projectStore';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { Switch } from '@/components/ui/switch';
import { CardDescription } from '@/components/ui/card';
import type { Project, ProjectMember, User, PlaywrightConfig } from '@/types';

const PW_DEFAULTS: Required<PlaywrightConfig> = {
  testTimeout: 120000, actionTimeout: 0, navigationTimeout: 0,
  retries: 0, workers: 1, defaultHeadless: true, defaultBrowser: 'chromium',
  viewportWidth: 1280, viewportHeight: 720,
  screenshot: 'on-failure', video: 'on-failure', trace: 'on-failure',
  slowMo: 0, ignoreHttpsErrors: false,
};

// ─── Main Page ───────────────────────────────────────────────────────────────

export const ProjectDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { can } = usePermissions();
  const { setCurrentProject } = useProjectStore();

  const { data: project, isLoading } = useProject(id!);
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-muted-foreground">Project not found</p>
        <Button variant="outline" onClick={() => navigate('/app/projects')}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Projects
        </Button>
      </div>
    );
  }

  const handleOpenProject = () => {
    setCurrentProject(project);
    navigate('/app/test-cases');
    toast.success(`Switched to ${project.name}`);
  };

  const handleArchive = () => {
    updateProject.mutate(
      { id: project.id, data: { isArchived: !project.isArchived } },
      { onSuccess: () => toast.success(project.isArchived ? 'Project restored' : 'Project archived') },
    );
  };

  const handleEditSave = (data: Partial<Project> & { jiraProjectKey?: string | null }) => {
    const { jiraProjectKey, key, ...rest } = data;
    updateProject.mutate(
      { id: project.id, data: { ...rest, jiraProjectKey } as any },
      { onSuccess: () => { toast.success('Project updated'); setEditDialogOpen(false); }, onError: (e) => toast.error(e.message) },
    );
  };

  const handleDelete = () => {
    deleteProject.mutate(project.id, {
      onSuccess: () => {
        toast.success('Project deleted');
        if (currentProject?.id === project.id) setCurrentProject(null);
        navigate('/app/projects');
      },
      onError: (e) => toast.error(e.message),
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/app/projects')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight">{project.name}</h1>
              <Badge variant="outline" className="font-mono">{project.key}</Badge>
              {project.isArchived && <Badge variant="secondary">Archived</Badge>}
              {project.settings?.jiraProjectKey && (
                <Badge variant="secondary" className="gap-1">
                  <Link2 className="h-3 w-3" /> {project.settings.jiraProjectKey}
                </Badge>
              )}
            </div>
            {project.description && (
              <p className="text-muted-foreground mt-1">{project.description}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={handleOpenProject} className="gap-2">
            <FolderKanban className="h-4 w-4" /> Open Project
          </Button>
          {can('projects:update') && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setEditDialogOpen(true)}>
                  <Pencil className="mr-2 h-4 w-4" /> Edit Details
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleArchive}>
                  {project.isArchived
                    ? <><ArchiveRestore className="mr-2 h-4 w-4" /> Restore</>
                    : <><Archive className="mr-2 h-4 w-4" /> Archive</>
                  }
                </DropdownMenuItem>
                {can('projects:delete') && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive" onClick={() => setDeleteDialogOpen(true)}>
                      <Trash2 className="mr-2 h-4 w-4" /> Delete Project
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="members">
        <TabsList>
          <TabsTrigger value="members" className="gap-1.5">
            <Users className="h-3.5 w-3.5" /> Members
          </TabsTrigger>
          <TabsTrigger value="environments" className="gap-1.5">
            <Server className="h-3.5 w-3.5" /> Environments
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-1.5">
            <Settings className="h-3.5 w-3.5" /> Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="mt-4">
          <MembersPanel projectId={project.id} canManage={can('projects:update')} />
        </TabsContent>

        <TabsContent value="environments" className="mt-4">
          <EnvironmentsPanel projectId={project.id} canManage={can('projects:update')} />
        </TabsContent>

        <TabsContent value="settings" className="mt-4">
          <SettingsPanel project={project} canEdit={can('projects:update')} />
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <ProjectDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        project={project}
        onSave={handleEditSave}
        isLoading={updateProject.isPending}
      />

      {/* Delete Confirmation */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Project"
        description={`Delete "${project.name}"? All associated test suites and test cases will also be deleted. This cannot be undone.`}
        onConfirm={handleDelete}
      />
    </div>
  );
};

// ─── Members Panel ───────────────────────────────────────────────────────────

function MembersPanel({ projectId, canManage }: { projectId: string; canManage: boolean }) {
  const { data: members = [], isLoading } = useProjectMembers(projectId);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<ProjectMember | null>(null);

  const removeMember = useRemoveProjectMember();

  const handleRemove = useCallback(() => {
    if (!removeTarget) return;
    removeMember.mutate(
      { projectId, userId: removeTarget.userId },
      { onSuccess: () => setRemoveTarget(null) },
    );
  }, [removeTarget, removeMember, projectId]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">
            Team Members <Badge variant="secondary" className="ml-2">{members.length}</Badge>
          </CardTitle>
          {canManage && (
            <Button size="sm" onClick={() => setAddDialogOpen(true)} className="gap-1.5">
              <UserPlus className="h-4 w-4" /> Add Member
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {members.length === 0 ? (
          <div className="border border-dashed rounded-lg p-8 text-center">
            <Users className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="font-medium">No members yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Add team members to give them access to this project
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {members.map((member) => (
              <MemberRow
                key={member.id}
                member={member}
                projectId={projectId}
                canManage={canManage}
                onRemove={() => setRemoveTarget(member)}
              />
            ))}
          </div>
        )}
      </CardContent>

      {canManage && (
        <AddMemberDialog
          open={addDialogOpen}
          onOpenChange={setAddDialogOpen}
          projectId={projectId}
          existingUserIds={members.map((m) => m.userId)}
        />
      )}

      <DeleteConfirmDialog
        open={!!removeTarget}
        onOpenChange={(open) => !open && setRemoveTarget(null)}
        title="Remove Member"
        description={`Remove ${removeTarget?.user?.displayName || 'this user'} from the project? They will lose access to project data.`}
        onConfirm={handleRemove}
      />
    </Card>
  );
}

// ─── Member Row ──────────────────────────────────────────────────────────────

function MemberRow({
  member, projectId, canManage, onRemove,
}: {
  member: ProjectMember;
  projectId: string;
  canManage: boolean;
  onRemove: () => void;
}) {
  const user = member.user;
  if (!user) return null;

  const initials = `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase();

  return (
    <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/30 transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        <Avatar className="h-9 w-9">
          {user.avatarUrl && <AvatarImage src={user.avatarUrl} />}
          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{user.displayName}</p>
          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <Badge variant="outline" className="capitalize text-xs">
          {member.role?.name || user.role?.replace('_', ' ') || 'Member'}
        </Badge>
        <span className="text-xs text-muted-foreground hidden sm:inline">
          {formatDistanceToNow(new Date(member.createdAt), { addSuffix: true })}
        </span>
        {canManage && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem className="text-destructive" onClick={onRemove}>
                <Trash2 className="mr-2 h-4 w-4" /> Remove
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}

// ─── Add Member Dialog ───────────────────────────────────────────────────────

function AddMemberDialog({
  open, onOpenChange, projectId, existingUserIds,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  projectId: string;
  existingUserIds: string[];
}) {
  const { data: usersResponse } = useUsers({ limit: 100 });
  const allUsers: User[] = usersResponse?.data ?? [];
  const addMember = useAddProjectMember();
  const { data: roles = [] } = useRoles();

  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [userSearchOpen, setUserSearchOpen] = useState(false);

  // Filter out users already in the project
  const availableUsers = useMemo(
    () => allUsers.filter((u) => u.isActive && !existingUserIds.includes(u.id)),
    [allUsers, existingUserIds],
  );

  const selectedUser = allUsers.find((u) => u.id === selectedUserId);

  const handleAdd = useCallback(() => {
    if (!selectedUserId) {
      toast.error('Select a user');
      return;
    }
    addMember.mutate(
      { projectId, userId: selectedUserId, roleId: selectedRoleId || undefined as any },
      {
        onSuccess: () => {
          setSelectedUserId('');
          setSelectedRoleId('');
          onOpenChange(false);
        },
      },
    );
  }, [selectedUserId, selectedRoleId, addMember, projectId, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Team Member</DialogTitle>
          <DialogDescription>Select a user from your organization to add to this project</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* User picker */}
          <div className="space-y-2">
            <Label>User *</Label>
            <Popover open={userSearchOpen} onOpenChange={setUserSearchOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
                  {selectedUser ? (
                    <span className="flex items-center gap-2 truncate">
                      <span className="font-medium">{selectedUser.displayName}</span>
                      <span className="text-muted-foreground text-xs">{selectedUser.email}</span>
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Select user...</span>
                  )}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[350px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search users..." />
                  <CommandList>
                    {availableUsers.length === 0 ? (
                      <CommandEmpty>No available users</CommandEmpty>
                    ) : (
                      <CommandGroup>
                        {availableUsers.map((u) => (
                          <CommandItem
                            key={u.id}
                            value={`${u.displayName} ${u.email}`}
                            onSelect={() => { setSelectedUserId(u.id); setUserSearchOpen(false); }}
                          >
                            <Check className={cn('mr-2 h-3.5 w-3.5', selectedUserId === u.id ? 'opacity-100' : 'opacity-0')} />
                            <div className="flex flex-col min-w-0">
                              <span className="text-sm font-medium truncate">{u.displayName}</span>
                              <span className="text-xs text-muted-foreground truncate">{u.email}</span>
                            </div>
                            <Badge variant="outline" className="ml-auto text-xs capitalize shrink-0">
                              {u.role.replace('_', ' ')}
                            </Badge>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    )}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Role picker (optional) */}
          {roles.length > 0 && (
            <div className="space-y-2">
              <Label>Project Role <span className="text-xs text-muted-foreground font-normal">(optional override)</span></Label>
              <Select value={selectedRoleId} onValueChange={setSelectedRoleId}>
                <SelectTrigger><SelectValue placeholder="Use org-level role" /></SelectTrigger>
                <SelectContent>
                  {roles.map((r: any) => (
                    <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                If not set, the user's organization-level role applies.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleAdd} disabled={!selectedUserId || addMember.isPending}>
            {addMember.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <UserPlus className="h-4 w-4 mr-2" />}
            Add Member
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Settings Panel ──────────────────────────────────────────────────────────

function SettingsPanel({ project, canEdit }: { project: Project; canEdit: boolean }) {
  const queryClient = useQueryClient();
  const updateProject = useUpdateProject();
  const { data: jiraConfig } = useJiraConfig();
  const jiraConnected = !!jiraConfig?.connected;
  const { data: jiraProjectsData, isLoading: loadingJiraProjects } = useJiraProjects(jiraConnected);

  const jiraProjects = jiraProjectsData?.projects ?? [];
  const [jiraProjectKey, setJiraProjectKey] = useState<string | null>(project.settings?.jiraProjectKey ?? null);
  const [jiraPopoverOpen, setJiraPopoverOpen] = useState(false);

  // ── Playwright config override ────────────────────────────────────────────
  const { data: globalSettings } = useQuery({ queryKey: ['settings'], queryFn: api.settings.getAll });
  const globalPwConfig: Required<PlaywrightConfig> = { ...PW_DEFAULTS, ...(globalSettings?.playwrightConfig ?? {}) };

  const projectPwOverride: Partial<PlaywrightConfig> = (project.settings?.playwrightConfig as Partial<PlaywrightConfig>) ?? {};
  const [pwOverride, setPwOverride] = useState<Partial<PlaywrightConfig>>(projectPwOverride);

  useEffect(() => {
    setPwOverride((project.settings?.playwrightConfig as Partial<PlaywrightConfig>) ?? {});
  }, [project.settings?.playwrightConfig]);

  const savePwOverrideMutation = useMutation({
    mutationFn: (override: Partial<PlaywrightConfig>) =>
      api.projects.update(project.id, { settings: { ...project.settings, playwrightConfig: override } } as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', project.id] });
      toast.success('Playwright override saved');
    },
    onError: () => toast.error('Failed to save override'),
  });

  const handlePwOverrideChange = <K extends keyof PlaywrightConfig>(key: K, value: PlaywrightConfig[K]) => {
    const next = { ...pwOverride, [key]: value };
    setPwOverride(next);
    savePwOverrideMutation.mutate(next);
  };

  const handleResetPwOverride = () => {
    setPwOverride({});
    savePwOverrideMutation.mutate({});
  };

  const hasOverride = Object.keys(pwOverride).length > 0;
  const effective = { ...globalPwConfig, ...pwOverride };

  const jiraLabel = useMemo(() => {
    if (!jiraProjectKey || !jiraProjects.length) return null;
    const p = jiraProjects.find((p: any) => p.key === jiraProjectKey);
    return p ? `${p.key} — ${p.name}` : jiraProjectKey;
  }, [jiraProjectKey, jiraProjects]);

  const handleSaveJiraLink = useCallback(() => {
    updateProject.mutate(
      { id: project.id, data: { jiraProjectKey } as any },
      { onSuccess: () => toast.success('Jira project link updated') },
    );
  }, [updateProject, project.id, jiraProjectKey]);

  const hasChanged = jiraProjectKey !== (project.settings?.jiraProjectKey ?? null);

  return (
    <div className="space-y-6">
      {/* General Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Project Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
            <InfoField label="Project Key" value={project.key} mono />
            <InfoField label="Created" value={formatDistanceToNow(new Date(project.createdAt), { addSuffix: true })} />
            <InfoField label="Updated" value={formatDistanceToNow(new Date(project.updatedAt), { addSuffix: true })} />
            <InfoField label="Status" value={project.isArchived ? 'Archived' : 'Active'} />
          </div>
        </CardContent>
      </Card>

      {/* Jira Integration */}
      {jiraConnected && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Link2 className="h-4 w-4" /> Jira Integration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Linked Jira Project</Label>
              <div className="flex items-center gap-2">
                <Popover open={jiraPopoverOpen} onOpenChange={setJiraPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="flex-1 justify-between font-normal"
                      disabled={!canEdit}
                    >
                      {jiraProjectKey ? (
                        <span className="flex items-center gap-2 truncate">
                          <Badge variant="secondary" className="font-mono text-xs shrink-0">{jiraProjectKey}</Badge>
                          <span className="truncate text-sm">{jiraLabel}</span>
                        </span>
                      ) : (
                        <span className="text-muted-foreground">No Jira project linked</span>
                      )}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[350px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search Jira projects..." />
                      <CommandList>
                        {loadingJiraProjects ? (
                          <div className="flex items-center justify-center py-6">
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                          </div>
                        ) : jiraProjects.length === 0 ? (
                          <CommandEmpty>No Jira projects found.</CommandEmpty>
                        ) : (
                          <CommandGroup>
                            {jiraProjects.map((p: any) => (
                              <CommandItem
                                key={p.key}
                                value={`${p.key} ${p.name}`}
                                onSelect={() => {
                                  setJiraProjectKey(p.key === jiraProjectKey ? null : p.key);
                                  setJiraPopoverOpen(false);
                                }}
                              >
                                <Check className={cn('mr-2 h-3.5 w-3.5', jiraProjectKey === p.key ? 'opacity-100' : 'opacity-0')} />
                                <Badge variant="outline" className="font-mono text-xs mr-2 shrink-0">{p.key}</Badge>
                                <span className="truncate">{p.name}</span>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        )}
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                {jiraProjectKey && canEdit && (
                  <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => setJiraProjectKey(null)} title="Unlink">
                    <X className="h-4 w-4 text-muted-foreground" />
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                When linked, Jira ticket searches in this project will be scoped to the selected Jira project.
              </p>
              {hasChanged && canEdit && (
                <Button size="sm" onClick={handleSaveJiraLink} disabled={updateProject.isPending}>
                  {updateProject.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  Save Jira Link
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Playwright Config Override */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Camera className="h-4 w-4 text-blue-500" /> Playwright Override
              </CardTitle>
              <CardDescription className="mt-1">
                Override global Playwright defaults for this project. Blank = use global setting.
              </CardDescription>
            </div>
            {hasOverride && canEdit && (
              <Button variant="ghost" size="sm" className="text-muted-foreground gap-1.5" onClick={handleResetPwOverride} disabled={savePwOverrideMutation.isPending}>
                <RotateCcw className="h-3.5 w-3.5" /> Reset to global
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Timeouts */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Timeouts</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {([
                { key: 'testTimeout', label: 'Test Timeout (ms)' },
                { key: 'actionTimeout', label: 'Action Timeout (ms)' },
                { key: 'navigationTimeout', label: 'Navigation Timeout (ms)' },
              ] as const).map(({ key, label }) => (
                <div key={key} className="space-y-1">
                  <Label className="text-xs">{label}</Label>
                  <Input
                    type="number" min={0}
                    value={pwOverride[key] ?? ''}
                    placeholder={`${globalPwConfig[key]} (global)`}
                    disabled={!canEdit}
                    onChange={(e) => {
                      const v = e.target.value === '' ? undefined : parseInt(e.target.value);
                      const next = { ...pwOverride };
                      if (v === undefined) delete next[key]; else (next[key] as any) = v;
                      setPwOverride(next);
                    }}
                    onBlur={(e) => {
                      const v = e.target.value === '' ? undefined : parseInt(e.target.value);
                      const next = { ...pwOverride };
                      if (v === undefined) delete next[key]; else (next[key] as any) = v;
                      savePwOverrideMutation.mutate(next);
                    }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Execution */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Execution</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Retries</Label>
                <Input type="number" min={0} max={5}
                  value={pwOverride.retries ?? ''}
                  placeholder={`${globalPwConfig.retries} (global)`}
                  disabled={!canEdit}
                  onChange={(e) => {
                    const v = e.target.value === '' ? undefined : parseInt(e.target.value);
                    const next = { ...pwOverride }; if (v === undefined) delete next.retries; else next.retries = v; setPwOverride(next);
                  }}
                  onBlur={(e) => {
                    const v = e.target.value === '' ? undefined : parseInt(e.target.value);
                    const next = { ...pwOverride }; if (v === undefined) delete next.retries; else next.retries = v; savePwOverrideMutation.mutate(next);
                  }}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Workers</Label>
                <Input type="number" min={1} max={8}
                  value={pwOverride.workers ?? ''}
                  placeholder={`${globalPwConfig.workers} (global)`}
                  disabled={!canEdit}
                  onChange={(e) => {
                    const v = e.target.value === '' ? undefined : parseInt(e.target.value);
                    const next = { ...pwOverride }; if (v === undefined) delete next.workers; else next.workers = v; setPwOverride(next);
                  }}
                  onBlur={(e) => {
                    const v = e.target.value === '' ? undefined : parseInt(e.target.value);
                    const next = { ...pwOverride }; if (v === undefined) delete next.workers; else next.workers = v; savePwOverrideMutation.mutate(next);
                  }}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Slow Mo (ms)</Label>
                <Input type="number" min={0}
                  value={pwOverride.slowMo ?? ''}
                  placeholder={`${globalPwConfig.slowMo} (global)`}
                  disabled={!canEdit}
                  onChange={(e) => {
                    const v = e.target.value === '' ? undefined : parseInt(e.target.value);
                    const next = { ...pwOverride }; if (v === undefined) delete next.slowMo; else next.slowMo = v; setPwOverride(next);
                  }}
                  onBlur={(e) => {
                    const v = e.target.value === '' ? undefined : parseInt(e.target.value);
                    const next = { ...pwOverride }; if (v === undefined) delete next.slowMo; else next.slowMo = v; savePwOverrideMutation.mutate(next);
                  }}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Default Browser</Label>
                <Select
                  value={effective.defaultBrowser}
                  onValueChange={(v) => handlePwOverrideChange('defaultBrowser', v)}
                  disabled={!canEdit}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="chromium">Chromium</SelectItem>
                    <SelectItem value="firefox">Firefox</SelectItem>
                    <SelectItem value="webkit">WebKit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex flex-wrap gap-6 mt-3">
              <div className="flex items-center gap-3">
                <Switch checked={effective.defaultHeadless} disabled={!canEdit}
                  onCheckedChange={(v) => handlePwOverrideChange('defaultHeadless', v)} />
                <span className="text-sm">Headless</span>
                {pwOverride.defaultHeadless !== undefined && <span className="text-[10px] text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded">overriding global</span>}
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={effective.ignoreHttpsErrors} disabled={!canEdit}
                  onCheckedChange={(v) => handlePwOverrideChange('ignoreHttpsErrors', v)} />
                <span className="text-sm">Ignore HTTPS errors</span>
                {pwOverride.ignoreHttpsErrors !== undefined && <span className="text-[10px] text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded">overriding global</span>}
              </div>
            </div>
          </div>

          {/* Viewport */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Viewport</p>
            <div className="grid grid-cols-2 gap-3 max-w-xs">
              <div className="space-y-1">
                <Label className="text-xs">Width (px)</Label>
                <Input type="number" min={320}
                  value={pwOverride.viewportWidth ?? ''}
                  placeholder={`${globalPwConfig.viewportWidth}`}
                  disabled={!canEdit}
                  onChange={(e) => { const v = e.target.value === '' ? undefined : parseInt(e.target.value); const next = { ...pwOverride }; if (v === undefined) delete next.viewportWidth; else next.viewportWidth = v; setPwOverride(next); }}
                  onBlur={(e) => { const v = e.target.value === '' ? undefined : parseInt(e.target.value); const next = { ...pwOverride }; if (v === undefined) delete next.viewportWidth; else next.viewportWidth = v; savePwOverrideMutation.mutate(next); }}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Height (px)</Label>
                <Input type="number" min={240}
                  value={pwOverride.viewportHeight ?? ''}
                  placeholder={`${globalPwConfig.viewportHeight}`}
                  disabled={!canEdit}
                  onChange={(e) => { const v = e.target.value === '' ? undefined : parseInt(e.target.value); const next = { ...pwOverride }; if (v === undefined) delete next.viewportHeight; else next.viewportHeight = v; setPwOverride(next); }}
                  onBlur={(e) => { const v = e.target.value === '' ? undefined : parseInt(e.target.value); const next = { ...pwOverride }; if (v === undefined) delete next.viewportHeight; else next.viewportHeight = v; savePwOverrideMutation.mutate(next); }}
                />
              </div>
            </div>
          </div>

          {/* Artifact Capture */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Artifact Capture</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {(['screenshot', 'video', 'trace'] as const).map((art) => (
                <div key={art} className="space-y-1">
                  <Label className="text-xs capitalize">{art}</Label>
                  <Select
                    value={effective[art]}
                    onValueChange={(v) => handlePwOverrideChange(art, v as 'always' | 'on-failure' | 'never')}
                    disabled={!canEdit}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="always">Always</SelectItem>
                      <SelectItem value="on-failure">On Failure</SelectItem>
                      <SelectItem value="never">Never</SelectItem>
                    </SelectContent>
                  </Select>
                  {pwOverride[art] !== undefined && <span className="text-[10px] text-blue-500">overriding global</span>}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function InfoField({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <span className="text-xs text-muted-foreground">{label}</span>
      <p className={cn('font-medium truncate', mono && 'font-mono')}>{value}</p>
    </div>
  );
}
