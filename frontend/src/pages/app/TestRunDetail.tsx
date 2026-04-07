import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  MinusCircle,
  Clock,
  Play,
  Download,
  User,
  Tag,
  GitBranch,
  Server,
  MessageSquare,
  Bug,
  History,
  FileText,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Zap,
  Square,
  Loader2,
  Bot,
  BarChart3,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useTestRun, useTestRunHistory, useUpdateTestRun, useUpdateTestRunCase, useExecuteTestRun, useCancelTestRunExecution, useExecutionProgress, useTestRunReport } from '@/hooks/useTestRuns';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useReleases } from '@/hooks/useReleases';
import { useUsers } from '@/hooks/useUsers';
import { useAuthStore } from '@/stores/authStore';
import { usePermissions } from '@/hooks/usePermissions';
import { CanShow } from '@/components/auth/PermissionGuard';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, format } from 'date-fns';
import { toast } from 'sonner';
import { useScriptExecution } from '@/hooks/useAutomation';
import { ExecutionResultsPanel } from '@/components/automation/ExecutionResultsPanel';
import type { TestStatus, TestRunCase } from '@/types';

const statusConfig: Record<TestStatus, { label: string; className: string; icon: typeof CheckCircle2 }> = {
  passed: { label: 'Passed', className: 'bg-green-500/10 text-green-600 border-green-500/20', icon: CheckCircle2 },
  failed: { label: 'Failed', className: 'bg-destructive/10 text-destructive border-destructive/20', icon: XCircle },
  blocked: { label: 'Blocked', className: 'bg-orange-500/10 text-orange-600 border-orange-500/20', icon: AlertTriangle },
  not_run: { label: 'Not Run', className: 'bg-muted text-muted-foreground border-border', icon: MinusCircle },
  in_progress: { label: 'In Progress', className: 'bg-primary/10 text-primary border-primary/20', icon: Play },
};

export const TestRunDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const { data: testRun, isLoading } = useTestRun(id!);
  const { data: history = [] } = useTestRunHistory(id!);
  const { data: releases = [] } = useReleases(testRun?.projectId);
  const { data: usersData } = useUsers({ limit: 100 });
  const users: any[] = (usersData as any)?.data ?? (usersData as any)?.users ?? (Array.isArray(usersData) ? usersData : []);
  const updateTestRun = useUpdateTestRun();
  const updateTestRunCase = useUpdateTestRunCase();
  const executeTestRun = useExecuteTestRun();
  const cancelExecution = useCancelTestRunExecution();

  const isRunExecuting = testRun?.status === 'executing';
  const { data: autoExecProgress } = useExecutionProgress(id, isRunExecuting);

  const [expandedCase, setExpandedCase] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!testRun) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold">Test Run not found</h2>
        <Button variant="link" onClick={() => navigate('/app/test-runs')}>
          Go back to Test Runs
        </Button>
      </div>
    );
  }

  const release = releases.find(r => r.id === testRun.releaseId);

  // Calculate stats
  const passed = testRun.testCases.filter(tc => tc.status === 'passed').length;
  const failed = testRun.testCases.filter(tc => tc.status === 'failed').length;
  const blocked = testRun.testCases.filter(tc => tc.status === 'blocked').length;
  const notRun = testRun.testCases.filter(tc => tc.status === 'not_run').length;
  const inProgress = testRun.testCases.filter(tc => tc.status === 'in_progress').length;
  const total = testRun.testCases.length;
  const executed = passed + failed + blocked;
  const executionProgress = total > 0 ? Math.round((executed / total) * 100) : 0;
  const automatedNotRun = testRun.testCases.filter(tc => tc.executionMode === 'automated' && tc.status === 'not_run').length;
  const automatedTotal = testRun.testCases.filter(tc => tc.executionMode === 'automated').length;
  const manualTotal = testRun.testCases.filter(tc => tc.executionMode === 'manual').length;

  const filteredCases = statusFilter === 'all' 
    ? testRun.testCases 
    : testRun.testCases.filter(tc => tc.status === statusFilter);

  const getAssigneeName = (userId?: string) => {
    if (!userId) return null;
    const u = users.find((u: any) => u.id === userId);
    if (!u) return userId.slice(0, 8);
    return u.firstName && u.lastName ? `${u.firstName} ${u.lastName}` : u.displayName || u.email;
  };

  const handleStatusChange = async (runCase: TestRunCase, newStatus: TestStatus) => {
    try {
      await updateTestRunCase.mutateAsync({
        runId: testRun.id,
        testCaseId: runCase.testCaseId,
        data: { status: newStatus },
      });
      toast.success('Status updated');
    } catch {
      toast.error('Failed to update status');
    }
  };

  const handleCompleteRun = async () => {
    try {
      await updateTestRun.mutateAsync({
        id: testRun.id,
        data: { status: 'completed' },
      });
      toast.success('Test run marked as completed');
    } catch {
      toast.error('Failed to complete test run');
    }
  };

  const exportReport = () => {
    const report = {
      testRun: {
        id: testRun.id,
        name: testRun.name,
        description: testRun.description,
        environment: testRun.environment,
        buildNumber: testRun.buildNumber,
        status: testRun.status,
        startedAt: testRun.startedAt,
        completedAt: testRun.completedAt,
        release: release ? { name: release.name, version: release.version } : null,
      },
      summary: {
        totalCases: total,
        passed,
        failed,
        blocked,
        notRun,
        inProgress,
        passRate: testRun.passRate,
        executionProgress,
      },
      testCases: testRun.testCases.map(tc => {
        const details = tc.testCase;
        return {
          tcId: details?.tcId ?? tc.testCaseId,
          title: details?.title,
          priority: details?.priority,
          status: tc.status,
          executedAt: tc.executedAt,
          duration: tc.duration,
          comment: tc.comment,
          defects: tc.defects,
          actualResult: tc.actualResult,
        };
      }),
      history,
      generatedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `test-run-report-${testRun.id}-${format(new Date(), 'yyyy-MM-dd-HHmm')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Report exported successfully');
  };

  const exportCSVReport = () => {
    const headers = ['TC ID', 'Title', 'Priority', 'Status', 'Executed At', 'Duration (s)', 'Comment', 'Defects'];
    const rows = testRun.testCases.map(tc => {
      const details = tc.testCase;
      return [
        details?.tcId ?? tc.testCaseId,
        details?.title || '',
        details?.priority || '',
        tc.status,
        tc.executedAt ? format(new Date(tc.executedAt), 'yyyy-MM-dd HH:mm') : '',
        tc.duration?.toString() || '',
        tc.comment || '',
        tc.defects?.join('; ') || '',
      ];
    });

    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `test-run-report-${testRun.id}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV report exported successfully');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/app/test-runs')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-semibold">{testRun.name}</h1>
              <Badge 
                variant="outline" 
                className={cn(statusConfig[testRun.status === 'active' ? 'in_progress' : testRun.status === 'completed' ? 'passed' : 'not_run'].className)}
              >
                {testRun.status.charAt(0).toUpperCase() + testRun.status.slice(1)}
              </Badge>
            </div>
            {testRun.description && (
              <p className="text-muted-foreground">{testRun.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Download className="h-4 w-4" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={exportReport}>
                <FileText className="mr-2 h-4 w-4" />
                Export JSON Report
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportCSVReport}>
                <FileText className="mr-2 h-4 w-4" />
                Export CSV Report
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <CanShow permission="test_runs:update">
            {/* Execute Automated Tests button */}
            {(testRun.status === 'active') && automatedNotRun > 0 && (
              <Button
                onClick={() => executeTestRun.mutate(testRun.id)}
                disabled={executeTestRun.isPending}
                className="gap-2"
                variant="default"
              >
                {executeTestRun.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                Run Automated ({automatedNotRun})
              </Button>
            )}
            {/* Cancel execution button */}
            {isRunExecuting && (
              <Button
                onClick={() => cancelExecution.mutate(testRun.id)}
                disabled={cancelExecution.isPending}
                variant="destructive"
                className="gap-2"
              >
                {cancelExecution.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Square className="h-4 w-4" />}
                Cancel Execution
              </Button>
            )}
            {testRun.status === 'active' && (
              <Button onClick={handleCompleteRun} variant="outline" className="gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Complete Run
              </Button>
            )}
          </CanShow>
        </div>
      </div>

      {/* Execution Progress Bar */}
      {isRunExecuting && autoExecProgress && (
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3 mb-2">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span className="text-sm font-medium">Executing automated tests...</span>
              <span className="text-sm text-muted-foreground ml-auto">
                {autoExecProgress.completed} / {autoExecProgress.total} completed
              </span>
            </div>
            <Progress value={autoExecProgress.total > 0 ? (autoExecProgress.completed / autoExecProgress.total) * 100 : 0} className="h-2" />
            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
              {autoExecProgress.passed > 0 && <span className="text-green-600">{autoExecProgress.passed} passed</span>}
              {autoExecProgress.failed > 0 && <span className="text-red-500">{autoExecProgress.failed} failed</span>}
              {autoExecProgress.running > 0 && <span className="text-primary">{autoExecProgress.running} running</span>}
              {autoExecProgress.pending > 0 && <span>{autoExecProgress.pending} pending</span>}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{passed}</p>
                <p className="text-xs text-muted-foreground">Passed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10">
                <XCircle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold">{failed}</p>
                <p className="text-xs text-muted-foreground">Failed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/10">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{blocked}</p>
                <p className="text-xs text-muted-foreground">Blocked</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Play className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{inProgress}</p>
                <p className="text-xs text-muted-foreground">In Progress</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <MinusCircle className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{notRun}</p>
                <p className="text-xs text-muted-foreground">Not Run</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress and Meta */}
      <div className="grid md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Execution Progress</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm">Overall Progress</span>
                <span className="text-sm font-medium">{executionProgress}%</span>
              </div>
              <Progress value={executionProgress} className="h-3" />
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm">Pass Rate</span>
                <span className="text-sm font-medium">{testRun.passRate}%</span>
              </div>
              <div className="flex h-3 rounded-full overflow-hidden bg-muted">
                {passed > 0 && (
                  <div className="bg-green-500 transition-all" style={{ width: `${(passed / total) * 100}%` }} />
                )}
                {failed > 0 && (
                  <div className="bg-destructive transition-all" style={{ width: `${(failed / total) * 100}%` }} />
                )}
                {blocked > 0 && (
                  <div className="bg-orange-500 transition-all" style={{ width: `${(blocked / total) * 100}%` }} />
                )}
                {inProgress > 0 && (
                  <div className="bg-primary transition-all" style={{ width: `${(inProgress / total) * 100}%` }} />
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Run Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Started:</span>
              <span>{format(new Date(testRun.startedAt), 'MMM d, yyyy HH:mm')}</span>
            </div>
            {testRun.completedAt && (
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Completed:</span>
                <span>{format(new Date(testRun.completedAt), 'MMM d, yyyy HH:mm')}</span>
              </div>
            )}
            {release && (
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Release:</span>
                <Badge variant="secondary">{release.name} ({release.version})</Badge>
              </div>
            )}
            {testRun.environment && (
              <div className="flex items-center gap-2">
                <Server className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Environment:</span>
                <span>{testRun.environment}</span>
              </div>
            )}
            {testRun.buildNumber && (
              <div className="flex items-center gap-2">
                <GitBranch className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Build:</span>
                <code className="text-xs bg-muted px-1 py-0.5 rounded">{testRun.buildNumber}</code>
              </div>
            )}
            {testRun.assignedTo && (
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Assigned to:</span>
                <span>{getAssigneeName(testRun.assignedTo)}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Test Cases and History Tabs */}
      <Tabs defaultValue="testcases">
        <TabsList>
          <TabsTrigger value="testcases" className="gap-2">
            <FileText className="h-4 w-4" />
            Test Cases ({total})
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="h-4 w-4" />
            Execution History ({history.length})
          </TabsTrigger>
          <TabsTrigger value="report" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Report
          </TabsTrigger>
        </TabsList>

        <TabsContent value="testcases" className="space-y-4 mt-4">
          <div className="flex items-center gap-4">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="passed">Passed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="blocked">Blocked</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="not_run">Not Run</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground">
              Showing {filteredCases.length} of {total} test cases
            </span>
          </div>

          <div className="space-y-2">
            {filteredCases.map((runCase) => {
              const testCase = runCase.testCase;
              const statusInfo = statusConfig[runCase.status];
              const StatusIcon = statusInfo.icon;
              const executedBy = runCase.executedBy;
              const isExpanded = expandedCase === runCase.id;

              return (
                <Collapsible key={runCase.id} open={isExpanded} onOpenChange={() => setExpandedCase(isExpanded ? null : runCase.id)}>
                  <Card>
                    <CollapsibleTrigger asChild>
                      <CardContent className="p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className={cn('p-1.5 rounded', statusInfo.className.split(' ')[0])}>
                            <StatusIcon className={cn('h-4 w-4', statusInfo.className.split(' ')[1])} />
                          </div>
                          <span className="text-xs font-mono font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded w-16 text-center">
                            {testCase?.tcId ?? '—'}
                          </span>
                          <span className="flex-1 font-medium">{testCase?.title || 'Unknown Test Case'}</span>
                          {runCase.executionMode === 'automated' ? (
                            <Badge variant="secondary" className="text-[10px] gap-1 shrink-0">
                              <Bot className="h-3 w-3" /> Auto
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] shrink-0">Manual</Badge>
                          )}
                          <Badge variant="outline" className={statusInfo.className}>
                            {statusInfo.label}
                          </Badge>
                          {runCase.executedAt && (
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(runCase.executedAt), { addSuffix: true })}
                            </span>
                          )}
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </div>
                      </CardContent>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent className="pt-0 pb-4 px-4 border-t">
                        {/* Automation Execution Results */}
                        {runCase.executionMode === 'automated' && runCase.scriptExecutionId && (
                          <div className="pt-4 pb-2">
                            <AutomatedCaseResults scriptExecutionId={runCase.scriptExecutionId} />
                          </div>
                        )}

                        <div className="grid md:grid-cols-2 gap-6 pt-4">
                          <div className="space-y-4">
                            <CanShow permission="test_runs:execute">
                              <div>
                                <label className="text-sm font-medium mb-2 block">Update Status</label>
                                <Select
                                  value={runCase.status}
                                  onValueChange={(value) => handleStatusChange(runCase, value as TestStatus)}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="passed">Passed</SelectItem>
                                    <SelectItem value="failed">Failed</SelectItem>
                                    <SelectItem value="blocked">Blocked</SelectItem>
                                    <SelectItem value="in_progress">In Progress</SelectItem>
                                    <SelectItem value="not_run">Not Run</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </CanShow>
                            {testCase && (
                              <div>
                                <label className="text-sm font-medium mb-2 block">Test Steps</label>
                                <div className="space-y-2 text-sm">
                                  {testCase.steps.map((step, idx) => (
                                    <div key={step.id} className="flex gap-2 p-2 bg-muted/50 rounded">
                                      <span className="font-mono text-muted-foreground">{idx + 1}.</span>
                                      <div>
                                        <p>{step.action}</p>
                                        <p className="text-muted-foreground text-xs">Expected: {step.expectedResult}</p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                          <div className="space-y-4">
                            {runCase.comment && (
                              <div>
                                <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                                  <MessageSquare className="h-4 w-4" />
                                  Comment
                                </label>
                                <p className="text-sm bg-muted/50 p-3 rounded">{runCase.comment}</p>
                              </div>
                            )}
                            {runCase.actualResult && (
                              <div>
                                <label className="text-sm font-medium mb-2 block">Actual Result</label>
                                <p className="text-sm bg-muted/50 p-3 rounded">{runCase.actualResult}</p>
                              </div>
                            )}
                            {runCase.defects && runCase.defects.length > 0 && (
                              <div>
                                <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                                  <Bug className="h-4 w-4" />
                                  Linked Defects
                                </label>
                                <div className="flex gap-2 flex-wrap">
                                  {runCase.defects.map((defect) => (
                                    <Badge key={defect} variant="destructive" className="gap-1">
                                      <Bug className="h-3 w-3" />
                                      {defect}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                            {/* Jira Sync Info */}
                            {testCase?.jiraTicketId && (
                              <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                                <label className="text-sm font-medium flex items-center gap-2">
                                  🔷 Jira Integration
                                </label>
                                <div className="text-xs space-y-1">
                                  <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground">Ticket</span>
                                    <a href={testCase.jiraTicketUrl || '#'} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-1">
                                      {testCase.jiraTicketId} <ExternalLink className="h-3 w-3" />
                                    </a>
                                  </div>
                                  {testCase.jiraSubtaskId && (
                                    <div className="flex items-center justify-between">
                                      <span className="text-muted-foreground">Subtask</span>
                                      <span className="font-mono">{testCase.jiraSubtaskId}</span>
                                    </div>
                                  )}
                                  <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground">Comment sync</span>
                                    <Badge variant="secondary" className="text-xs">
                                      {runCase.status !== 'not_run' ? '✓ Posted' : 'Pending'}
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                            )}
                            {(executedBy || runCase.duration) && (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <User className="h-4 w-4" />
                                {executedBy && `Executed`}
                                {runCase.duration && ` • ${runCase.duration}s`}
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <div className="h-96 overflow-y-auto">
                <div className="divide-y">
                  {history.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      No execution history yet
                    </div>
                  ) : (
                    history.map((item) => {
                      const tcDetails = testRun.testCases.find(tc => tc.testCaseId === item.testCaseId)?.testCase;
                      const statusInfo = statusConfig[item.status];
                      const StatusIcon = statusInfo.icon;

                      return (
                        <div key={item.id} className="flex items-center gap-4 p-4 hover:bg-muted/50">
                          <div className={cn('p-1.5 rounded', statusInfo.className.split(' ')[0])}>
                            <StatusIcon className={cn('h-4 w-4', statusInfo.className.split(' ')[1])} />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium flex items-center gap-2">
                              <span className="font-mono text-xs font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                                {tcDetails?.tcId ?? '—'}
                              </span>
                              {tcDetails?.title ?? item.testCaseId}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(item.executedAt), 'MMM d, yyyy HH:mm')}
                              {item.duration && ` • ${item.duration}s`}
                            </p>
                            {item.comment && (
                              <p className="text-sm text-muted-foreground mt-1">{item.comment}</p>
                            )}
                          </div>
                          <Badge variant="outline" className={statusInfo.className}>
                            {statusInfo.label}
                          </Badge>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Report Tab */}
        <TabsContent value="report" className="mt-4">
          <ReportPanel testRunId={testRun.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

// ─── Automated Case Results (fetches ScriptExecution and shows Result/Logs/Assets) ──

function AutomatedCaseResults({ scriptExecutionId }: { scriptExecutionId: string }) {
  const { data: execution, isLoading } = useScriptExecution(scriptExecutionId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground ml-2">Loading execution results...</span>
      </div>
    );
  }

  if (!execution) {
    return (
      <p className="text-xs text-muted-foreground text-center py-4">Execution data not available</p>
    );
  }

  return <ExecutionResultsPanel execution={execution} />;
}

// ─── Report Panel ────────────────────────────────────────────────────────────

const CHART_COLORS = {
  passed: '#22c55e',
  failed: '#ef4444',
  blocked: '#f97316',
  notRun: '#a1a1aa',
  automated: '#6366f1',
  manual: '#f59e0b',
};

function ReportPanel({ testRunId }: { testRunId: string }) {
  const { data: report, isLoading } = useTestRunReport(testRunId);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-48">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!report) return null;

  const { summary, defects, timeline } = report;

  // Pie chart data — overall pass/fail/blocked/notRun
  const pieData = [
    { name: 'Passed', value: summary.automated.passed + summary.manual.passed, color: CHART_COLORS.passed },
    { name: 'Failed', value: summary.automated.failed + summary.manual.failed, color: CHART_COLORS.failed },
    { name: 'Blocked', value: summary.automated.blocked + summary.manual.blocked, color: CHART_COLORS.blocked },
    { name: 'Not Run', value: summary.automated.notRun + summary.manual.notRun, color: CHART_COLORS.notRun },
  ].filter(d => d.value > 0);

  // Bar chart data — automated vs manual
  const barData = [
    {
      category: 'Automated',
      passed: summary.automated.passed,
      failed: summary.automated.failed,
      blocked: summary.automated.blocked,
      notRun: summary.automated.notRun,
      total: summary.automated.total,
    },
    {
      category: 'Manual',
      passed: summary.manual.passed,
      failed: summary.manual.failed,
      blocked: summary.manual.blocked,
      notRun: summary.manual.notRun,
      total: summary.manual.total,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard label="Total Cases" value={summary.totalCases} />
        <SummaryCard label="Overall Pass Rate" value={`${summary.overallPassRate}%`} className="text-green-600" />
        <SummaryCard label="Automated" value={summary.automated.total} sub={`${summary.automated.passRate}% pass`} />
        <SummaryCard label="Manual" value={summary.manual.total} sub={`${summary.manual.passRate}% pass`} />
      </div>

      {/* Charts Row */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Pass Rate Pie */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" paddingAngle={2} label={({ name, value }) => `${name}: ${value}`}>
                  {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Automated vs Manual Bar */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Automated vs Manual</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={barData}>
                <XAxis dataKey="category" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="passed" name="Passed" fill={CHART_COLORS.passed} stackId="stack" />
                <Bar dataKey="failed" name="Failed" fill={CHART_COLORS.failed} stackId="stack" />
                <Bar dataKey="blocked" name="Blocked" fill={CHART_COLORS.blocked} stackId="stack" />
                <Bar dataKey="notRun" name="Not Run" fill={CHART_COLORS.notRun} stackId="stack" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Duration Summary */}
      {(summary.automated.totalDuration > 0 || summary.manual.totalDuration > 0) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Execution Duration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-xs text-muted-foreground">Total</span>
                <p className="font-semibold">{formatDuration(summary.automated.totalDuration + summary.manual.totalDuration)}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Automated</span>
                <p className="font-semibold">{formatDuration(summary.automated.totalDuration)}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Manual</span>
                <p className="font-semibold">{formatDuration(summary.manual.totalDuration)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Defects */}
      {defects.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <XCircle className="h-4 w-4 text-destructive" /> Defects ({defects.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {defects.map((d: any, i: number) => (
                <div key={i} className="flex items-center gap-3 p-2 rounded border text-sm">
                  <Badge variant="outline" className="font-mono text-xs shrink-0">{d.tcId || '—'}</Badge>
                  <span className="flex-1 truncate">{d.title}</span>
                  <div className="flex gap-1">
                    {d.defects.map((def: string, j: number) => (
                      <Badge key={j} variant="destructive" className="text-xs">{def}</Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Execution Timeline */}
      {timeline.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Execution Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
              {timeline.map((t: any, i: number) => {
                const sc = statusConfig[t.status as TestStatus] || statusConfig.not_run;
                const Icon = sc.icon;
                return (
                  <div key={i} className="flex items-center gap-3 text-sm py-1.5">
                    <span className="text-xs text-muted-foreground w-20 shrink-0 font-mono">
                      {t.executedAt ? format(new Date(t.executedAt), 'HH:mm:ss') : '—'}
                    </span>
                    <Icon className={cn('h-3.5 w-3.5 shrink-0', sc.className.split(' ')[1])} />
                    <Badge variant="outline" className="text-[10px] font-mono shrink-0">{t.tcId || '—'}</Badge>
                    <span className="truncate flex-1">{t.title}</span>
                    <Badge variant={t.executionMode === 'automated' ? 'secondary' : 'outline'} className="text-[10px] shrink-0">
                      {t.executionMode === 'automated' ? '🤖 Auto' : 'Manual'}
                    </Badge>
                    {t.duration != null && (
                      <span className="text-xs text-muted-foreground shrink-0">{t.duration}s</span>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function SummaryCard({ label, value, sub, className }: { label: string; value: string | number; sub?: string; className?: string }) {
  return (
    <Card>
      <CardContent className="pt-4 pb-4">
        <span className="text-xs text-muted-foreground">{label}</span>
        <p className={cn('text-2xl font-bold', className)}>{value}</p>
        {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
      </CardContent>
    </Card>
  );
}

function formatDuration(seconds: number): string {
  if (seconds === 0) return '0s';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `${secs}s`;
  return `${mins}m ${secs}s`;
}
