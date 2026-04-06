import { useState, useEffect, useMemo, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import {
  Play, Sparkles, Upload, Code2, Clock, CheckCircle2, XCircle,
  AlertCircle, Loader2, Trash2, Shield, Activity, ChevronDown,
  ChevronRight, Copy, Terminal, Eye, Monitor, Zap, Square, ImageIcon,
  Maximize2, Minimize2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  useAutomationScripts, useGenerateScript, useImportCodegenScript,
  useUpdateScript, useDeleteScript, useExecuteScript, useScriptExecutions,
  useCancelExecution, useStartCodegen, useCodegenStatus, useStopCodegen,
  useCompleteCodegen,
} from '@/hooks/useAutomation';
import { httpClient } from '@/services/http-client';
import type { AutomationScript, ScriptExecution, BrowserType, StructuredLogs } from '@/types';
import { formatDistanceToNow, format } from 'date-fns';
import { toast } from 'sonner';

// ─── Constants ───────────────────────────────────────────────────────────────

interface AutomationPanelProps {
  testCaseId: string;
  projectId: string;
  testCaseHasSteps: boolean;
}

type GenerationMode = 'record' | 'paste' | 'ai-only';

const STATUS_CONFIG: Record<string, { icon: typeof CheckCircle2; color: string; label: string; bg: string }> = {
  draft:   { icon: Code2,        color: 'text-muted-foreground', label: 'Draft',   bg: 'bg-muted' },
  ready:   { icon: CheckCircle2, color: 'text-blue-500',         label: 'Ready',   bg: 'bg-blue-50 dark:bg-blue-950/20' },
  running: { icon: Loader2,      color: 'text-amber-500',        label: 'Running', bg: 'bg-amber-50 dark:bg-amber-950/20' },
  passed:  { icon: CheckCircle2, color: 'text-green-500',        label: 'Passed',  bg: 'bg-green-50 dark:bg-green-950/20' },
  failed:  { icon: XCircle,      color: 'text-red-500',          label: 'Failed',  bg: 'bg-red-50 dark:bg-red-950/20' },
  error:   { icon: AlertCircle,  color: 'text-red-500',          label: 'Error',   bg: 'bg-red-50 dark:bg-red-950/20' },
  queued:  { icon: Clock,        color: 'text-muted-foreground', label: 'Queued',  bg: 'bg-muted' },
  healed:  { icon: Shield,       color: 'text-purple-500',       label: 'Healed',  bg: 'bg-purple-50 dark:bg-purple-950/20' },
};

const MONACO_OPTIONS_READONLY = {
  readOnly: true,
  minimap: { enabled: true },
  fontSize: 13,
  lineNumbers: 'on' as const,
  scrollBeyondLastLine: false,
  automaticLayout: true,
  wordWrap: 'on' as const,
  padding: { top: 12, bottom: 12 },
  renderLineHighlight: 'none' as const,
  domReadOnly: true,
};

const MONACO_OPTIONS_EDITABLE = {
  minimap: { enabled: true },
  fontSize: 13,
  lineNumbers: 'on' as const,
  scrollBeyondLastLine: false,
  automaticLayout: true,
  wordWrap: 'on' as const,
  padding: { top: 12, bottom: 12 },
  tabSize: 2,
  formatOnPaste: true,
  bracketPairColorization: { enabled: true },
  guides: { bracketPairs: true },
};

const BROWSER_OPTIONS: { value: BrowserType; label: string }[] = [
  { value: 'chromium', label: 'Chromium' },
  { value: 'firefox', label: 'Firefox' },
  { value: 'webkit', label: 'WebKit' },
];

function getStatusConfig(status: string) {
  return STATUS_CONFIG[status] || STATUS_CONFIG.draft;
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text);
  toast.success('Copied to clipboard');
}

// ─── Monaco Editor Shell (shared fullscreen wrapper) ─────────────────────────

function MonacoEditorShell({
  value,
  onChange,
  height = '400px',
  readOnly = false,
  allowFullscreen = true,
  language = 'typescript',
}: {
  value: string;
  onChange?: (value: string) => void;
  height?: string;
  readOnly?: boolean;
  allowFullscreen?: boolean;
  language?: string;
}) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (!isFullscreen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsFullscreen(false);
    };
    document.addEventListener('keydown', handleEsc);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [isFullscreen]);

  const options = readOnly ? MONACO_OPTIONS_READONLY : MONACO_OPTIONS_EDITABLE;

  const editorLoading = (
    <div className="flex items-center justify-center h-full bg-[#1e1e1e]">
      <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
    </div>
  );

  const toolbar = (
    <div className="flex items-center justify-between px-3 py-1.5 bg-[#252526] border-b border-[#3c3c3c]">
      <span className="text-[11px] text-[#969696] font-medium select-none">
        {readOnly ? 'Read Only' : 'Editor'} — {language}
      </span>
      <div className="flex items-center gap-1">
        {!readOnly && (
          <span className="text-[10px] text-[#969696] mr-2 select-none">
            {value.split('\n').length} lines
          </span>
        )}
        {allowFullscreen && (
          <button
            onClick={() => setIsFullscreen((f) => !f)}
            className="p-1 rounded hover:bg-[#3c3c3c] text-[#969696] hover:text-white transition-colors"
            title={isFullscreen ? 'Exit fullscreen (Esc)' : 'Expand to fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </button>
        )}
      </div>
    </div>
  );

  // Fullscreen overlay
  if (isFullscreen) {
    return (
      <>
        {/* Collapsed placeholder so layout doesn't jump */}
        <div className="rounded-lg border overflow-hidden bg-[#1e1e1e]" style={{ height }}>
          <div className="flex items-center justify-center h-full text-xs text-[#969696]">
            Editor is in fullscreen mode — press <kbd className="mx-1 px-1.5 py-0.5 rounded bg-[#3c3c3c] text-[#cccccc] font-mono text-[10px]">Esc</kbd> to exit
          </div>
        </div>
        {/* Fullscreen overlay */}
        <div className="fixed inset-0 z-50 bg-[#1e1e1e] flex flex-col">
          {toolbar}
          <div className="flex-1 min-h-0">
            <Editor
              height="100%"
              language={language}
              value={value || (readOnly ? '// No script content' : '')}
              theme="vs-dark"
              onChange={readOnly ? undefined : (v) => onChange?.(v || '')}
              options={{ ...options, minimap: { enabled: true } }}
              loading={editorLoading}
            />
          </div>
          <div className="flex items-center justify-between px-3 py-1.5 bg-[#007acc] text-white text-[11px]">
            <span>{value.split('\n').length} lines</span>
            <div className="flex items-center gap-3">
              <span>TypeScript</span>
              <span>UTF-8</span>
              <button
                onClick={() => setIsFullscreen(false)}
                className="flex items-center gap-1 hover:opacity-80 transition-opacity"
              >
                <Minimize2 className="h-3 w-3" /> Exit Fullscreen
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Normal inline mode
  return (
    <div className="rounded-lg border overflow-hidden">
      {toolbar}
      <Editor
        height={height}
        language={language}
        value={value || (readOnly ? '// No script content' : '')}
        theme="vs-dark"
        onChange={readOnly ? undefined : (v) => onChange?.(v || '')}
        options={options}
        loading={editorLoading}
      />
    </div>
  );
}

// ─── Monaco Code Viewer (read-only) ─────────────────────────────────────────

function CodeViewer({ value, height = '400px', allowFullscreen = true }: { value: string; height?: string; allowFullscreen?: boolean }) {
  return <MonacoEditorShell value={value} height={height} readOnly allowFullscreen={allowFullscreen} />;
}

// ─── Monaco Code Editor (editable) ──────────────────────────────────────────

function CodeEditor({
  value,
  onChange,
  height = '450px',
  allowFullscreen = true,
}: {
  value: string;
  onChange: (value: string) => void;
  height?: string;
  allowFullscreen?: boolean;
}) {
  return <MonacoEditorShell value={value} onChange={onChange} height={height} allowFullscreen={allowFullscreen} />;
}

// ─── Browser Select (reusable) ──────────────────────────────────────────────

function BrowserSelect({ value, onChange }: { value: BrowserType; onChange: (v: BrowserType) => void }) {
  return (
    <div>
      <Label>Browser</Label>
      <Select value={value} onValueChange={(v) => onChange(v as BrowserType)}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          {BROWSER_OPTIONS.map((b) => (
            <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

// ─── URL + Browser Config Row (reusable) ────────────────────────────────────

function UrlBrowserConfig({
  targetUrl,
  onUrlChange,
  browserType,
  onBrowserChange,
}: {
  targetUrl: string;
  onUrlChange: (v: string) => void;
  browserType: BrowserType;
  onBrowserChange: (v: BrowserType) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <Label>Target URL</Label>
        <Input placeholder="https://your-app.com" value={targetUrl} onChange={(e) => onUrlChange(e.target.value)} />
      </div>
      <BrowserSelect value={browserType} onChange={onBrowserChange} />
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export const AutomationPanel = ({ testCaseId, projectId, testCaseHasSteps }: AutomationPanelProps) => {
  const { data: scripts = [], isLoading } = useAutomationScripts(testCaseId);
  const generateScript = useGenerateScript();
  const updateScript = useUpdateScript();
  const deleteScript = useDeleteScript();
  const executeScript = useExecuteScript();
  const cancelExecution = useCancelExecution();

  const startCodegen = useStartCodegen();
  const stopCodegen = useStopCodegen();
  const completeCodegen = useCompleteCodegen();

  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [targetUrl, setTargetUrl] = useState('');
  const [browserType, setBrowserType] = useState<BrowserType>('chromium');
  const [codegenScript, setCodegenScript] = useState('');
  const [selectedScriptId, setSelectedScriptId] = useState<string | null>(null);
  const [codegenSessionId, setCodegenSessionId] = useState<string | null>(null);
  const [generationMode, setGenerationMode] = useState<GenerationMode>('record');

  const { data: codegenStatus } = useCodegenStatus(codegenSessionId || undefined);

  const activeScript = selectedScriptId
    ? scripts.find((s) => s.id === selectedScriptId)
    : scripts[0] || null;

  const isRecording = codegenStatus?.status === 'recording';
  const recordingDone = codegenStatus?.status === 'completed' && !!codegenStatus?.recordedScript;

  // ── Handlers ────────────────────────────────────────────────────────────

  const handleStartRecording = useCallback(() => {
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
  }, [startCodegen, testCaseId, projectId, targetUrl, browserType]);

  const handleStopRecording = useCallback(() => {
    if (!codegenSessionId) return;
    stopCodegen.mutate(codegenSessionId, {
      onSuccess: () => toast.info('Recording stopped'),
      onError: (err: any) => toast.error(err.message || 'Failed to stop recording'),
    });
  }, [stopCodegen, codegenSessionId]);

  const handleCompleteCodegen = useCallback(() => {
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
  }, [completeCodegen, codegenSessionId]);

  const handleGenerate = useCallback(() => {
    generateScript.mutate(
      {
        testCaseId, projectId,
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
  }, [generateScript, testCaseId, projectId, targetUrl, browserType, codegenScript]);

  const handleExecute = useCallback((script: AutomationScript, headless: boolean) => {
    executeScript.mutate(
      { scriptId: script.id, options: { enableHealing: true, headless } },
      {
        onSuccess: () => toast.success('Execution started — watching progress...'),
        onError: (err: any) => toast.error(err.message || 'Failed to start execution'),
      },
    );
  }, [executeScript]);

  const handleCancel = useCallback((executionId: string) => {
    cancelExecution.mutate(executionId, {
      onSuccess: () => toast.info('Execution cancelled'),
      onError: (err: any) => toast.error(err.message || 'Failed to cancel'),
    });
  }, [cancelExecution]);

  const handleDelete = useCallback((script: AutomationScript) => {
    deleteScript.mutate(script.id, {
      onSuccess: () => {
        if (selectedScriptId === script.id) setSelectedScriptId(null);
        toast.success('Script deleted');
      },
    });
  }, [deleteScript, selectedScriptId]);

  const handleDialogClose = useCallback((open: boolean) => {
    if (!open && isRecording) return;
    if (!open) {
      setCodegenSessionId(null);
      setCodegenScript('');
    }
    setGenerateDialogOpen(open);
  }, [isRecording]);

  // ── Loading state ───────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Playwright Automation
            </CardTitle>
            <Button size="sm" onClick={() => setGenerateDialogOpen(true)} disabled={!testCaseHasSteps}>
              <Sparkles className="h-4 w-4 mr-1" />
              {scripts.length > 0 ? 'New Script' : 'Generate Script'}
            </Button>
          </div>
        </CardHeader>

        {scripts.length === 0 ? (
          <CardContent>
            <EmptyScriptsState hasSteps={testCaseHasSteps} />
          </CardContent>
        ) : (
          <CardContent className="space-y-4">
            {scripts.length > 1 && (
              <ScriptTabs scripts={scripts} activeId={activeScript?.id} onSelect={setSelectedScriptId} />
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

      {/* Generate Dialog */}
      <GenerateDialog
        open={generateDialogOpen}
        onOpenChange={handleDialogClose}
        generationMode={generationMode}
        onModeChange={setGenerationMode}
        targetUrl={targetUrl}
        onUrlChange={setTargetUrl}
        browserType={browserType}
        onBrowserChange={setBrowserType}
        codegenScript={codegenScript}
        onCodegenScriptChange={setCodegenScript}
        codegenSessionId={codegenSessionId}
        codegenStatus={codegenStatus}
        isRecording={isRecording}
        recordingDone={recordingDone}
        onStartRecording={handleStartRecording}
        onStopRecording={handleStopRecording}
        onCompleteCodegen={handleCompleteCodegen}
        onGenerate={handleGenerate}
        onResetSession={() => setCodegenSessionId(null)}
        isStartingCodegen={startCodegen.isPending}
        isStoppingCodegen={stopCodegen.isPending}
        isCompletingCodegen={completeCodegen.isPending}
        isGenerating={generateScript.isPending}
      />
    </div>
  );
};

// ─── Empty State ─────────────────────────────────────────────────────────────

function EmptyScriptsState({ hasSteps }: { hasSteps: boolean }) {
  return (
    <div className="border border-dashed rounded-lg p-8 text-center space-y-4">
      <Code2 className="h-10 w-10 mx-auto text-muted-foreground" />
      <div>
        <p className="font-medium">No automation scripts yet</p>
        <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
          {hasSteps
            ? 'Click "Generate Script" to record your test flow in a browser. The platform will capture your actions and AI will turn them into a production-ready Playwright script.'
            : 'Add test steps first, then generate an automation script.'}
        </p>
      </div>
      {hasSteps && (
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
  );
}

// ─── Script Tabs (multi-script selector) ─────────────────────────────────────

function ScriptTabs({
  scripts,
  activeId,
  onSelect,
}: {
  scripts: AutomationScript[];
  activeId?: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2">
      {scripts.map((s) => {
        const cfg = getStatusConfig(s.status);
        return (
          <button
            key={s.id}
            onClick={() => onSelect(s.id)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm whitespace-nowrap transition-colors ${
              activeId === s.id ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
            }`}
          >
            <cfg.icon className={`h-3.5 w-3.5 ${cfg.color} ${s.status === 'running' ? 'animate-spin' : ''}`} />
            <span className="truncate max-w-[200px]">{s.name}</span>
          </button>
        );
      })}
    </div>
  );
}

// ─── Generate Dialog ─────────────────────────────────────────────────────────

function GenerateDialog({
  open, onOpenChange, generationMode, onModeChange,
  targetUrl, onUrlChange, browserType, onBrowserChange,
  codegenScript, onCodegenScriptChange,
  codegenSessionId, codegenStatus,
  isRecording, recordingDone,
  onStartRecording, onStopRecording, onCompleteCodegen, onGenerate, onResetSession,
  isStartingCodegen, isStoppingCodegen, isCompletingCodegen, isGenerating,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  generationMode: GenerationMode;
  onModeChange: (v: GenerationMode) => void;
  targetUrl: string;
  onUrlChange: (v: string) => void;
  browserType: BrowserType;
  onBrowserChange: (v: BrowserType) => void;
  codegenScript: string;
  onCodegenScriptChange: (v: string) => void;
  codegenSessionId: string | null;
  codegenStatus: any;
  isRecording: boolean;
  recordingDone: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onCompleteCodegen: () => void;
  onGenerate: () => void;
  onResetSession: () => void;
  isStartingCodegen: boolean;
  isStoppingCodegen: boolean;
  isCompletingCodegen: boolean;
  isGenerating: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Generate Playwright Script</DialogTitle>
          <DialogDescription>
            Record your test flow in a browser, or let AI generate from test case steps directly.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <Tabs value={generationMode} onValueChange={(v) => onModeChange(v as GenerationMode)}>
            <TabsList className="w-full">
              <TabsTrigger value="record" className="flex-1 gap-1.5">
                <Monitor className="h-3.5 w-3.5" /> Record (Recommended)
              </TabsTrigger>
              <TabsTrigger value="paste" className="flex-1 gap-1.5">
                <Upload className="h-3.5 w-3.5" /> Paste Codegen
              </TabsTrigger>
              <TabsTrigger value="ai-only" className="flex-1 gap-1.5">
                <Sparkles className="h-3.5 w-3.5" /> AI Only
              </TabsTrigger>
            </TabsList>

            {/* Record Mode */}
            <TabsContent value="record" className="space-y-4 mt-4">
              <RecordModeContent
                codegenSessionId={codegenSessionId}
                codegenStatus={codegenStatus}
                isRecording={isRecording}
                recordingDone={recordingDone}
                targetUrl={targetUrl}
                onUrlChange={onUrlChange}
                browserType={browserType}
                onBrowserChange={onBrowserChange}
                onStartRecording={onStartRecording}
                onStopRecording={onStopRecording}
                onCompleteCodegen={onCompleteCodegen}
                onResetSession={onResetSession}
                isStarting={isStartingCodegen}
                isStopping={isStoppingCodegen}
                isCompleting={isCompletingCodegen}
              />
            </TabsContent>

            {/* Paste Mode */}
            <TabsContent value="paste" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Code2 className="h-4 w-4" /> Paste Codegen Recording
                </Label>
                <p className="text-xs text-muted-foreground">
                  If you already have a codegen recording (from <code className="bg-muted px-1 rounded">npx playwright codegen</code>), paste it below.
                </p>
                <CodeEditor
                  value={codegenScript}
                  onChange={onCodegenScriptChange}
                  height="220px"
                  allowFullscreen={false}
                />
                {codegenScript.trim() && (
                  <p className="text-xs text-green-600 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Codegen detected — AI will use real DOM selectors
                  </p>
                )}
              </div>
              <UrlBrowserConfig
                targetUrl={targetUrl} onUrlChange={onUrlChange}
                browserType={browserType} onBrowserChange={onBrowserChange}
              />
              <Button className="w-full" onClick={onGenerate} disabled={isGenerating || !codegenScript.trim()}>
                {isGenerating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                Enhance with AI
              </Button>
            </TabsContent>

            {/* AI-Only Mode */}
            <TabsContent value="ai-only" className="space-y-4 mt-4">
              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  <strong>Note:</strong> AI-only mode generates scripts purely from test case steps without real DOM context.
                  The "Record" mode is recommended for more accurate selectors.
                </p>
              </div>
              <UrlBrowserConfig
                targetUrl={targetUrl} onUrlChange={onUrlChange}
                browserType={browserType} onBrowserChange={onBrowserChange}
              />
              <Button className="w-full" onClick={onGenerate} disabled={isGenerating}>
                {isGenerating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                Generate from Test Steps
              </Button>
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isRecording}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Record Mode Content ─────────────────────────────────────────────────────

function RecordModeContent({
  codegenSessionId, codegenStatus, isRecording, recordingDone,
  targetUrl, onUrlChange, browserType, onBrowserChange,
  onStartRecording, onStopRecording, onCompleteCodegen, onResetSession,
  isStarting, isStopping, isCompleting,
}: {
  codegenSessionId: string | null;
  codegenStatus: any;
  isRecording: boolean;
  recordingDone: boolean;
  targetUrl: string;
  onUrlChange: (v: string) => void;
  browserType: BrowserType;
  onBrowserChange: (v: BrowserType) => void;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onCompleteCodegen: () => void;
  onResetSession: () => void;
  isStarting: boolean;
  isStopping: boolean;
  isCompleting: boolean;
}) {
  // Initial state — show config + start button
  if (!codegenSessionId) {
    return (
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
        <UrlBrowserConfig
          targetUrl={targetUrl} onUrlChange={onUrlChange}
          browserType={browserType} onBrowserChange={onBrowserChange}
        />
        <Button className="w-full" size="lg" onClick={onStartRecording} disabled={isStarting}>
          {isStarting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
          Start Recording
        </Button>
      </>
    );
  }

  // Recording in progress
  if (isRecording) {
    return (
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
          <span>
            Started {codegenStatus?.startedAt ? formatDistanceToNow(new Date(codegenStatus.startedAt), { addSuffix: true }) : ''}
          </span>
          <span className="flex items-center gap-1">
            <Loader2 className="h-3 w-3 animate-spin" /> Waiting for browser to close...
          </span>
        </div>
        <Button variant="outline" className="w-full text-red-600 hover:text-red-600" onClick={onStopRecording} disabled={isStopping}>
          {isStopping ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <XCircle className="h-4 w-4 mr-2" />}
          Stop Recording
        </Button>
      </div>
    );
  }

  // Recording complete — preview + generate
  if (recordingDone) {
    const recordedScript = codegenStatus!.recordedScript!;
    const lineCount = recordedScript.split('\n').length;

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
          <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
          <div>
            <p className="text-sm font-medium text-green-700 dark:text-green-400">Recording captured!</p>
            <p className="text-xs text-green-600 dark:text-green-300">{lineCount} lines of Playwright code recorded</p>
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-medium text-muted-foreground">Recorded Script Preview</span>
            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => copyToClipboard(recordedScript)}>
              <Copy className="h-3 w-3 mr-1" /> Copy
            </Button>
          </div>
          <CodeViewer value={recordedScript} height="200px" allowFullscreen={false} />
        </div>

        <Button className="w-full" size="lg" onClick={onCompleteCodegen} disabled={isCompleting}>
          {isCompleting ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> AI is enhancing your recording...</>
          ) : (
            <><Sparkles className="h-4 w-4 mr-2" /> Generate Script with AI</>
          )}
        </Button>
      </div>
    );
  }

  // Recording failed
  if (codegenStatus?.status === 'failed') {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
          <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
          <div>
            <p className="text-sm font-medium text-red-700 dark:text-red-400">Recording failed</p>
            <p className="text-xs text-red-600 dark:text-red-300">{codegenStatus.error}</p>
          </div>
        </div>
        <Button variant="outline" className="w-full" onClick={onResetSession}>Try Again</Button>
      </div>
    );
  }

  return null;
}

// ─── Script Detail ───────────────────────────────────────────────────────────

function ScriptDetail({
  script, onExecute, onCancel, onDelete, onUpdate, isExecuting, isCancelling,
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

  const cfg = getStatusConfig(script.status);
  const StatusIcon = cfg.icon;
  const runningExecution = executions.find((e) => e.status === 'running');
  const isRunning = script.status === 'running' && !!runningExecution;

  const handleSaveEdit = useCallback(() => {
    onUpdate({ activeScript: editedScript });
    setEditMode(false);
  }, [onUpdate, editedScript]);

  const handleCancelEdit = useCallback(() => {
    setEditMode(false);
    setEditedScript(script.activeScript || '');
  }, [script.activeScript]);

  const handleStartEdit = useCallback(() => {
    setEditedScript(script.activeScript || '');
    setEditMode(true);
  }, [script.activeScript]);

  return (
    <Tabs defaultValue="script" className="space-y-4">
      {/* Header: tabs + controls */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <TabsList>
          <TabsTrigger value="script">Script</TabsTrigger>
          <TabsTrigger value="executions">
            Runs {executions.length > 0 && <Badge variant="secondary" className="ml-1.5 h-5 px-1.5">{executions.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="details">Info</TabsTrigger>
        </TabsList>

        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.bg}`}>
            <StatusIcon className={`h-3.5 w-3.5 ${cfg.color} ${script.status === 'running' ? 'animate-spin' : ''}`} />
            <span className={cfg.color}>{cfg.label}</span>
          </div>

          <label className="flex items-center gap-1.5 text-xs cursor-pointer select-none" title="Run without visible browser window">
            <input type="checkbox" checked={headless} onChange={(e) => setHeadless(e.target.checked)} className="h-3.5 w-3.5 rounded" />
            <Eye className="h-3 w-3 text-muted-foreground" /> Headless
          </label>

          {isRunning ? (
            <Button size="sm" variant="destructive" onClick={() => onCancel(runningExecution.id)} disabled={isCancelling}>
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
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => copyToClipboard(script.activeScript || '')} title="Copy">
              <Copy className="h-4 w-4" />
            </Button>
            {editMode ? (
              <>
                <Button size="sm" variant="outline" onClick={handleCancelEdit}>Cancel</Button>
                <Button size="sm" onClick={handleSaveEdit}>Save</Button>
              </>
            ) : (
              <Button variant="ghost" size="sm" onClick={handleStartEdit}>Edit</Button>
            )}
          </div>
        </div>

        {editMode ? (
          <CodeEditor value={editedScript} onChange={setEditedScript} height="450px" />
        ) : (
          <CodeViewer value={script.activeScript || ''} height="450px" />
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

// ─── Small Reusable Components ───────────────────────────────────────────────

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-muted-foreground text-xs">{label}</span>
      <p className="font-medium truncate">{value}</p>
    </div>
  );
}

function RunningIndicator({ onCancel, isCancelling }: { onCancel: () => void; isCancelling: boolean }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;
  const formatted = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
      <Loader2 className="h-4 w-4 animate-spin text-amber-500 shrink-0" />
      <div className="flex-1 space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium text-amber-700 dark:text-amber-400">Executing test...</span>
          <span className="text-amber-600 dark:text-amber-500">{formatted}</span>
        </div>
        <div className="h-1.5 rounded-full bg-amber-200 dark:bg-amber-800 overflow-hidden">
          <div className="h-full bg-amber-500 rounded-full animate-pulse" style={{ width: '100%' }} />
        </div>
      </div>
      <Button
        size="sm" variant="ghost"
        className="shrink-0 text-amber-700 hover:text-red-600 hover:bg-red-50 dark:text-amber-400 dark:hover:text-red-400 dark:hover:bg-red-950/20 h-7 px-2"
        onClick={onCancel} disabled={isCancelling}
      >
        {isCancelling ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Square className="h-3.5 w-3.5" />}
        <span className="ml-1 text-xs">Stop</span>
      </Button>
    </div>
  );
}

// ─── Execution History ───────────────────────────────────────────────────────

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
  const cfg = getStatusConfig(exec.status);
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
                <span className="text-xs text-muted-foreground">{logs.summary.passedTests}/{logs.summary.totalTests} passed</span>
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
          {logs && (
            <div className="p-3 border-b">
              <ExecutionSummary logs={logs} />
            </div>
          )}

          <Tabs defaultValue="result" className="w-full">
            <div className="border-b px-3">
              <TabsList className="h-8 bg-transparent p-0 gap-0">
                <TabsTrigger value="result" className="h-8 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-3 text-xs gap-1.5">
                  <Activity className="h-3 w-3" /> Result
                </TabsTrigger>
                <TabsTrigger value="logs" className="h-8 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-3 text-xs gap-1.5" disabled={!hasLogs && !exec.errorMessage}>
                  <Terminal className="h-3 w-3" /> Logs
                </TabsTrigger>
                <TabsTrigger value="assets" className="h-8 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-3 text-xs gap-1.5" disabled={!hasAssets}>
                  <ImageIcon className="h-3 w-3" /> Assets
                  {hasAssets && (
                    <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                      {(exec.screenshots?.length || 0) + (hasVideo ? 1 : 0)}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="result" className="p-3 mt-0 space-y-3">
              {logs?.steps && logs.steps.length > 0 && (
                <div className="space-y-1">
                  {logs.steps.map((step, i) => <StepResultItem key={i} step={step} index={i} />)}
                </div>
              )}
              {exec.errorMessage && !logs?.steps?.length && (
                <ErrorBlock title="Error" message={exec.errorMessage} />
              )}
              {exec.healingDetails && <HealingInfo details={exec.healingDetails} />}
              {!logs?.steps?.length && !exec.errorMessage && (
                <p className="text-xs text-muted-foreground text-center py-4">No step-level results available</p>
              )}
            </TabsContent>

            <TabsContent value="logs" className="p-3 mt-0 space-y-3">
              {exec.errorMessage && <ErrorBlock title="Error" message={exec.errorMessage} />}
              {logs?.stdout && (
                <div>
                  <p className="text-xs font-medium mb-1 flex items-center gap-1"><Terminal className="h-3 w-3" />Console Output</p>
                  <CodeViewer value={logs.stdout} height="250px" allowFullscreen={false} />
                </div>
              )}
              {logs?.stderr && (
                <div>
                  <p className="text-xs font-medium mb-1 flex items-center gap-1 text-red-500"><AlertCircle className="h-3 w-3" />Error Output</p>
                  <CodeViewer value={logs.stderr} height="250px" allowFullscreen={false} />
                </div>
              )}
              {!logs?.stdout && !logs?.stderr && !exec.errorMessage && (
                <p className="text-xs text-muted-foreground text-center py-4">No log output available</p>
              )}
            </TabsContent>

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

// ─── Shared UI Blocks ────────────────────────────────────────────────────────

function ErrorBlock({ title, message }: { title: string; message: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-red-500 mb-1 flex items-center gap-1"><AlertCircle className="h-3 w-3" />{title}</p>
      <pre className="text-xs bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-300 p-3 rounded border border-red-200 dark:border-red-800 overflow-auto max-h-[200px] whitespace-pre-wrap">
        {message}
      </pre>
    </div>
  );
}

function HealingInfo({ details }: { details: ScriptExecution['healingDetails'] }) {
  if (!details) return null;
  return (
    <div className="p-2 rounded bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 text-xs">
      <p className="font-medium text-purple-600 flex items-center gap-1 mb-1"><Shield className="h-3 w-3" />Self-Healing Applied</p>
      <p className="text-muted-foreground">
        Attempt {details.attempt} via {details.provider}/{details.model}
        {details.timestamp && ` at ${format(new Date(details.timestamp), 'HH:mm:ss')}`}
      </p>
    </div>
  );
}

// ─── Step Result Item ────────────────────────────────────────────────────────

function StepResultItem({ step, index }: { step: StructuredLogs['steps'][number]; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = getStatusConfig(step.status);
  const StatusIcon = cfg.icon;
  const hasActions = step.actions && step.actions.length > 0;
  const hasDetails = hasActions || step.error || step.snippet;

  return (
    <div className={`rounded border text-xs ${cfg.bg}`}>
      <button
        onClick={() => hasDetails && setExpanded(!expanded)}
        className={`w-full flex items-start gap-2 p-2 text-left ${hasDetails ? 'cursor-pointer hover:bg-muted/30' : 'cursor-default'}`}
      >
        {hasDetails ? (
          expanded ? <ChevronDown className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" />
        ) : (
          <StatusIcon className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${cfg.color}`} />
        )}
        <StatusIcon className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${cfg.color}`} />
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
          {hasActions && (
            <div className="space-y-0.5 mt-2">
              {step.actions!.map((action, ai) => (
                <div
                  key={ai}
                  className={`flex items-center gap-2 py-1 px-2 rounded ${
                    action.status === 'passed' ? 'bg-green-50/50 dark:bg-green-950/10' : 'bg-red-50/50 dark:bg-red-950/10'
                  }`}
                >
                  {action.status === 'passed' ? (
                    <CheckCircle2 className="h-3 w-3 text-green-500 shrink-0" />
                  ) : (
                    <XCircle className="h-3 w-3 text-red-500 shrink-0" />
                  )}
                  <span className="flex-1 font-mono text-[11px] truncate" title={action.title}>{action.title}</span>
                  <span className="text-muted-foreground text-[10px] shrink-0">{action.duration}</span>
                </div>
              ))}
            </div>
          )}
          {step.error && (
            <pre className="text-red-600 dark:text-red-400 whitespace-pre-wrap break-words text-[11px] bg-red-50 dark:bg-red-950/20 p-2 rounded mt-2">{step.error}</pre>
          )}
          {step.snippet && (
            <pre className="text-muted-foreground whitespace-pre-wrap text-[11px] bg-muted p-2 rounded">{step.snippet}</pre>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Execution Summary Bar ───────────────────────────────────────────────────

function ExecutionSummary({ logs }: { logs: StructuredLogs }) {
  const { summary } = logs;
  const passPercent = summary.totalTests > 0
    ? Math.round((summary.passedTests / summary.totalTests) * 100)
    : (summary.passed ? 100 : 0);

  return (
    <div className="flex items-center gap-4 p-2 rounded bg-muted/30 text-xs">
      <span className="font-medium">{summary.duration}</span>
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

// ─── Artifact Helpers ────────────────────────────────────────────────────────

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
      .catch(() => { if (!cancelled) setBlobUrl(null); });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [executionId, filename]);

  return blobUrl;
}

function ExecutionArtifacts({ exec }: { exec: ScriptExecution }) {
  const [previewIdx, setPreviewIdx] = useState<number | null>(null);
  const hasScreenshots = exec.screenshots && exec.screenshots.length > 0;
  const hasVideo = !!exec.videoPath;

  if (!hasScreenshots && !hasVideo) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium flex items-center gap-1"><ImageIcon className="h-3 w-3" />Artifacts</p>
      {hasScreenshots && (
        <div className="flex gap-2 flex-wrap">
          {exec.screenshots.map((filename, i) => (
            <ArtifactThumbnail key={i} executionId={exec.id} filename={filename} index={i} onClick={() => setPreviewIdx(i)} />
          ))}
        </div>
      )}
      {hasVideo && <ArtifactVideo executionId={exec.id} filename={exec.videoPath!} />}
      {previewIdx !== null && hasScreenshots && (
        <ArtifactPreviewDialog executionId={exec.id} filename={exec.screenshots[previewIdx]} onClose={() => setPreviewIdx(null)} />
      )}
    </div>
  );
}

function ArtifactThumbnail({ executionId, filename, index, onClick }: { executionId: string; filename: string; index: number; onClick: () => void }) {
  const blobUrl = useArtifactBlobUrl(executionId, filename);
  return (
    <button onClick={onClick} className="group relative w-24 h-16 rounded border overflow-hidden hover:ring-2 ring-primary transition-all bg-muted">
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
      <video controls className="w-full max-h-[300px]" src={blobUrl}>Your browser does not support the video tag.</video>
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

// ─── Helpers ─────────────────────────────────────────────────────────────────

function useParsedLogs(rawLogs: string | null): StructuredLogs | null {
  return useMemo(() => {
    if (!rawLogs) return null;
    try {
      return JSON.parse(rawLogs) as StructuredLogs;
    } catch {
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
