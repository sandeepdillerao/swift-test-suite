import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link2, Unlink, Search, Loader2, ChevronsUpDown, Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useJiraConfig, useJiraProjects, useSearchJiraIssues, useLinkJiraIssue, useUnlinkJiraIssue } from '@/hooks/useIntegrations';
import type { TestCase } from '@/types';

interface JiraLinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  testCase: TestCase | null;
  onSave: (data: {
    jiraTicketId?: string;
    jiraTicketUrl?: string;
    jiraSubtaskId?: string;
    jiraSubtaskUrl?: string;
    jiraSyncStatus?: TestCase['jiraSyncStatus'];
  }) => void;
  onUnlink: () => void;
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export const JiraLinkDialog = ({ open, onOpenChange, testCase, onSave, onUnlink }: JiraLinkDialogProps) => {
  const [ticketId, setTicketId] = useState('');
  const [ticketUrl, setTicketUrl] = useState('');
  const [createSubtask, setCreateSubtask] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [selectedIssueKey, setSelectedIssueKey] = useState<string>('');
  const [projectOpen, setProjectOpen] = useState(false);
  const [issueTypeFilter, setIssueTypeFilter] = useState<string>('');

  const debouncedSearch = useDebounce(searchText, 400);

  const { data: jiraConfig } = useJiraConfig();
  const jiraConnected = jiraConfig?.connected ?? false;

  const { data: projectsData, isLoading: projectsLoading } = useJiraProjects(jiraConnected && open);
  const { data: issuesData, isLoading: isSearching } = useSearchJiraIssues(
    {
      projectKey: selectedProject || undefined,
      searchText: debouncedSearch || undefined,
      issueType: (issueTypeFilter || undefined) as any,
      limit: 20,
    },
    jiraConnected && open && (!!selectedProject || !!debouncedSearch),
  );

  const linkMutation = useLinkJiraIssue();
  const unlinkMutation = useUnlinkJiraIssue();

  const isLinked = !!testCase?.jiraTicketId;

  useEffect(() => {
    if (open && testCase) {
      setTicketId(testCase.jiraTicketId || '');
      setTicketUrl(testCase.jiraTicketUrl || '');
      setCreateSubtask(false);
      setSelectedIssueKey('');
      setSearchText('');
      setIssueTypeFilter('');
      // Pre-select project from config if available
      setSelectedProject(jiraConfig?.defaultProjectKey || '');
    }
  }, [open, testCase, jiraConfig?.defaultProjectKey]);

  const handleSave = async () => {
    const issueKey = selectedIssueKey || ticketId.trim();
    if (!issueKey || !testCase) return;

    if (jiraConnected) {
      try {
        await linkMutation.mutateAsync({
          testCaseId: testCase.id,
          data: { jiraIssueKey: issueKey, createSubtask },
        });
        toast.success(`Linked to ${issueKey}`);
        onOpenChange(false);
      } catch (err: any) {
        toast.error(err.message || 'Failed to link issue');
      }
    } else {
      const baseUrl = ticketUrl || `https://your-domain.atlassian.net/browse/${issueKey}`;
      onSave({
        jiraTicketId: issueKey,
        jiraTicketUrl: baseUrl,
        jiraSyncStatus: 'synced',
      });
      onOpenChange(false);
    }
  };

  const handleUnlink = async () => {
    if (!testCase) return;
    if (jiraConnected) {
      try {
        await unlinkMutation.mutateAsync(testCase.id);
        toast.success('Jira ticket unlinked');
        onOpenChange(false);
      } catch (err: any) {
        toast.error(err.message || 'Failed to unlink');
      }
    } else {
      onUnlink();
    }
  };

  const selectedProjectLabel = useMemo(() => {
    if (!selectedProject || !projectsData) return null;
    const p = projectsData.projects.find(p => p.key === selectedProject);
    return p ? `${p.key} — ${p.name}` : selectedProject;
  }, [selectedProject, projectsData]);

  const issueTypes = ['story', 'task', 'bug', 'epic'] as const;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            🔷 Link to Jira
          </DialogTitle>
          <DialogDescription>
            {jiraConnected
              ? 'Search and select a Jira issue to link'
              : 'Enter a Jira ticket ID manually'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 flex-1 overflow-y-auto py-2">
          {/* Currently linked banner */}
          {isLinked && (
            <div className="p-2.5 rounded-lg bg-muted/50 flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20 gap-1 shrink-0">
                  🔷 {testCase!.jiraTicketId}
                </Badge>
                <span className="text-xs text-muted-foreground truncate">Linked</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive shrink-0 h-7 px-2"
                onClick={handleUnlink}
                disabled={unlinkMutation.isPending}
              >
                {unlinkMutation.isPending ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <><Unlink className="h-3 w-3 mr-1" /> Unlink</>
                )}
              </Button>
            </div>
          )}

          {jiraConnected ? (
            <>
              {/* Project combobox */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Project</Label>
                <Popover open={projectOpen} onOpenChange={setProjectOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={projectOpen}
                      className="w-full justify-between font-normal h-9 text-sm"
                    >
                      <span className="truncate">
                        {selectedProjectLabel || 'Select project...'}
                      </span>
                      <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search projects..." />
                      <CommandList>
                        <CommandEmpty>
                          {projectsLoading ? 'Loading...' : 'No projects found.'}
                        </CommandEmpty>
                        <CommandGroup>
                          {projectsData?.projects.map((p) => (
                            <CommandItem
                              key={p.key}
                              value={`${p.key} ${p.name}`}
                              onSelect={() => {
                                setSelectedProject(p.key === selectedProject ? '' : p.key);
                                setProjectOpen(false);
                              }}
                            >
                              <Check className={cn(
                                'mr-2 h-3.5 w-3.5',
                                selectedProject === p.key ? 'opacity-100' : 'opacity-0',
                              )} />
                              <span className="font-mono text-xs mr-2 text-muted-foreground">{p.key}</span>
                              <span className="truncate">{p.name}</span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Filters row */}
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search issues..."
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    className="pl-8 h-9 text-sm"
                  />
                </div>
                <div className="flex gap-1">
                  {issueTypes.map(type => (
                    <Button
                      key={type}
                      variant={issueTypeFilter === type ? 'default' : 'outline'}
                      size="sm"
                      className="h-9 px-2.5 text-xs capitalize"
                      onClick={() => setIssueTypeFilter(issueTypeFilter === type ? '' : type)}
                    >
                      {type}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Issue results */}
              <div className="border rounded-lg overflow-hidden">
                {isSearching ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    <span className="ml-2 text-sm text-muted-foreground">Searching...</span>
                  </div>
                ) : issuesData && issuesData.issues.length > 0 ? (
                  <div className="max-h-[240px] overflow-y-auto divide-y">
                    {issuesData.issues.map((issue) => (
                      <button
                        key={issue.key}
                        type="button"
                        className={cn(
                          'w-full text-left px-3 py-2.5 text-sm transition-colors hover:bg-muted/50',
                          selectedIssueKey === issue.key && 'bg-primary/5 ring-1 ring-inset ring-primary/20',
                        )}
                        onClick={() => {
                          setSelectedIssueKey(issue.key === selectedIssueKey ? '' : issue.key);
                          setTicketId(issue.key);
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className={cn(
                              'text-[11px] font-mono shrink-0 px-1.5',
                              selectedIssueKey === issue.key && 'border-primary/40 text-primary',
                            )}
                          >
                            {issue.key}
                          </Badge>
                          <span className="truncate flex-1 text-[13px]">{issue.summary}</span>
                          {selectedIssueKey === issue.key && (
                            <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 mt-1 ml-[calc(theme(spacing.2)+3.5rem)]">
                          {issue.issueType && (
                            <span className="text-[11px] text-muted-foreground">{issue.issueType}</span>
                          )}
                          {issue.status && (
                            <Badge variant="secondary" className="text-[10px] h-4 px-1.5">{issue.status}</Badge>
                          )}
                          {issue.priority && (
                            <Badge variant="outline" className="text-[10px] h-4 px-1.5">{issue.priority}</Badge>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (selectedProject || debouncedSearch) ? (
                  <div className="text-center py-8 text-sm text-muted-foreground">
                    No issues found
                  </div>
                ) : (
                  <div className="text-center py-8 text-sm text-muted-foreground">
                    Select a project or search to browse issues
                  </div>
                )}
              </div>

              {/* Selected issue indicator */}
              {selectedIssueKey && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/5 border border-primary/20">
                  <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span className="text-sm">
                    Selected: <span className="font-mono font-medium">{selectedIssueKey}</span>
                  </span>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="jiraTicket" className="text-xs font-medium">Jira Ticket ID *</Label>
                <Input
                  id="jiraTicket"
                  placeholder="e.g., PROJ-1234"
                  value={ticketId}
                  onChange={(e) => setTicketId(e.target.value.toUpperCase())}
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="jiraUrl" className="text-xs font-medium">Jira URL (optional)</Label>
                <Input
                  id="jiraUrl"
                  placeholder="https://your-domain.atlassian.net/browse/PROJ-1234"
                  value={ticketUrl}
                  onChange={(e) => setTicketUrl(e.target.value)}
                  className="h-9 text-sm"
                />
                <p className="text-[11px] text-muted-foreground">
                  Auto-generated from ticket ID if left blank
                </p>
              </div>
            </>
          )}

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-xs font-medium">Create Jira Subtask</Label>
              <p className="text-[11px] text-muted-foreground">
                Subtask for tracking test execution, status synced automatically
              </p>
            </div>
            <Switch checked={createSubtask} onCheckedChange={setCreateSubtask} />
          </div>

          {createSubtask && (
            <div className="p-2.5 bg-muted/30 rounded-lg text-[11px] space-y-1">
              <p className="font-medium">Subtask will include:</p>
              <ul className="text-muted-foreground space-y-0.5 list-disc pl-4">
                <li>Test case title and steps as description</li>
                <li>Status synced: Pass → Done, Fail → To Do, In Progress → In Progress</li>
              </ul>
            </div>
          )}
        </div>

        <DialogFooter className="pt-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!(selectedIssueKey || ticketId.trim()) || linkMutation.isPending}
          >
            {linkMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Link2 className="h-4 w-4 mr-2" />
            )}
            {isLinked ? 'Update Link' : 'Link Ticket'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
