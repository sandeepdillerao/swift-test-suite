import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Plus,
  TestTube2,
  FolderTree,
  Calendar,
  Zap,
  Loader2,
  Bot,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge, PriorityBadge } from '@/components/StatusBadge';
import { TestSuiteDialog } from '@/components/testsuites/TestSuiteDialog';
import { TestCaseDialog } from '@/components/testcases/TestCaseDialog';
import { DeleteConfirmDialog } from '@/components/testcases/DeleteConfirmDialog';
import { useTestSuite, useTestSuites, useUpdateTestSuite, useDeleteTestSuite } from '@/hooks/useTestSuites';
import { useTestCases, useCreateTestCase } from '@/hooks/useTestCases';
import { useCreateTestRun, useSuiteAutomationSummary } from '@/hooks/useTestRuns';
import { useEnvironments } from '@/hooks/useEnvironments';
import { useProjectStore } from '@/stores/projectStore';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { usePermissions } from '@/hooks/usePermissions';
import { CanShow } from '@/components/auth/PermissionGuard';
import type { TestSuite, TestCase } from '@/types';
import { format } from 'date-fns';
import { toast } from 'sonner';

export const TestSuiteDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentProject } = useProjectStore();
  const projectId = currentProject?.id;

  const { data: suite, isLoading: suiteLoading } = useTestSuite(id || '');
  const { data: testCases = [], isLoading: casesLoading } = useTestCases(undefined, id);
  const { data: allSuites = [] } = useTestSuites(projectId ?? '');

  const updateSuite = useUpdateTestSuite();
  const deleteSuite = useDeleteTestSuite();
  const createTestCase = useCreateTestCase();
  const createTestRun = useCreateTestRun();

  const { data: automationSummary } = useSuiteAutomationSummary(id);
  const { data: environments = [] } = useEnvironments(projectId);
  const automatedCount = automationSummary?.automatedCases?.length ?? 0;

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [addCaseDialogOpen, setAddCaseDialogOpen] = useState(false);
  const [runDialogOpen, setRunDialogOpen] = useState(false);
  const [runEnvId, setRunEnvId] = useState('');
  const [runBuild, setRunBuild] = useState('');

  const isLoading = suiteLoading || casesLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!suite) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <p className="text-muted-foreground">Test suite not found</p>
        <Button variant="outline" onClick={() => navigate('/app/test-suites')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Test Suites
        </Button>
      </div>
    );
  }

  const statusCounts = testCases.reduce(
    (acc, tc) => {
      acc[tc.status] = (acc[tc.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const handleSaveSuite = (data: Partial<TestSuite>) => {
    updateSuite.mutate(
      { id: suite.id, data },
      {
        onSuccess: () => { toast.success('Test suite updated'); setEditDialogOpen(false); },
        onError: () => toast.error('Failed to update test suite'),
      }
    );
  };

  const confirmDeleteSuite = () => {
    deleteSuite.mutate(suite.id, {
      onSuccess: () => {
        toast.success('Test suite deleted');
        navigate('/app/test-suites');
      },
      onError: () => toast.error('Failed to delete test suite'),
    });
  };

  const handleRunSuite = () => {
    if (!projectId || !id) return;
    createTestRun.mutate(
      {
        name: `Suite Run — ${suite.name} — ${new Date().toLocaleDateString()}`,
        projectId,
        suiteId: id,
        environmentId: runEnvId || undefined,
        buildNumber: runBuild || undefined,
        includeManualCases: true,
      },
      {
        onSuccess: (run: any) => {
          setRunDialogOpen(false);
          toast.success('Test run created from suite');
          navigate(`/app/test-runs/${run.id}`);
        },
        onError: (e: any) => toast.error(e.message || 'Failed to create test run'),
      },
    );
  };

  const handleSaveTestCase = (data: Partial<TestCase>) => {
    createTestCase.mutate(
      { ...data, suiteId: suite.id, projectId },
      {
        onSuccess: () => { toast.success('Test case created'); setAddCaseDialogOpen(false); },
        onError: () => toast.error('Failed to create test case'),
      }
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <Button
            variant="ghost"
            size="sm"
            className="-ml-2 mb-2"
            onClick={() => navigate('/app/test-suites')}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Test Suites
          </Button>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <FolderTree className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">{suite.name}</h1>
              <p className="text-muted-foreground">{suite.description}</p>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {automatedCount > 0 && (
            <Button size="sm" onClick={() => setRunDialogOpen(true)} className="gap-1.5">
              <Zap className="h-4 w-4" />
              Run Suite ({automatedCount} auto)
            </Button>
          )}
          <CanShow permission="test_suites:update">
            <Button variant="outline" size="sm" onClick={() => setEditDialogOpen(true)}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </CanShow>
          <CanShow permission="test_suites:delete">
            <Button
              variant="outline"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </CanShow>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <TestTube2 className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{testCases.length}</p>
                <p className="text-xs text-muted-foreground">Total Cases</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <TestTube2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{statusCounts.passed || 0}</p>
                <p className="text-xs text-muted-foreground">Passed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10">
                <TestTube2 className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold">{statusCounts.failed || 0}</p>
                <p className="text-xs text-muted-foreground">Failed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/10">
                <TestTube2 className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{statusCounts.blocked || 0}</p>
                <p className="text-xs text-muted-foreground">Blocked</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Test Cases List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Test Cases in this Suite</CardTitle>
          <CanShow permission="test_cases:create">
            <Button size="sm" className="gap-2" onClick={() => setAddCaseDialogOpen(true)}>
              <Plus className="h-4 w-4" />
              Add Test Case
            </Button>
          </CanShow>
        </CardHeader>
        <CardContent>
          {testCases.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <TestTube2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No test cases in this suite yet</p>
              <CanShow permission="test_cases:create">
                <Button className="mt-4 gap-2" variant="outline" onClick={() => setAddCaseDialogOpen(true)}>
                  <Plus className="h-4 w-4" />
                  Create First Test Case
                </Button>
              </CanShow>
            </div>
          ) : (
            <div className="space-y-2">
              {testCases.map((tc) => (
                <div
                  key={tc.id}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => navigate(`/app/test-cases/${tc.id}`)}
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                      {tc.tcId}
                    </span>
                    <div>
                      <p className="font-medium text-sm">{tc.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {tc.description}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <PriorityBadge priority={tc.priority} />
                    <StatusBadge status={tc.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Metadata */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            Created on {format(new Date(suite.createdAt), 'MMMM d, yyyy')}
          </div>
        </CardContent>
      </Card>

      {/* Edit Suite Dialog */}
      <TestSuiteDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        suite={suite}
        suites={allSuites}
        onSave={handleSaveSuite}
      />

      {/* Delete Suite Dialog */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Test Suite"
        description={`Are you sure you want to delete "${suite.name}"? This will not delete the test cases in this suite.`}
        onConfirm={confirmDeleteSuite}
      />

      {/* Add Test Case Dialog */}
      <TestCaseDialog
        open={addCaseDialogOpen}
        onOpenChange={setAddCaseDialogOpen}
        testCase={null}
        suites={[{ id: suite.id, name: suite.name }]}
        onSave={handleSaveTestCase}
      />

      {/* Run Suite Dialog */}
      <Dialog open={runDialogOpen} onOpenChange={setRunDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Run Suite</DialogTitle>
            <DialogDescription>
              Create a test run from this suite with automated execution
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {automationSummary && (
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-2 rounded bg-muted/50">
                  <p className="text-lg font-bold">{automationSummary.totalCases}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
                <div className="p-2 rounded bg-green-500/10">
                  <p className="text-lg font-bold text-green-600">{automationSummary.automatedCases.length}</p>
                  <p className="text-xs text-green-600">Automated</p>
                </div>
                <div className="p-2 rounded bg-amber-500/10">
                  <p className="text-lg font-bold text-amber-600">{automationSummary.manualCases.length}</p>
                  <p className="text-xs text-amber-600">Manual</p>
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label>Environment</Label>
              <Select value={runEnvId} onValueChange={setRunEnvId}>
                <SelectTrigger><SelectValue placeholder="Select environment..." /></SelectTrigger>
                <SelectContent>
                  {environments.map(env => (
                    <SelectItem key={env.id} value={env.id}>
                      {env.name} {env.isDefault && '(Default)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Build Number <span className="text-xs text-muted-foreground font-normal">(optional)</span></Label>
              <Input placeholder="e.g., build-2024.01.15" value={runBuild} onChange={(e) => setRunBuild(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRunDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleRunSuite} disabled={createTestRun.isPending}>
              {createTestRun.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Zap className="h-4 w-4 mr-2" />}
              Create & Run
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
