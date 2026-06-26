import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Loader2, Video, Square, Sparkles, ChevronRight, ChevronLeft,
  CheckCircle2, Bot, AlertCircle, ArrowLeft, Globe, Copy,
  FileText, Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  useGenerateSuiteFromRecording, useStartCodegen, useCodegenStatus, useStopCodegen,
} from '@/hooks/useAutomation';
import { useEnvironments } from '@/hooks/useEnvironments';
import { useProjectStore } from '@/stores/projectStore';
import { CodeViewer, CodeEditor } from '@/components/automation/AutomationPanel';
import type { TestCase, TestSuite } from '@/types';

type Step = 'configure' | 'record' | 'review' | 'done';
const STEPS: Step[] = ['configure', 'record', 'review', 'done'];
const stepLabel: Record<Step, string> = {
  configure: 'Configure', record: 'Record', review: 'Review & Generate', done: 'Done',
};

export const GenerateFromRecording = () => {
  const navigate = useNavigate();
  const { currentProject } = useProjectStore();
  const projectId = currentProject?.id ?? '';

  const [step, setStep] = useState<Step>('configure');
  const [suiteName, setSuiteName] = useState('');
  const [suiteDescription, setSuiteDescription] = useState('');
  const [flowDescription, setFlowDescription] = useState('');
  const [selectedEnvId, setSelectedEnvId] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [recordedScript, setRecordedScript] = useState<string | null>(null);
  const [editedScript, setEditedScript] = useState('');
  const [pastedScript, setPastedScript] = useState('');
  const [inputMode, setInputMode] = useState<'record' | 'paste'>('record');
  const [result, setResult] = useState<{ suite: TestSuite; testCases: TestCase[]; count: number } | null>(null);

  const startCodegen = useStartCodegen();
  const stopCodegen = useStopCodegen();
  const generateSuite = useGenerateSuiteFromRecording();
  const isElectron = !!window.electron?.isElectron;

  const { data: environments = [] } = useEnvironments(projectId);
  const { data: sessionStatus } = useCodegenStatus(sessionId ?? undefined);
  const selectedEnv = environments.find((e) => e.id === selectedEnvId) ?? null;

  useEffect(() => {
    if (sessionStatus?.status === 'completed' && sessionStatus.recordedScript) {
      setRecordedScript(sessionStatus.recordedScript);
      setEditedScript(sessionStatus.recordedScript);
    }
    if (sessionStatus?.status === 'failed' && sessionStatus.error) {
      toast.error(sessionStatus.error === 'CHROMIUM_NOT_INSTALLED'
        ? 'Chromium not installed. Download in progress — please wait.'
        : `Recording failed: ${sessionStatus.error}`);
    }
  }, [sessionStatus]);

  const activeScript = inputMode === 'paste' ? pastedScript : (editedScript || '');

  const reset = useCallback(() => {
    setStep('configure'); setSuiteName(''); setSuiteDescription(''); setFlowDescription('');
    setSelectedEnvId(''); setSessionId(null); setRecordedScript(null);
    setEditedScript(''); setPastedScript(''); setInputMode('record'); setResult(null);
  }, []);

  const handleStartRecording = async () => {
    try {
      const res = await startCodegen.mutateAsync({ projectId, targetUrl: selectedEnv?.baseUrl });
      setSessionId(res.sessionId);
    } catch (err: any) { toast.error(err.message || 'Failed to start recording'); }
  };

  const handleStopRecording = async () => {
    if (!sessionId) return;
    try { await stopCodegen.mutateAsync(sessionId); } catch { /* ignore */ }
  };

  const handleGenerate = async () => {
    const script = activeScript.trim();
    if (!script) { toast.error('No script available.'); return; }
    try {
      const res = await generateSuite.mutateAsync({
        projectId, suiteName, suiteDescription: suiteDescription || undefined,
        recordedScript: script, flowDescription: flowDescription || undefined,
        suiteVariables: selectedEnv?.variables ?? {}, environmentId: selectedEnv?.id,
      });
      setResult(res);
      setStep('done');
    } catch (err: any) { toast.error(err.message || 'AI generation failed'); }
  };

  const isRecording = sessionStatus?.status === 'recording';
  const recordingDone = !!recordedScript || sessionStatus?.status === 'completed';
  const stepIndex = STEPS.indexOf(step);

  // ── Shared header + stepper ─────────────────────────────────────────────────
  const Header = (
    <div className="flex items-center gap-4 mb-5">
      <Button variant="ghost" size="icon" className="shrink-0" onClick={() => navigate('/app/test-suites')}>
        <ArrowLeft className="h-4 w-4" />
      </Button>
      <div className="flex items-center gap-2 min-w-0">
        <Sparkles className="h-4 w-4 text-primary shrink-0" />
        <h1 className="text-lg font-semibold truncate">Generate Suite from Recording</h1>
      </div>
      <div className="ml-auto flex items-center gap-1.5 shrink-0">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-1.5">
            <button
              className={cn(
                'flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-bold transition-colors shrink-0',
                i < stepIndex ? 'bg-primary text-primary-foreground cursor-pointer' :
                i === stepIndex ? 'bg-primary text-primary-foreground ring-2 ring-primary/30' :
                'bg-muted text-muted-foreground cursor-default',
              )}
              onClick={() => i < stepIndex && setStep(s)}
            >
              {i < stepIndex ? <CheckCircle2 className="h-3 w-3" /> : i + 1}
            </button>
            <span className={cn(
              'text-xs hidden md:block',
              i === stepIndex ? 'text-foreground font-medium' : 'text-muted-foreground',
            )}>
              {stepLabel[s]}
            </span>
            {i < STEPS.length - 1 && <div className="w-6 h-px bg-border" />}
          </div>
        ))}
      </div>
    </div>
  );

  // ── Step 1: Configure ───────────────────────────────────────────────────────
  if (step === 'configure') return (
    <div className="space-y-4">
      {Header}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Left: form */}
        <div className="lg:col-span-2 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="suiteName" className="text-xs">Suite Name <span className="text-destructive">*</span></Label>
              <Input id="suiteName" placeholder="Authentication Test Suite" value={suiteName}
                onChange={(e) => setSuiteName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="flowDesc" className="text-xs">Flow Description
                <span className="text-muted-foreground ml-1">(helps AI)</span>
              </Label>
              <Input id="flowDesc" placeholder="e.g. Login with valid / invalid credentials"
                value={flowDescription} onChange={(e) => setFlowDescription(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="suiteDesc" className="text-xs">Suite Description</Label>
            <Textarea id="suiteDesc" rows={2} placeholder="Briefly describe what this suite covers…"
              value={suiteDescription} onChange={(e) => setSuiteDescription(e.target.value)} className="resize-none" />
          </div>
        </div>

        {/* Right: env */}
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1">
              <Globe className="h-3 w-3" /> Environment
              <span className="text-muted-foreground">(optional)</span>
            </Label>
            {environments.length === 0 ? (
              <p className="text-xs text-muted-foreground p-2 border rounded-md bg-muted/30">
                No environments. Add one in Project Settings.
              </p>
            ) : (
              <Select value={selectedEnvId} onValueChange={setSelectedEnvId}>
                <SelectTrigger className="text-sm"><SelectValue placeholder="Select environment…" /></SelectTrigger>
                <SelectContent>
                  {environments.map((env) => (
                    <SelectItem key={env.id} value={env.id}>
                      <span className="flex items-center gap-2">
                        {env.name}
                        {env.isDefault && <Badge variant="secondary" className="text-[10px] px-1 py-0">default</Badge>}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {selectedEnv && (
              <div className="text-xs text-muted-foreground space-y-0.5 pl-1">
                <div className="font-mono truncate">{selectedEnv.baseUrl}</div>
                {Object.keys(selectedEnv.variables ?? {}).length > 0 && (
                  <div className="text-green-600 dark:text-green-400">
                    ✓ {Object.keys(selectedEnv.variables).length} vars will be imported
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="rounded-lg border bg-muted/20 p-3 text-xs text-muted-foreground space-y-1">
            <p className="font-medium text-foreground flex items-center gap-1">
              <Bot className="h-3.5 w-3.5" /> AI generates:
            </p>
            <div className="space-y-0.5 ml-4">
              <p>• Happy path scenarios</p>
              <p>• Negative / error cases</p>
              <p>• Edge cases & boundaries</p>
              <p>• Step-by-step instructions</p>
              <p>• Playwright script per test case</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-1">
        <Button onClick={() => setStep('record')} disabled={!suiteName.trim()}>
          Next: Record Flow <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );

  // ── Step 2: Record ──────────────────────────────────────────────────────────
  if (step === 'record') return (
    <div className="space-y-4">
      {Header}
      <Tabs value={inputMode} onValueChange={(v) => setInputMode(v as 'record' | 'paste')}>
        <div className="flex items-center justify-between mb-3">
          <TabsList className="h-8">
            <TabsTrigger value="record" className="text-xs h-7 gap-1.5">
              <Video className="h-3.5 w-3.5" /> Record Live
            </TabsTrigger>
            <TabsTrigger value="paste" className="text-xs h-7 gap-1.5">
              <FileText className="h-3.5 w-3.5" /> Paste Script
            </TabsTrigger>
          </TabsList>
          <Button variant="ghost" size="sm" className="text-xs" onClick={() => setStep('configure')}>
            <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Back
          </Button>
        </div>

        <TabsContent value="record" className="mt-0 space-y-3">
          {/* Status strip */}
          <div className={cn(
            'flex items-center gap-3 px-4 py-2.5 rounded-lg border text-sm',
            isRecording ? 'bg-red-500/5 border-red-500/20' :
            recordingDone ? 'bg-green-500/5 border-green-500/20' :
            'bg-muted/30'
          )}>
            {!isElectron ? (
              <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
            ) : isRecording ? (
              <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse shrink-0" />
            ) : recordingDone ? (
              <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
            ) : (
              <Video className="h-4 w-4 text-muted-foreground shrink-0" />
            )}

            <span className={cn(
              'flex-1',
              isRecording ? 'text-red-600 dark:text-red-400 font-medium' :
              recordingDone ? 'text-green-700 dark:text-green-400 font-medium' :
              'text-muted-foreground'
            )}>
              {!isElectron ? 'Live recording requires the desktop app — use Paste Script instead' :
               isRecording ? 'Recording in progress… interact with your app, then close the browser or click Stop' :
               recordingDone ? `Script captured — ${(editedScript || '').split('\n').length} lines · edit below if needed` :
               selectedEnv ? `Ready to record — will open at ${selectedEnv.baseUrl}` :
               'Ready to record — a browser window will open'}
            </span>

            {!isElectron ? null : isRecording ? (
              <Button size="sm" variant="destructive" className="h-7 text-xs shrink-0"
                onClick={handleStopRecording} disabled={stopCodegen.isPending}>
                {stopCodegen.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Square className="h-3.5 w-3.5 mr-1" />}
                Stop
              </Button>
            ) : recordingDone ? (
              <Button size="sm" variant="outline" className="h-7 text-xs shrink-0"
                onClick={() => { setRecordedScript(null); setEditedScript(''); setSessionId(null); }}>
                Record Again
              </Button>
            ) : (
              <Button size="sm" className="h-7 text-xs shrink-0"
                onClick={handleStartRecording} disabled={startCodegen.isPending}>
                {startCodegen.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Video className="h-3.5 w-3.5 mr-1" />}
                Start Recording
              </Button>
            )}
          </div>

          {/* Script editor — always visible; empty placeholder until recorded */}
          <div className="rounded-lg border overflow-hidden">
            <div className="flex items-center justify-between px-3 py-1.5 border-b bg-muted/30">
              <span className="text-xs text-muted-foreground font-mono">playwright-recording.ts</span>
              {editedScript && (
                <Button variant="ghost" size="sm" className="h-6 text-xs gap-1 px-2"
                  onClick={() => navigator.clipboard.writeText(editedScript).then(() => toast.success('Copied'))}>
                  <Copy className="h-3 w-3" /> Copy
                </Button>
              )}
            </div>
            <CodeEditor value={editedScript} onChange={setEditedScript} height="420px" allowFullscreen />
          </div>
        </TabsContent>

        <TabsContent value="paste" className="mt-0 space-y-2">
          <p className="text-xs text-muted-foreground">
            Run <code className="bg-muted px-1.5 py-0.5 rounded font-mono">npx playwright codegen your-app.com</code> and paste the output below.
          </p>
          <div className="rounded-lg border overflow-hidden">
            <div className="flex items-center px-3 py-1.5 border-b bg-muted/30">
              <span className="text-xs text-muted-foreground font-mono">playwright-script.ts</span>
            </div>
            <CodeEditor value={pastedScript} onChange={setPastedScript} height="460px" allowFullscreen />
          </div>
        </TabsContent>
      </Tabs>

      <div className="flex items-center justify-between pt-1">
        <Button variant="ghost" size="sm" onClick={() => setStep('configure')}>
          <ChevronLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <Button
          onClick={() => setStep('review')}
          disabled={inputMode === 'paste' ? !pastedScript.trim() : !recordingDone}
        >
          Review & Generate <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );

  // ── Step 3: Review & Generate ───────────────────────────────────────────────
  if (step === 'review') return (
    <div className="space-y-4">
      {Header}
      <div className="grid gap-4 lg:grid-cols-4">
        {/* Script viewer — 3/4 */}
        <div className="lg:col-span-3 rounded-lg border overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-3 py-1.5 border-b bg-muted/30 shrink-0">
            <span className="text-xs text-muted-foreground font-mono">playwright-recording.ts</span>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{activeScript.split('\n').length} lines</span>
              <Button variant="ghost" size="sm" className="h-6 text-xs gap-1 px-2"
                onClick={() => navigator.clipboard.writeText(activeScript).then(() => toast.success('Copied'))}>
                <Copy className="h-3 w-3" /> Copy
              </Button>
            </div>
          </div>
          <CodeViewer value={activeScript} height="500px" allowFullscreen />
        </div>

        {/* Summary + generate — 1/4 */}
        <div className="space-y-3">
          <Card className="text-sm">
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm flex items-center gap-2">
                <Bot className="h-4 w-4 text-primary" /> Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-2.5">
              <div>
                <p className="text-xs text-muted-foreground">Suite</p>
                <p className="font-medium text-sm truncate">{suiteName}</p>
              </div>
              {flowDescription && (
                <>
                  <Separator />
                  <div>
                    <p className="text-xs text-muted-foreground">Flow</p>
                    <p className="text-xs mt-0.5">{flowDescription}</p>
                  </div>
                </>
              )}
              {selectedEnv && (
                <>
                  <Separator />
                  <div>
                    <p className="text-xs text-muted-foreground">Environment</p>
                    <p className="font-medium text-xs mt-0.5">{selectedEnv.name}</p>
                    <p className="text-xs text-muted-foreground font-mono truncate">{selectedEnv.baseUrl}</p>
                  </div>
                </>
              )}
              <Separator />
              <div className="text-xs text-muted-foreground space-y-0.5">
                <p className="flex items-center gap-1 text-foreground font-medium">
                  <Zap className="h-3 w-3 text-primary" /> AI will generate
                </p>
                <p>• Test cases (AI decides count)</p>
                <p>• Playwright script per test case</p>
                <p>• Step-by-step instructions</p>
              </div>
            </CardContent>
          </Card>

          {generateSuite.isError && (
            <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
              <p className="text-xs text-destructive">
                {(generateSuite.error as any)?.message || 'Generation failed. Check AI settings.'}
              </p>
            </div>
          )}

          {generateSuite.isPending ? (
            <div className="flex flex-col items-center gap-2 p-4 rounded-lg border bg-muted/30">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="text-xs text-muted-foreground text-center">Analyzing script and generating test cases…</p>
              <Progress value={undefined} className="w-full h-1 animate-pulse" />
            </div>
          ) : (
            <Button onClick={handleGenerate} disabled={!activeScript.trim()} className="w-full" size="lg">
              <Sparkles className="h-4 w-4 mr-2" /> Generate Test Cases
            </Button>
          )}

          <Button variant="ghost" className="w-full text-xs" onClick={() => setStep('record')}>
            <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Edit Recording
          </Button>
        </div>
      </div>
    </div>
  );

  // ── Step 4: Done ─────────────────────────────────────────────────────────────
  if (step === 'done' && result) return (
    <div className="space-y-4">
      {Header}
      {/* Done banner */}
      <div className="flex items-center gap-3 p-4 rounded-lg border bg-green-500/5 border-green-500/20">
        <div className="w-9 h-9 rounded-full bg-green-500/15 flex items-center justify-center shrink-0">
          <CheckCircle2 className="h-5 w-5 text-green-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold">{result.suite.name}</p>
          <p className="text-sm text-muted-foreground">
            {result.count} test cases generated · each has a Playwright script seeded from your recording
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={reset}>Generate Another</Button>
          <Button size="sm" onClick={() => navigate(`/app/test-suites/${result.suite.id}`)}>
            View Suite
          </Button>
        </div>
      </div>

      {/* Test case grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {result.testCases.map((tc, i) => (
          <div key={tc.id} className="rounded-lg border bg-card p-4 space-y-2 hover:shadow-sm transition-shadow">
            <div className="flex items-start gap-2">
              <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0 mt-0.5">
                {i + 1}
              </span>
              <p className="font-medium text-sm leading-tight">{tc.title}</p>
            </div>
            {tc.description && (
              <p className="text-xs text-muted-foreground line-clamp-2 pl-7">{tc.description}</p>
            )}
            <div className="flex items-center gap-1.5 pl-7 flex-wrap">
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 capitalize h-4">{tc.priority}</Badge>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 gap-0.5">
                <Zap className="h-2.5 w-2.5" /> script ready
              </Badge>
              {tc.tags?.slice(0, 2).map((t) => (
                <Badge key={t} variant="secondary" className="text-[10px] px-1.5 py-0 h-4">{t}</Badge>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-center pt-2">
        <Button variant="ghost" size="sm" onClick={() => navigate('/app/test-suites')}>
          Back to Test Suites
        </Button>
      </div>
    </div>
  );

  return null;
};
