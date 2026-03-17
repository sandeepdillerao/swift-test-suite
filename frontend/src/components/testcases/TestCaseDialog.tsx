import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Badge } from '@/components/ui/badge';
import type { TestCase, TestStep, Priority, TestType, TestStatus } from '@/types';

const testCaseSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(2000).optional(),
  preconditions: z.string().max(1000).optional(),
  expectedResult: z.string().max(1000).optional(),
  priority: z.enum(['critical', 'high', 'medium', 'low']),
  type: z.enum(['manual', 'automated']),
  suiteId: z.string().min(1, 'Suite is required'),
  tags: z.string().optional(),
});

type TestCaseFormData = z.infer<typeof testCaseSchema>;

interface TestCaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  testCase?: TestCase | null;
  suites: { id: string; name: string }[];
  onSave: (data: Partial<TestCase>) => void;
}

export const TestCaseDialog = ({
  open,
  onOpenChange,
  testCase,
  suites,
  onSave,
}: TestCaseDialogProps) => {
  const isEditing = !!testCase;
  const [steps, setSteps] = useState<TestStep[]>([]);

  const form = useForm<TestCaseFormData>({
    resolver: zodResolver(testCaseSchema),
    defaultValues: {
      title: '',
      description: '',
      preconditions: '',
      expectedResult: '',
      priority: 'medium',
      type: 'manual',
      suiteId: suites[0]?.id || '',
      tags: '',
    },
  });

  useEffect(() => {
    if (testCase) {
      form.reset({
        title: testCase.title,
        description: testCase.description,
        preconditions: testCase.preconditions || '',
        expectedResult: testCase.expectedResult,
        priority: testCase.priority,
        type: testCase.type,
        suiteId: testCase.suiteId,
        tags: testCase.tags.join(', '),
      });
      setSteps(testCase.steps || []);
    } else {
      form.reset({
        title: '',
        description: '',
        preconditions: '',
        expectedResult: '',
        priority: 'medium',
        type: 'manual',
        suiteId: suites[0]?.id || '',
        tags: '',
      });
      setSteps([]);
    }
  }, [testCase, form, suites]);

  const addStep = () => {
    const newStep: TestStep = {
      id: String(Date.now()),
      order: steps.length + 1,
      action: '',
      expectedResult: '',
    };
    setSteps([...steps, newStep]);
  };

  const updateStep = (id: string, field: 'action' | 'expectedResult', value: string) => {
    setSteps(steps.map(s => (s.id === id ? { ...s, [field]: value } : s)));
  };

  const removeStep = (id: string) => {
    setSteps(steps.filter(s => s.id !== id).map((s, i) => ({ ...s, order: i + 1 })));
  };

  const onSubmit = (data: TestCaseFormData) => {
    const tags = data.tags
      ? data.tags.split(',').map(t => t.trim()).filter(Boolean)
      : [];

    onSave({
      ...data,
      tags,
      steps,
      projectId: '1',
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Test Case' : 'Create New Test Case'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Info */}
            <div className="grid gap-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title *</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter test case title" {...field} />
                    </FormControl>
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
                    <FormControl>
                      <Textarea
                        placeholder="Describe what this test case verifies"
                        className="min-h-[80px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="suiteId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Test Suite *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select suite" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {suites.map((suite) => (
                            <SelectItem key={suite.id} value={suite.id}>
                              {suite.name}
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
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Test Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
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

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priority</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
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
                  name="tags"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tags</FormLabel>
                      <FormControl>
                        <Input placeholder="smoke, regression, api" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="preconditions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preconditions</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Prerequisites before executing this test"
                        className="min-h-[60px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Test Steps */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium">Test Steps</Label>
                <Button type="button" variant="outline" size="sm" onClick={addStep}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Step
                </Button>
              </div>

              {steps.length === 0 ? (
                <div className="border border-dashed rounded-lg p-6 text-center text-muted-foreground">
                  No steps added yet. Click "Add Step" to begin.
                </div>
              ) : (
                <div className="space-y-2">
                  {steps.map((step, index) => (
                    <div
                      key={step.id}
                      className="flex items-start gap-2 p-3 border rounded-lg bg-muted/30"
                    >
                      <div className="flex items-center gap-2 pt-2">
                        <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                        <Badge variant="secondary" className="h-6 w-6 p-0 justify-center">
                          {index + 1}
                        </Badge>
                      </div>
                      <div className="flex-1 grid gap-2">
                        <Input
                          placeholder="Step action"
                          value={step.action}
                          onChange={(e) => updateStep(step.id, 'action', e.target.value)}
                        />
                        <Input
                          placeholder="Expected result"
                          value={step.expectedResult}
                          onChange={(e) => updateStep(step.id, 'expectedResult', e.target.value)}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => removeStep(step.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Expected Result */}
            <FormField
              control={form.control}
              name="expectedResult"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Overall Expected Result</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Final expected outcome of this test case"
                      className="min-h-[60px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {isEditing ? 'Save Changes' : 'Create Test Case'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
