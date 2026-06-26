import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FolderTree,
  Plus,
  ChevronRight,
  TestTube2,
  MoreHorizontal,
  Pencil,
  Trash2,
  Sparkles,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { TestSuiteDialog } from '@/components/testsuites/TestSuiteDialog';
import { DeleteConfirmDialog } from '@/components/testcases/DeleteConfirmDialog';
import { useTestSuites, useCreateTestSuite, useUpdateTestSuite, useDeleteTestSuite } from '@/hooks/useTestSuites';
import { useProjectStore } from '@/stores/projectStore';
import { cn } from '@/lib/utils';
import type { TestSuite } from '@/types';
import { toast } from 'sonner';
import { usePermissions } from '@/hooks/usePermissions';
import { CanShow } from '@/components/auth/PermissionGuard';

export const TestSuites = () => {
  const navigate = useNavigate();
  const { can } = usePermissions();
  const { currentProject } = useProjectStore();
  const projectId = currentProject?.id ?? '';
  const { data: suites = [], isLoading } = useTestSuites(projectId);
  const createSuite = useCreateTestSuite();
  const updateSuite = useUpdateTestSuite();
  const deleteSuite = useDeleteTestSuite();

  const [selectedSuite, setSelectedSuite] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSuite, setEditingSuite] = useState<TestSuite | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingSuite, setDeletingSuite] = useState<TestSuite | null>(null);

  const handleCreate = () => {
    setEditingSuite(null);
    setDialogOpen(true);
  };

  const handleEdit = (suite: TestSuite) => {
    setEditingSuite(suite);
    setDialogOpen(true);
  };

  const handleView = (suite: TestSuite) => {
    navigate(`/app/test-suites/${suite.id}`);
  };

  const handleDelete = (suite: TestSuite) => {
    setDeletingSuite(suite);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (deletingSuite) {
      deleteSuite.mutate(deletingSuite.id, {
        onSuccess: () => toast.success('Test suite deleted'),
        onError: () => toast.error('Failed to delete test suite'),
      });
    }
    setDeleteDialogOpen(false);
    setDeletingSuite(null);
  };

  const handleSave = (data: Partial<TestSuite>) => {
    if (editingSuite) {
      updateSuite.mutate(
        { id: editingSuite.id, data },
        { onSuccess: () => toast.success('Test suite updated'), onError: () => toast.error('Failed to update') },
      );
    } else {
      createSuite.mutate(
        { ...data, projectId },
        { onSuccess: () => toast.success('Test suite created'), onError: () => toast.error('Failed to create') },
      );
    }
  };


  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Test Suites</h1>
          <p className="text-muted-foreground">
            Organize test cases into logical groups
          </p>
        </div>
        <div className="flex items-center gap-2">
          <CanShow permission="test_suites:create">
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => navigate('/app/test-suites/generate-from-recording')}
              disabled={!projectId}
            >
              <Sparkles className="h-4 w-4 text-primary" />
              Generate from Recording
            </Button>
            <Button className="gap-2" onClick={handleCreate} disabled={!projectId}>
              <Plus className="h-4 w-4" />
              New Suite
            </Button>
          </CanShow>
        </div>
      </div>

      {!projectId && (
        <Card className="flex flex-col items-center justify-center py-8">
          <FolderTree className="h-10 w-10 text-muted-foreground mb-3" />
          <p className="text-muted-foreground text-sm">Select a project to view test suites</p>
        </Card>
      )}

      {/* Suites Grid */}
      {projectId && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {suites.map((suite) => (
            <Card
              key={suite.id}
              className={cn(
                'cursor-pointer transition-all hover:shadow-md',
                selectedSuite === suite.id && 'ring-2 ring-primary'
              )}
              onClick={() => setSelectedSuite(suite.id)}
            >
              <CardHeader className="flex flex-row items-start justify-between pb-2">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <FolderTree className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{suite.name}</CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {suite.testCasesCount ?? 0} test cases
                    </p>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleView(suite)}>
                      <ChevronRight className="mr-2 h-4 w-4" />
                      View Details
                    </DropdownMenuItem>
                    {can('test_suites:update') && (
                      <DropdownMenuItem onClick={() => handleEdit(suite)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                    )}
                    {can('test_suites:delete') && (
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => handleDelete(suite)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {suite.description}
                </p>
                {suite.variables && Object.keys(suite.variables).length > 0 && (
                  <p className="text-xs text-muted-foreground mt-2">
                    {Object.keys(suite.variables).length} suite variable{Object.keys(suite.variables).length !== 1 ? 's' : ''}
                  </p>
                )}
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <TestTube2 className="h-4 w-4" />
                    <span>{suite.testCasesCount ?? 0} cases</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleView(suite);
                    }}
                  >
                    View
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {projectId && suites.length === 0 && (
        <Card className="flex flex-col items-center justify-center py-12">
          <FolderTree className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">No test suites yet</h3>
          <p className="text-muted-foreground text-sm mt-1">
            Create manually or generate one from a Playwright recording
          </p>
          <CanShow permission="test_suites:create">
            <div className="flex items-center gap-3 mt-4">
              <Button variant="outline" className="gap-2" onClick={() => navigate('/app/test-suites/generate-from-recording')}>
                <Sparkles className="h-4 w-4 text-primary" />
                Generate from Recording
              </Button>
              <Button className="gap-2" onClick={handleCreate}>
                <Plus className="h-4 w-4" />
                Create Suite
              </Button>
            </div>
          </CanShow>
        </Card>
      )}

      {/* Create/Edit Dialog */}
      <TestSuiteDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        suite={editingSuite}
        suites={suites}
        onSave={handleSave}
      />

      {/* Delete Confirmation */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Test Suite"
        description={`Are you sure you want to delete "${deletingSuite?.name}"? This will not delete the test cases in this suite.`}
        onConfirm={confirmDelete}
      />
    </div>
  );
};
