import { useState } from 'react';
import { Sparkles, Check, X, Loader2, ExternalLink, ChevronDown, ChevronUp, AlertCircle, Settings as SettingsIcon } from 'lucide-react';
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
import type { TestCase, TestStep } from '@/types';

interface GeneratedTestCase {
  id: string;
  title: string;
  description: string;
  preconditions: string;
  steps: TestStep[];
  expectedResult: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  type: 'manual' | 'automated';
  tags: string[];
  selected: boolean;
}

// Mock AI generation
const mockGenerateTestCases = async (ticketId: string): Promise<GeneratedTestCase[]> => {
  await new Promise(r => setTimeout(r, 2000));
  return [
    {
      id: 'gen-1',
      title: `Verify ${ticketId} - Happy path user flow`,
      description: `Validate the main user flow described in ${ticketId}`,
      preconditions: 'User is logged in with valid credentials',
      steps: [
        { id: 's1', order: 1, action: 'Navigate to the feature page', expectedResult: 'Feature page loads correctly' },
        { id: 's2', order: 2, action: 'Perform the primary action', expectedResult: 'Action completes successfully' },
        { id: 's3', order: 3, action: 'Verify the result', expectedResult: 'Expected output is displayed' },
      ],
      expectedResult: 'Feature works as described in the acceptance criteria',
      priority: 'high',
      type: 'manual',
      tags: ['regression', ticketId.toLowerCase()],
      selected: true,
    },
    {
      id: 'gen-2',
      title: `Verify ${ticketId} - Error handling`,
      description: `Validate error scenarios for ${ticketId}`,
      preconditions: 'User is logged in',
      steps: [
        { id: 's1', order: 1, action: 'Navigate to the feature page', expectedResult: 'Feature page loads' },
        { id: 's2', order: 2, action: 'Provide invalid input', expectedResult: 'Validation error is shown' },
        { id: 's3', order: 3, action: 'Submit without required fields', expectedResult: 'Error message appears' },
      ],
      expectedResult: 'Appropriate error messages are displayed for all invalid inputs',
      priority: 'medium',
      type: 'manual',
      tags: ['negative', ticketId.toLowerCase()],
      selected: true,
    },
    {
      id: 'gen-3',
      title: `Verify ${ticketId} - Boundary conditions`,
      description: `Test edge cases and boundary conditions for ${ticketId}`,
      preconditions: 'Test environment is set up with boundary data',
      steps: [
        { id: 's1', order: 1, action: 'Test with minimum values', expectedResult: 'System handles minimum values' },
        { id: 's2', order: 2, action: 'Test with maximum values', expectedResult: 'System handles maximum values' },
        { id: 's3', order: 3, action: 'Test with empty/null values', expectedResult: 'System handles gracefully' },
      ],
      expectedResult: 'All boundary conditions are handled correctly',
      priority: 'medium',
      type: 'manual',
      tags: ['boundary', ticketId.toLowerCase()],
      selected: true,
    },
    {
      id: 'gen-4',
      title: `Verify ${ticketId} - Permission check`,
      description: `Ensure proper authorization for ${ticketId} feature`,
      preconditions: 'Multiple user roles available',
      steps: [
        { id: 's1', order: 1, action: 'Log in as admin user', expectedResult: 'Full access granted' },
        { id: 's2', order: 2, action: 'Log in as regular user', expectedResult: 'Limited access as expected' },
        { id: 's3', order: 3, action: 'Try accessing without login', expectedResult: 'Redirected to login page' },
      ],
      expectedResult: 'Feature respects role-based access control',
      priority: 'high',
      type: 'manual',
      tags: ['security', ticketId.toLowerCase()],
      selected: false,
    },
  ];
};

interface GenerateFromJiraDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAccept: (testCases: Partial<TestCase>[]) => void;
}

export const GenerateFromJiraDialog = ({ open, onOpenChange, onAccept }: GenerateFromJiraDialogProps) => {
  const [ticketId, setTicketId] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generated, setGenerated] = useState<GeneratedTestCase[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { activeProvider, activeModel, isConfigured } = useAIConfigStore();
  const providerLabel = AI_PROVIDERS.find(p => p.provider === activeProvider)?.label || activeProvider;

  const handleGenerate = async () => {
    if (!ticketId.trim()) return;
    setIsGenerating(true);
    setGenerated([]);
    try {
      const results = await mockGenerateTestCases(ticketId.trim().toUpperCase());
      setGenerated(results);
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleSelect = (id: string) => {
    setGenerated(prev => prev.map(g => g.id === id ? { ...g, selected: !g.selected } : g));
  };

  const handleAccept = () => {
    const selected = generated.filter(g => g.selected);
    onAccept(selected.map(g => ({
      title: g.title,
      description: g.description,
      preconditions: g.preconditions,
      steps: g.steps,
      expectedResult: g.expectedResult,
      priority: g.priority,
      type: g.type,
      tags: g.tags,
      jiraTicketId: ticketId.trim().toUpperCase(),
      jiraSyncStatus: 'synced' as const,
      projectId: '1',
      suiteId: '1',
    })));
    onOpenChange(false);
    setGenerated([]);
    setTicketId('');
  };

  const selectedCount = generated.filter(g => g.selected).length;

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
            <Button onClick={handleGenerate} disabled={!ticketId.trim() || isGenerating}>
              {isGenerating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              {isGenerating ? 'Analyzing...' : 'Generate'}
            </Button>
          </div>

          {/* Mock Jira Ticket Preview */}
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

          {/* Generated Results */}
          {generated.length > 0 && (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">
                  Generated {generated.length} test cases • {selectedCount} selected
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
            <Button onClick={handleAccept} disabled={selectedCount === 0} className="gap-2">
              <Check className="h-4 w-4" />
              Accept {selectedCount} Test Case{selectedCount !== 1 ? 's' : ''}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
