import { useState, useEffect, useMemo, useCallback } from 'react';
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
  Shield,
  Activity,
  ChevronDown,
  ChevronRight,
  Copy,
  Terminal,
  Eye,
  Monitor,
  Zap,
  Square,
  ImageIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
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
  DialogDescription,
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
  useCancelExecution,
  useStartCodegen,
  useCodegenStatus,
  useStopCodegen,
  useCompleteCodegen,
} from '@/hooks/useAutomation';
import { automationService } from '@/services/modules/automation.service';
import { httpClient } from '@/services/http-client';
import type { AutomationScript, ScriptExecution, BrowserType, StructuredLogs } from '@/types';
import { formatDistanceToNow, format } from 'date-fns';
import { toast } from 'sonner';

interface AutomationPanelProps {
  testCaseId: string;
  projectId: string;
  testCaseHasSteps: boolean;
}

const statusConfig: Record<string, { icon: typeof CheckCircle2; color: string; label: string; bg: string }> = {
  draft:   { icon: Code2,        color: 'text-muted-foreground', label: 'Draft',   bg: 'bg-muted' },
  ready:   { icon: CheckCircle2, color: 'text-blue-500',         label: 'Ready',   bg: 'bg-blue-50 dark:bg-blue-950/20' },
  running: { icon: Loader2,      color: 'text-amber-500',        label: 'Running', bg: 'bg-amber-50 dark:bg-amber-950/20' },
  passed:  { icon: CheckCircle2, color: 'text-green-500',        label: 'Passed',  bg: 'bg-green-50 dark:bg-green-950/20' },
  failed:  { icon: XCircle,      color: 'text-red-500',          label: 'Failed',  bg: 'bg-red-50 dark:bg-red-950/20' },
  error:   { icon: AlertCircle,  color: 'text-red-500',          label: 'Error',   bg: 'bg-red-50 dark:bg-red-950/20' },
  queued:  { icon: Clock,        color: 'text-muted-foreground', label: 'Queued',  bg: 'bg-muted' },
  healed:  { icon: Shield,       color: 'text-purple-500',       label: 'Healed',  bg: 'bg-purple-50 dark:bg-purple-950/20' },
};

export const AutomationPanel = ({ testCaseId, projectId, testCaseHasSteps }: AutomationPanelProps) => {
  const { data: scripts = [], isLoading } = useAutomationScripts(testCaseId);
  const generateScript = useGenerateScript();
  const importCodegen = useImportCodegenScript();
  const updateScript = useUpdateScript();
  const deleteScript = useDeleteScript();
  const executeScript = useExecuteScript();

  // Codegen recording hooks
  const startCodegen = useStartCodegen();
  const stopCodegen = useStopCodegen();
  const completeCodegen = useCompleteCodegen();

  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [targetUrl, setTargetUrl] = useState('');
  const [browserType, setBrowserType] = useState<BrowserType>('chromium');
  const [codegenScript, setCodegenScript] = useState('');
  const [selectedScriptId, setSelectedScriptId] = useState<string | null>(null);
  const [codegenSessionId, setCodegenSessionId] = useState<string | null>(null);
  const [generationMode, setGenerationMode] = useState<'record' | 'paste' | 'ai-only'>('record');

  // Poll codegen status while recording
  const { data: codegenStatus } = useCodegenStatus(codegenSessionId || undefined);

  const activeScript = selectedScriptId
    ? scripts.find((s) => s.id === selectedScriptId)
    : scripts[0] || null;

  const isRecording = codegenStatus?.status === 'recording';
  const recordingDone = codegenStatus?.status === 'completed' && !!codegenStatus?.recordedScript;

  // Handle starting codegen recording
  const handleStartRecording = () => {
    startCodegen.mutate(
      { testCaseId, projectId, targetUrl: targetUrl || undefined, browserType },
      {
        onSuccess: (result) => {
          setCodegenSessionId(result.sessionId);
          toast.success('Browser opened — perform your test flow, then close the browser');
        },
        onError: (err: any) => toast.error(err.message || 'Failed to start codegen'),
      },
    );
  };

  // Handle stopping codegen recording
  const handleStopRecording = () => {
    if (!codegenSessionId) return;
    stopCodegen.mutate(codegenSessionId, {
      onSuccess: () => toast.info('Recording stopped'),
      onError: (err: any) => toast.error(err.message || 'Failed to stop recording'),
    });
  };

  // Handle completing codegen flow (recorded script → AI → final script)
  const handleCompleteCodegen = () => {
    if (!codegenSessionId) return;
    completeCodegen.mutate(codegenSessionId, {
      onSuccess: (script) => {
        setSelectedScriptId(script.id);
        setGenerateDialogOpen(false);
        setCodegenSessionId(null);
        toast.success('Script generated from codegen recording + AI');
      },
      onError: (err: any) => toast.error(err.message || 'Failed to generate script from recording'),
    });
  };

  // Handle manual paste / AI-only generation
  const handleGenerate = () => {
    generateScript.mutate(
      {
        testCaseId,
        projectId,
        targetUrl: targetUrl || undefined,
        browserType,
        codegenScript: codegenScript.trim() || undefined,
      },
      {
        onSuccess: (script) => {
          setSelectedScriptId(script.id);
          setGenerateDialogOpen(false);
          setCodegenScript('');
          toast.success(
            codegenScript.trim()
              ? 'Script generated from codegen + test case'
              : 'Script generated from test case steps',
          );
        },
        onError: (err: any) => toast.error(err.message || 'Failed to generate script'),
      },
    );
  };

  const cancelExecution = useCancelExecution();

  const handleExecute = (script: AutomationScript, headless: boolean) => {
    executeScript.mutate(
      { scriptId: script.id, options: { enableHealing: true, headless } },
      {
        onSuccess: () => toast.success('Execution started — watching progress...'),
        onError: (err: any) => toast.error(err.message || 'Failed to start execution'),
      },
    );
  };

  const handleCancel = (executionId: string) => {
    cancelExecution.mutate(executionId, {
      onSuccess: () => toast.info('Execution cancelled'),
      onError: (err: any) => toast.error(err.message || 'Failed to cancel'),
    });
  };

  const handleDelete = (script: AutomationScript) => {
    deleteScript.mutate(script.id, {
      onSuccess: () => {
        if (selectedScriptId === script.id) setSelectedScriptId(null);
        toast.success('Script deleted');
      },
    });
  };

  // Reset dialog state when closing
  const handleDialogClose = (open: boolean) => {
    if (!open) {
      // Don't allow closing while recording
      if (isRecording) return;
      setCodegenSessionId(null);
      setCodegenScript('');
    }
    setGenerateDialogOpen(open);
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
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Playwright Automation
            </CardTitle>
            <Button
              size="sm"
              onClick={() => setGenerateDialogOpen(true)}
              disabled={!testCaseHasSteps}
            >
              <Sparkles className="h-4 w-4 mr-1" />
              {scripts.length > 0 ? 'New Script' : 'Generate Script'}
            </Button>
          </div>
        </CardHeader>

        {scripts.length === 0 ? (
          <CardContent>
            <div className="border border-dashed rounded-lg p-8 text-center space-y-4">
              <Code2 className="h-10 w-10 mx-auto text-muted-foreground" />
              <div>
                <p className="font-medium">No automation scripts yet</p>
                <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                  {testCaseHasSteps
                    ? 'Click "Generate Script" to record your test flow in a browser. The platform will capture your actions and AI will turn them into a production-ready Playwright script.'
                    : 'Add test steps first, then generate an automation script.'}
                </p>
              </div>
              {testCaseHasSteps && (
                <div className="flex justify-center gap-3">
                  <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3 max-w-xs text-left">
                    <p className="font-medium mb-1">How it works:</p>
                    <ol className="list-decimal list-inside space-y-0.5">
                      <li>Click "Generate Script" → choose "Record"</li>
                      <li>A browser opens — perform your test flow</li>
                      <li>Close the browser when done</li>
                      <li>AI merges your recording with test case steps</li>
                    </ol>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        ) : (
          <CardContent className="space-y-4">
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

            {activeScript && (
              <ScriptDetail
                script={activeScript}
                onExecute={(headless) => handleExecute(activeScript, headless)}
                onCancel={handleCancel}
                onDelete={() => handleDelete(activeScript)}
                onUpdate={(data) =>
                  updateScript.mutate({ id: activeScript.id, data }, { onSuccess: () => toast.success('Script updated') })
                }
                isExecuting={executeScript.isPending}
                isCancelling={cancelExecution.isPending}
              />
            )}
          </CardContent>
        )}
      </Card>

      {/* Generate Dialog — Record / Paste / AI-only */}
      <Dialog open={generateDialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Generate Playwright Script</DialogTitle>
            <DialogDescription>
              Record your test flow in a browser, or let AI generate from test case steps directly.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Mode selection tabs */}
            <Tabs value={generationMode} onValueChange={(v) => setGenerationMode(v as typeof generationMode)}>
              <TabsList className="w-full">
                <TabsTrigger value="record" className="flex-1 gap-1.5">
                  <Monitor className="h-3.5 w-3.5" />
                  Record (Recommended)
                </TabsTrigger>
                <TabsTrigger value="paste" className="flex-1 gap-1.5">
                  <Upload className="h-3.5 w-3.5" />
                  Paste Codegen
                </TabsTrigger>
                <TabsTrigger value="ai-only" className="flex-1 gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" />
                  AI Only
                </TabsTrigger>
              </TabsList>

              {/* ── Record Mode ──────────────────────────────────────────── */}
              <TabsContent value="record" className="space-y-4 mt-4">
                {!codegenSessionId ? (
                  <>
                    <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                      <p className="text-sm font-medium text-blue-700 dark:text-blue-400 mb-2">How it works</p>
                      <ol className="text-xs text-blue-600 dark:text-blue-300 space-y-1 list-decimal list-inside">
                        <li>Enter your target URL and click <strong>"Start Recording"</strong></li>
                        <li>A browser window opens — perform your test actions</li>
                        <li>Close the browser when you're done</li>
                        <li>The recording is automatically fed to AI along with your test case steps and Jira context</li>
                        <li>AI produces a production-ready script with proper assertions and structure</li>
                      </ol>
                    </div>

                    {/* URL + Browser config */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Target URL</Label>
                        <Input
                          placeholder="https://your-app.com"
                          value={targetUrl}
                          onChange={(e) => setTargetUrl(e.target.value)}
                        />
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

                    <Button
                      className="w-full"
                      size="lg"
                      onClick={handleStartRecording}
                      disabled={startCodegen.isPending}
                    >
                      {startCodegen.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Play className="h-4 w-4 mr-2" />
                      )}
                      Start Recording
                    </Button>
                  </>
                ) : isRecording ? (
                  /* Recording in progress */
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-4 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
                      <div className="relative">
                        <div className="h-3 w-3 bg-red-500 rounded-full animate-pulse" />
                        <div className="absolute inset-0 h-3 w-3 bg-red-500 rounded-full animate-ping" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-red-700 dark:text-red-400">Recording in progress...</p>
                        <p className="text-xs text-red-600 dark:text-red-300 mt-0.5">
                          A browser window should be open. Perform your test actions, then close the browser to finish recording.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                      <span>Started {codegenStatus?.startedAt ? formatDistanceToNow(new Date(codegenStatus.startedAt), { addSuffix: true }) : ''}</span>
                      <span className="flex items-center gap-1">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Waiting for browser to close...
                      </span>
                    </div>

                    <Button
                      variant="outline"
                      className="w-full text-red-600 hover:text-red-600"
                      onClick={handleStopRecording}
                      disabled={stopCodegen.isPending}
                    >
                      {stopCodegen.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <XCircle className="h-4 w-4 mr-2" />}
                      Stop Recording
                    </Button>
                  </div>
                ) : recordingDone ? (
                  /* Recording complete — show preview and generate button */
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
                      <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-green-700 dark:text-green-400">Recording captured!</p>
                        <p className="text-xs text-green-600 dark:text-green-300">
                          {codegenStatus!.recordedScript!.split('\n').length} lines of Playwright code recorded
                        </p>
                      </div>
                    </div>

                    {/* Preview of recorded script */}
                    <div className="relative rounded-lg border bg-[#1e1e2e] overflow-hidden">
                      <div className="flex items-center justify-between px-3 py-1.5 bg-[#2a2a3e] border-b border-white/10">
                        <span className="text-[11px] text-gray-400">Recorded Script Preview</span>
                        <button
                          className="text-[11px] text-gray-400 hover:text-white transition-colors"
                          onClick={() => { navigator.clipboard.writeText(codegenStatus!.recordedScript!); toast.success('Copied'); }}
                        >
                          <Copy className="h-3 w-3" />
                        </button>
                      </div>
                      <pre className="p-3 overflow-auto max-h-[200px] text-xs font-mono whitespace-pre text-gray-300">
                        {codegenStatus!.recordedScript}
                      </pre>
                    </div>

                    <Button
                      className="w-full"
                      size="lg"
                      onClick={handleCompleteCodegen}
                      disabled={completeCodegen.isPending}
                    >
                      {completeCodegen.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          AI is enhancing your recording...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4 mr-2" />
                          Generate Script with AI
                        </>
                      )}
                    </Button>
                  </div>
                ) : codegenStatus?.status === 'failed' ? (
                  /* Recording failed */
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
                      <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-red-700 dark:text-red-400">Recording failed</p>
                        <p className="text-xs text-red-600 dark:text-red-300">{codegenStatus.error}</p>
                      </div>
                    </div>
                    <Button variant="outline" className="w-full" onClick={() => setCodegenSessionId(null)}>
                      Try Again
                    </Button>
                  </div>
                ) : null}
              </TabsContent>

              {/* ── Paste Mode ──────────────────────────────────────────── */}
              <TabsContent value="paste" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Code2 className="h-4 w-4" />
                    Paste Codegen Recording
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    If you already have a codegen recording (from <code className="bg-muted px-1 rounded">npx playwright codegen</code>), paste it below.
                  </p>
                  <Textarea
                    placeholder={`// Paste codegen output here\nimport { test, expect } from '@playwright/test';\n\ntest('recorded test', async ({ page }) => {\n  await page.goto('...');\n  ...\n});`}
                    className="min-h-[200px] font-mono text-xs"
                    value={codegenScript}
                    onChange={(e) => setCodegenScript(e.target.value)}
                  />
                  {codegenScript.trim() && (
                    <p className="text-xs text-green-600 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Codegen detected — AI will use real DOM selectors
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Target URL</Label>
                    <Input placeholder="https://your-app.com" value={targetUrl} onChange={(e) => setTargetUrl(e.target.value)} />
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

                <Button className="w-full" onClick={handleGenerate} disabled={generateScript.isPending || !codegenScript.trim()}>
                  {generateScript.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                  Enhance with AI
                </Button>
              </TabsContent>

              {/* ── AI-Only Mode ─────────────────────────────────────────── */}
              <TabsContent value="ai-only" className="space-y-4 mt-4">
                <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    <strong>Note:</strong> AI-only mode generates scripts purely from test case steps without real DOM context.
                    The "Record" mode is recommended for more accurate selectors.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Target URL</Label>
                    <Input placeholder="https://your-app.com" value={targetUrl} onChange={(e) => setTargetUrl(e.target.value)} />
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

                <Button className="w-full" onClick={handleGenerate} disabled={generateScript.isPending}>
                  {generateScript.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                  Generate from Test Steps
                </Button>
              </TabsContent>
            </Tabs>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => handleDialogClose(false)} disabled={isRecording}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ─── Script Detail ───────────────────────────────────────────────────────────

function ScriptDetail({
  script,
  onExecute,
  onCancel,
  onDelete,
  onUpdate,
  isExecuting,
  isCancelling,
}: {
  script: AutomationScript;
  onExecute: (headless: boolean) => void;
  onCancel: (executionId: string) => void;
  onDelete: () => void;
  onUpdate: (data: Partial<AutomationScript>) => void;
  isExecuting: boolean;
  isCancelling: boolean;
}) {
  const [editMode, setEditMode] = useState(false);
  const [editedScript, setEditedScript] = useState(script.activeScript || '');
  const [headless, setHeadless] = useState(true);
  const { data: executions = [] } = useScriptExecutions(script.id);
  const cfg = statusConfig[script.status] || statusConfig.draft;
  const StatusIcon = cfg.icon;

  // Find the currently running execution (if any) for cancel
  const runningExecution = executions.find((e) => e.status === 'running');
  const isRunning = script.status === 'running' && !!runningExecution;

  const handleSaveEdit = () => {
    onUpdate({ activeScript: editedScript });
    setEditMode(false);
  };

  return (
    <Tabs defaultValue="script" className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <TabsList>
          <TabsTrigger value="script">Script</TabsTrigger>
          <TabsTrigger value="executions">
            Runs {executions.length > 0 && <Badge variant="secondary" className="ml-1.5 h-5 px-1.5">{executions.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="details">Info</TabsTrigger>
        </TabsList>

        <div className="flex items-center gap-3">
          {/* Status pill */}
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.bg}`}>
            <StatusIcon className={`h-3.5 w-3.5 ${cfg.color} ${script.status === 'running' ? 'animate-spin' : ''}`} />
            <span className={cfg.color}>{cfg.label}</span>
          </div>

          {/* Headless toggle */}
          <label className="flex items-center gap-1.5 text-xs cursor-pointer select-none" title="Run without visible browser window">
            <input type="checkbox" checked={headless} onChange={(e) => setHeadless(e.target.checked)} className="h-3.5 w-3.5 rounded" />
            <Eye className="h-3 w-3 text-muted-foreground" />
            Headless
          </label>

          {/* Run / Cancel button */}
          {isRunning ? (
            <Button
              size="sm"
              variant="destructive"
              onClick={() => onCancel(runningExecution.id)}
              disabled={isCancelling}
            >
              {isCancelling ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Square className="h-3.5 w-3.5 mr-1" />}
              Cancel
            </Button>
          ) : (
            <Button size="sm" onClick={() => onExecute(headless)} disabled={isExecuting || !script.activeScript}>
              {isExecuting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Play className="h-4 w-4 mr-1" />}
              Run
            </Button>
          )}
        </div>
      </div>

      {/* Running progress indicator */}
      {isRunning && <RunningIndicator onCancel={() => onCancel(runningExecution.id)} isCancelling={isCancelling} />}

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
            {script.healingAttempts > 0 && (
              <Badge variant="secondary" className="gap-1"><Shield className="h-3 w-3" />Healed x{script.healingAttempts}</Badge>
            )}
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { navigator.clipboard.writeText(script.activeScript || ''); toast.success('Copied'); }} title="Copy">
              <Copy className="h-4 w-4" />
            </Button>
            {editMode ? (
              <>
                <Button size="sm" variant="outline" onClick={() => { setEditMode(false); setEditedScript(script.activeScript || ''); }}>Cancel</Button>
                <Button size="sm" onClick={handleSaveEdit}>Save</Button>
              </>
            ) : (
              <Button variant="ghost" size="sm" onClick={() => { setEditedScript(script.activeScript || ''); setEditMode(true); }}>Edit</Button>
            )}
          </div>
        </div>

        {editMode ? (
          <Textarea value={editedScript} onChange={(e) => setEditedScript(e.target.value)} className="min-h-[400px] font-mono text-xs" />
        ) : (
          <div className="relative rounded-lg border bg-[#1e1e2e] overflow-hidden">
            <pre className="p-4 overflow-auto max-h-[500px] text-xs font-mono whitespace-pre text-gray-200">
              {script.activeScript || 'No script content'}
            </pre>
          </div>
        )}
      </TabsContent>

      {/* Executions Tab */}
      <TabsContent value="executions">
        <ExecutionHistory executions={executions} />
      </TabsContent>

      {/* Details Tab */}
      <TabsContent value="details" className="space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
          <InfoItem label="Total Runs" value={String(script.totalRuns)} />
          <InfoItem label="Pass Rate" value={script.totalRuns > 0 ? `${script.stabilityScore}%` : 'N/A'} />
          <InfoItem label="Last Run" value={script.lastRunAt ? formatDistanceToNow(new Date(script.lastRunAt), { addSuffix: true }) : 'Never'} />
          <InfoItem label="Last Duration" value={script.lastRunDuration ? `${(script.lastRunDuration / 1000).toFixed(1)}s` : 'N/A'} />
          <InfoItem label="Self-Healing" value={`${script.healingAttempts}/${script.maxHealingAttempts}`} />
          <InfoItem label="Target URL" value={script.targetUrl || 'Not set'} />
        </div>
        <Separator />
        <div className="flex justify-end">
          <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={onDelete}>
            <Trash2 className="h-4 w-4 mr-1" /> Delete Script
          </Button>
        </div>
      </TabsContent>
    </Tabs>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-muted-foreground text-xs">{label}</span>
      <p className="font-medium truncate">{value}</p>
    </div>
  );
}

// ─── Running Indicator ──────────────────────────────────────────────────────

function RunningIndicator({ onCancel, isCancelling }: { onCancel: () => void; isCancelling: boolean }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const formatElapsed = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
      <Loader2 className="h-4 w-4 animate-spin text-amber-500 shrink-0" />
      <div className="flex-1 space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium text-amber-700 dark:text-amber-400">Executing test...</span>
          <span className="text-amber-600 dark:text-amber-500">{formatElapsed(elapsed)}</span>
        </div>
        <div className="h-1.5 rounded-full bg-amber-200 dark:bg-amber-800 overflow-hidden">
          <div className="h-full bg-amber-500 rounded-full animate-pulse" style={{ width: '100%' }} />
        </div>
      </div>
      <Button
        size="sm"
        variant="ghost"
        className="shrink-0 text-amber-700 hover:text-red-600 hover:bg-red-50 dark:text-amber-400 dark:hover:text-red-400 dark:hover:bg-red-950/20 h-7 px-2"
        onClick={onCancel}
        disabled={isCancelling}
      >
        {isCancelling ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Square className="h-3.5 w-3.5" />}
        <span className="ml-1 text-xs">Stop</span>
      </Button>
    </div>
  );
}

// ─── Execution History ──────────────────────────────────────────────────────

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
      {executions.map((exec) => (
        <ExecutionItem
          key={exec.id}
          exec={exec}
          isExpanded={expandedId === exec.id}
          onToggle={() => setExpandedId(expandedId === exec.id ? null : exec.id)}
        />
      ))}
    </div>
  );
}

function ExecutionItem({ exec, isExpanded, onToggle }: { exec: ScriptExecution; isExpanded: boolean; onToggle: () => void }) {
  const cfg = statusConfig[exec.status] || statusConfig.queued;
  const StatusIcon = cfg.icon;
  const logs = useParsedLogs(exec.logs);
  const hasScreenshots = exec.screenshots && exec.screenshots.length > 0;
  const hasVideo = !!exec.videoPath;
  const hasAssets = hasScreenshots || hasVideo;
  const hasLogs = !!(logs?.stdout || logs?.stderr);

  return (
    <Collapsible open={isExpanded} onOpenChange={onToggle}>
      <CollapsibleTrigger asChild>
        <button className={`w-full flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors text-left ${cfg.bg}`}>
          {isExpanded ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
          <StatusIcon className={`h-4 w-4 shrink-0 ${cfg.color} ${exec.status === 'running' ? 'animate-spin' : ''}`} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{cfg.label}</span>
              {exec.healingApplied && <Badge variant="secondary" className="text-xs gap-1"><Shield className="h-3 w-3" />Healed</Badge>}
              {logs && logs.summary.totalTests > 0 && (
                <span className="text-xs text-muted-foreground">
                  {logs.summary.passedTests}/{logs.summary.totalTests} passed
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {exec.startedAt ? format(new Date(exec.startedAt), 'MMM d, HH:mm:ss') : 'Queued'}
              {exec.duration && ` \u00B7 ${(exec.duration / 1000).toFixed(1)}s`}
            </p>
          </div>
          <Badge variant="outline" className="text-xs capitalize shrink-0">{exec.browserType}</Badge>
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="ml-4 mt-1 border rounded-lg bg-background overflow-hidden">
          {/* Summary bar — always visible at top */}
          {logs && (
            <div className="p-3 border-b">
              <ExecutionSummary logs={logs} />
            </div>
          )}

          {/* Tabbed content: Result | Logs | Assets */}
          <Tabs defaultValue="result" className="w-full">
            <div className="border-b px-3">
              <TabsList className="h-8 bg-transparent p-0 gap-0">
                <TabsTrigger value="result" className="h-8 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-3 text-xs gap-1.5">
                  <Activity className="h-3 w-3" />
                  Result
                </TabsTrigger>
                <TabsTrigger value="logs" className="h-8 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-3 text-xs gap-1.5" disabled={!hasLogs && !exec.errorMessage}>
                  <Terminal className="h-3 w-3" />
                  Logs
                </TabsTrigger>
                <TabsTrigger value="assets" className="h-8 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-3 text-xs gap-1.5" disabled={!hasAssets}>
                  <ImageIcon className="h-3 w-3" />
                  Assets
                  {hasAssets && (
                    <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                      {(exec.screenshots?.length || 0) + (hasVideo ? 1 : 0)}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>
            </div>

            {/* ── Result Tab ────────────────────────────────── */}
            <TabsContent value="result" className="p-3 mt-0 space-y-3">
              {/* Step results */}
              {logs?.steps && logs.steps.length > 0 && (
                <div className="space-y-1">
                  {logs.steps.map((step, i) => (
                    <StepResultItem key={i} step={step} index={i} />
                  ))}
                </div>
              )}

              {/* Error display when no steps */}
              {exec.errorMessage && !logs?.steps?.length && (
                <div>
                  <p className="text-xs font-medium text-red-500 mb-1 flex items-center gap-1"><AlertCircle className="h-3 w-3" />Error</p>
                  <pre className="text-xs bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-300 p-3 rounded border border-red-200 dark:border-red-800 overflow-auto max-h-[200px] whitespace-pre-wrap">
                    {exec.errorMessage}
                  </pre>
                </div>
              )}

              {/* Healing info */}
              {exec.healingDetails && (
                <div className="p-2 rounded bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 text-xs">
                  <p className="font-medium text-purple-600 flex items-center gap-1 mb-1"><Shield className="h-3 w-3" />Self-Healing Applied</p>
                  <p className="text-muted-foreground">
                    Attempt {exec.healingDetails.attempt} via {exec.healingDetails.provider}/{exec.healingDetails.model}
                    {exec.healingDetails.timestamp && ` at ${format(new Date(exec.healingDetails.timestamp), 'HH:mm:ss')}`}
                  </p>
                </div>
              )}

              {/* Empty state */}
              {!logs?.steps?.length && !exec.errorMessage && (
                <p className="text-xs text-muted-foreground text-center py-4">No step-level results available</p>
              )}
            </TabsContent>

            {/* ── Logs Tab ──────────────────────────────────── */}
            <TabsContent value="logs" className="p-3 mt-0 space-y-3">
              {exec.errorMessage && (
                <div>
                  <p className="text-xs font-medium text-red-500 mb-1 flex items-center gap-1"><AlertCircle className="h-3 w-3" />Error</p>
                  <pre className="text-xs bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-300 p-3 rounded border border-red-200 dark:border-red-800 overflow-auto max-h-[200px] whitespace-pre-wrap">
                    {exec.errorMessage}
                  </pre>
                </div>
              )}
              {logs?.stdout && (
                <div>
                  <p className="text-xs font-medium mb-1 flex items-center gap-1"><Terminal className="h-3 w-3" />Console Output</p>
                  <pre className="text-[11px] bg-[#1e1e2e] text-gray-300 p-3 rounded border overflow-auto max-h-[300px] whitespace-pre-wrap">
                    {logs.stdout}
                  </pre>
                </div>
              )}
              {logs?.stderr && (
                <div>
                  <p className="text-xs font-medium mb-1 flex items-center gap-1 text-red-500"><AlertCircle className="h-3 w-3" />Error Output</p>
                  <pre className="text-[11px] bg-[#1e1e2e] text-red-300 p-3 rounded border overflow-auto max-h-[300px] whitespace-pre-wrap">
                    {logs.stderr}
                  </pre>
                </div>
              )}
              {!logs?.stdout && !logs?.stderr && !exec.errorMessage && (
                <p className="text-xs text-muted-foreground text-center py-4">No log output available</p>
              )}
            </TabsContent>

            {/* ── Assets Tab ───────────────────────────────── */}
            <TabsContent value="assets" className="p-3 mt-0 space-y-4">
              <ExecutionArtifacts exec={exec} />
              {!hasAssets && (
                <p className="text-xs text-muted-foreground text-center py-4">No screenshots or videos captured</p>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

// ─── Step Result Item (expandable with actions) ─────────────────────────────

function StepResultItem({ step, index }: { step: StructuredLogs['steps'][number]; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const sc = statusConfig[step.status] || statusConfig.draft;
  const SI = sc.icon;
  const hasActions = step.actions && step.actions.length > 0;
  const hasDetails = hasActions || step.error || step.snippet;

  return (
    <div className={`rounded border text-xs ${sc.bg}`}>
      <button
        onClick={() => hasDetails && setExpanded(!expanded)}
        className={`w-full flex items-start gap-2 p-2 text-left ${hasDetails ? 'cursor-pointer hover:bg-muted/30' : 'cursor-default'}`}
      >
        {hasDetails ? (
          expanded ? <ChevronDown className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" />
        ) : (
          <SI className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${sc.color}`} />
        )}
        <SI className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${sc.color}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium">
              <span className="text-muted-foreground mr-1">#{index + 1}</span>
              {step.name}
            </span>
            <div className="flex items-center gap-2 shrink-0">
              <Badge variant={step.status === 'passed' ? 'default' : step.status === 'failed' ? 'destructive' : 'secondary'} className="text-[10px] h-4 px-1.5">
                {step.status}
              </Badge>
              <span className="text-muted-foreground">{step.duration}</span>
            </div>
          </div>
        </div>
      </button>

      {expanded && (
        <div className="px-3 pb-3 pt-0 space-y-2 border-t ml-5">
          {/* Individual actions within this test */}
          {hasActions && (
            <div className="space-y-0.5 mt-2">
              {step.actions!.map((action, ai) => {
                const actionPassed = action.status === 'passed';
                return (
                  <div key={ai} className={`flex items-center gap-2 py-1 px-2 rounded ${actionPassed ? 'bg-green-50/50 dark:bg-green-950/10' : 'bg-red-50/50 dark:bg-red-950/10'}`}>
                    {actionPassed ? (
                      <CheckCircle2 className="h-3 w-3 text-green-500 shrink-0" />
                    ) : (
                      <XCircle className="h-3 w-3 text-red-500 shrink-0" />
                    )}
                    <span className="flex-1 font-mono text-[11px] truncate" title={action.title}>{action.title}</span>
                    <span className="text-muted-foreground text-[10px] shrink-0">{action.duration}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Error details */}
          {step.error && (
            <div className="mt-2">
              <pre className="text-red-600 dark:text-red-400 whitespace-pre-wrap break-words text-[11px] bg-red-50 dark:bg-red-950/20 p-2 rounded">{step.error}</pre>
            </div>
          )}
          {step.snippet && (
            <pre className="text-muted-foreground whitespace-pre-wrap text-[11px] bg-muted p-2 rounded">{step.snippet}</pre>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Execution Summary Bar ──────────────────────────────────────────────────

function ExecutionSummary({ logs }: { logs: StructuredLogs }) {
  const { summary } = logs;
  const passPercent = summary.totalTests > 0
    ? Math.round((summary.passedTests / summary.totalTests) * 100)
    : (summary.passed ? 100 : 0);

  return (
    <div className="flex items-center gap-4 p-2 rounded bg-muted/30 text-xs">
      <div className="flex items-center gap-1">
        <span className="font-medium">{summary.duration}</span>
      </div>
      <Separator orientation="vertical" className="h-4" />
      <div className="flex items-center gap-3">
        {summary.totalTests > 0 ? (
          <>
            {summary.passedTests > 0 && (
              <span className="flex items-center gap-1 text-green-600"><CheckCircle2 className="h-3 w-3" />{summary.passedTests} passed</span>
            )}
            {summary.failedTests > 0 && (
              <span className="flex items-center gap-1 text-red-500"><XCircle className="h-3 w-3" />{summary.failedTests} failed</span>
            )}
            {summary.skippedTests > 0 && (
              <span className="flex items-center gap-1 text-muted-foreground">{summary.skippedTests} skipped</span>
            )}
          </>
        ) : (
          <span className="flex items-center gap-1 text-muted-foreground">
            {summary.passed ? (
              <><CheckCircle2 className="h-3 w-3 text-green-500" />All checks passed</>
            ) : (
              <><XCircle className="h-3 w-3 text-red-500" />Execution failed</>
            )}
          </span>
        )}
      </div>
      <div className="ml-auto">
        <Badge variant={passPercent === 100 ? 'default' : passPercent > 0 ? 'secondary' : 'destructive'}>
          {passPercent}% pass rate
        </Badge>
      </div>
    </div>
  );
}

// ─── Authenticated Artifact Hook ─────────────────────────────────────────────

/** Fetch an artifact with JWT auth and return an object URL */
function useArtifactBlobUrl(executionId: string, filename: string | null): string | null {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!filename) return;
    let objectUrl = '';
    let cancelled = false;

    httpClient
      .get(`/automation/executions/${executionId}/artifacts/${filename}`, { responseType: 'blob' })
      .then((r) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(r.data as Blob);
        setBlobUrl(objectUrl);
      })
      .catch(() => {
        if (!cancelled) setBlobUrl(null);
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [executionId, filename]);

  return blobUrl;
}

// ─── Execution Artifacts (Screenshots, Video) ───────────────────────────────

function ExecutionArtifacts({ exec }: { exec: ScriptExecution }) {
  const [previewIdx, setPreviewIdx] = useState<number | null>(null);
  const hasScreenshots = exec.screenshots && exec.screenshots.length > 0;
  const hasVideo = !!exec.videoPath;

  if (!hasScreenshots && !hasVideo) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium flex items-center gap-1"><ImageIcon className="h-3 w-3" />Artifacts</p>

      {/* Screenshots */}
      {hasScreenshots && (
        <div className="flex gap-2 flex-wrap">
          {exec.screenshots.map((filename, i) => (
            <ArtifactThumbnail
              key={i}
              executionId={exec.id}
              filename={filename}
              index={i}
              onClick={() => setPreviewIdx(i)}
            />
          ))}
        </div>
      )}

      {/* Video */}
      {hasVideo && <ArtifactVideo executionId={exec.id} filename={exec.videoPath!} />}

      {/* Screenshot preview dialog */}
      {previewIdx !== null && hasScreenshots && (
        <ArtifactPreviewDialog
          executionId={exec.id}
          filename={exec.screenshots[previewIdx]}
          onClose={() => setPreviewIdx(null)}
        />
      )}
    </div>
  );
}

function ArtifactThumbnail({ executionId, filename, index, onClick }: { executionId: string; filename: string; index: number; onClick: () => void }) {
  const blobUrl = useArtifactBlobUrl(executionId, filename);

  return (
    <button
      onClick={onClick}
      className="group relative w-24 h-16 rounded border overflow-hidden hover:ring-2 ring-primary transition-all bg-muted"
    >
      {blobUrl ? (
        <img src={blobUrl} alt={`Screenshot ${index + 1}`} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      )}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
        <Eye className="h-4 w-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </button>
  );
}

function ArtifactVideo({ executionId, filename }: { executionId: string; filename: string }) {
  const blobUrl = useArtifactBlobUrl(executionId, filename);

  if (!blobUrl) {
    return (
      <div className="rounded border bg-black h-[200px] flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-white/50" />
      </div>
    );
  }

  return (
    <div className="rounded border overflow-hidden bg-black">
      <video controls className="w-full max-h-[300px]" src={blobUrl}>
        Your browser does not support the video tag.
      </video>
    </div>
  );
}

function ArtifactPreviewDialog({ executionId, filename, onClose }: { executionId: string; filename: string; onClose: () => void }) {
  const blobUrl = useArtifactBlobUrl(executionId, filename);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl p-2">
        {blobUrl ? (
          <img src={blobUrl} alt="Screenshot preview" className="w-full rounded" />
        ) : (
          <div className="h-[400px] flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function useParsedLogs(rawLogs: string | null): StructuredLogs | null {
  return useMemo(() => {
    if (!rawLogs) return null;
    try {
      return JSON.parse(rawLogs) as StructuredLogs;
    } catch {
      // Legacy plain-text logs — wrap in basic structure
      return {
        summary: { passed: false, duration: '?', totalTests: 0, passedTests: 0, failedTests: 0, skippedTests: 0 },
        steps: [],
        error: null,
        stdout: rawLogs,
        stderr: null,
      };
    }
  }, [rawLogs]);
}
