import { useState } from 'react';
import { Sparkles, Check, Loader2, ChevronDown, ChevronUp, AlertCircle, Settings as SettingsIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAIConfigStore, AI_PROVIDERS } from '@/stores/aiConfigStore';
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
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { toast } from 'sonner';
import { useGenerateFromJira, useSaveGeneratedTestCases } from '@/hooks/useIntegrations';
import type { TestCase, TestStep } from '@/types';
import type { JiraIssueDetail, GeneratedTestCaseItem } from '@/services/modules/integrations.service';

interface GeneratedTestCase extends GeneratedTestCaseItem {
  id: string;
  selected: boolean;
}

interface GenerateFromJiraDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAccept: (testCases: Partial<TestCase>[]) => void;
  projectId?: string;
  suiteId?: string;
  suites?: { id: string; name: string }[];
  isAiConfigured?: boolean;
}

export const GenerateFromJiraDialog = ({ open, onOpenChange, onAccept, projectId, suiteId, suites = [], isAiConfigured = false }: GenerateFromJiraDialogProps) => {
  const [ticketId, setTicketId] = useState('');
  const [generated, setGenerated] = useState<GeneratedTestCase[]>([]);
  const [jiraIssue, setJiraIssue] = useState<JiraIssueDetail | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { activeProvider, activeModel } = useAIConfigStore();
  const providerLabel = AI_PROVIDERS.find(p => p.provider === activeProvider)?.label || activeProvider;

  const generateMutation = useGenerateFromJira();
  const saveMutation = useSaveGeneratedTestCases();

  const handleGenerate = async () => {
    if (!ticketId.trim()) return;
    setGenerated([]);
    setJiraIssue(null);

    try {
      const result = await generateMutation.mutateAsync(ticketId.trim().toUpperCase());
      setJiraIssue(result.jiraIssue);
      setGenerated(
        result.generatedTestCases.map((tc, i) => ({
          ...tc,
          id: `gen-${i + 1}`,
          selected: true,
        })),
      );
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate test cases');
    }
  };

  const toggleSelect = (id: string) => {
    setGenerated(prev => prev.map(g => g.id === id ? { ...g, selected: !g.selected } : g));
  };

  const handleAccept = async () => {
    const selected = generated.filter(g => g.selected);
    const resolvedSuiteId = suiteId || suites[0]?.id;

    if (projectId && resolvedSuiteId) {
      try {
        await saveMutation.mutateAsync({
          projectId,
          suiteId: resolvedSuiteId,
          jiraIssueKey: ticketId.trim().toUpperCase(),
          testCases: selected.map(({ id, selected: _, ...rest }) => rest),
        });
        toast.success(`${selected.length} test case${selected.length !== 1 ? 's' : ''} created`);
        onOpenChange(false);
        setGenerated([]);
        setTicketId('');
        setJiraIssue(null);
      } catch (err: any) {
        toast.error(err.message || 'Failed to save test cases');
      }
    } else {
      // Fallback to the onAccept callback if no project/suite context
      onAccept(selected.map(g => ({
        title: g.title,
        description: g.description,
        preconditions: g.preconditions,
        steps: g.steps as TestStep[],
        expectedResult: g.expectedResult,
        priority: g.priority as TestCase['priority'],
        type: g.type as TestCase['type'],
        tags: g.tags,
        jiraTicketId: ticketId.trim().toUpperCase(),
        jiraSyncStatus: 'synced' as const,
        projectId,
        suiteId: resolvedSuiteId,
      })));
      onOpenChange(false);
      setGenerated([]);
      setTicketId('');
      setJiraIssue(null);
    }
  };

  const selectedCount = generated.filter(g => g.selected).length;
  const isGenerating = generateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Generate Test Cases from Jira
          </DialogTitle>
          <DialogDescription>
            AI will analyze the Jira ticket and generate test cases for review
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {/* AI Provider Status */}
          {!isAiConfigured ? (
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
          ) : (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-muted text-xs text-muted-foreground">
              <Sparkles className="h-3 w-3 text-primary" />
              Using <span className="font-medium text-foreground">{providerLabel}</span> · <span className="font-mono">{activeModel}</span>
            </div>
          )}

          {/* Input */}
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                placeholder="Enter Jira Ticket ID (e.g., PROJ-1234)"
                value={ticketId}
                onChange={(e) => setTicketId(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
              />
            </div>
            <Button onClick={handleGenerate} disabled={!ticketId.trim() || isGenerating || !isAiConfigured}>
              {isGenerating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              {isGenerating ? 'Analyzing...' : 'Generate'}
            </Button>
          </div>

          {/* Jira Ticket Preview */}
          {isGenerating && (
            <Card className="border-dashed">
              <CardContent className="py-4">
                <div className="flex items-center gap-3 mb-3">
                  <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">🔷 {ticketId}</Badge>
                  <span className="text-sm font-medium">Analyzing ticket...</span>
                </div>
                <div className="space-y-2">
                  <div className="h-3 bg-muted rounded animate-pulse w-3/4" />
                  <div className="h-3 bg-muted rounded animate-pulse w-1/2" />
                  <div className="h-3 bg-muted rounded animate-pulse w-2/3" />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Real Jira Issue Preview */}
          {jiraIssue && !isGenerating && (
            <Card>
              <CardContent className="py-4">
                <div className="flex items-center gap-3 mb-2">
                  <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">🔷 {jiraIssue.key}</Badge>
                  {jiraIssue.issueType && <Badge variant="outline" className="text-xs">{jiraIssue.issueType}</Badge>}
                  {jiraIssue.status && <Badge variant="secondary" className="text-xs">{jiraIssue.status}</Badge>}
                  {jiraIssue.priority && <Badge variant="outline" className="text-xs">{jiraIssue.priority}</Badge>}
                </div>
                <p className="font-medium text-sm">{jiraIssue.summary}</p>
                {jiraIssue.description && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-3">{jiraIssue.description}</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Generated Results */}
          {generated.length > 0 && (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">
                  Generated {generated.length} test cases · {selectedCount} selected
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setGenerated(prev => prev.map(g => ({ ...g, selected: true })))}
                >
                  Select All
                </Button>
              </div>

              <ScrollArea className="flex-1 -mx-6 px-6">
                <div className="space-y-2 pb-2">
                  {generated.map((tc) => (
                    <Collapsible
                      key={tc.id}
                      open={expandedId === tc.id}
                      onOpenChange={() => setExpandedId(expandedId === tc.id ? null : tc.id)}
                    >
                      <Card className={tc.selected ? 'border-primary/50' : 'opacity-60'}>
                        <CollapsibleTrigger asChild>
                          <CardContent className="py-3 cursor-pointer hover:bg-muted/50">
                            <div className="flex items-start gap-3">
                              <Checkbox
                                checked={tc.selected}
                                onCheckedChange={() => toggleSelect(tc.id)}
                                onClick={(e) => e.stopPropagation()}
                                className="mt-0.5"
                              />
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm">{tc.title}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge variant="outline" className="text-xs capitalize">{tc.priority}</Badge>
                                  <Badge variant="secondary" className="text-xs">{tc.steps.length} steps</Badge>
                                  {tc.tags.map(tag => (
                                    <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                                  ))}
                                </div>
                              </div>
                              {expandedId === tc.id ? (
                                <ChevronUp className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                              )}
                            </div>
                          </CardContent>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <CardContent className="pt-0 pb-3 border-t">
                            <div className="space-y-3 pt-3 text-sm">
                              <div>
                                <Label className="text-xs text-muted-foreground">Description</Label>
                                <p>{tc.description}</p>
                              </div>
                              <div>
                                <Label className="text-xs text-muted-foreground">Preconditions</Label>
                                <p>{tc.preconditions}</p>
                              </div>
                              <div>
                                <Label className="text-xs text-muted-foreground">Steps</Label>
                                <div className="space-y-1 mt-1">
                                  {tc.steps.map((step, i) => (
                                    <div key={step.id} className="flex gap-2 p-2 bg-muted/50 rounded text-xs">
                                      <span className="font-mono text-muted-foreground">{i + 1}.</span>
                                      <div>
                                        <p>{step.action}</p>
                                        <p className="text-muted-foreground">→ {step.expectedResult}</p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                              <div>
                                <Label className="text-xs text-muted-foreground">Expected Result</Label>
                                <p>{tc.expectedResult}</p>
                              </div>
                            </div>
                          </CardContent>
                        </CollapsibleContent>
                      </Card>
                    </Collapsible>
                  ))}
                </div>
              </ScrollArea>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          {generated.length > 0 && (
            <Button onClick={handleAccept} disabled={selectedCount === 0 || saveMutation.isPending} className="gap-2">
              {saveMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              Accept {selectedCount} Test Case{selectedCount !== 1 ? 's' : ''}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
