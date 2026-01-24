import { useState } from 'react';
import { 
  FolderTree, 
  Plus, 
  ChevronRight,
  TestTube2,
  MoreHorizontal,
  Pencil,
  Trash2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTestSuites } from '@/hooks/useTestSuites';
import { cn } from '@/lib/utils';

export const TestSuites = () => {
  const { data: suites = [], isLoading } = useTestSuites('1');
  const [selectedSuite, setSelectedSuite] = useState<string | null>(null);

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
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          New Suite
        </Button>
      </div>

      {/* Suites Grid */}
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
                    {suite.testCasesCount} test cases
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
                  <DropdownMenuItem>
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-destructive">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground line-clamp-2">
                {suite.description}
              </p>
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <TestTube2 className="h-4 w-4" />
                  <span>{suite.testCasesCount} cases</span>
                </div>
                <Button variant="ghost" size="sm" className="gap-1">
                  View
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {suites.length === 0 && (
        <Card className="flex flex-col items-center justify-center py-12">
          <FolderTree className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">No test suites yet</h3>
          <p className="text-muted-foreground text-sm mt-1">
            Create your first test suite to organize your test cases
          </p>
          <Button className="mt-4 gap-2">
            <Plus className="h-4 w-4" />
            Create Suite
          </Button>
        </Card>
      )}
    </div>
  );
};
