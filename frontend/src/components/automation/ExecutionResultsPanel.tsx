import { useState, useEffect, useMemo } from 'react';
import {
  CheckCircle2, XCircle, AlertCircle, Loader2, Shield, Activity,
  ChevronDown, ChevronRight, Terminal, Eye, ImageIcon, Clock, Code2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Dialog, DialogContent,
} from '@/components/ui/dialog';
import { httpClient } from '@/services/http-client';
import type { ScriptExecution, StructuredLogs } from '@/types';
import { format } from 'date-fns';

// ─── Status Config ──────────────────────────────────────────────────────────

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

export function getExecutionStatusConfig(status: string) {
  return STATUS_CONFIG[status] || STATUS_CONFIG.draft;
}

// ─── Parsed Logs Hook ───────────────────────────────────────────────────────

export function useParsedLogs(rawLogs: string | null): StructuredLogs | null {
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

// ─── Artifact Blob URL Hook ─────────────────────────────────────────────────

export function useArtifactBlobUrl(executionId: string, filename: string | null): string | null {
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

// ─── Execution Summary Bar ──────────────────────────────────────────────────

export function ExecutionSummary({ logs }: { logs: StructuredLogs }) {
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

// ─── Error Block ────────────────────────────────────────────────────────────

export function ErrorBlock({ title, message }: { title: string; message: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-red-500 mb-1 flex items-center gap-1"><AlertCircle className="h-3 w-3" />{title}</p>
      <pre className="text-xs bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-300 p-3 rounded border border-red-200 dark:border-red-800 overflow-auto max-h-[200px] whitespace-pre-wrap">
        {message}
      </pre>
    </div>
  );
}

// ─── Healing Info ───────────────────────────────────────────────────────────

export function HealingInfo({ details }: { details: ScriptExecution['healingDetails'] }) {
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

// ─── Step Result Item ───────────────────────────────────────────────────────

export function StepResultItem({ step, index }: { step: StructuredLogs['steps'][number]; index: number }) {
  // Auto-expand failed steps so pass/fail is immediately visible without clicking
  const [expanded, setExpanded] = useState(step.status === 'failed');
  const cfg = getExecutionStatusConfig(step.status);
  const StatusIcon = cfg.icon;
  const actions = step.actions ?? [];
  const hasDetails = actions.length > 0 || step.error || step.snippet;

  const passedActions = actions.filter((a) => a.status === 'passed').length;
  const failedActions = actions.filter((a) => a.status === 'failed').length;

  return (
    <div className={`rounded border text-xs ${cfg.bg}`}>
      <button
        onClick={() => hasDetails && setExpanded(!expanded)}
        className={`w-full flex items-start gap-2 p-2.5 text-left ${hasDetails ? 'cursor-pointer hover:bg-muted/20' : 'cursor-default'}`}
      >
        <StatusIcon className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${cfg.color}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium">
              <span className="text-muted-foreground mr-1">#{index + 1}</span>
              {step.name}
            </span>
            <div className="flex items-center gap-2 shrink-0">
              {/* per-action summary chips */}
              {actions.length > 0 && (
                <span className="flex items-center gap-1 text-[10px]">
                  {passedActions > 0 && (
                    <span className="flex items-center gap-0.5 text-green-600 dark:text-green-400">
                      <CheckCircle2 className="h-3 w-3" />{passedActions}
                    </span>
                  )}
                  {failedActions > 0 && (
                    <span className="flex items-center gap-0.5 text-red-500">
                      <XCircle className="h-3 w-3" />{failedActions}
                    </span>
                  )}
                </span>
              )}
              <Badge
                variant={step.status === 'passed' ? 'default' : step.status === 'failed' ? 'destructive' : 'secondary'}
                className="text-[10px] h-4 px-1.5 capitalize"
              >
                {step.status}
              </Badge>
              <span className="text-muted-foreground">{step.duration}</span>
              {hasDetails && (
                expanded
                  ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                  : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
              )}
            </div>
          </div>
        </div>
      </button>

      {expanded && hasDetails && (
        <div className="border-t">
          {/* Action-level step list */}
          {actions.length > 0 && (
            <div className="divide-y">
              {actions.map((action, ai) => (
                <div key={ai}>
                  <div className={`flex items-center gap-2 px-3 py-1.5 ${
                    action.status === 'passed'
                      ? 'bg-green-500/5'
                      : 'bg-red-500/5'
                  }`}>
                    {action.status === 'passed' ? (
                      <CheckCircle2 className="h-3 w-3 text-green-500 shrink-0" />
                    ) : (
                      <XCircle className="h-3 w-3 text-red-500 shrink-0" />
                    )}
                    <span className="text-[10px] text-muted-foreground w-5 shrink-0 font-mono">{ai + 1}.</span>
                    {action.category && action.category !== 'test' && (
                      <span className="text-[9px] font-mono text-muted-foreground bg-muted/60 px-1 rounded shrink-0">
                        {action.category}
                      </span>
                    )}
                    <span className="flex-1 font-mono text-[11px] break-all">{action.title}</span>
                    {action.duration && (
                      <span className="text-muted-foreground text-[10px] shrink-0">{action.duration}</span>
                    )}
                  </div>
                  {action.error && (
                    <pre className="text-red-600 dark:text-red-400 whitespace-pre-wrap text-[10px] bg-red-50 dark:bg-red-950/20 px-3 py-2 ml-10">
                      {action.error}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Test-level error / snippet */}
          {(step.error || step.snippet) && (
            <div className="p-3 space-y-2">
              {step.error && (
                <pre className="text-red-600 dark:text-red-400 whitespace-pre-wrap break-words text-[11px] bg-red-50 dark:bg-red-950/20 p-2 rounded">
                  {step.error}
                </pre>
              )}
              {step.snippet && (
                <pre className="text-muted-foreground whitespace-pre-wrap text-[11px] bg-muted p-2 rounded">
                  {step.snippet}
                </pre>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Execution Artifacts ────────────────────────────────────────────────────

export function ExecutionArtifacts({ exec }: { exec: ScriptExecution }) {
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

// ─── Full Execution Results Panel ───────────────────────────────────────────
// Compact panel showing Result, Logs, and Assets tabs for a single execution.

export function ExecutionResultsPanel({ execution }: { execution: ScriptExecution }) {
  const logs = useParsedLogs(execution.logs);
  const hasScreenshots = execution.screenshots && execution.screenshots.length > 0;
  const hasVideo = !!execution.videoPath;
  const hasAssets = hasScreenshots || hasVideo;
  const hasLogs = !!(logs?.stdout || logs?.stderr);
  const cfg = getExecutionStatusConfig(execution.status);
  const StatusIcon = cfg.icon;

  return (
    <div className="border rounded-lg bg-background overflow-hidden">
      {/* Header */}
      <div className={`flex items-center gap-3 p-3 ${cfg.bg}`}>
        <StatusIcon className={`h-4 w-4 shrink-0 ${cfg.color} ${execution.status === 'running' ? 'animate-spin' : ''}`} />
        <span className="text-sm font-medium">{cfg.label}</span>
        {execution.healingApplied && <Badge variant="secondary" className="text-xs gap-1"><Shield className="h-3 w-3" />Healed</Badge>}
        {logs && logs.summary.totalTests > 0 && (
          <span className="text-xs text-muted-foreground">{logs.summary.passedTests}/{logs.summary.totalTests} passed</span>
        )}
        {execution.duration && (
          <span className="text-xs text-muted-foreground ml-auto">{(execution.duration / 1000).toFixed(1)}s</span>
        )}
        <Badge variant="outline" className="text-xs capitalize shrink-0">{execution.browserType}</Badge>
      </div>

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
            <TabsTrigger value="logs" className="h-8 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-3 text-xs gap-1.5" disabled={!hasLogs && !execution.errorMessage}>
              <Terminal className="h-3 w-3" /> Logs
            </TabsTrigger>
            <TabsTrigger value="assets" className="h-8 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-3 text-xs gap-1.5" disabled={!hasAssets}>
              <ImageIcon className="h-3 w-3" /> Assets
              {hasAssets && (
                <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                  {(execution.screenshots?.length || 0) + (hasVideo ? 1 : 0)}
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
          {execution.errorMessage && !logs?.steps?.length && (
            <ErrorBlock title="Error" message={execution.errorMessage} />
          )}
          {execution.healingDetails && <HealingInfo details={execution.healingDetails} />}
          {!logs?.steps?.length && !execution.errorMessage && (
            <p className="text-xs text-muted-foreground text-center py-4">No step-level results available</p>
          )}
        </TabsContent>

        <TabsContent value="logs" className="p-3 mt-0 space-y-3">
          {execution.errorMessage && <ErrorBlock title="Error" message={execution.errorMessage} />}
          {logs?.stdout && (
            <div>
              <p className="text-xs font-medium mb-1 flex items-center gap-1"><Terminal className="h-3 w-3" />Console Output</p>
              <pre className="text-xs bg-[#1e1e1e] text-[#d4d4d4] p-3 rounded border overflow-auto max-h-[250px] whitespace-pre-wrap font-mono">{logs.stdout}</pre>
            </div>
          )}
          {logs?.stderr && (
            <div>
              <p className="text-xs font-medium mb-1 flex items-center gap-1 text-red-500"><AlertCircle className="h-3 w-3" />Error Output</p>
              <pre className="text-xs bg-[#1e1e1e] text-red-400 p-3 rounded border overflow-auto max-h-[250px] whitespace-pre-wrap font-mono">{logs.stderr}</pre>
            </div>
          )}
          {!logs?.stdout && !logs?.stderr && !execution.errorMessage && (
            <p className="text-xs text-muted-foreground text-center py-4">No log output available</p>
          )}
        </TabsContent>

        <TabsContent value="assets" className="p-3 mt-0 space-y-4">
          <ExecutionArtifacts exec={execution} />
          {!hasAssets && (
            <p className="text-xs text-muted-foreground text-center py-4">No screenshots or videos captured</p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
