import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { TestSuite } from '@/types';

const testSuiteSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500).optional(),
  parentId: z.string().optional(),
});

type TestSuiteFormData = z.infer<typeof testSuiteSchema>;

interface TestSuiteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  suite?: TestSuite | null;
  suites: TestSuite[];
  onSave: (data: Partial<TestSuite>) => void;
}

export const TestSuiteDialog = ({
  open,
  onOpenChange,
  suite,
  suites,
  onSave,
}: TestSuiteDialogProps) => {
  const isEditing = !!suite;

  const form = useForm<TestSuiteFormData>({
    resolver: zodResolver(testSuiteSchema),
    defaultValues: {
      name: '',
      description: '',
      parentId: '',
    },
  });

  useEffect(() => {
    if (suite) {
      form.reset({
        name: suite.name,
        description: suite.description,
        parentId: suite.parentId || '__none__',
      });
    } else {
      form.reset({
        name: '',
        description: '',
        parentId: '__none__',
      });
    }
  }, [suite, form]);

  const onSubmit = (data: TestSuiteFormData) => {
    onSave({
      ...data,
      parentId: data.parentId === '__none__' ? undefined : data.parentId || undefined,
    });
    onOpenChange(false);
  };

  // Filter out current suite from parent options to prevent circular reference
  const parentOptions = suites.filter((s) => s.id !== suite?.id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Test Suite' : 'Create New Test Suite'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter suite name" {...field} />
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
                      placeholder="Describe the purpose of this test suite"
                      className="min-h-[80px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="parentId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Parent Suite (Optional)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select parent suite" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="__none__">None (Root Level)</SelectItem>
                      {parentOptions.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {isEditing ? 'Save Changes' : 'Create Suite'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
