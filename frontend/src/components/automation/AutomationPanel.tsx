import { useState } from 'react';
import {
  Play,
  Sparkles,
  Upload,
  Code2,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Trash2,
  Settings2,
  Shield,
  Activity,
  ChevronDown,
  ChevronRight,
  Copy,
  RotateCcw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  useAutomationScripts,
  useGenerateScript,
  useImportCodegenScript,
  useUpdateScript,
  useDeleteScript,
  useExecuteScript,
  useScriptExecutions,
} from '@/hooks/useAutomation';
import type { AutomationScript, ScriptExecution, BrowserType } from '@/types';
import { formatDistanceToNow, format } from 'date-fns';
import { toast } from 'sonner';

interface AutomationPanelProps {
  testCaseId: string;
  projectId: string;
  testCaseHasSteps: boolean;
}

const statusConfig: Record<string, { icon: typeof CheckCircle2; color: string; label: string }> = {
  draft: { icon: Code2, color: 'text-muted-foreground', label: 'Draft' },
  ready: { icon: CheckCircle2, color: 'text-blue-500', label: 'Ready' },
  running: { icon: Loader2, color: 'text-yellow-500', label: 'Running' },
  passed: { icon: CheckCircle2, color: 'text-green-500', label: 'Passed' },
  failed: { icon: XCircle, color: 'text-red-500', label: 'Failed' },
  error: { icon: AlertCircle, color: 'text-red-500', label: 'Error' },
  queued: { icon: Clock, color: 'text-muted-foreground', label: 'Queued' },
  healed: { icon: Shield, color: 'text-purple-500', label: 'Healed' },
};

export const AutomationPanel = ({ testCaseId, projectId, testCaseHasSteps }: AutomationPanelProps) => {
  const { data: scripts = [], isLoading } = useAutomationScripts(testCaseId);
  const generateScript = useGenerateScript();
  const importCodegen = useImportCodegenScript();
  const updateScript = useUpdateScript();
  const deleteScript = useDeleteScript();
  const executeScript = useExecuteScript();

  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [targetUrl, setTargetUrl] = useState('');
  const [browserType, setBrowserType] = useState<BrowserType>('chromium');
  const [rawCodegen, setRawCodegen] = useState('');
  const [selectedScriptId, setSelectedScriptId] = useState<string | null>(null);

  const activeScript = selectedScriptId
    ? scripts.find((s) => s.id === selectedScriptId)
    : scripts[0] || null;

  const handleGenerate = () => {
    generateScript.mutate(
      { testCaseId, projectId, targetUrl: targetUrl || undefined, browserType },
      {
        onSuccess: (script) => {
          setSelectedScriptId(script.id);
          setGenerateDialogOpen(false);
          toast.success('Playwright script generated successfully');
        },
        onError: (err: any) => toast.error(err.message || 'Failed to generate script'),
      },
    );
  };

  const handleImport = () => {
    if (!rawCodegen.trim()) { toast.error('Paste your codegen script'); return; }
    importCodegen.mutate(
      { testCaseId, projectId, rawScript: rawCodegen, targetUrl: targetUrl || undefined },
      {
        onSuccess: (script) => {
          setSelectedScriptId(script.id);
          setImportDialogOpen(false);
          setRawCodegen('');
          toast.success('Codegen script imported and refactored');
        },
        onError: (err: any) => toast.error(err.message || 'Failed to import script'),
      },
    );
  };

  const handleExecute = (script: AutomationScript, headless: boolean) => {
    executeScript.mutate(
      { scriptId: script.id, options: { enableHealing: true, headless } },
      {
        onSuccess: () => toast.success('Execution started'),
        onError: (err: any) => toast.error(err.message || 'Failed to start execution'),
      },
    );
  };

  const handleDelete = (script: AutomationScript) => {
    deleteScript.mutate(script.id, {
      onSuccess: () => {
        if (selectedScriptId === script.id) setSelectedScriptId(null);
        toast.success('Script deleted');
      },
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header Actions */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Code2 className="h-4 w-4" />
              Playwright Automation
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setImportDialogOpen(true)}
              >
                <Upload className="h-4 w-4 mr-1" />
                Import Codegen
              </Button>
              <Button
                size="sm"
                onClick={() => setGenerateDialogOpen(true)}
                disabled={!testCaseHasSteps}
              >
                <Sparkles className="h-4 w-4 mr-1" />
                Generate Script
              </Button>
            </div>
          </div>
        </CardHeader>

        {scripts.length === 0 ? (
          <CardContent>
            <div className="border border-dashed rounded-lg p-8 text-center space-y-3">
              <Code2 className="h-10 w-10 mx-auto text-muted-foreground" />
              <div>
                <p className="font-medium">No automation scripts yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {testCaseHasSteps
                    ? 'Generate a Playwright script from test case steps using AI, or import a codegen recording.'
                    : 'Add test steps first, then generate an automation script.'}
                </p>
              </div>
            </div>
          </CardContent>
        ) : (
          <CardContent className="space-y-4">
            {/* Script Selector (if multiple) */}
            {scripts.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {scripts.map((s) => {
                  const cfg = statusConfig[s.status] || statusConfig.draft;
                  return (
                    <button
                      key={s.id}
                      onClick={() => setSelectedScriptId(s.id)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm whitespace-nowrap transition-colors ${
                        activeScript?.id === s.id ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                      }`}
                    >
                      <cfg.icon className={`h-3.5 w-3.5 ${cfg.color} ${s.status === 'running' ? 'animate-spin' : ''}`} />
                      <span className="truncate max-w-[200px]">{s.name}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Active Script Details */}
            {activeScript && (
              <ScriptDetail
                script={activeScript}
                onExecute={(headless: boolean) => handleExecute(activeScript, headless)}
                onDelete={() => handleDelete(activeScript)}
                onUpdate={(data) =>
                  updateScript.mutate(
                    { id: activeScript.id, data },
                    { onSuccess: () => toast.success('Script updated') },
                  )
                }
                isExecuting={executeScript.isPending}
              />
            )}
          </CardContent>
        )}
      </Card>

      {/* Generate Dialog */}
      <Dialog open={generateDialogOpen} onOpenChange={setGenerateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate Playwright Script</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Target URL (optional)</Label>
              <Input
                placeholder="https://your-app.com"
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">Base URL for the application under test</p>
            </div>
            <div>
              <Label>Browser</Label>
              <Select value={browserType} onValueChange={(v) => setBrowserType(v as BrowserType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="chromium">Chromium</SelectItem>
                  <SelectItem value="firefox">Firefox</SelectItem>
                  <SelectItem value="webkit">WebKit</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGenerateDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleGenerate} disabled={generateScript.isPending}>
              {generateScript.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />}
              Generate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Codegen Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Import Playwright Codegen Script</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Target URL (optional)</Label>
              <Input
                placeholder="https://your-app.com"
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
              />
            </div>
            <div>
              <Label>Raw Codegen Script</Label>
              <Textarea
                placeholder={`Paste your Playwright codegen output here...\n\nRun: npx playwright codegen https://your-app.com`}
                className="min-h-[300px] font-mono text-xs"
                value={rawCodegen}
                onChange={(e) => setRawCodegen(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                AI will automatically refactor selectors, add assertions, and clean up the script.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleImport} disabled={importCodegen.isPending}>
              {importCodegen.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}
              Import & Refactor
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ─── Script Detail Sub-Component ──────────────────────────────────────────────

function ScriptDetail({
  script,
  onExecute,
  onDelete,
  onUpdate,
  isExecuting,
}: {
  script: AutomationScript;
  onExecute: (headless: boolean) => void;
  onDelete: () => void;
  onUpdate: (data: Partial<AutomationScript>) => void;
  isExecuting: boolean;
}) {
  const [editMode, setEditMode] = useState(false);
  const [editedScript, setEditedScript] = useState(script.activeScript || '');
  const [headless, setHeadless] = useState(true);
  const { data: executions = [] } = useScriptExecutions(script.id);
  const cfg = statusConfig[script.status] || statusConfig.draft;
  const StatusIcon = cfg.icon;

  const handleSaveEdit = () => {
    onUpdate({ activeScript: editedScript });
    setEditMode(false);
  };

  const copyScript = () => {
    navigator.clipboard.writeText(script.activeScript || '');
    toast.success('Script copied to clipboard');
  };

  return (
    <Tabs defaultValue="script" className="space-y-4">
      <div className="flex items-center justify-between">
        <TabsList>
          <TabsTrigger value="script">Script</TabsTrigger>
          <TabsTrigger value="executions">
            Executions {executions.length > 0 && <Badge variant="secondary" className="ml-1.5 h-5 px-1.5">{executions.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
        </TabsList>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-sm">
            <StatusIcon className={`h-4 w-4 ${cfg.color} ${script.status === 'running' ? 'animate-spin' : ''}`} />
            <span className={cfg.color}>{cfg.label}</span>
          </div>
          <label className="flex items-center gap-1.5 text-xs cursor-pointer select-none">
            <input
              type="checkbox"
              checked={headless}
              onChange={(e) => setHeadless(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-muted-foreground"
            />
            Headless
          </label>
          <Button
            size="sm"
            onClick={() => onExecute(headless)}
            disabled={isExecuting || script.status === 'running' || !script.activeScript}
          >
            {isExecuting || script.status === 'running' ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Play className="h-4 w-4 mr-1" />
            )}
            Run
          </Button>
        </div>
      </div>

      {/* Script Tab */}
      <TabsContent value="script" className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="capitalize">{script.source.replace('_', ' ')}</Badge>
            <Badge variant="outline">{script.browserType}</Badge>
            {script.stabilityScore > 0 && (
              <Badge variant={script.stabilityScore >= 80 ? 'default' : script.stabilityScore >= 50 ? 'secondary' : 'destructive'}>
                {script.stabilityScore}% stable
              </Badge>
            )}
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={copyScript} title="Copy script">
              <Copy className="h-4 w-4" />
            </Button>
            {editMode ? (
              <>
                <Button size="sm" variant="outline" onClick={() => { setEditMode(false); setEditedScript(script.activeScript || ''); }}>Cancel</Button>
                <Button size="sm" onClick={handleSaveEdit}>Save</Button>
              </>
            ) : (
              <Button variant="ghost" size="sm" onClick={() => { setEditedScript(script.activeScript || ''); setEditMode(true); }}>
                Edit
              </Button>
            )}
          </div>
        </div>

        {editMode ? (
          <Textarea
            value={editedScript}
            onChange={(e) => setEditedScript(e.target.value)}
            className="min-h-[400px] font-mono text-xs"
          />
        ) : (
          <div className="relative rounded-lg border bg-muted/30 overflow-hidden">
            <pre className="p-4 overflow-auto max-h-[500px] text-xs font-mono whitespace-pre">
              {script.activeScript || 'No script content'}
            </pre>
          </div>
        )}

        {script.healingAttempts > 0 && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800">
            <Shield className="h-4 w-4 text-purple-500" />
            <span className="text-sm">
              Self-healing applied {script.healingAttempts}/{script.maxHealingAttempts} times
            </span>
          </div>
        )}
      </TabsContent>

      {/* Executions Tab */}
      <TabsContent value="executions">
        <ExecutionHistory executions={executions} />
      </TabsContent>

      {/* Details Tab */}
      <TabsContent value="details" className="space-y-3">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Total Runs</span>
            <p className="font-medium">{script.totalRuns}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Pass Rate</span>
            <p className="font-medium">{script.totalRuns > 0 ? `${script.stabilityScore}%` : 'N/A'}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Last Run</span>
            <p className="font-medium">
              {script.lastRunAt ? formatDistanceToNow(new Date(script.lastRunAt), { addSuffix: true }) : 'Never'}
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">Last Duration</span>
            <p className="font-medium">
              {script.lastRunDuration ? `${(script.lastRunDuration / 1000).toFixed(1)}s` : 'N/A'}
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">Healing Attempts</span>
            <p className="font-medium">{script.healingAttempts}/{script.maxHealingAttempts}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Target URL</span>
            <p className="font-medium truncate">{script.targetUrl || 'Not set'}</p>
          </div>
        </div>
        <Separator />
        <div className="flex justify-end">
          <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={onDelete}>
            <Trash2 className="h-4 w-4 mr-1" />
            Delete Script
          </Button>
        </div>
      </TabsContent>
    </Tabs>
  );
}

// ─── Execution History Sub-Component ──────────────────────────────────────────

function ExecutionHistory({ executions }: { executions: ScriptExecution[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (executions.length === 0) {
    return (
      <div className="border border-dashed rounded-lg p-6 text-center text-muted-foreground">
        <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No executions yet. Run the script to see results.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {executions.map((exec) => {
        const cfg = statusConfig[exec.status] || statusConfig.queued;
        const StatusIcon = cfg.icon;
        const isExpanded = expandedId === exec.id;

        return (
          <Collapsible key={exec.id} open={isExpanded} onOpenChange={(open) => setExpandedId(open ? exec.id : null)}>
            <CollapsibleTrigger asChild>
              <button className="w-full flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors text-left">
                {isExpanded ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
                <StatusIcon className={`h-4 w-4 shrink-0 ${cfg.color} ${exec.status === 'running' ? 'animate-spin' : ''}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{cfg.label}</span>
                    {exec.healingApplied && <Badge variant="secondary" className="text-xs"><Shield className="h-3 w-3 mr-1" />Healed</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {exec.startedAt ? format(new Date(exec.startedAt), 'MMM d, HH:mm:ss') : 'Queued'}
                    {exec.duration && ` - ${(exec.duration / 1000).toFixed(1)}s`}
                  </p>
                </div>
                <Badge variant="outline" className="text-xs capitalize">{exec.browserType}</Badge>
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="ml-8 mt-1 p-3 border rounded-lg bg-muted/20 space-y-3">
                {exec.errorMessage && (
                  <div>
                    <p className="text-xs font-medium text-red-500 mb-1">Error</p>
                    <pre className="text-xs bg-red-50 dark:bg-red-950/20 p-2 rounded border border-red-200 dark:border-red-800 overflow-auto max-h-[150px] whitespace-pre-wrap">
                      {exec.errorMessage}
                    </pre>
                  </div>
                )}
                {exec.logs && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Logs</p>
                    <pre className="text-xs bg-muted p-2 rounded border overflow-auto max-h-[200px] whitespace-pre-wrap">
                      {exec.logs}
                    </pre>
                  </div>
                )}
                {exec.healingDetails && (
                  <div>
                    <p className="text-xs font-medium text-purple-500 mb-1">Healing Details</p>
                    <pre className="text-xs bg-purple-50 dark:bg-purple-950/20 p-2 rounded border border-purple-200 dark:border-purple-800 overflow-auto max-h-[100px]">
                      {JSON.stringify(exec.healingDetails, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        );
      })}
    </div>
  );
}
