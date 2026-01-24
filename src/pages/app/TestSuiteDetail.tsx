import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Pencil, 
  Trash2, 
  Plus,
  TestTube2,
  FolderTree,
  Calendar
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatusBadge, PriorityBadge } from '@/components/StatusBadge';
import { useTestSuite } from '@/hooks/useTestSuites';
import { useTestCases } from '@/hooks/useTestCases';
import { format } from 'date-fns';

export const TestSuiteDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: suite, isLoading: suiteLoading } = useTestSuite(id || '');
  const { data: testCases = [], isLoading: casesLoading } = useTestCases('1', id);

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
              <div className="p-2 rounded-lg bg-success/10">
                <TestTube2 className="h-5 w-5 text-success" />
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
              <div className="p-2 rounded-lg bg-warning/10">
                <TestTube2 className="h-5 w-5 text-warning" />
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
          <Button size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            Add Test Case
          </Button>
        </CardHeader>
        <CardContent>
          {testCases.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <TestTube2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No test cases in this suite yet</p>
              <Button className="mt-4 gap-2" variant="outline">
                <Plus className="h-4 w-4" />
                Create First Test Case
              </Button>
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
                    <span className="font-mono text-xs text-muted-foreground w-16">
                      {tc.id}
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
    </div>
  );
};
