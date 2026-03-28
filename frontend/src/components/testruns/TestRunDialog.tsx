import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Search } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { useTestCases } from '@/hooks/useTestCases';
import { useReleases } from '@/hooks/useReleases';
import { useUsers } from '@/hooks/useUsers';
import { useProjectStore } from '@/stores/projectStore';
import type { TestRun } from '@/types';

const formSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500).optional(),
  releaseId: z.string().optional(),
  assignedTo: z.string().optional(),
  environment: z.string().max(50).optional(),
  buildNumber: z.string().max(50).optional(),
});

type FormData = z.infer<typeof formSchema>;

interface TestRunDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  testRun?: TestRun;
  onSave: (data: Record<string, any>) => void;
}

export const TestRunDialog = ({ open, onOpenChange, testRun, onSave }: TestRunDialogProps) => {
  const { currentProject } = useProjectStore();
  const projectId = currentProject?.id;
  const { data: testCases = [] } = useTestCases(projectId);
  const { data: releases = [] } = useReleases(projectId);
  const { data: usersData } = useUsers({ limit: 100 });
  const users: any[] = (usersData as any)?.data ?? (usersData as any)?.users ?? (Array.isArray(usersData) ? usersData : []);

  const [selectedCases, setSelectedCases] = useState<string[]>([]);
  const [searchFilter, setSearchFilter] = useState('');

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
      releaseId: '__none__',
      assignedTo: '__none__',
      environment: '',
      buildNumber: '',
    },
  });

  useEffect(() => {
    if (!open) return;
    if (testRun) {
      const caseIds = testRun.testCases?.map(tc => tc.testCaseId) ?? [];
      setSelectedCases(caseIds);
      form.reset({
        name: testRun.name,
        description: testRun.description || '',
        releaseId: testRun.releaseId || '__none__',
        assignedTo: testRun.assignedTo || '__none__',
        environment: testRun.environment || '',
        buildNumber: testRun.buildNumber || '',
      });
    } else {
      setSelectedCases([]);
      setSearchFilter('');
      form.reset({
        name: '',
        description: '',
        releaseId: '__none__',
        assignedTo: '__none__',
        environment: '',
        buildNumber: '',
      });
    }
  }, [open, testRun, form]);

  const toggleTestCase = (id: string) => {
    setSelectedCases(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id],
    );
  };

  const selectAll = () => setSelectedCases(filteredTestCases.map(tc => tc.id));
  const clearAll = () => setSelectedCases([]);

  const filteredTestCases = useMemo(() => {
    if (!searchFilter.trim()) return testCases;
    const q = searchFilter.toLowerCase();
    return testCases.filter(
      tc =>
        tc.title.toLowerCase().includes(q) ||
        (tc.tcId && tc.tcId.toLowerCase().includes(q)) ||
        tc.priority.toLowerCase().includes(q) ||
        tc.tags?.some(t => t.toLowerCase().includes(q)),
    );
  }, [testCases, searchFilter]);

  const onSubmit = (data: FormData) => {
    if (!projectId) return;

    // Send the shape the backend CreateTestRunDto expects
    onSave({
      name: data.name,
      description: data.description || undefined,
      projectId,
      releaseId: data.releaseId === '__none__' ? undefined : data.releaseId,
      assignedTo: data.assignedTo === '__none__' ? undefined : data.assignedTo,
      environment: data.environment || undefined,
      buildNumber: data.buildNumber || undefined,
      testCaseIds: selectedCases,
    });
    onOpenChange(false);
  };

  const priorityColors: Record<string, string> = {
    critical: 'bg-destructive/10 text-destructive',
    high: 'bg-orange-500/10 text-orange-600',
    medium: 'bg-primary/10 text-primary',
    low: 'bg-muted text-muted-foreground',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{testRun ? 'Edit Test Run' : 'Create New Test Run'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 overflow-y-auto flex-1 pr-1">
            {/* Row 1: Name + Release */}
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

            {/* Description */}
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

            {/* Row 2: Assignee + Env + Build */}
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
                        {(Array.isArray(users) ? users : []).map((user: any) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.name || user.email}
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
                <FormLabel className="text-base">
                  Select Test Cases
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    ({selectedCases.length} of {testCases.length} selected)
                  </span>
                </FormLabel>
                <div className="space-x-2">
                  <Button type="button" variant="outline" size="sm" onClick={selectAll}>
                    Select All
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={clearAll}>
                    Clear
                  </Button>
                </div>
              </div>

              {/* Search filter */}
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Filter test cases by title, ID, priority, or tag..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="pl-8 h-9 text-sm"
                />
              </div>

              <div className="h-56 overflow-y-auto border rounded-lg">
                {filteredTestCases.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                    {searchFilter ? 'No test cases match your filter' : 'No test cases available'}
                  </div>
                ) : (
                  <div className="divide-y">
                    {filteredTestCases.map((tc) => (
                      <div
                        key={tc.id}
                        className="flex items-center gap-3 px-3 py-2 hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => toggleTestCase(tc.id)}
                      >
                        <Checkbox
                          checked={selectedCases.includes(tc.id)}
                          onCheckedChange={() => toggleTestCase(tc.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <span className="text-xs font-mono text-muted-foreground w-16 shrink-0">
                          {tc.tcId || tc.id.slice(0, 8)}
                        </span>
                        <span className="text-sm flex-1 truncate">{tc.title}</span>
                        <Badge variant="outline" className={`text-[10px] h-5 px-1.5 ${priorityColors[tc.priority] || ''}`}>
                          {tc.priority}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] h-5 px-1.5">
                          {tc.type}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={selectedCases.length === 0}>
                {testRun ? 'Update Run' : 'Create Run'}
                {selectedCases.length > 0 && ` (${selectedCases.length} cases)`}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
