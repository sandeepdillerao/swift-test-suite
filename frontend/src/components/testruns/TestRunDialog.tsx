import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Search, Zap, Users as UsersIcon, Loader2, Info } from 'lucide-react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTestCases } from '@/hooks/useTestCases';
import { useTestSuites } from '@/hooks/useTestSuites';
import { useReleases } from '@/hooks/useReleases';
import { useUsers } from '@/hooks/useUsers';
import { useEnvironments } from '@/hooks/useEnvironments';
import { useSuiteAutomationSummary } from '@/hooks/useTestRuns';
import { useProjectStore } from '@/stores/projectStore';
import type { TestRun } from '@/types';

// ─── Schema ──────────────────────────────────────────────────────────────────

const formSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500).optional(),
  releaseId: z.string().optional(),
  assignedTo: z.string().optional(),
  environmentId: z.string().optional(),
  environment: z.string().max(50).optional(),
  buildNumber: z.string().max(50).optional(),
});

type FormData = z.infer<typeof formSchema>;

// ─── Props ───────────────────────────────────────────────────────────────────

interface TestRunDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  testRun?: TestRun;
  onSave: (data: Record<string, any>) => void;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const PRIORITY_COLORS: Record<string, string> = {
  critical: 'bg-destructive/10 text-destructive',
  high: 'bg-orange-500/10 text-orange-600',
  medium: 'bg-primary/10 text-primary',
  low: 'bg-muted text-muted-foreground',
};

const NONE_VALUE = '__none__';

// ─── Component ───────────────────────────────────────────────────────────────

export const TestRunDialog = ({ open, onOpenChange, testRun, onSave }: TestRunDialogProps) => {
  const { currentProject } = useProjectStore();
  const projectId = currentProject?.id;

  const { data: testCases = [] } = useTestCases(projectId);
  const { data: suites = [] } = useTestSuites(projectId ?? '');
  const { data: releases = [] } = useReleases(projectId);
  const { data: environments = [] } = useEnvironments(projectId);
  const { data: usersData } = useUsers({ limit: 100 });
  const users: any[] = (usersData as any)?.data ?? (usersData as any)?.users ?? (Array.isArray(usersData) ? usersData : []);

  const [selectionMode, setSelectionMode] = useState<'cases' | 'suite'>('cases');
  const [selectedCases, setSelectedCases] = useState<string[]>([]);
  const [selectedSuiteId, setSelectedSuiteId] = useState<string>('');
  const [searchFilter, setSearchFilter] = useState('');
  const [includeManual, setIncludeManual] = useState(true);

  // Automation summary for selected suite
  const { data: automationSummary, isLoading: loadingSummary } = useSuiteAutomationSummary(
    selectionMode === 'suite' && selectedSuiteId ? selectedSuiteId : undefined,
  );

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '', description: '', releaseId: NONE_VALUE,
      assignedTo: NONE_VALUE, environmentId: NONE_VALUE,
      environment: '', buildNumber: '',
    },
  });

  // Reset on open
  useEffect(() => {
    if (!open) return;
    if (testRun) {
      setSelectedCases(testRun.testCases?.map(tc => tc.testCaseId) ?? []);
      setSelectionMode('cases');
      form.reset({
        name: testRun.name,
        description: testRun.description || '',
        releaseId: testRun.releaseId || NONE_VALUE,
        assignedTo: testRun.assignedTo || NONE_VALUE,
        environmentId: testRun.environmentId || NONE_VALUE,
        environment: testRun.environment || '',
        buildNumber: testRun.buildNumber || '',
      });
    } else {
      setSelectedCases([]);
      setSelectedSuiteId('');
      setSearchFilter('');
      setSelectionMode('cases');
      setIncludeManual(true);
      const defaultEnv = environments.find(e => e.isDefault);
      form.reset({
        name: '', description: '', releaseId: NONE_VALUE,
        assignedTo: NONE_VALUE,
        environmentId: defaultEnv?.id || NONE_VALUE,
        environment: '', buildNumber: '',
      });
    }
  }, [open, testRun, form, environments]);

  // ── Filtered test cases ────────────────────────────────────────────────

  const filteredTestCases = useMemo(() => {
    if (!searchFilter.trim()) return testCases;
    const q = searchFilter.toLowerCase();
    return testCases.filter(tc =>
      tc.title.toLowerCase().includes(q) ||
      (tc.tcId && tc.tcId.toLowerCase().includes(q)) ||
      tc.priority.toLowerCase().includes(q) ||
      tc.tags?.some(t => t.toLowerCase().includes(q)),
    );
  }, [testCases, searchFilter]);

  // ── Handlers ───────────────────────────────────────────────────────────

  const toggleTestCase = (id: string) => {
    setSelectedCases(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
  };

  const selectAll = () => setSelectedCases(filteredTestCases.map(tc => tc.id));
  const clearAll = () => setSelectedCases([]);

  const onSubmit = (data: FormData) => {
    if (!projectId) return;

    const base = {
      name: data.name,
      description: data.description || undefined,
      projectId,
      releaseId: data.releaseId === NONE_VALUE ? undefined : data.releaseId,
      assignedTo: data.assignedTo === NONE_VALUE ? undefined : data.assignedTo,
      environmentId: data.environmentId === NONE_VALUE ? undefined : data.environmentId,
      environment: data.environment || undefined,
      buildNumber: data.buildNumber || undefined,
    };

    if (selectionMode === 'suite' && selectedSuiteId) {
      onSave({ ...base, suiteId: selectedSuiteId, includeManualCases: includeManual });
    } else {
      onSave({ ...base, testCaseIds: selectedCases });
    }
    onOpenChange(false);
  };

  const canSubmit = selectionMode === 'suite' ? !!selectedSuiteId : selectedCases.length > 0;

  // ── Selected environment label ─────────────────────────────────────────

  const selectedEnvId = form.watch('environmentId');
  const selectedEnv = environments.find(e => e.id === selectedEnvId);

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
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Run Name *</FormLabel>
                  <FormControl><Input placeholder="e.g., Sprint 25 Regression" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="releaseId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Release</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select release" /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value={NONE_VALUE}>No Release</SelectItem>
                      {releases.map(r => <SelectItem key={r.id} value={r.id}>{r.name} ({r.version})</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            {/* Description */}
            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl><Textarea placeholder="Describe the purpose of this test run..." rows={2} {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            {/* Row 2: Assignee + Environment + Build */}
            <div className="grid grid-cols-3 gap-4">
              <FormField control={form.control} name="assignedTo" render={({ field }) => (
                <FormItem>
                  <FormLabel>Assigned To</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select assignee" /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value={NONE_VALUE}>Unassigned</SelectItem>
                      {(Array.isArray(users) ? users : []).map((u: any) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.firstName && u.lastName ? `${u.firstName} ${u.lastName}` : u.displayName || u.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="environmentId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Environment</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select environment" /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value={NONE_VALUE}>No Environment</SelectItem>
                      {environments.map(env => (
                        <SelectItem key={env.id} value={env.id}>
                          {env.name} {env.isDefault && '(Default)'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedEnv && (
                    <p className="text-xs text-muted-foreground truncate">{selectedEnv.baseUrl}</p>
                  )}
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="buildNumber" render={({ field }) => (
                <FormItem>
                  <FormLabel>Build Number</FormLabel>
                  <FormControl><Input placeholder="e.g., build-2024.01.15.1" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            {/* Test Case Selection — Tabs: Individual Cases / From Suite */}
            <div className="space-y-3">
              <FormLabel className="text-base">Select Test Cases</FormLabel>

              <Tabs value={selectionMode} onValueChange={(v) => setSelectionMode(v as typeof selectionMode)}>
                <TabsList className="h-9">
                  <TabsTrigger value="cases" className="gap-1.5 text-xs">
                    <UsersIcon className="h-3.5 w-3.5" /> Individual Cases
                  </TabsTrigger>
                  <TabsTrigger value="suite" className="gap-1.5 text-xs">
                    <Zap className="h-3.5 w-3.5" /> From Suite
                  </TabsTrigger>
                </TabsList>

                {/* Individual Case Selection */}
                <TabsContent value="cases" className="mt-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      {selectedCases.length} of {testCases.length} selected
                    </span>
                    <div className="space-x-2">
                      <Button type="button" variant="outline" size="sm" onClick={selectAll}>Select All</Button>
                      <Button type="button" variant="outline" size="sm" onClick={clearAll}>Clear</Button>
                    </div>
                  </div>

                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Filter by title, ID, priority, or tag..."
                      value={searchFilter}
                      onChange={(e) => setSearchFilter(e.target.value)}
                      className="pl-8 h-9 text-sm"
                    />
                  </div>

                  <TestCaseList
                    testCases={filteredTestCases}
                    selectedCases={selectedCases}
                    onToggle={toggleTestCase}
                    searchFilter={searchFilter}
                  />
                </TabsContent>

                {/* Suite Selection */}
                <TabsContent value="suite" className="mt-3 space-y-3">
                  <div className="space-y-2">
                    <FormLabel className="text-sm">Select Suite</FormLabel>
                    <Select value={selectedSuiteId} onValueChange={setSelectedSuiteId}>
                      <SelectTrigger><SelectValue placeholder="Choose a test suite..." /></SelectTrigger>
                      <SelectContent>
                        {suites.map(s => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Automation Summary */}
                  {selectedSuiteId && (
                    <AutomationSummaryCard
                      summary={automationSummary}
                      isLoading={loadingSummary}
                      includeManual={includeManual}
                      onIncludeManualChange={setIncludeManual}
                    />
                  )}
                </TabsContent>
              </Tabs>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={!canSubmit}>
                {testRun ? 'Update Run' : 'Create Run'}
                {selectionMode === 'cases' && selectedCases.length > 0 && ` (${selectedCases.length} cases)`}
                {selectionMode === 'suite' && automationSummary && ` (${automationSummary.totalCases} cases)`}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

// ─── Test Case List ──────────────────────────────────────────────────────────

function TestCaseList({ testCases, selectedCases, onToggle, searchFilter }: {
  testCases: any[];
  selectedCases: string[];
  onToggle: (id: string) => void;
  searchFilter: string;
}) {
  if (testCases.length === 0) {
    return (
      <div className="h-56 border rounded-lg flex items-center justify-center text-sm text-muted-foreground">
        {searchFilter ? 'No test cases match your filter' : 'No test cases available'}
      </div>
    );
  }

  return (
    <div className="h-56 overflow-y-auto border rounded-lg divide-y">
      {testCases.map(tc => (
        <div
          key={tc.id}
          className="flex items-center gap-3 px-3 py-2 hover:bg-muted/50 cursor-pointer transition-colors"
          onClick={() => onToggle(tc.id)}
        >
          <Checkbox
            checked={selectedCases.includes(tc.id)}
            onCheckedChange={() => onToggle(tc.id)}
            onClick={(e) => e.stopPropagation()}
          />
          <span className="text-xs font-mono text-muted-foreground w-16 shrink-0">
            {tc.tcId || tc.id.slice(0, 8)}
          </span>
          <span className="text-sm flex-1 truncate">{tc.title}</span>
          <Badge variant="outline" className={`text-[10px] h-5 px-1.5 ${PRIORITY_COLORS[tc.priority] || ''}`}>
            {tc.priority}
          </Badge>
          <Badge variant={tc.type === 'automated' ? 'default' : 'outline'} className="text-[10px] h-5 px-1.5">
            {tc.type === 'automated' ? '🤖 Auto' : tc.type}
          </Badge>
        </div>
      ))}
    </div>
  );
}

// ─── Automation Summary Card ─────────────────────────────────────────────────

function AutomationSummaryCard({ summary, isLoading, includeManual, onIncludeManualChange }: {
  summary: any;
  isLoading: boolean;
  includeManual: boolean;
  onIncludeManualChange: (v: boolean) => void;
}) {
  if (isLoading) {
    return (
      <div className="border rounded-lg p-4 flex items-center justify-center">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mr-2" />
        <span className="text-sm text-muted-foreground">Analyzing suite...</span>
      </div>
    );
  }

  if (!summary) return null;

  const { totalCases, automatedCases, manualCases } = summary;

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Info className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">Automation Readiness</span>
      </div>

      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="p-2 rounded bg-muted/50">
          <p className="text-lg font-bold">{totalCases}</p>
          <p className="text-xs text-muted-foreground">Total</p>
        </div>
        <div className="p-2 rounded bg-green-500/10">
          <p className="text-lg font-bold text-green-600">{automatedCases.length}</p>
          <p className="text-xs text-green-600">Automated</p>
        </div>
        <div className="p-2 rounded bg-amber-500/10">
          <p className="text-lg font-bold text-amber-600">{manualCases.length}</p>
          <p className="text-xs text-amber-600">Manual</p>
        </div>
      </div>

      {manualCases.length > 0 && (
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <Checkbox checked={includeManual} onCheckedChange={(v) => onIncludeManualChange(!!v)} />
          Include manual test cases
          <span className="text-xs text-muted-foreground">
            ({manualCases.length} cases without passing automation scripts)
          </span>
        </label>
      )}

      <p className="text-xs text-muted-foreground">
        Automated test cases will run automatically when you execute the test run. Manual cases require manual testing.
      </p>
    </div>
  );
}
