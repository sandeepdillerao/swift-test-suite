import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Sparkles, Check, Loader2, ArrowLeft,
  Plus, Trash2, GripVertical, Pencil, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useAiGenerationStore, type GeneratedTestCase } from '@/stores/aiGenerationStore';
import { useSaveGeneratedTestCases } from '@/hooks/useIntegrations';
import type { TestStep } from '@/types';

// --- Schema ---

const editSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(2000).optional(),
  preconditions: z.string().max(1000).optional(),
  expectedResult: z.string().max(1000).optional(),
  priority: z.enum(['critical', 'high', 'medium', 'low']),
  type: z.enum(['manual', 'automated']),
  tags: z.string().optional(),
});

type EditFormData = z.infer<typeof editSchema>;

// --- Component ---

export default function AiReviewPage() {
  const navigate = useNavigate();
  const {
    jiraIssue, generatedTestCases, projectId, suiteId, suites,
    createSubtask, toggleSelect, selectAll, updateTestCase, markCreated,
    setSuiteId, setCreateSubtask, clear,
  } = useAiGenerationStore();

  const saveMutation = useSaveGeneratedTestCases();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editSteps, setEditSteps] = useState<TestStep[]>([]);
  const [selectedSuiteId, setSelectedSuiteId] = useState(suiteId || suites[0]?.id || '');

  // Redirect if no data
  if (!jiraIssue || generatedTestCases.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <Sparkles className="h-12 w-12 text-muted-foreground/30" />
        <p className="text-muted-foreground">No AI-generated test cases to review.</p>
        <Button variant="outline" onClick={() => navigate('/app/test-cases')}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Test Cases
        </Button>
      </div>
    );
  }

  const selectedCount = generatedTestCases.filter(g => g.selected && !g.created).length;
  const createdCount = generatedTestCases.filter(g => g.created).length;
  const allDone = createdCount === generatedTestCases.length;

  const handleSuiteChange = (val: string) => {
    setSelectedSuiteId(val);
    setSuiteId(val);
  };

  const handleCreateAllSelected = async () => {
    const selected = generatedTestCases.filter(g => g.selected && !g.created);
    const resolvedSuiteId = selectedSuiteId || suites[0]?.id;

    if (!resolvedSuiteId) {
      toast.error('Please select a test suite first');
      return;
    }

    try {
      await saveMutation.mutateAsync({
        projectId,
        suiteId: resolvedSuiteId,
        jiraIssueKey: jiraIssue.key,
        createSubtask,
        testCases: selected.map(({ id, selected: _s, created: _c, ...rest }) => rest),
      });
      toast.success(`${selected.length} test case${selected.length !== 1 ? 's' : ''} created and linked to ${jiraIssue.key}`);
      markCreated(selected.map(g => g.id));
    } catch (err: any) {
      toast.error(err.message || 'Failed to save test cases');
    }
  };

  const handleDone = () => {
    clear();
    navigate('/app/test-cases');
  };

  const openEdit = (tc: GeneratedTestCase) => {
    setEditingId(tc.id);
    setEditSteps(tc.steps.map((s, i) => ({ ...s, id: s.id || String(Date.now() + i), order: i + 1 })));
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => { clear(); navigate(-1); }}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <Separator orientation="vertical" className="h-6" />
            <div>
              <h1 className="text-lg font-semibold flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                AI Generated Test Cases
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Review, edit, and create test cases from <span className="font-mono font-medium">{jiraIssue.key}</span>
                {jiraIssue.summary && <> — {jiraIssue.summary}</>}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              {generatedTestCases.length} generated · {selectedCount} selected
              {createdCount > 0 && <span className="text-green-600"> · {createdCount} created</span>}
            </span>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="border-b px-6 py-3 flex items-center gap-4 flex-wrap bg-muted/30">
        <div className="flex items-center gap-2">
          <Label className="text-sm font-medium whitespace-nowrap">Suite:</Label>
          <Select value={selectedSuiteId} onValueChange={handleSuiteChange}>
            <SelectTrigger className="h-8 text-sm w-[200px]">
              <SelectValue placeholder="Select suite" />
            </SelectTrigger>
            <SelectContent>
              {suites.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Separator orientation="vertical" className="h-6" />

        <div className="flex items-center gap-2">
          <Switch
            id="create-subtask"
            checked={createSubtask}
            onCheckedChange={setCreateSubtask}
          />
          <Label htmlFor="create-subtask" className="text-sm cursor-pointer">
            Create Jira subtask for each test case
          </Label>
        </div>

        <div className="flex-1" />

        <Button variant="outline" size="sm" onClick={selectAll}>
          Select All
        </Button>

        {allDone ? (
          <Button size="sm" onClick={handleDone} className="gap-2">
            <Check className="h-4 w-4" /> Done
          </Button>
        ) : (
          <Button
            size="sm"
            onClick={handleCreateAllSelected}
            disabled={selectedCount === 0 || !selectedSuiteId || saveMutation.isPending}
            className="gap-2"
          >
            {saveMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            Create {selectedCount} Selected
          </Button>
        )}
      </div>

      {/* Test case cards grid */}
      <ScrollArea className="flex-1">
        <div className="p-6 grid gap-4 grid-cols-1 lg:grid-cols-2">
          {generatedTestCases.map((tc) => (
            <TestCaseCard
              key={tc.id}
              tc={tc}
              onToggle={() => toggleSelect(tc.id)}
              onEdit={() => openEdit(tc)}
            />
          ))}
        </div>
      </ScrollArea>

      {/* Edit sheet */}
      {editingId && (
        <EditSheet
          tc={generatedTestCases.find(g => g.id === editingId)!}
          steps={editSteps}
          setSteps={setEditSteps}
          suites={suites}
          selectedSuiteId={selectedSuiteId}
          onSave={(id, updates, steps) => {
            updateTestCase(id, { ...updates, steps });
            setEditingId(null);
          }}
          onClose={() => setEditingId(null)}
        />
      )}
    </div>
  );
}

// --- TestCaseCard ---

function TestCaseCard({ tc, onToggle, onEdit }: { tc: GeneratedTestCase; onToggle: () => void; onEdit: () => void }) {
  return (
    <Card className={cn(
      'transition-all',
      tc.created && 'opacity-60 border-green-200 bg-green-50/30 dark:bg-green-950/10',
      tc.selected && !tc.created && 'ring-1 ring-primary/20',
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          {tc.created ? (
            <Check className="h-4 w-4 text-green-600 mt-1 shrink-0" />
          ) : (
            <Checkbox
              checked={tc.selected}
              onCheckedChange={onToggle}
              className="mt-1"
            />
          )}
          <div className="flex-1 min-w-0">
            <CardTitle className="text-sm font-semibold leading-snug">{tc.title}</CardTitle>
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              <Badge variant="outline" className="text-[10px] capitalize h-5 px-1.5">{tc.priority}</Badge>
              <Badge variant="secondary" className="text-[10px] h-5 px-1.5">{tc.type}</Badge>
              <span className="text-[10px] text-muted-foreground">{tc.steps.length} steps</span>
              {tc.tags.map(tag => (
                <Badge key={tag} variant="secondary" className="text-[10px] h-5 px-1.5">{tag}</Badge>
              ))}
              {tc.created && <Badge className="bg-green-100 text-green-700 border-green-200 text-[10px] h-5 px-1.5">Created</Badge>}
            </div>
          </div>
          {!tc.created && (
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onEdit}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        {tc.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{tc.description}</p>
        )}

        {/* Steps preview */}
        <div className="border rounded-md overflow-hidden">
          <div className="grid grid-cols-[32px_1fr_1fr] text-[10px] font-medium text-muted-foreground bg-muted/50 px-2 py-1.5">
            <span>#</span>
            <span>Action</span>
            <span>Expected</span>
          </div>
          <div className="divide-y max-h-[120px] overflow-y-auto">
            {tc.steps.slice(0, 4).map((step, i) => (
              <div key={step.id} className="grid grid-cols-[32px_1fr_1fr] px-2 py-1.5 text-xs">
                <span className="font-mono text-[10px] text-muted-foreground">{i + 1}</span>
                <p className="pr-2 line-clamp-1">{step.action}</p>
                <p className="line-clamp-1 text-muted-foreground">{step.expectedResult}</p>
              </div>
            ))}
            {tc.steps.length > 4 && (
              <div className="px-2 py-1 text-[10px] text-muted-foreground text-center">
                +{tc.steps.length - 4} more steps
              </div>
            )}
          </div>
        </div>

        {tc.expectedResult && (
          <div className="text-xs">
            <span className="font-medium text-muted-foreground">Expected: </span>
            <span className="line-clamp-1">{tc.expectedResult}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// --- EditSheet ---

function EditSheet({
  tc, steps, setSteps, suites, selectedSuiteId, onSave, onClose,
}: {
  tc: GeneratedTestCase;
  steps: TestStep[];
  setSteps: (s: TestStep[]) => void;
  suites: { id: string; name: string }[];
  selectedSuiteId: string;
  onSave: (id: string, updates: Partial<GeneratedTestCase>, steps: TestStep[]) => void;
  onClose: () => void;
}) {
  const form = useForm<EditFormData>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      title: tc.title,
      description: tc.description || '',
      preconditions: tc.preconditions || '',
      expectedResult: tc.expectedResult || '',
      priority: (['critical', 'high', 'medium', 'low'].includes(tc.priority) ? tc.priority : 'medium') as any,
      type: (tc.type === 'automated' ? 'automated' : 'manual') as any,
      tags: tc.tags?.join(', ') || '',
    },
  });

  const addStep = () => {
    setSteps([...steps, { id: String(Date.now()), order: steps.length + 1, action: '', expectedResult: '' }]);
  };

  const updateStep = (id: string, field: 'action' | 'expectedResult', value: string) => {
    setSteps(steps.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const removeStep = (id: string) => {
    setSteps(steps.filter(s => s.id !== id).map((s, i) => ({ ...s, order: i + 1 })));
  };

  const handleSubmit = (data: EditFormData) => {
    const tags = data.tags ? data.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
    onSave(tc.id, {
      title: data.title,
      description: data.description || '',
      preconditions: data.preconditions || '',
      expectedResult: data.expectedResult || '',
      priority: data.priority,
      type: data.type,
      tags,
    }, steps);
    toast.success('Test case updated');
  };

  return (
    <Sheet open onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent className="sm:max-w-xl w-full overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Pencil className="h-4 w-4" /> Edit Test Case
          </SheetTitle>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 mt-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title *</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl><Textarea className="min-h-[70px]" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="critical">Critical</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="manual">Manual</SelectItem>
                        <SelectItem value="automated">Automated</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="tags"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tags</FormLabel>
                  <FormControl><Input placeholder="smoke, regression" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="preconditions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Preconditions</FormLabel>
                  <FormControl><Textarea className="min-h-[50px]" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Steps */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Test Steps</Label>
                <Button type="button" variant="outline" size="sm" onClick={addStep}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add Step
                </Button>
              </div>
              {steps.length === 0 ? (
                <div className="border border-dashed rounded-lg p-4 text-center text-sm text-muted-foreground">
                  No steps. Click "Add Step" to begin.
                </div>
              ) : (
                <div className="space-y-2">
                  {steps.map((step, index) => (
                    <div key={step.id} className="flex items-start gap-2 p-2.5 border rounded-lg bg-muted/30">
                      <Badge variant="secondary" className="h-6 w-6 p-0 justify-center mt-1.5 shrink-0">{index + 1}</Badge>
                      <div className="flex-1 grid gap-1.5">
                        <Input
                          placeholder="Step action"
                          value={step.action}
                          onChange={(e) => updateStep(step.id, 'action', e.target.value)}
                          className="h-8 text-sm"
                        />
                        <Input
                          placeholder="Expected result"
                          value={step.expectedResult}
                          onChange={(e) => updateStep(step.id, 'expectedResult', e.target.value)}
                          className="h-8 text-sm"
                        />
                      </div>
                      <Button
                        type="button" variant="ghost" size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive mt-1 shrink-0"
                        onClick={() => removeStep(step.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <FormField
              control={form.control}
              name="expectedResult"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Overall Expected Result</FormLabel>
                  <FormControl><Textarea className="min-h-[50px]" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-2 pt-4">
              <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
              <Button type="submit" className="flex-1 gap-2">
                <Check className="h-4 w-4" /> Save Changes
              </Button>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
