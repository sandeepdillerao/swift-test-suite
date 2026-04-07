import { useState, useEffect, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import {
  Play, Sparkles, Upload, Code2, Clock, CheckCircle2, XCircle,
  AlertCircle, Loader2, Trash2, Shield, Activity, ChevronDown,
  ChevronRight, Copy, Terminal, Eye, Monitor, Zap, Square, ImageIcon,
  Maximize2, Minimize2, Variable,
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
import { useEnvironments } from '@/hooks/useEnvironments';
import type { ProjectEnvironment } from '@/types';
import type { AutomationScript, ScriptExecution, BrowserType, StructuredLogs } from '@/types';
import { formatDistanceToNow, format } from 'date-fns';
import { toast } from 'sonner';
import {
  getExecutionStatusConfig,
  useParsedLogs as useSharedParsedLogs,
  ExecutionSummary,
  ErrorBlock,
  HealingInfo,
  StepResultItem,
  ExecutionArtifacts,
} from './ExecutionResultsPanel';

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
  return getExecutionStatusConfig(status);
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
  const { data: environments = [] } = useEnvironments(projectId);
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
  const [selectedEnvId, setSelectedEnvId] = useState<string>('');

  const { data: codegenStatus } = useCodegenStatus(codegenSessionId || undefined);

  // Auto-select default environment and populate targetUrl
  const selectedEnv = environments.find((e) => e.id === selectedEnvId);

  useEffect(() => {
    if (environments.length > 0 && !selectedEnvId) {
      const defaultEnv = environments.find((e) => e.isDefault) || environments[0];
      setSelectedEnvId(defaultEnv.id);
      if (!targetUrl) setTargetUrl(defaultEnv.baseUrl);
    }
  }, [environments]); // eslint-disable-line react-hooks/exhaustive-deps

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
        variables: selectedEnv?.variables && Object.keys(selectedEnv.variables).length > 0 ? selectedEnv.variables : undefined,
        authConfigs: selectedEnv?.authConfigs && selectedEnv.authConfigs.length > 0 ? selectedEnv.authConfigs : undefined,
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
  }, [generateScript, testCaseId, projectId, targetUrl, browserType, codegenScript, selectedEnv]);

  const handleExecute = useCallback((script: AutomationScript, headless: boolean) => {
    // Build merged variables: env vars + auth config constants
    const mergedVars: Record<string, string> = { ...(selectedEnv?.variables || {}) };
    if (selectedEnv?.authConfigs) {
      for (const auth of selectedEnv.authConfigs) {
        const prefix = auth.label.toUpperCase().replace(/[^A-Z0-9]/g, '_');
        mergedVars[`${prefix}_USERNAME`] = auth.username;
        mergedVars[`${prefix}_PASSWORD`] = auth.password;
        if (auth.role) mergedVars[`${prefix}_ROLE`] = auth.role;
      }
    }
    const hasVars = Object.keys(mergedVars).length > 0;

    executeScript.mutate(
      {
        scriptId: script.id,
        options: {
          enableHealing: true,
          headless,
          targetUrl: selectedEnv?.baseUrl || undefined,
          ...(hasVars ? { variables: mergedVars } : {}),
        },
      },
      {
        onSuccess: () => toast.success('Execution started — watching progress...'),
        onError: (err: any) => toast.error(err.message || 'Failed to start execution'),
      },
    );
  }, [executeScript, selectedEnv]);

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
        environments={environments}
        selectedEnvId={selectedEnvId}
        onEnvChange={(envId) => {
          setSelectedEnvId(envId);
          const env = environments.find((e) => e.id === envId);
          if (env) setTargetUrl(env.baseUrl);
        }}
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
  environments, selectedEnvId, onEnvChange,
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
  environments: ProjectEnvironment[];
  selectedEnvId: string;
  onEnvChange: (envId: string) => void;
}) {
  const selectedEnv = environments.find((e) => e.id === selectedEnvId);
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
          {/* Environment Selector */}
          {environments.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <Label className="text-sm">Environment</Label>
                  <Select value={selectedEnvId} onValueChange={onEnvChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select environment..." />
                    </SelectTrigger>
                    <SelectContent>
                      {environments.map((env) => (
                        <SelectItem key={env.id} value={env.id}>
                          {env.name} {env.isDefault ? '(Default)' : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {selectedEnv && <EnvironmentVariablesHelper environment={selectedEnv} />}
            </div>
          )}

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

// ─── Environment Variables Helper ────────────────────────────────────────────

function EnvironmentVariablesHelper({ environment }: { environment: ProjectEnvironment }) {
  const [expanded, setExpanded] = useState(false);
  const varEntries = Object.entries(environment.variables);
  const hasVars = varEntries.length > 0;
  const hasAuth = environment.authConfigs.length > 0;

  if (!hasVars && !hasAuth) return null;

  return (
    <Collapsible open={expanded} onOpenChange={setExpanded}>
      <CollapsibleTrigger asChild>
        <button className="w-full flex items-center gap-2 p-2.5 rounded-lg border bg-blue-50/50 dark:bg-blue-950/10 border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-950/20 transition-colors text-left">
          {expanded ? <ChevronDown className="h-3.5 w-3.5 shrink-0 text-blue-500" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0 text-blue-500" />}
          <Code2 className="h-4 w-4 text-blue-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="text-xs font-medium text-blue-700 dark:text-blue-400">
              Environment Variables & Auth
            </span>
            <span className="text-[10px] text-blue-500 dark:text-blue-500 ml-2">
              {hasVars ? `${varEntries.length} variable${varEntries.length !== 1 ? 's' : ''}` : ''}
              {hasVars && hasAuth ? ' · ' : ''}
              {hasAuth ? `${environment.authConfigs.length} auth config${environment.authConfigs.length !== 1 ? 's' : ''}` : ''}
            </span>
          </div>
          <Badge variant="secondary" className="text-[10px] shrink-0">
            AI-aware
          </Badge>
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-1 rounded-lg border p-3 space-y-4 text-xs bg-muted/20">
          {/* How it works */}
          <div className="space-y-1.5">
            <p className="font-medium text-sm">How variables work in scripts</p>
            <p className="text-muted-foreground">
              When you generate or execute a script, environment variables are automatically injected. The AI will use these
              variables in the generated script instead of hardcoding values. You can access them in two ways:
            </p>
          </div>

          {/* Variables Table */}
          {hasVars && (
            <div className="space-y-2">
              <p className="font-medium flex items-center gap-1.5">
                <Variable className="h-3.5 w-3.5" /> Variables
              </p>
              <div className="rounded border overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="text-left px-2 py-1.5 font-medium">Variable</th>
                      <th className="text-left px-2 py-1.5 font-medium">Value</th>
                      <th className="text-left px-2 py-1.5 font-medium">Usage in Script</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {varEntries.map(([key, value]) => (
                      <tr key={key}>
                        <td className="px-2 py-1.5 font-mono font-semibold text-primary">{key}</td>
                        <td className="px-2 py-1.5 text-muted-foreground truncate max-w-[120px]">{value}</td>
                        <td className="px-2 py-1.5 font-mono text-[11px] text-muted-foreground">
                          <code className="bg-muted px-1 rounded">{key}</code> or <code className="bg-muted px-1 rounded">process.env.{key}</code>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Auth Configs */}
          {hasAuth && (
            <div className="space-y-2">
              <p className="font-medium flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5" /> Auth Configs
              </p>
              <div className="rounded border overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="text-left px-2 py-1.5 font-medium">Label</th>
                      <th className="text-left px-2 py-1.5 font-medium">Role</th>
                      <th className="text-left px-2 py-1.5 font-medium">Constants in Script</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {environment.authConfigs.map((auth, i) => {
                      const prefix = auth.label.toUpperCase().replace(/[^A-Z0-9]/g, '_');
                      return (
                        <tr key={i}>
                          <td className="px-2 py-1.5 font-medium">{auth.label}</td>
                          <td className="px-2 py-1.5 text-muted-foreground">{auth.role || '—'}</td>
                          <td className="px-2 py-1.5 font-mono text-[11px]">
                            <code className="bg-muted px-1 rounded text-primary">{prefix}_USERNAME</code>{' '}
                            <code className="bg-muted px-1 rounded text-primary">{prefix}_PASSWORD</code>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="text-muted-foreground">
                Credentials are injected as constants at runtime. AI-generated scripts use these names — never hardcoded passwords.
              </p>
            </div>
          )}

          {/* Code Examples */}
          <div className="space-y-2">
            <p className="font-medium">Example usage in Playwright script</p>
            <pre className="bg-[#1e1e1e] text-[#d4d4d4] p-3 rounded text-[11px] font-mono overflow-x-auto">{[
              '// baseURL is set in playwright config — use relative paths:',
              "await page.goto('/');           // → baseURL",
              "await page.goto('/dashboard');  // → baseURL + /dashboard",
              '',
              ...(varEntries.length > 0 ? [
                '// Environment variables — injected as constants:',
                ...varEntries.map(([key]) => `// const ${key} = "...";  (injected at runtime)`),
                `await page.fill('#field', ${varEntries[0][0]});  // use constant directly`,
                `const val = process.env.${varEntries[0][0]};     // or via process.env`,
              ] : []),
              '',
              ...(hasAuth ? [
                '// Auth credentials — injected as constants:',
                ...environment.authConfigs.map((auth) => {
                  const prefix = auth.label.toUpperCase().replace(/[^A-Z0-9]/g, '_');
                  return `// const ${prefix}_USERNAME = "...";  const ${prefix}_PASSWORD = "...";`;
                }),
                `await page.fill('[name="username"]', ${environment.authConfigs[0].label.toUpperCase().replace(/[^A-Z0-9]/g, '_')}_USERNAME);`,
                `await page.fill('[name="password"]', ${environment.authConfigs[0].label.toUpperCase().replace(/[^A-Z0-9]/g, '_')}_PASSWORD);`,
              ] : []),
            ].join('\n')}</pre>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
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

// ─── Re-export useParsedLogs from shared module ─────────────────────────────

const useParsedLogs = useSharedParsedLogs;
