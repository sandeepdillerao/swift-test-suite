import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import type { TestRun, TestCase, Release, User, TestRunCase } from '@/types';
import { useTestCases } from '@/hooks/useTestCases';
import { useReleases } from '@/hooks/useReleases';
import { mockUsers } from '@/lib/mock-data';

const formSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500).optional(),
  releaseId: z.string().optional(),
  assignedTo: z.string().optional(),
  environment: z.string().max(50).optional(),
  buildNumber: z.string().max(50).optional(),
  testCaseIds: z.array(z.string()),
});

type FormData = z.infer<typeof formSchema>;

interface TestRunDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  testRun?: TestRun;
  onSave: (data: Partial<TestRun>) => void;
}

export const TestRunDialog = ({ open, onOpenChange, testRun, onSave }: TestRunDialogProps) => {
  const { data: testCases = [] } = useTestCases('1');
  const { data: releases = [] } = useReleases('1');
  const [selectedCases, setSelectedCases] = useState<string[]>([]);
  
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
      releaseId: '__none__',
      assignedTo: '__none__',
      environment: '',
      buildNumber: '',
      testCaseIds: [],
    },
  });

  useEffect(() => {
    if (testRun) {
      const caseIds = testRun.testCases.map(tc => tc.testCaseId);
      setSelectedCases(caseIds);
      form.reset({
        name: testRun.name,
        description: testRun.description || '',
        releaseId: testRun.releaseId || '__none__',
        assignedTo: testRun.assignedTo || '__none__',
        environment: testRun.environment || '',
        buildNumber: testRun.buildNumber || '',
        testCaseIds: caseIds,
      });
    } else {
      setSelectedCases([]);
      form.reset({
        name: '',
        description: '',
        releaseId: '__none__',
        assignedTo: '__none__',
        environment: '',
        buildNumber: '',
        testCaseIds: [],
      });
    }
  }, [testRun, form]);

  const toggleTestCase = (id: string) => {
    setSelectedCases(prev => {
      const newSelection = prev.includes(id) 
        ? prev.filter(c => c !== id) 
        : [...prev, id];
      form.setValue('testCaseIds', newSelection);
      return newSelection;
    });
  };

  const selectAll = () => {
    const allIds = testCases.map(tc => tc.id);
    setSelectedCases(allIds);
    form.setValue('testCaseIds', allIds);
  };

  const clearAll = () => {
    setSelectedCases([]);
    form.setValue('testCaseIds', []);
  };

  const onSubmit = (data: FormData) => {
    const testRunCases: TestRunCase[] = data.testCaseIds.map(tcId => ({
      id: `trc-new-${tcId}`,
      testCaseId: tcId,
      testRunId: testRun?.id || 'new',
      status: 'not_run' as const,
    }));

    onSave({
      ...data,
      projectId: '1',
      releaseId: data.releaseId === '__none__' ? undefined : data.releaseId,
      assignedTo: data.assignedTo === '__none__' ? undefined : data.assignedTo,
      testCases: testRunCases,
    });
    onOpenChange(false);
  };

  const priorityColors = {
    critical: 'bg-destructive/10 text-destructive',
    high: 'bg-orange-500/10 text-orange-600',
    medium: 'bg-primary/10 text-primary',
    low: 'bg-muted text-muted-foreground',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{testRun ? 'Edit Test Run' : 'Create New Test Run'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Run Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Sprint 25 Regression" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="releaseId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Release</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select release" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="__none__">No Release</SelectItem>
                        {releases.map((release) => (
                          <SelectItem key={release.id} value={release.id}>
                            {release.name} ({release.version})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Describe the purpose of this test run..." 
                      rows={2}
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="assignedTo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assigned To</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select assignee" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="__none__">Unassigned</SelectItem>
                        {mockUsers.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="environment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Environment</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Staging, Production" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="buildNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Build Number</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., build-2024.01.15.1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Test Case Selection */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <FormLabel>Select Test Cases ({selectedCases.length} selected)</FormLabel>
                <div className="space-x-2">
                  <Button type="button" variant="outline" size="sm" onClick={selectAll}>
                    Select All
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={clearAll}>
                    Clear
                  </Button>
                </div>
              </div>
              <ScrollArea className="h-64 border rounded-lg p-4">
                <div className="space-y-2">
                  {testCases.map((tc) => (
                    <div 
                      key={tc.id} 
                      className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 cursor-pointer"
                      onClick={() => toggleTestCase(tc.id)}
                    >
                      <Checkbox 
                        checked={selectedCases.includes(tc.id)}
                        onCheckedChange={() => toggleTestCase(tc.id)}
                      />
                      <span className="text-sm font-mono text-muted-foreground">{tc.id}</span>
                      <span className="text-sm flex-1">{tc.title}</span>
                      <Badge variant="outline" className={priorityColors[tc.priority]}>
                        {tc.priority}
                      </Badge>
                      <Badge variant="outline">
                        {tc.type}
                      </Badge>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={selectedCases.length === 0}>
                {testRun ? 'Update Run' : 'Create Run'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
