import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FolderKanban, Plus, Archive, Key, Clock, Search, Link2, Users, Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProjectDialog } from '@/components/projects/ProjectDialog';
import { useProjects, useCreateProject, useUpdateProject } from '@/hooks/useProjects';
import { useProjectStore } from '@/stores/projectStore';
import { useProjectMembers } from '@/hooks/useRbac';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { CanShow } from '@/components/auth/PermissionGuard';
import type { Project } from '@/types';

// ─── Constants ───────────────────────────────────────────────────────────────

const PROJECT_COLORS = [
  'bg-blue-500', 'bg-violet-500', 'bg-green-500', 'bg-orange-500',
  'bg-pink-500', 'bg-cyan-500', 'bg-amber-500', 'bg-rose-500',
];

function projectColor(key: string) {
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = key.charCodeAt(i) + ((hash << 5) - hash);
  return PROJECT_COLORS[Math.abs(hash) % PROJECT_COLORS.length];
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export const Projects = () => {
  const navigate = useNavigate();
  const { data: projects = [], isLoading } = useProjects();
  const createProject = useCreateProject();
  const updateProject = useUpdateProject();
  const { currentProject, setCurrentProject } = useProjectStore();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() =>
    projects.filter(p =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.key.toLowerCase().includes(search.toLowerCase())
    ), [projects, search]);

  const active = useMemo(() => filtered.filter(p => !p.isArchived), [filtered]);
  const archived = useMemo(() => filtered.filter(p => p.isArchived), [filtered]);

  const handleCreate = () => setDialogOpen(true);

  const handleSave = (data: Partial<Project> & { jiraProjectKey?: string | null }) => {
    const { jiraProjectKey, ...rest } = data;
    const payload = { ...rest, jiraProjectKey } as any;
    createProject.mutate(payload, {
      onSuccess: (created) => {
        toast.success('Project created');
        setCurrentProject(created);
        setDialogOpen(false);
        navigate(`/app/projects/${created.id}`);
      },
      onError: (e) => toast.error(e.message),
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
          <p className="text-muted-foreground">Manage and switch between testing projects</p>
        </div>
        <CanShow permission="projects:create">
          <Button className="gap-2" onClick={handleCreate}>
            <Plus className="h-4 w-4" /> New Project
          </Button>
        </CanShow>
      </div>

      {/* Stats */}
      {projects.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={FolderKanban} value={active.length} label="Active" className="bg-primary/10 text-primary" />
          <StatCard icon={Archive} value={archived.length} label="Archived" className="bg-muted text-muted-foreground" />
        </div>
      )}

      {/* Search */}
      {projects.length > 0 && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search projects..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
      )}

      {/* Content */}
      {projects.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16">
          <FolderKanban className="h-14 w-14 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">No projects yet</h3>
          <p className="text-muted-foreground text-sm mt-1 mb-6">Create your first project to start organizing test cases</p>
          <Button className="gap-2" onClick={handleCreate}>
            <Plus className="h-4 w-4" /> Create First Project
          </Button>
        </Card>
      ) : (
        <Tabs defaultValue="active">
          <TabsList>
            <TabsTrigger value="active">Active ({active.length})</TabsTrigger>
            {archived.length > 0 && <TabsTrigger value="archived">Archived ({archived.length})</TabsTrigger>}
          </TabsList>
          <TabsContent value="active" className="mt-4">
            {active.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">No active projects match your search.</p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {active.map(p => (
                  <ProjectCard key={p.id} project={p} isActive={currentProject?.id === p.id} onClick={() => navigate(`/app/projects/${p.id}`)} />
                ))}
              </div>
            )}
          </TabsContent>
          <TabsContent value="archived" className="mt-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {archived.map(p => (
                <ProjectCard key={p.id} project={p} isActive={false} onClick={() => navigate(`/app/projects/${p.id}`)} />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      )}

      {/* Create Dialog (only for create — editing happens on detail page) */}
      <ProjectDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        project={null}
        onSave={handleSave}
        isLoading={createProject.isPending}
      />
    </div>
  );
};

// ─── Project Card ────────────────────────────────────────────────────────────

function ProjectCard({ project, isActive, onClick }: { project: Project; isActive: boolean; onClick: () => void }) {
  const color = projectColor(project.key);
  const { data: members = [] } = useProjectMembers(project.id);

  return (
    <Card
      className={cn(
        'group hover:shadow-md transition-all cursor-pointer',
        isActive && 'ring-2 ring-primary',
        project.isArchived && 'opacity-60',
      )}
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <div className={cn('h-10 w-10 rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0', color)}>
            {project.key.slice(0, 2)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold leading-tight truncate">{project.name}</h3>
              {isActive && <Badge variant="secondary" className="text-xs py-0 shrink-0">Active</Badge>}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <code className="text-xs text-muted-foreground font-mono">{project.key}</code>
              {project.settings?.jiraProjectKey && (
                <Badge variant="outline" className="text-[10px] h-4 px-1.5 gap-0.5">
                  <Link2 className="h-2.5 w-2.5" /> {project.settings.jiraProjectKey}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {project.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{project.description}</p>
        )}
        <div className="flex items-center gap-4 text-xs text-muted-foreground border-t pt-3 mt-1">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatDistanceToNow(new Date(project.updatedAt), { addSuffix: true })}
          </span>
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {members.length} {members.length === 1 ? 'member' : 'members'}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Stat Card ───────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, value, label, className }: { icon: typeof FolderKanban; value: number; label: string; className: string }) {
  return (
    <Card>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-center gap-3">
          <div className={cn('p-2 rounded-lg', className)}><Icon className="h-4 w-4" /></div>
          <div>
            <p className="text-xl font-bold">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
