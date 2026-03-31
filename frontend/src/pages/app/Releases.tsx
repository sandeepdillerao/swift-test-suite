import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Tag,
  Calendar,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  CheckCircle2,
  Clock,
  Archive,
  Rocket,
  Play
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useReleases, useCreateRelease, useUpdateRelease, useDeleteRelease } from '@/hooks/useReleases';
import { useTestRuns } from '@/hooks/useTestRuns';
import { useProjectStore } from '@/stores/projectStore';
import { ReleaseDialog } from '@/components/releases/ReleaseDialog';
import { DeleteConfirmDialog } from '@/components/testcases/DeleteConfirmDialog';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import type { Release, ReleaseStatus } from '@/types';

const statusConfig: Record<ReleaseStatus, { label: string; className: string; icon: typeof Tag }> = {
  planning: { label: 'Planning', className: 'bg-muted text-muted-foreground', icon: Clock },
  in_progress: { label: 'In Progress', className: 'bg-primary/10 text-primary', icon: Play },
  released: { label: 'Released', className: 'bg-green-500/10 text-green-600', icon: Rocket },
  archived: { label: 'Archived', className: 'bg-muted text-muted-foreground', icon: Archive },
};

export const Releases = () => {
  const navigate = useNavigate();
  const { currentProject } = useProjectStore();
  const projectId = currentProject?.id;
  const { data: releases = [], isLoading } = useReleases(projectId);
  const { data: testRuns = [] } = useTestRuns(projectId);
  const createRelease = useCreateRelease();
  const updateRelease = useUpdateRelease();
  const deleteRelease = useDeleteRelease();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedRelease, setSelectedRelease] = useState<Release | undefined>();

  const handleCreate = () => {
    setSelectedRelease(undefined);
    setDialogOpen(true);
  };

  const handleEdit = (release: Release) => {
    setSelectedRelease(release);
    setDialogOpen(true);
  };

  const handleDelete = (release: Release) => {
    setSelectedRelease(release);
    setDeleteDialogOpen(true);
  };

  const handleSave = async (data: Partial<Release>) => {
    try {
      if (selectedRelease) {
        // Update existing release — strip fields that shouldn't be sent to PATCH
        const { id, projectId: _pid, createdBy, createdAt, updatedAt, ...updateData } = data as Release;
        await updateRelease.mutateAsync({ id: selectedRelease.id, data: updateData });
        toast.success('Release updated successfully');
      } else {
        await createRelease.mutateAsync({ ...data, projectId });
        toast.success('Release created successfully');
      }
    } catch (error) {
      toast.error(selectedRelease ? 'Failed to update release' : 'Failed to create release');
    }
  };

  const confirmDelete = async () => {
    if (!selectedRelease) return;
    try {
      await deleteRelease.mutateAsync(selectedRelease.id);
      toast.success('Release deleted successfully');
      setDeleteDialogOpen(false);
    } catch (error) {
      toast.error('Failed to delete release');
    }
  };

  const getLinkedTestRuns = (releaseId: string) => {
    return testRuns.filter(tr => tr.releaseId === releaseId);
  };

  const planningReleases = releases.filter(r => r.status === 'planning');
  const inProgressReleases = releases.filter(r => r.status === 'in_progress');
  const releasedReleases = releases.filter(r => r.status === 'released');
  const archivedReleases = releases.filter(r => r.status === 'archived');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const ReleaseCard = ({ release }: { release: Release }) => {
    const statusInfo = statusConfig[release.status];
    const StatusIcon = statusInfo.icon;
    const linkedRuns = getLinkedTestRuns(release.id);
    const completedRuns = linkedRuns.filter(r => r.status === 'completed');
    const avgPassRate = completedRuns.length > 0
      ? Math.round(completedRuns.reduce((acc, r) => acc + r.passRate, 0) / completedRuns.length)
      : null;

    return (
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4 flex-1">
              <div className={cn('p-2.5 rounded-lg', statusInfo.className.split(' ')[0])}>
                <StatusIcon className={cn('h-5 w-5', statusInfo.className.split(' ')[1])} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1 flex-wrap">
                  <h3 className="font-semibold text-lg">{release.name}</h3>
                  <Badge variant="outline">{release.version}</Badge>
                  <Badge variant="outline" className={statusInfo.className}>
                    {statusInfo.label}
                  </Badge>
                </div>
                {release.description && (
                  <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{release.description}</p>
                )}
                <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                  {release.plannedDate && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      Planned: {format(new Date(release.plannedDate), 'MMM d, yyyy')}
                    </span>
                  )}
                  {release.releasedDate && (
                    <span className="flex items-center gap-1">
                      <Rocket className="h-4 w-4" />
                      Released: {format(new Date(release.releasedDate), 'MMM d, yyyy')}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-lg font-semibold">{linkedRuns.length}</p>
                <p className="text-xs text-muted-foreground">Test Runs</p>
              </div>
              {avgPassRate !== null && (
                <div className="text-right">
                  <p className="text-lg font-semibold text-green-600">{avgPassRate}%</p>
                  <p className="text-xs text-muted-foreground">Avg Pass Rate</p>
                </div>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleEdit(release)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(release)}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Linked Test Runs */}
          {linkedRuns.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-sm font-medium mb-2">Linked Test Runs</p>
              <div className="flex flex-wrap gap-2">
                {linkedRuns.map(run => (
                  <Badge 
                    key={run.id} 
                    variant="secondary" 
                    className="cursor-pointer hover:bg-secondary/80"
                    onClick={() => navigate(`/app/test-runs/${run.id}`)}
                  >
                    {run.name}
                    <span className={cn(
                      'ml-1',
                      run.status === 'completed' ? 'text-green-600' : 'text-primary'
                    )}>
                      ({run.passRate}%)
                    </span>
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Release Management</h1>
          <p className="text-muted-foreground">
            Manage releases and track testing progress
          </p>
        </div>
        <Button className="gap-2" onClick={handleCreate}>
          <Plus className="h-4 w-4" />
          New Release
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="in_progress">
        <TabsList>
          <TabsTrigger value="planning" className="gap-2">
            <Clock className="h-4 w-4" />
            Planning ({planningReleases.length})
          </TabsTrigger>
          <TabsTrigger value="in_progress" className="gap-2">
            <Play className="h-4 w-4" />
            In Progress ({inProgressReleases.length})
          </TabsTrigger>
          <TabsTrigger value="released" className="gap-2">
            <Rocket className="h-4 w-4" />
            Released ({releasedReleases.length})
          </TabsTrigger>
          <TabsTrigger value="archived" className="gap-2">
            <Archive className="h-4 w-4" />
            Archived ({archivedReleases.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="planning" className="space-y-4 mt-4">
          {planningReleases.length === 0 ? (
            <Card className="flex flex-col items-center justify-center py-12">
              <Clock className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No releases in planning</h3>
              <p className="text-muted-foreground text-sm mt-1">Create a new release to get started</p>
              <Button className="mt-4 gap-2" onClick={handleCreate}>
                <Plus className="h-4 w-4" />
                Create Release
              </Button>
            </Card>
          ) : (
            planningReleases.map(release => <ReleaseCard key={release.id} release={release} />)
          )}
        </TabsContent>

        <TabsContent value="in_progress" className="space-y-4 mt-4">
          {inProgressReleases.length === 0 ? (
            <Card className="flex flex-col items-center justify-center py-12">
              <Play className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No releases in progress</h3>
              <p className="text-muted-foreground text-sm mt-1">Releases being tested will appear here</p>
            </Card>
          ) : (
            inProgressReleases.map(release => <ReleaseCard key={release.id} release={release} />)
          )}
        </TabsContent>

        <TabsContent value="released" className="space-y-4 mt-4">
          {releasedReleases.length === 0 ? (
            <Card className="flex flex-col items-center justify-center py-12">
              <Rocket className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No completed releases</h3>
              <p className="text-muted-foreground text-sm mt-1">Completed releases will appear here</p>
            </Card>
          ) : (
            releasedReleases.map(release => <ReleaseCard key={release.id} release={release} />)
          )}
        </TabsContent>

        <TabsContent value="archived" className="space-y-4 mt-4">
          {archivedReleases.length === 0 ? (
            <Card className="flex flex-col items-center justify-center py-12">
              <Archive className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No archived releases</h3>
              <p className="text-muted-foreground text-sm mt-1">Archived releases will appear here</p>
            </Card>
          ) : (
            archivedReleases.map(release => <ReleaseCard key={release.id} release={release} />)
          )}
        </TabsContent>
      </Tabs>

      <ReleaseDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        release={selectedRelease}
        onSave={handleSave}
      />

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Release"
        description={`Are you sure you want to delete "${selectedRelease?.name}"? This will not delete linked test runs.`}
        onConfirm={confirmDelete}
      />
    </div>
  );
};
