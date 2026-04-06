import { useEffect, useState, useMemo } from 'react';
import { Check, ChevronsUpDown, Link2, Unlink, Loader2 } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { useJiraConfig, useJiraProjects } from '@/hooks/useIntegrations';
import type { Project } from '@/types';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project?: Project | null;
  onSave: (data: Partial<Project> & { jiraProjectKey?: string | null }) => void;
  isLoading?: boolean;
}

// ─── Component ───────────────────────────────────────────────────────────────

export const ProjectDialog = ({ open, onOpenChange, project, onSave, isLoading }: ProjectDialogProps) => {
  const [name, setName] = useState('');
  const [key, setKey] = useState('');
  const [description, setDescription] = useState('');
  const [jiraProjectKey, setJiraProjectKey] = useState<string | null>(null);

  const { data: jiraConfig } = useJiraConfig();
  const jiraConnected = !!jiraConfig?.connected;
  const { data: jiraProjectsData, isLoading: loadingJiraProjects } = useJiraProjects(jiraConnected && open);

  const jiraProjects = jiraProjectsData?.projects ?? [];

  // Reset form on open
  useEffect(() => {
    if (open) {
      setName(project?.name ?? '');
      setKey(project?.key ?? '');
      setDescription(project?.description ?? '');
      setJiraProjectKey(project?.settings?.jiraProjectKey ?? null);
    }
  }, [open, project]);

  const handleKeyInput = (value: string) => {
    setKey(value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10));
  };

  const handleNameChange = (value: string) => {
    setName(value);
    if (!project) {
      const generated = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
      setKey(generated);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !key.trim()) return;
    onSave({
      name: name.trim(),
      key: key.trim(),
      description: description.trim() || null,
      jiraProjectKey: jiraProjectKey || null,
    });
  };

  const selectedJiraLabel = useMemo(() => {
    if (!jiraProjectKey || !jiraProjects.length) return null;
    const p = jiraProjects.find((p: any) => p.key === jiraProjectKey);
    return p ? `${p.key} — ${p.name}` : jiraProjectKey;
  }, [jiraProjectKey, jiraProjects]);

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
          {/* Name */}
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

          {/* Key */}
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

          {/* Description */}
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

          {/* Jira Project Link */}
          {jiraConnected && (
            <JiraProjectPicker
              value={jiraProjectKey}
              onChange={setJiraProjectKey}
              projects={jiraProjects}
              isLoading={loadingJiraProjects}
              selectedLabel={selectedJiraLabel}
            />
          )}

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

// ─── Jira Project Picker ─────────────────────────────────────────────────────

function JiraProjectPicker({
  value,
  onChange,
  projects,
  isLoading,
  selectedLabel,
}: {
  value: string | null;
  onChange: (v: string | null) => void;
  projects: any[];
  isLoading: boolean;
  selectedLabel: string | null;
}) {
  const [popoverOpen, setPopoverOpen] = useState(false);

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-1.5">
        <Link2 className="h-3.5 w-3.5" />
        Jira Project
        <span className="text-xs text-muted-foreground font-normal ml-1">(optional)</span>
      </Label>

      <div className="flex items-center gap-2">
        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={popoverOpen}
              className="flex-1 justify-between font-normal"
            >
              {value ? (
                <span className="flex items-center gap-2 truncate">
                  <Badge variant="secondary" className="font-mono text-xs shrink-0">{value}</Badge>
                  <span className="truncate text-sm">{selectedLabel}</span>
                </span>
              ) : (
                <span className="text-muted-foreground">Link a Jira project...</span>
              )}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[350px] p-0" align="start">
            <Command>
              <CommandInput placeholder="Search Jira projects..." />
              <CommandList>
                {isLoading ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                ) : projects.length === 0 ? (
                  <CommandEmpty>No Jira projects found.</CommandEmpty>
                ) : (
                  <CommandGroup>
                    {projects.map((p: any) => (
                      <CommandItem
                        key={p.key}
                        value={`${p.key} ${p.name}`}
                        onSelect={() => {
                          onChange(p.key === value ? null : p.key);
                          setPopoverOpen(false);
                        }}
                      >
                        <Check className={cn('mr-2 h-3.5 w-3.5', value === p.key ? 'opacity-100' : 'opacity-0')} />
                        <Badge variant="outline" className="font-mono text-xs mr-2 shrink-0">{p.key}</Badge>
                        <span className="truncate">{p.name}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {value && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0"
            onClick={() => onChange(null)}
            title="Unlink Jira project"
          >
            <Unlink className="h-4 w-4 text-muted-foreground" />
          </Button>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        {value
          ? 'Jira ticket searches will be scoped to this project.'
          : 'Link a Jira project to scope ticket searches when linking test cases.'}
      </p>
    </div>
  );
}
