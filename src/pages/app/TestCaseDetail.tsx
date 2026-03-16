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
import { useTestCase } from '@/hooks/useTestCases';
import { formatDistanceToNow, format } from 'date-fns';

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
  const { data: testCase, isLoading } = useTestCase(id || '');

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
            <span className="font-mono text-sm text-muted-foreground">{testCase.id}</span>
            <StatusBadge status={testCase.status} />
            <PriorityBadge priority={testCase.priority} />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">{testCase.title}</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Pencil className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
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
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
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
                <span className="text-sm">Authentication</span>
              </div>
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
                    <p className="text-xs text-muted-foreground">Bob Wilson</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
