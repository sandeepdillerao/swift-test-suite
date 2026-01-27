import { useEffect } from 'react';
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
import type { Release } from '@/types';

const formSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  version: z.string().min(1, 'Version is required').max(20),
  description: z.string().max(500).optional(),
  status: z.enum(['planning', 'in_progress', 'released', 'archived']),
  plannedDate: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface ReleaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  release?: Release;
  onSave: (data: Partial<Release>) => void;
}

export const ReleaseDialog = ({ open, onOpenChange, release, onSave }: ReleaseDialogProps) => {
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      version: '',
      description: '',
      status: 'planning',
      plannedDate: '',
    },
  });

  useEffect(() => {
    if (release) {
      form.reset({
        name: release.name,
        version: release.version,
        description: release.description || '',
        status: release.status,
        plannedDate: release.plannedDate ? release.plannedDate.split('T')[0] : '',
      });
    } else {
      form.reset({
        name: '',
        version: '',
        description: '',
        status: 'planning',
        plannedDate: '',
      });
    }
  }, [release, form]);

  const onSubmit = (data: FormData) => {
    onSave({
      ...data,
      projectId: '1',
      plannedDate: data.plannedDate ? new Date(data.plannedDate).toISOString() : undefined,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{release ? 'Edit Release' : 'Create New Release'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Release Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Release 3.0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="version"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Version *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., 3.0.0" {...field} />
                    </FormControl>
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
                      placeholder="Describe the release..." 
                      rows={3}
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
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="planning">Planning</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="released">Released</SelectItem>
                        <SelectItem value="archived">Archived</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="plannedDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Planned Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {release ? 'Update Release' : 'Create Release'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
