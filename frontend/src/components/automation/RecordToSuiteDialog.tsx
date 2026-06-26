import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Loader2,
  Video,
  Square,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  FolderTree,
  Bot,
  AlertCircle,
  ExternalLink,
  Globe,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useGenerateSuiteFromRecording } from '@/hooks/useAutomation';
import { useStartCodegen, useCodegenStatus, useStopCodegen } from '@/hooks/useAutomation';
import { useEnvironments } from '@/hooks/useEnvironments';
import type { TestCase, TestSuite } from '@/types';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onCreated: (suite: TestSuite, testCases: TestCase[]) => void;
}

type Step = 'configure' | 'record' | 'review' | 'done';

const STEPS: Step[] = ['configure', 'record', 'review', 'done'];

const stepLabel: Record<Step, string> = {
  configure: 'Configure',
  record: 'Record',
  review: 'Review & Generate',
  done: 'Done',
};

export function RecordToSuiteDialog({ open, onOpenChange, projectId, onCreated }: Props) {
  const [step, setStep] = useState<Step>('configure');

  // Step 1 — configure
  const [suiteName, setSuiteName] = useState('');
  const [suiteDescription, setSuiteDescription] = useState('');
  const [flowDescription, setFlowDescription] = useState('');
  const [selectedEnvId, setSelectedEnvId] = useState('');

  // Step 2 — record
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [recordedScript, setRecordedScript] = useState<string | null>(null);
  const [pastedScript, setPastedScript] = useState('');
  const [useManualPaste, setUseManualPaste] = useState(false);

  // Step 3 — review / generate
  const [result, setResult] = useState<{ suite: TestSuite; testCases: TestCase[]; count: number } | null>(null);

  const startCodegen = useStartCodegen();
  const stopCodegen = useStopCodegen();
  const generateSuite = useGenerateSuiteFromRecording();
  const isElectron = !!window.electron?.isElectron;

  const { data: environments = [] } = useEnvironments(projectId);
  const { data: sessionStatus } = useCodegenStatus(sessionId ?? undefined);

  const selectedEnv = environments.find((e) => e.id === selectedEnvId) ?? null;

  // Track recording state
  useEffect(() => {
    if (sessionStatus?.status === 'completed' && sessionStatus.recordedScript) {
      setRecordedScript(sessionStatus.recordedScript);
    }
    if (sessionStatus?.status === 'failed' && sessionStatus.error) {
      if (sessionStatus.error === 'CHROMIUM_NOT_INSTALLED') {
        toast.error('Chromium is not installed. Please wait for the automatic download to complete.');
      } else {
        toast.error(`Recording failed: ${sessionStatus.error}`);
      }
    }
  }, [sessionStatus]);

  const reset = useCallback(() => {
    setStep('configure');
    setSuiteName('');
    setSuiteDescription('');
    setFlowDescription('');
    setSelectedEnvId('');
    setSessionId(null);
    setRecordedScript(null);
    setPastedScript('');
    setUseManualPaste(false);
    setResult(null);
  }, []);

  const handleClose = () => {
    if (sessionId && sessionStatus?.status === 'recording') {
      stopCodegen.mutate(sessionId);
    }
    reset();
    onOpenChange(false);
  };

  const handleStartRecording = async () => {
    try {
      const res = await startCodegen.mutateAsync({
        projectId,
        targetUrl: selectedEnv?.baseUrl || undefined,
      });
      setSessionId(res.sessionId);
    } catch (err: any) {
      toast.error(err.message || 'Failed to start recording');
    }
  };

  const handleStopRecording = async () => {
    if (!sessionId) return;
    try {
      await stopCodegen.mutateAsync(sessionId);
    } catch {
      // ignore
    }
  };

  const handleGenerate = async () => {
    const script = useManualPaste ? pastedScript : recordedScript;
    if (!script?.trim()) {
      toast.error('No recording available. Please record a flow or paste a Playwright script.');
      return;
    }

    try {
      const res = await generateSuite.mutateAsync({
        projectId,
        suiteName,
        suiteDescription: suiteDescription || undefined,
        recordedScript: script,
        flowDescription: flowDescription || undefined,
        suiteVariables: selectedEnv?.variables ?? {},
        environmentId: selectedEnv?.id,
      });
      setResult(res);
      setStep('done');
      onCreated(res.suite, res.testCases);
    } catch (err: any) {
      toast.error(err.message || 'AI generation failed');
    }
  };

  const isRecording = sessionStatus?.status === 'recording';
  const recordingDone = !!recordedScript || sessionStatus?.status === 'completed';

  const stepIndex = STEPS.indexOf(step);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Generate Test Suite from Recording
          </DialogTitle>
          <DialogDescription>
            Record a flow once — AI generates a complete test suite with multiple test cases
          </DialogDescription>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-1 mt-2 mb-6">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-1 flex-1">
              <div className={cn(
                'flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold transition-colors',
                i < stepIndex ? 'bg-primary text-primary-foreground' :
                i === stepIndex ? 'bg-primary text-primary-foreground ring-2 ring-primary/30' :
                'bg-muted text-muted-foreground'
              )}>
                {i < stepIndex ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
              </div>
              <span className={cn('text-xs hidden sm:block', i === stepIndex ? 'text-foreground font-medium' : 'text-muted-foreground')}>
                {stepLabel[s]}
              </span>
              {i < STEPS.length - 1 && <div className="flex-1 h-px bg-border mx-1" />}
            </div>
          ))}
        </div>

        {/* ── Step 1: Configure ── */}
        {step === 'configure' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="suiteName">Suite Name <span className="text-destructive">*</span></Label>
              <Input
                id="suiteName"
                placeholder="e.g. Authentication Test Suite"
                value={suiteName}
                onChange={(e) => setSuiteName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="suiteDesc">Suite Description</Label>
              <Textarea
                id="suiteDesc"
                rows={2}
                placeholder="Briefly describe what this suite covers..."
                value={suiteDescription}
                onChange={(e) => setSuiteDescription(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="flowDesc">
                What flow are you recording?{' '}
                <span className="text-muted-foreground text-xs">(helps AI generate better test cases)</span>
              </Label>
              <Input
                id="flowDesc"
                placeholder="e.g. User login with valid and invalid credentials"
                value={flowDescription}
                onChange={(e) => setFlowDescription(e.target.value)}
              />
            </div>

            {/* Environment selector */}
            <div className="space-y-2">
              <Label>
                Environment{' '}
                <span className="text-muted-foreground text-xs">(optional — sets starting URL and imports variables into the suite)</span>
              </Label>
              {environments.length === 0 ? (
                <div className="flex items-center gap-2 p-3 bg-muted/40 rounded-lg text-sm text-muted-foreground">
                  <Globe className="h-4 w-4 shrink-0" />
                  No environments configured for this project. Add one in Project Settings.
                </div>
              ) : (
                <Select value={selectedEnvId} onValueChange={setSelectedEnvId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an environment (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {environments.map((env) => (
                      <SelectItem key={env.id} value={env.id}>
                        <div className="flex items-center gap-2">
                          <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>{env.name}</span>
                          <span className="text-muted-foreground text-xs">{env.baseUrl}</span>
                          {env.isDefault && <Badge variant="secondary" className="text-xs px-1 py-0">default</Badge>}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {selectedEnv && Object.keys(selectedEnv.variables ?? {}).length > 0 && (
                <p className="text-xs text-muted-foreground ml-1">
                  {Object.keys(selectedEnv.variables).length} variable{Object.keys(selectedEnv.variables).length !== 1 ? 's' : ''} will be imported into the suite ({Object.keys(selectedEnv.variables).join(', ')})
                </p>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <Button onClick={() => setStep('record')} disabled={!suiteName.trim()}>
                Next: Record Flow <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 2: Record ── */}
        {step === 'record' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Button variant="ghost" size="sm" onClick={() => setStep('configure')}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Back
              </Button>
            </div>

            <div className="flex gap-2 mb-4">
              <Button
                variant={!useManualPaste ? 'default' : 'outline'}
                size="sm"
                onClick={() => setUseManualPaste(false)}
              >
                <Video className="h-4 w-4 mr-2" /> Record Live
              </Button>
              <Button
                variant={useManualPaste ? 'default' : 'outline'}
                size="sm"
                onClick={() => setUseManualPaste(true)}
              >
                Paste Script
              </Button>
            </div>

            {!useManualPaste ? (
              <div className="space-y-4">
                {!isElectron && (
                  <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-sm">
                    <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                    <p className="text-amber-700 dark:text-amber-400">Live recording requires the desktop app. Use "Paste Script" to import a Playwright recording.</p>
                  </div>
                )}
                {selectedEnv && (
                  <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg text-xs text-muted-foreground">
                    <Globe className="h-3.5 w-3.5 shrink-0" />
                    Recording will start at <span className="font-mono font-medium text-foreground ml-1">{selectedEnv.baseUrl}</span>
                  </div>
                )}
                <div className="rounded-lg border bg-muted/30 p-6 text-center space-y-4">
                  {!isRecording && !recordingDone ? (
                    <>
                      <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <Video className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">Ready to record</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          A browser window will open. Interact with your app to record the flow, then close the browser when done.
                        </p>
                      </div>
                      <Button onClick={handleStartRecording} disabled={!isElectron || startCodegen.isPending} size="lg">
                        {startCodegen.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Video className="h-4 w-4 mr-2" />}
                        Start Recording
                      </Button>
                    </>
                  ) : isRecording ? (
                    <>
                      <div className="mx-auto w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center animate-pulse">
                        <div className="w-4 h-4 rounded-full bg-red-500" />
                      </div>
                      <div>
                        <p className="font-medium text-red-600 dark:text-red-400">Recording in progress…</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Interact with your app. Close the browser when done, or click Stop.
                        </p>
                      </div>
                      <Button variant="destructive" onClick={handleStopRecording} disabled={stopCodegen.isPending}>
                        {stopCodegen.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Square className="h-4 w-4 mr-2" />}
                        Stop Recording
                      </Button>
                    </>
                  ) : (
                    <>
                      <div className="mx-auto w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
                        <CheckCircle2 className="h-6 w-6 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium text-green-700 dark:text-green-400">Recording captured!</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {recordedScript?.split('\n').length ?? 0} lines recorded. Ready to generate test cases.
                        </p>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => { setRecordedScript(null); setSessionId(null); }}>
                        Record Again
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Paste your Playwright recording</Label>
                <Textarea
                  rows={12}
                  placeholder={`import { test, expect } from '@playwright/test';\n\ntest('test', async ({ page }) => {\n  await page.goto('...');\n  // paste your codegen recording here\n});`}
                  value={pastedScript}
                  onChange={(e) => setPastedScript(e.target.value)}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Run <code className="bg-muted px-1 rounded">npx playwright codegen your-app.com</code> and paste the output above.
                </p>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button
                onClick={() => setStep('review')}
                disabled={useManualPaste ? !pastedScript.trim() : !recordingDone}
              >
                Next: Generate <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 3: Review & Generate ── */}
        {step === 'review' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Button variant="ghost" size="sm" onClick={() => setStep('record')}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Back
              </Button>
            </div>

            <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-primary" />
                <span className="font-medium">Ready to generate</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">Suite:</span> <span className="font-medium">{suiteName}</span></div>
                {selectedEnv && (
                  <div><span className="text-muted-foreground">Environment:</span> <span className="font-medium">{selectedEnv.name}</span></div>
                )}
                {flowDescription && (
                  <div className="col-span-2"><span className="text-muted-foreground">Flow:</span> <span className="font-medium">{flowDescription}</span></div>
                )}
                <div className="col-span-2">
                  <span className="text-muted-foreground">Script:</span>{' '}
                  <span className="font-medium">
                    {(useManualPaste ? pastedScript : recordedScript)?.split('\n').length ?? 0} lines
                  </span>
                </div>
                {selectedEnv && Object.keys(selectedEnv.variables ?? {}).length > 0 && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Suite variables:</span>{' '}
                    <span className="font-medium">{Object.keys(selectedEnv.variables).join(', ')}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="text-sm text-muted-foreground space-y-1 rounded-lg border p-3">
              <p className="font-medium text-foreground">AI will generate:</p>
              <ul className="list-disc list-inside space-y-0.5 ml-1">
                <li>Happy path scenarios (valid inputs → success)</li>
                <li>Negative/error cases (invalid inputs, wrong data)</li>
                <li>Edge cases (empty fields, boundary values)</li>
                <li>Step-by-step test instructions based on your recording</li>
              </ul>
              <p className="text-xs mt-2 italic">AI decides the optimal number of test cases based on your flow.</p>
            </div>

            {generateSuite.isPending && (
              <div className="flex flex-col items-center gap-3 py-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">AI is analyzing your recording and generating test cases…</p>
                <Progress value={undefined} className="w-48 h-1 animate-pulse" />
              </div>
            )}

            {generateSuite.isError && (
              <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm">
                <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                <p className="text-destructive">{(generateSuite.error as any)?.message || 'Generation failed. Check your AI settings.'}</p>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button onClick={handleGenerate} disabled={generateSuite.isPending} size="lg">
                {generateSuite.isPending
                  ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating…</>
                  : <><Sparkles className="h-4 w-4 mr-2" /> Generate Test Cases</>
                }
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 4: Done ── */}
        {step === 'done' && result && (
          <div className="space-y-4 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Suite Created!</h3>
              <p className="text-muted-foreground mt-1">
                <span className="font-medium text-foreground">{result.count}</span> test cases generated in{' '}
                <span className="font-medium text-foreground">"{result.suite.name}"</span>
              </p>
            </div>
            <div className="rounded-lg border bg-muted/30 p-4 text-left space-y-2">
              <div className="flex items-center gap-2 mb-3">
                <FolderTree className="h-4 w-4 text-primary" />
                <span className="font-medium">{result.suite.name}</span>
              </div>
              {result.testCases.map((tc, i) => (
                <div key={tc.id} className="flex items-start gap-2 text-sm">
                  <span className="text-muted-foreground shrink-0 w-5">{i + 1}.</span>
                  <div>
                    <span className="font-medium">{tc.title}</span>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Badge variant="outline" className="text-xs px-1 py-0">{tc.priority}</Badge>
                      {tc.tags?.slice(0, 3).map((t) => (
                        <Badge key={t} variant="secondary" className="text-xs px-1 py-0">{t}</Badge>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-center gap-3 pt-2">
              <Button variant="outline" onClick={() => { reset(); }}>
                Generate Another
              </Button>
              <Button onClick={handleClose}>
                <ExternalLink className="h-4 w-4 mr-2" /> View Suite
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
