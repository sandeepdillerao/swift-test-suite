import { useEffect, useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { Project } from '@/types';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project?: Project | null;
  onSave: (data: Partial<Project>) => void;
  isLoading?: boolean;
}

export const ProjectDialog = ({ open, onOpenChange, project, onSave, isLoading }: Props) => {
  const [name, setName] = useState('');
  const [key, setKey] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (open) {
      setName(project?.name ?? '');
      setKey(project?.key ?? '');
      setDescription(project?.description ?? '');
    }
  }, [open, project]);

  const handleKeyInput = (value: string) => {
    setKey(value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10));
  };

  const handleNameChange = (value: string) => {
    setName(value);
    if (!project) {
      // Auto-generate key from name
      const generated = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
      setKey(generated);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !key.trim()) return;
    onSave({ name: name.trim(), key: key.trim(), description: description.trim() || null });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{project ? 'Edit Project' : 'Create Project'}</DialogTitle>
          <DialogDescription>
            {project ? 'Update project details' : 'Set up a new testing project'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="proj-name">Project Name *</Label>
            <Input
              id="proj-name"
              placeholder="E-Commerce Platform"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="proj-key">
              Project Key *
              <span className="ml-2 text-xs text-muted-foreground font-normal">
                (2–10 uppercase letters/numbers, e.g. ECOM)
              </span>
            </Label>
            <Input
              id="proj-key"
              placeholder="ECOM"
              value={key}
              onChange={(e) => handleKeyInput(e.target.value)}
              className="font-mono uppercase"
              maxLength={10}
              required
              disabled={!!project}
            />
            {project && (
              <p className="text-xs text-muted-foreground">Project key cannot be changed after creation.</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="proj-desc">Description</Label>
            <Textarea
              id="proj-desc"
              placeholder="What does this project test?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || !key.trim() || isLoading}>
              {isLoading ? 'Saving…' : project ? 'Save Changes' : 'Create Project'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
