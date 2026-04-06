import { useState, useEffect, useMemo } from 'react';
import {
  Sparkles, Check, Loader2, AlertCircle,
  Settings as SettingsIcon, Search, ChevronsUpDown,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAIConfigStore, AI_PROVIDERS } from '@/stores/aiConfigStore';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from '@/components/ui/command';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  useJiraConfig, useJiraProjects, useSearchJiraIssues,
  useGenerateFromJira,
} from '@/hooks/useIntegrations';
import { useAiGenerationStore } from '@/stores/aiGenerationStore';

interface GenerateFromJiraDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAccept: (testCases: any[]) => void;
  projectId?: string;
  suiteId?: string;
  suites?: { id: string; name: string }[];
  isAiConfigured?: boolean;
  /** Pre-linked Jira project key from the TestFlow project settings */
  linkedJiraProjectKey?: string | null;
}

// --- Helpers ---

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

// --- Component ---

export const GenerateFromJiraDialog = ({
  open, onOpenChange, onAccept, projectId, suiteId, suites = [], isAiConfigured = false,
  linkedJiraProjectKey,
}: GenerateFromJiraDialogProps) => {
  const navigate = useNavigate();
  const { activeProvider, activeModel } = useAIConfigStore();
  const providerLabel = AI_PROVIDERS.find(p => p.provider === activeProvider)?.label || activeProvider;
  const { setGenerationResult } = useAiGenerationStore();

  // Jira search state
  const [searchText, setSearchText] = useState('');
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedIssueKey, setSelectedIssueKey] = useState('');
  const [projectOpen, setProjectOpen] = useState(false);
  const [issueTypeFilter, setIssueTypeFilter] = useState('');
  const [manualTicketId, setManualTicketId] = useState('');

  const debouncedSearch = useDebounce(searchText, 400);

  // Jira config & data
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

  // Mutations
  const generateMutation = useGenerateFromJira();

  // If a Jira project is linked at the TestFlow project level, lock to it
  const lockedJiraProject = linkedJiraProjectKey || null;

  // Reset on open/close
  useEffect(() => {
    if (open) {
      setSearchText('');
      setSelectedIssueKey('');
      setManualTicketId('');
      setIssueTypeFilter('');
      setSelectedProject(lockedJiraProject || jiraConfig?.defaultProjectKey || '');
    }
  }, [open, lockedJiraProject, jiraConfig?.defaultProjectKey]);

  // Derived
  const issueTypes = ['story', 'task', 'bug', 'epic'] as const;
  const ticketId = selectedIssueKey || manualTicketId.trim();
  const isGenerating = generateMutation.isPending;

  const selectedProjectLabel = useMemo(() => {
    if (!selectedProject || !projectsData) return null;
    const p = projectsData.projects.find(p => p.key === selectedProject);
    return p ? `${p.key} - ${p.name}` : selectedProject;
  }, [selectedProject, projectsData]);

  // --- Handlers ---

  const handleGenerate = async () => {
    if (!ticketId) return;

    try {
      const result = await generateMutation.mutateAsync(ticketId.toUpperCase());
      // Store results and navigate to full review page
      setGenerationResult(
        result.jiraIssue,
        result.generatedTestCases,
        projectId || '',
        suiteId || suites[0]?.id || '',
        suites,
      );
      onOpenChange(false);
      navigate('/app/ai-review');
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate test cases');
    }
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  // --- Render ---

  const renderAiStatusBanner = () => {
    if (!isAiConfigured) {
      return (
        <div className="flex items-center gap-3 p-3 rounded-lg border border-destructive/30 bg-destructive/10 text-sm">
          <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
          <div className="flex-1">
            <span className="font-medium">No AI provider configured.</span>{' '}
            <span className="text-muted-foreground">Add an API key in settings to enable AI generation.</span>
          </div>
          <Button variant="outline" size="sm" className="gap-1 shrink-0" onClick={() => { onOpenChange(false); navigate('/app/settings'); }}>
            <SettingsIcon className="h-3 w-3" /> Configure
          </Button>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-2 p-2 rounded-lg bg-muted text-xs text-muted-foreground">
        <Sparkles className="h-3 w-3 text-primary" />
        Using <span className="font-medium text-foreground">{providerLabel}</span> · <span className="font-mono">{activeModel}</span>
      </div>
    );
  };

  const renderSearchPhase = () => (
    <div className="space-y-3 flex-1 overflow-hidden flex flex-col">
      {renderAiStatusBanner()}

      {jiraConnected ? (
        <>
          {/* Project combobox — locked when project has a linked Jira project */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Jira Project</Label>
            {lockedJiraProject ? (
              <div className="flex items-center gap-2 h-9 px-3 rounded-md border bg-muted/50">
                <Badge variant="secondary" className="font-mono text-xs">{lockedJiraProject}</Badge>
                <span className="text-sm text-muted-foreground truncate">{selectedProjectLabel || lockedJiraProject}</span>
                <span className="text-[10px] text-muted-foreground ml-auto">Linked in project settings</span>
              </div>
            ) : (
              <Popover open={projectOpen} onOpenChange={setProjectOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline" role="combobox" aria-expanded={projectOpen}
                    className="w-full justify-between font-normal h-9 text-sm"
                  >
                    <span className="truncate">{selectedProjectLabel || 'Select project...'}</span>
                    <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search projects..." />
                    <CommandList>
                      <CommandEmpty>{projectsLoading ? 'Loading...' : 'No projects found.'}</CommandEmpty>
                      <CommandGroup>
                        {projectsData?.projects.map((p) => (
                          <CommandItem
                            key={p.key}
                            value={`${p.key} ${p.name}`}
                            onSelect={() => { setSelectedProject(p.key === selectedProject ? '' : p.key); setProjectOpen(false); }}
                          >
                            <Check className={cn('mr-2 h-3.5 w-3.5', selectedProject === p.key ? 'opacity-100' : 'opacity-0')} />
                            <span className="font-mono text-xs mr-2 text-muted-foreground">{p.key}</span>
                            <span className="truncate">{p.name}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            )}
          </div>

          {/* Search & filters */}
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search Jira issues..."
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
          <div className="border rounded-lg overflow-hidden flex-1">
            {isSearching ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">Searching...</span>
              </div>
            ) : issuesData && issuesData.issues.length > 0 ? (
              <div className="max-h-[220px] overflow-y-auto divide-y">
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
                      {issue.issueType && <span className="text-[11px] text-muted-foreground">{issue.issueType}</span>}
                      {issue.status && <Badge variant="secondary" className="text-[10px] h-4 px-1.5">{issue.status}</Badge>}
                      {issue.priority && <Badge variant="outline" className="text-[10px] h-4 px-1.5">{issue.priority}</Badge>}
                    </div>
                  </button>
                ))}
              </div>
            ) : (selectedProject || debouncedSearch) ? (
              <div className="text-center py-8 text-sm text-muted-foreground">No issues found</div>
            ) : (
              <div className="text-center py-8 text-sm text-muted-foreground">Select a project or search to browse issues</div>
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
        /* Manual ticket input when Jira not connected */
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Jira Ticket ID *</Label>
            <Input
              placeholder="Enter Jira Ticket ID (e.g., PROJ-1234)"
              value={manualTicketId}
              onChange={(e) => setManualTicketId(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
              className="h-9 text-sm"
            />
            <p className="text-[11px] text-muted-foreground">
              Connect Jira in Settings for searchable issue selection
            </p>
          </div>
        </div>
      )}

      {/* Loading skeleton */}
      {isGenerating && (
        <Card className="border-dashed">
          <CardContent className="py-4">
            <div className="flex items-center gap-3 mb-3">
              <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">{ticketId}</Badge>
              <span className="text-sm font-medium">Analyzing ticket with AI...</span>
            </div>
            <div className="space-y-2">
              <div className="h-3 bg-muted rounded animate-pulse w-3/4" />
              <div className="h-3 bg-muted rounded animate-pulse w-1/2" />
              <div className="h-3 bg-muted rounded animate-pulse w-2/3" />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] flex flex-col max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Generate Test Cases from Jira
          </DialogTitle>
          <DialogDescription>
            Search and select a Jira issue, then AI will generate test cases
          </DialogDescription>
        </DialogHeader>

        {renderSearchPhase()}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button
            onClick={handleGenerate}
            disabled={!ticketId || isGenerating || !isAiConfigured}
            className="gap-2"
          >
            {isGenerating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {isGenerating ? 'Generating...' : 'Generate Test Cases'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
