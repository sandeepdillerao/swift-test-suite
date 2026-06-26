import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Clock,
  User,
  FolderTree,
  CheckCircle2,
  XCircle,
  AlertCircle,
  MinusCircle,
  PlayCircle,
  ExternalLink,
  Link2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { StatusBadge, PriorityBadge } from '@/components/StatusBadge';
import { TestCaseDialog } from '@/components/testcases/TestCaseDialog';
import { DeleteConfirmDialog } from '@/components/testcases/DeleteConfirmDialog';
import { AutomationPanel } from '@/components/automation/AutomationPanel';
import { useTestCase, useUpdateTestCase, useDeleteTestCase } from '@/hooks/useTestCases';
import { useTestSuites } from '@/hooks/useTestSuites';
import { useProjectStore } from '@/stores/projectStore';
import { usePermissions } from '@/hooks/usePermissions';
import { CanShow } from '@/components/auth/PermissionGuard';
import { VariablesEditor } from '@/components/common/VariablesEditor';
import { formatDistanceToNow, format } from 'date-fns';
import { toast } from 'sonner';
import type { TestCase } from '@/types';

const statusIcons = {
  passed: CheckCircle2,
  failed: XCircle,
  blocked: AlertCircle,
  not_run: MinusCircle,
  in_progress: PlayCircle,
};

export const TestCaseDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentProject } = useProjectStore();
  const projectId = currentProject?.id;

  const { data: testCase, isLoading } = useTestCase(id || '');
  const { data: suites = [] } = useTestSuites(projectId ?? '');
  const updateTestCase = useUpdateTestCase();
  const deleteTestCase = useDeleteTestCase();

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const { can } = usePermissions();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!testCase) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <p className="text-muted-foreground">Test case not found</p>
        <Button variant="outline" onClick={() => navigate('/app/test-cases')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Test Cases
        </Button>
      </div>
    );
  }

  const StatusIcon = statusIcons[testCase.status];
  const suiteName = suites.find((s) => s.id === testCase.suiteId)?.name ?? '—';

  const handleSave = (data: Partial<TestCase>) => {
    updateTestCase.mutate(
      { id: testCase.id, data },
      {
        onSuccess: () => { toast.success('Test case updated'); setEditDialogOpen(false); },
        onError: () => toast.error('Failed to update test case'),
      }
    );
  };

  const confirmDelete = () => {
    deleteTestCase.mutate(testCase.id, {
      onSuccess: () => {
        toast.success('Test case deleted');
        navigate('/app/test-cases');
      },
      onError: () => toast.error('Failed to delete test case'),
    });
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
            onClick={() => navigate('/app/test-cases')}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Test Cases
          </Button>
          <div className="flex items-center gap-3">
            <span className="font-mono text-sm font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded">
              {testCase.tcId}
            </span>
            <StatusBadge status={testCase.status} />
            <PriorityBadge priority={testCase.priority} />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">{testCase.title}</h1>
        </div>
        <div className="flex gap-2">
          <CanShow permission="test_cases:update">
            <Button variant="outline" size="sm" onClick={() => setEditDialogOpen(true)}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </CanShow>
          <CanShow permission="test_cases:delete">
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

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {testCase.description || 'No description provided.'}
              </p>
            </CardContent>
          </Card>

          {/* Preconditions */}
          {testCase.preconditions && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Preconditions</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {testCase.preconditions}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Test Steps */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Test Steps</CardTitle>
            </CardHeader>
            <CardContent>
              {testCase.steps.length === 0 ? (
                <p className="text-sm text-muted-foreground">No steps defined.</p>
              ) : (
                <div className="space-y-4">
                  {testCase.steps.map((step, index) => (
                    <div key={step.id} className="flex gap-4">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-medium">
                        {index + 1}
                      </div>
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium">{step.action}</p>
                        <p className="text-sm text-muted-foreground">
                          <span className="font-medium">Expected:</span> {step.expectedResult}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Expected Result */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Expected Result</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {testCase.expectedResult || 'No expected result defined.'}
              </p>
            </CardContent>
          </Card>

          {/* Automation */}
          {projectId && (
            <AutomationPanel
              testCaseId={testCase.id}
              projectId={projectId}
              testCaseHasSteps={testCase.steps.length > 0}
            />
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Variables Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Variables</CardTitle>
            </CardHeader>
            <CardContent>
              <VariablesEditor
                value={testCase.variables ?? {}}
                onChange={(vars) => {
                  updateTestCase.mutate(
                    { id: testCase.id, data: { variables: vars } as any },
                    { onSuccess: () => toast.success('Variables saved'), onError: () => toast.error('Failed to save variables') },
                  );
                }}
                description="Override variables for this test case. Takes precedence over suite-level."
                readOnly={!can('test_cases:update')}
              />
            </CardContent>
          </Card>

          {/* Details Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                <div className="flex items-center gap-2">
                  <StatusIcon className="h-4 w-4" />
                  <StatusBadge status={testCase.status} />
                </div>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Priority</span>
                <PriorityBadge priority={testCase.priority} />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Type</span>
                <Badge variant="outline" className="capitalize">
                  {testCase.type}
                </Badge>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <FolderTree className="h-3 w-3" />
                  Suite
                </span>
                <span className="text-sm font-medium">{suiteName}</span>
              </div>
            </CardContent>
          </Card>

          {/* Jira Integration */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Link2 className="h-4 w-4" />
                Jira Integration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {testCase.jiraTicketId ? (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Ticket</span>
                    <a
                      href={testCase.jiraTicketUrl || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:underline"
                    >
                      🔷 {testCase.jiraTicketId}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                  {testCase.jiraSubtaskId && (
                    <>
                      <Separator />
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Subtask</span>
                        <a
                          href={testCase.jiraSubtaskUrl || '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:underline"
                        >
                          {testCase.jiraSubtaskId}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    </>
                  )}
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Sync</span>
                    <Badge variant={testCase.jiraSyncStatus === 'synced' ? 'default' : 'secondary'} className="capitalize">
                      {testCase.jiraSyncStatus || 'not_linked'}
                    </Badge>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Not linked to any Jira ticket</p>
              )}
            </CardContent>
          </Card>

          {/* Tags */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tags</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {testCase.tags.length === 0 ? (
                  <span className="text-sm text-muted-foreground">No tags</span>
                ) : (
                  testCase.tags.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Activity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <Clock className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="text-sm">Created</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(testCase.createdAt), 'MMM d, yyyy')}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Clock className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="text-sm">Last Updated</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(testCase.updatedAt), { addSuffix: true })}
                  </p>
                </div>
              </div>
              {testCase.lastRunAt && (
                <div className="flex items-start gap-3">
                  <PlayCircle className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <div>
                    <p className="text-sm">Last Executed</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(testCase.lastRunAt), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              )}
              {testCase.assignedTo && (
                <div className="flex items-start gap-3">
                  <User className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <div>
                    <p className="text-sm">Assigned To</p>
                    <p className="text-xs text-muted-foreground">{testCase.assignedTo}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Dialog */}
      <TestCaseDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        testCase={testCase}
        suites={suites.map((s) => ({ id: s.id, name: s.name }))}
        onSave={handleSave}
      />

      {/* Delete Dialog */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Test Case"
        description={`Are you sure you want to delete "${testCase.title}"? This action cannot be undone.`}
        onConfirm={confirmDelete}
      />
    </div>
  );
};
