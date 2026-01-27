import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Play, 
  Plus, 
  CheckCircle2,
  Clock,
  Archive,
  MoreHorizontal,
  Eye,
  Trash2,
  Edit,
  Download,
  Tag,
  XCircle,
  AlertTriangle,
  MinusCircle
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTestRuns, useCreateTestRun, useDeleteTestRun } from '@/hooks/useTestRuns';
import { useReleases } from '@/hooks/useReleases';
import { TestRunDialog } from '@/components/testruns/TestRunDialog';
import { DeleteConfirmDialog } from '@/components/testcases/DeleteConfirmDialog';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import type { TestRun } from '@/types';

const statusConfig = {
  active: { label: 'Active', className: 'bg-primary/10 text-primary', icon: Play },
  completed: { label: 'Completed', className: 'bg-green-500/10 text-green-600', icon: CheckCircle2 },
  archived: { label: 'Archived', className: 'bg-muted text-muted-foreground', icon: Archive },
};

export const TestRuns = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: testRuns = [], isLoading } = useTestRuns();
  const { data: releases = [] } = useReleases();
  const createTestRun = useCreateTestRun();
  const deleteTestRun = useDeleteTestRun();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedRun, setSelectedRun] = useState<TestRun | undefined>();

  const handleCreate = () => {
    setSelectedRun(undefined);
    setDialogOpen(true);
  };

  const handleEdit = (run: TestRun) => {
    setSelectedRun(run);
    setDialogOpen(true);
  };

  const handleDelete = (run: TestRun) => {
    setSelectedRun(run);
    setDeleteDialogOpen(true);
  };

  const handleSave = async (data: Partial<TestRun>) => {
    try {
      await createTestRun.mutateAsync(data);
      toast({ title: 'Test run created successfully' });
    } catch (error) {
      toast({ title: 'Failed to create test run', variant: 'destructive' });
    }
  };

  const confirmDelete = async () => {
    if (!selectedRun) return;
    try {
      await deleteTestRun.mutateAsync(selectedRun.id);
      toast({ title: 'Test run deleted successfully' });
      setDeleteDialogOpen(false);
    } catch (error) {
      toast({ title: 'Failed to delete test run', variant: 'destructive' });
    }
  };

  const exportReport = (run: TestRun) => {
    // Calculate stats
    const passed = run.testCases.filter(tc => tc.status === 'passed').length;
    const failed = run.testCases.filter(tc => tc.status === 'failed').length;
    const blocked = run.testCases.filter(tc => tc.status === 'blocked').length;
    const notRun = run.testCases.filter(tc => tc.status === 'not_run').length;
    const inProgress = run.testCases.filter(tc => tc.status === 'in_progress').length;

    const report = {
      testRun: {
        id: run.id,
        name: run.name,
        description: run.description,
        environment: run.environment,
        buildNumber: run.buildNumber,
        status: run.status,
        startedAt: run.startedAt,
        completedAt: run.completedAt,
      },
      summary: {
        totalCases: run.testCases.length,
        passed,
        failed,
        blocked,
        notRun,
        inProgress,
        passRate: run.passRate,
      },
      testCases: run.testCases,
      generatedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `test-run-report-${run.id}-${format(new Date(), 'yyyy-MM-dd')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Report exported successfully' });
  };

  const getReleaseName = (releaseId?: string) => {
    if (!releaseId) return null;
    const release = releases.find(r => r.id === releaseId);
    return release ? `${release.name} (${release.version})` : null;
  };

  const getStatusBreakdown = (run: TestRun) => {
    const passed = run.testCases.filter(tc => tc.status === 'passed').length;
    const failed = run.testCases.filter(tc => tc.status === 'failed').length;
    const blocked = run.testCases.filter(tc => tc.status === 'blocked').length;
    const notRun = run.testCases.filter(tc => tc.status === 'not_run').length;
    const total = run.testCases.length;
    return { passed, failed, blocked, notRun, total };
  };

  const activeRuns = testRuns.filter(r => r.status === 'active');
  const completedRuns = testRuns.filter(r => r.status === 'completed');
  const archivedRuns = testRuns.filter(r => r.status === 'archived');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const RunCard = ({ run }: { run: TestRun }) => {
    const statusInfo = statusConfig[run.status];
    const StatusIcon = statusInfo.icon;
    const breakdown = getStatusBreakdown(run);
    const releaseName = getReleaseName(run.releaseId);
    
    return (
      <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/app/test-runs/${run.id}`)}>
        <CardContent className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4 flex-1">
              <div className={cn('p-2.5 rounded-lg', statusInfo.className.split(' ')[0])}>
                <StatusIcon className={cn('h-5 w-5', statusInfo.className.split(' ')[1])} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1 flex-wrap">
                  <h3 className="font-semibold text-lg">{run.name}</h3>
                  <Badge variant="outline" className={statusInfo.className}>
                    {statusInfo.label}
                  </Badge>
                  {releaseName && (
                    <Badge variant="secondary" className="gap-1">
                      <Tag className="h-3 w-3" />
                      {releaseName}
                    </Badge>
                  )}
                </div>
                {run.description && (
                  <p className="text-sm text-muted-foreground mb-2 line-clamp-1">{run.description}</p>
                )}
                <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    Started {formatDistanceToNow(new Date(run.startedAt), { addSuffix: true })}
                  </span>
                  {run.environment && (
                    <span className="text-xs bg-muted px-2 py-0.5 rounded">{run.environment}</span>
                  )}
                  {run.buildNumber && (
                    <span className="text-xs font-mono text-muted-foreground">{run.buildNumber}</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-2xl font-bold">{run.passRate}%</p>
                <p className="text-xs text-muted-foreground">Pass Rate</p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/app/test-runs/${run.id}`); }}>
                    <Eye className="mr-2 h-4 w-4" />
                    View Details
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEdit(run); }}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); exportReport(run); }}>
                    <Download className="mr-2 h-4 w-4" />
                    Export Report
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive" onClick={(e) => { e.stopPropagation(); handleDelete(run); }}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Progress Bar with Status Breakdown */}
          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3 text-sm">
                <span className="flex items-center gap-1 text-green-600">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {breakdown.passed}
                </span>
                <span className="flex items-center gap-1 text-destructive">
                  <XCircle className="h-3.5 w-3.5" />
                  {breakdown.failed}
                </span>
                <span className="flex items-center gap-1 text-orange-500">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {breakdown.blocked}
                </span>
                <span className="flex items-center gap-1 text-muted-foreground">
                  <MinusCircle className="h-3.5 w-3.5" />
                  {breakdown.notRun}
                </span>
              </div>
              <span className="text-sm text-muted-foreground">{breakdown.total} test cases</span>
            </div>
            <div className="flex h-2 rounded-full overflow-hidden bg-muted">
              {breakdown.passed > 0 && (
                <div 
                  className="bg-green-500 transition-all" 
                  style={{ width: `${(breakdown.passed / breakdown.total) * 100}%` }} 
                />
              )}
              {breakdown.failed > 0 && (
                <div 
                  className="bg-destructive transition-all" 
                  style={{ width: `${(breakdown.failed / breakdown.total) * 100}%` }} 
                />
              )}
              {breakdown.blocked > 0 && (
                <div 
                  className="bg-orange-500 transition-all" 
                  style={{ width: `${(breakdown.blocked / breakdown.total) * 100}%` }} 
                />
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Test Runs</h1>
          <p className="text-muted-foreground">
            Execute and track test execution progress
          </p>
        </div>
        <Button className="gap-2" onClick={handleCreate}>
          <Plus className="h-4 w-4" />
          New Test Run
        </Button>
      </div>

      {/* Tabs for filtering */}
      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active" className="gap-2">
            <Play className="h-4 w-4" />
            Active ({activeRuns.length})
          </TabsTrigger>
          <TabsTrigger value="completed" className="gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Completed ({completedRuns.length})
          </TabsTrigger>
          <TabsTrigger value="archived" className="gap-2">
            <Archive className="h-4 w-4" />
            Archived ({archivedRuns.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4 mt-4">
          {activeRuns.length === 0 ? (
            <Card className="flex flex-col items-center justify-center py-12">
              <Play className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No active test runs</h3>
              <p className="text-muted-foreground text-sm mt-1">
                Start a new test run to execute your test cases
              </p>
              <Button className="mt-4 gap-2" onClick={handleCreate}>
                <Plus className="h-4 w-4" />
                Start Test Run
              </Button>
            </Card>
          ) : (
            activeRuns.map((run) => <RunCard key={run.id} run={run} />)
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4 mt-4">
          {completedRuns.length === 0 ? (
            <Card className="flex flex-col items-center justify-center py-12">
              <CheckCircle2 className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No completed test runs</h3>
              <p className="text-muted-foreground text-sm mt-1">
                Completed test runs will appear here
              </p>
            </Card>
          ) : (
            completedRuns.map((run) => <RunCard key={run.id} run={run} />)
          )}
        </TabsContent>

        <TabsContent value="archived" className="space-y-4 mt-4">
          {archivedRuns.length === 0 ? (
            <Card className="flex flex-col items-center justify-center py-12">
              <Archive className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No archived test runs</h3>
              <p className="text-muted-foreground text-sm mt-1">
                Archived test runs will appear here
              </p>
            </Card>
          ) : (
            archivedRuns.map((run) => <RunCard key={run.id} run={run} />)
          )}
        </TabsContent>
      </Tabs>

      <TestRunDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        testRun={selectedRun}
        onSave={handleSave}
      />

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Test Run"
        description={`Are you sure you want to delete "${selectedRun?.name}"? This action cannot be undone and all execution history will be lost.`}
        onConfirm={confirmDelete}
      />
    </div>
  );
};
