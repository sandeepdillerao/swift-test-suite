import { useState } from 'react';
import { 
  Play, 
  Plus, 
  CheckCircle2,
  Clock,
  Archive,
  MoreHorizontal,
  Eye,
  Trash2,
  Users
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTestRuns } from '@/hooks/useTestRuns';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

const statusConfig = {
  active: { label: 'Active', className: 'bg-primary/10 text-primary', icon: Play },
  completed: { label: 'Completed', className: 'bg-success/10 text-success', icon: CheckCircle2 },
  archived: { label: 'Archived', className: 'bg-muted text-muted-foreground', icon: Archive },
};

export const TestRuns = () => {
  const { data: testRuns = [], isLoading } = useTestRuns();

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
          <h1 className="text-2xl font-semibold tracking-tight">Test Runs</h1>
          <p className="text-muted-foreground">
            Execute and track test execution progress
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          New Test Run
        </Button>
      </div>

      {/* Test Runs List */}
      <div className="space-y-4">
        {testRuns.map((run) => {
          const statusInfo = statusConfig[run.status];
          const StatusIcon = statusInfo.icon;
          
          return (
            <Card key={run.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div className={cn('p-2.5 rounded-lg', statusInfo.className.split(' ')[0])}>
                      <StatusIcon className={cn('h-5 w-5', statusInfo.className.split(' ')[1])} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-semibold text-lg">{run.name}</h3>
                        <Badge variant="outline" className={statusInfo.className}>
                          {statusInfo.label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          Started {formatDistanceToNow(new Date(run.startedAt), { addSuffix: true })}
                        </span>
                        {run.completedAt && (
                          <span className="flex items-center gap-1">
                            <CheckCircle2 className="h-4 w-4" />
                            Completed {formatDistanceToNow(new Date(run.completedAt), { addSuffix: true })}
                          </span>
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
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mt-4 pt-4 border-t">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Progress</span>
                    <span className="text-sm text-muted-foreground">{run.passRate}% complete</span>
                  </div>
                  <Progress value={run.passRate} className="h-2" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Empty State */}
      {testRuns.length === 0 && (
        <Card className="flex flex-col items-center justify-center py-12">
          <Play className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">No test runs yet</h3>
          <p className="text-muted-foreground text-sm mt-1">
            Start a new test run to execute your test cases
          </p>
          <Button className="mt-4 gap-2">
            <Plus className="h-4 w-4" />
            Start Test Run
          </Button>
        </Card>
      )}
    </div>
  );
};
