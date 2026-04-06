import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FolderKanban,
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Archive,
  ArchiveRestore,
  Key,
  Clock,
  Search,
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ProjectDialog } from '@/components/projects/ProjectDialog';
import { DeleteConfirmDialog } from '@/components/testcases/DeleteConfirmDialog';
import { useProjects, useCreateProject, useUpdateProject, useDeleteProject } from '@/hooks/useProjects';
import { useProjectStore } from '@/stores/projectStore';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { usePermissions } from '@/hooks/usePermissions';
import { CanShow } from '@/components/auth/PermissionGuard';
import type { Project } from '@/types';

const PROJECT_COLORS = [
  'bg-blue-500', 'bg-violet-500', 'bg-green-500', 'bg-orange-500',
  'bg-pink-500', 'bg-cyan-500', 'bg-amber-500', 'bg-rose-500',
];

function projectColor(key: string) {
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = key.charCodeAt(i) + ((hash << 5) - hash);
  return PROJECT_COLORS[Math.abs(hash) % PROJECT_COLORS.length];
}

export const Projects = () => {
  const navigate = useNavigate();
  const { can } = usePermissions();
  const { data: projects = [], isLoading } = useProjects();
  const createProject = useCreateProject();
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();
  const { currentProject, setCurrentProject } = useProjectStore();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingProject, setDeletingProject] = useState<Project | null>(null);
  const [search, setSearch] = useState('');

  const filtered = projects.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.key.toLowerCase().includes(search.toLowerCase())
  );
  const active = filtered.filter(p => !p.isArchived);
  const archived = filtered.filter(p => p.isArchived);

  const handleCreate = () => { setEditingProject(null); setDialogOpen(true); };
  const handleEdit = (p: Project) => { setEditingProject(p); setDialogOpen(true); };
  const handleDeletePrompt = (p: Project) => { setDeletingProject(p); setDeleteDialogOpen(true); };

  const handleSave = async (data: Partial<Project>) => {
    if (editingProject) {
      updateProject.mutate(
        { id: editingProject.id, data },
        { onSuccess: () => { toast.success('Project updated'); setDialogOpen(false); }, onError: (e) => toast.error(e.message) },
      );
    } else {
      createProject.mutate(data, {
        onSuccess: (created) => {
          toast.success('Project created');
          setCurrentProject(created);
          setDialogOpen(false);
        },
        onError: (e) => toast.error(e.message),
      });
    }
  };

  const handleArchive = (p: Project) => {
    updateProject.mutate(
      { id: p.id, data: { isArchived: !p.isArchived } },
      { onSuccess: () => toast.success(p.isArchived ? 'Project restored' : 'Project archived') },
    );
  };

  const confirmDelete = () => {
    if (!deletingProject) return;
    deleteProject.mutate(deletingProject.id, {
      onSuccess: () => {
        toast.success('Project deleted');
        if (currentProject?.id === deletingProject.id) setCurrentProject(null);
      },
      onError: (e) => toast.error(e.message),
    });
    setDeleteDialogOpen(false);
    setDeletingProject(null);
  };

  const handleSelectProject = (p: Project) => {
    setCurrentProject(p);
    navigate('/app/test-cases');
    toast.success(`Switched to ${p.name}`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const ProjectCard = ({ project }: { project: Project }) => {
    const color = projectColor(project.key);
    const isActive = currentProject?.id === project.id;

    return (
      <Card
        className={cn(
          'group hover:shadow-md transition-all cursor-pointer',
          isActive && 'ring-2 ring-primary',
          project.isArchived && 'opacity-60'
        )}
        onClick={() => handleSelectProject(project)}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={cn('h-10 w-10 rounded-lg flex items-center justify-center text-white font-bold text-sm', color)}>
                {project.key.slice(0, 2)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold leading-tight">{project.name}</h3>
                  {isActive && (
                    <Badge variant="secondary" className="text-xs py-0">Active</Badge>
                  )}
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                  <Key className="h-3 w-3 text-muted-foreground" />
                  <code className="text-xs text-muted-foreground font-mono">{project.key}</code>
                </div>
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleSelectProject(project); }}>
                  <FolderKanban className="mr-2 h-4 w-4" />
                  Open Project
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEdit(project); }}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleArchive(project); }}>
                  {project.isArchived
                    ? <><ArchiveRestore className="mr-2 h-4 w-4" />Restore</>
                    : <><Archive className="mr-2 h-4 w-4" />Archive</>
                  }
                </DropdownMenuItem>
                {can('projects:delete') && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={(e) => { e.stopPropagation(); handleDeletePrompt(project); }}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
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
          </div>
        </CardContent>
      </Card>
    );
  };

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
            <Plus className="h-4 w-4" />
            New Project
          </Button>
        </CanShow>
      </div>

      {/* Stats row */}
      {projects.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <FolderKanban className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xl font-bold">{active.length}</p>
                  <p className="text-xs text-muted-foreground">Active</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted">
                  <Archive className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xl font-bold">{archived.length}</p>
                  <p className="text-xs text-muted-foreground">Archived</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search */}
      {projects.length > 0 && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      )}

      {projects.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16">
          <FolderKanban className="h-14 w-14 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">No projects yet</h3>
          <p className="text-muted-foreground text-sm mt-1 mb-6">
            Create your first project to start organizing test cases
          </p>
          <Button className="gap-2" onClick={handleCreate}>
            <Plus className="h-4 w-4" />
            Create First Project
          </Button>
        </Card>
      ) : (
        <Tabs defaultValue="active">
          <TabsList>
            <TabsTrigger value="active">Active ({active.length})</TabsTrigger>
            {archived.length > 0 && (
              <TabsTrigger value="archived">Archived ({archived.length})</TabsTrigger>
            )}
          </TabsList>
          <TabsContent value="active" className="mt-4">
            {active.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">No active projects match your search.</p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {active.map(p => <ProjectCard key={p.id} project={p} />)}
              </div>
            )}
          </TabsContent>
          <TabsContent value="archived" className="mt-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {archived.map(p => <ProjectCard key={p.id} project={p} />)}
            </div>
          </TabsContent>
        </Tabs>
      )}

      <ProjectDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        project={editingProject}
        onSave={handleSave}
        isLoading={createProject.isPending || updateProject.isPending}
      />
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Project"
        description={`Delete "${deletingProject?.name}"? All associated test suites and test cases will also be deleted. This cannot be undone.`}
        onConfirm={confirmDelete}
      />
    </div>
  );
};
