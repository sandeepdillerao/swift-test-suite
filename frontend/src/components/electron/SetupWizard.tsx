import { useState, useEffect, useCallback } from 'react'
import {
  Server, Cloud, Database, CheckCircle2, XCircle, RefreshCw,
  ArrowRight, ArrowLeft, FlaskConical, Copy, Check,
  AlertCircle, Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

type Mode = 'local' | 'remote'
type CheckState = 'idle' | 'checking' | 'ok' | 'fail'

interface Props {
  onComplete: () => void
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

const StatusIcon = ({ state, className }: { state: CheckState; className?: string }) => {
  if (state === 'checking') return <Loader2 className={cn('animate-spin text-amber-500', className)} />
  if (state === 'ok') return <CheckCircle2 className={cn('text-emerald-500', className)} />
  if (state === 'fail') return <XCircle className={cn('text-destructive', className)} />
  return <AlertCircle className={cn('text-muted-foreground', className)} />
}

const StepDot = ({ n, current, done }: { n: number; current: number; done: boolean }) => (
  <div className={cn(
    'h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all',
    done ? 'bg-emerald-500 border-emerald-500 text-white'
      : n === current ? 'bg-primary border-primary text-primary-foreground'
        : 'bg-muted border-border text-muted-foreground',
  )}>
    {done ? <Check className="h-3.5 w-3.5" /> : n}
  </div>
)

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-muted transition-colors"
      title="Copy"
    >
      {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}

function CodeBlock({ code }: { code: string }) {
  return (
    <div className="relative rounded-lg border border-border bg-muted/40 mt-2">
      <div className="absolute top-2 right-2"><CopyButton text={code} /></div>
      <pre className="p-3 pr-16 text-xs font-mono text-foreground overflow-x-auto leading-relaxed whitespace-pre-wrap">{code}</pre>
    </div>
  )
}

// ─── Main wizard ─────────────────────────────────────────────────────────────

export const SetupWizard = ({ onComplete }: Props): JSX.Element => {
  const [mode, setMode] = useState<Mode | null>(null)
  const [step, setStep] = useState(1) // 1=choose, 2=pg, 3=db, 4=done (local) / 2=remote-url, 3=done (remote)
  const [platform, setPlatform] = useState<string>('darwin')
  const [pgExpanded, setPgExpanded] = useState(false)

  // ── PostgreSQL check (step 2 local) ──
  const [pgHost, setPgHost] = useState('localhost')
  const [pgPort, setPgPort] = useState('5432')
  const [pgCheck, setPgCheck] = useState<CheckState>('idle')
  const [pgError, setPgError] = useState('')

  // ── DB credentials (step 3 local) ──
  const [dbUser, setDbUser] = useState('testflow')
  const [dbPassword, setDbPassword] = useState('')
  const [dbName, setDbName] = useState('testflow_db')
  const [dbCheck, setDbCheck] = useState<CheckState>('idle')
  const [dbError, setDbError] = useState('')

  // ── Remote URL (step 2 remote) ──
  const [remoteUrl, setRemoteUrl] = useState('https://')
  const [remoteCheck, setRemoteCheck] = useState<CheckState>('idle')
  const [remoteError, setRemoteError] = useState('')

  useEffect(() => {
    window.electron?.getPlatformInfo().then(i => setPlatform(i.platform))
  }, [])

  // ─── PostgreSQL port check ──────────────────────────────────────────────

  const checkPgPort = useCallback(async () => {
    setPgCheck('checking')
    setPgError('')
    const result = await window.electron!.checkPgPort(pgHost, Number(pgPort))
    if (result.ok) {
      setPgCheck('ok')
    } else {
      setPgCheck('fail')
      setPgError(result.error ?? 'Could not connect')
      setPgExpanded(true)
    }
  }, [pgHost, pgPort])

  useEffect(() => {
    if (step === 2 && mode === 'local') checkPgPort()
  }, [step, mode]) // eslint-disable-line react-hooks/exhaustive-deps

  // ─── DB credentials check ───────────────────────────────────────────────

  const checkDbCredentials = async () => {
    setDbCheck('checking')
    setDbError('')
    const result = await window.electron!.checkPgCredentials({
      host: pgHost, port: Number(pgPort),
      user: dbUser, password: dbPassword, database: dbName,
    })
    if (result.ok) {
      setDbCheck('ok')
    } else {
      setDbCheck('fail')
      setDbError(result.error ?? 'Authentication failed')
    }
  }

  // ─── Remote URL check ───────────────────────────────────────────────────

  const checkRemoteUrl = async () => {
    setRemoteCheck('checking')
    setRemoteError('')
    try {
      const clean = remoteUrl.replace(/\/+$/, '')
      const res = await fetch(`${clean}/health`, { signal: AbortSignal.timeout(6000) })
      if (res.ok || res.status === 401 || res.status === 403) {
        setRemoteCheck('ok')
      } else {
        throw new Error(`HTTP ${res.status}`)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setRemoteError(msg.includes('Failed to fetch') || msg.includes('refused') ? `No server found at ${remoteUrl}` : msg)
      setRemoteCheck('fail')
    }
  }

  // ─── Save & complete ────────────────────────────────────────────────────

  const saveLocal = async () => {
    await window.electron!.saveLocalServer({
      dbHost: pgHost, dbPort: Number(pgPort),
      dbUsername: dbUser, dbPassword, dbName,
      backendPort: 3000,
    })
    onComplete()
  }

  const saveRemote = async () => {
    await window.electron!.saveRemoteServer(remoteUrl)
    onComplete()
  }

  // ─── Install SQL ────────────────────────────────────────────────────────

  const sqlCommands = [
    `CREATE USER ${dbUser} WITH PASSWORD '${dbPassword || 'your_password'}';`,
    `CREATE DATABASE ${dbName} OWNER ${dbUser};`,
    `GRANT ALL PRIVILEGES ON DATABASE ${dbName} TO ${dbUser};`,
  ].join('\n')

  const pgInstallCmd = platform === 'darwin'
    ? 'brew install postgresql@15\nbrew services start postgresql@15'
    : platform === 'win32'
      ? '# Download from: https://www.postgresql.org/download/windows/\n# Install version 15+, keep default port 5432'
      : 'sudo apt-get update\nsudo apt-get install -y postgresql\nsudo systemctl enable --now postgresql'

  const pgConnectCmd = platform === 'win32'
    ? '# Open "SQL Shell (psql)" from the Start Menu'
    : 'psql -U postgres'

  // ─── Step totals ────────────────────────────────────────────────────────
  // Local: 1(choose) 2(pg) 3(db) 4(done)
  // Remote: 1(choose) 2(url) 3(done)
  const totalSteps = mode === 'local' ? 4 : mode === 'remote' ? 3 : 1

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-xl">

        {/* Header */}
        <div className="text-center mb-6">
          <div className="flex justify-center mb-3">
            <div className="h-14 w-14 rounded-2xl bg-primary flex items-center justify-center shadow-lg">
              <FlaskConical className="h-7 w-7 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-2xl font-bold">Welcome to TestFlow TCM</h1>
          <p className="text-sm text-muted-foreground mt-1">Let's get you set up in a few steps.</p>
        </div>

        {/* Step indicator */}
        {mode && (
          <div className="flex items-center justify-center gap-2 mb-6">
            {Array.from({ length: totalSteps }, (_, i) => i + 1).map((n, idx, arr) => (
              <div key={n} className="flex items-center gap-2">
                <StepDot n={n} current={step} done={step > n} />
                {idx < arr.length - 1 && (
                  <div className={cn('h-0.5 w-8 rounded', step > n ? 'bg-emerald-500' : 'bg-border')} />
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── Step 1: Choose mode ── */}
        {step === 1 && (
          <div className="space-y-3">
            <p className="text-sm text-center text-muted-foreground mb-4">How do you want to run TestFlow?</p>

            <ModeCard
              icon={<Server className="h-6 w-6" />}
              title="Run locally on this machine"
              description="TestFlow starts its own backend when you open the app. Needs PostgreSQL installed locally. Best for individual use."
              onClick={() => { setMode('local'); setStep(2) }}
            />
            <ModeCard
              icon={<Cloud className="h-6 w-6" />}
              title="Connect to a shared server"
              description="Connect to a hosted TestFlow instance. Best for teams — everyone shares the same data."
              onClick={() => { setMode('remote'); setStep(2) }}
            />
          </div>
        )}

        {/* ── Step 2 (local): PostgreSQL check ── */}
        {step === 2 && mode === 'local' && (
          <WizardCard
            icon={<Database className="h-5 w-5 text-primary" />}
            title="PostgreSQL"
            subtitle="TestFlow needs PostgreSQL to store your data."
            status={pgCheck}
            statusText={{
              idle: 'Checking…',
              checking: 'Checking if PostgreSQL is running…',
              ok: `PostgreSQL is running on ${pgHost}:${pgPort}`,
              fail: pgError || 'PostgreSQL is not reachable',
            }[pgCheck]}
          >
            {/* Host / Port inputs */}
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div className="space-y-1">
                <Label className="text-xs">Host</Label>
                <Input value={pgHost} onChange={e => setPgHost(e.target.value)} className="h-8 text-sm" placeholder="localhost" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Port</Label>
                <Input value={pgPort} onChange={e => setPgPort(e.target.value)} className="h-8 text-sm" placeholder="5432" />
              </div>
            </div>

            <Button variant="outline" size="sm" className="mt-3 gap-2" onClick={checkPgPort} disabled={pgCheck === 'checking'}>
              {pgCheck === 'checking' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              Check again
            </Button>

            {/* Install instructions (collapsed by default, expands on failure) */}
            {pgCheck === 'fail' && (
              <div className="mt-3">
                <button
                  onClick={() => setPgExpanded(v => !v)}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                >
                  {pgExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  {pgExpanded ? 'Hide' : 'Show'} install instructions
                </button>
                {pgExpanded && (
                  <div className="mt-2 space-y-2">
                    <p className="text-xs text-muted-foreground">
                      {platform === 'darwin' ? 'Run in Terminal:' : platform === 'win32' ? 'Windows:' : 'Run in Terminal:'}
                    </p>
                    <CodeBlock code={pgInstallCmd} />
                    <p className="text-xs text-muted-foreground mt-2">After installing, click <strong>Check again</strong> above.</p>
                  </div>
                )}
              </div>
            )}

            <WizardNav
              onBack={() => { setMode(null); setStep(1) }}
              onNext={() => setStep(3)}
              nextDisabled={pgCheck !== 'ok'}
              nextLabel="Next: Database setup"
            />
          </WizardCard>
        )}

        {/* ── Step 3 (local): DB credentials ── */}
        {step === 3 && mode === 'local' && (
          <WizardCard
            icon={<Database className="h-5 w-5 text-primary" />}
            title="Database setup"
            subtitle="Create a dedicated user and database for TestFlow, then verify below."
            status={dbCheck}
            statusText={{
              idle: 'Enter credentials and click "Test connection"',
              checking: 'Connecting to the database…',
              ok: `Connected to "${dbName}" as "${dbUser}"`,
              fail: dbError || 'Could not connect',
            }[dbCheck]}
          >
            {/* SQL commands to copy */}
            <div className="mt-3">
              <p className="text-xs text-muted-foreground mb-1">
                Run these in <strong>psql</strong> (connect as the <code className="bg-muted px-1 rounded">postgres</code> superuser first):
              </p>
              <p className="text-xs font-mono text-muted-foreground bg-muted/40 border border-border rounded px-2 py-1">{pgConnectCmd}</p>
              <CodeBlock code={sqlCommands} />
              <p className="text-xs text-muted-foreground mt-1">Use the same password below.</p>
            </div>

            {/* Credential fields */}
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="space-y-1">
                <Label className="text-xs">Username</Label>
                <Input value={dbUser} onChange={e => { setDbUser(e.target.value); setDbCheck('idle') }} className="h-8 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Password</Label>
                <Input type="password" value={dbPassword} onChange={e => { setDbPassword(e.target.value); setDbCheck('idle') }} className="h-8 text-sm" placeholder="your_password" />
              </div>
              <div className="col-span-2 space-y-1">
                <Label className="text-xs">Database name</Label>
                <Input value={dbName} onChange={e => { setDbName(e.target.value); setDbCheck('idle') }} className="h-8 text-sm" />
              </div>
            </div>

            <Button variant="outline" size="sm" className="mt-3 gap-2" onClick={checkDbCredentials} disabled={dbCheck === 'checking' || !dbPassword}>
              {dbCheck === 'checking' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              Test connection
            </Button>

            <WizardNav
              onBack={() => setStep(2)}
              onNext={() => setStep(4)}
              nextDisabled={dbCheck !== 'ok'}
              nextLabel="Finish setup"
            />
          </WizardCard>
        )}

        {/* ── Step 4 (local): Done ── */}
        {step === 4 && mode === 'local' && (
          <WizardCard
            icon={<CheckCircle2 className="h-5 w-5 text-emerald-500" />}
            title="You're all set!"
            subtitle="TestFlow is configured and ready to launch."
            status="ok"
            statusText="All checks passed"
          >
            <div className="mt-3 space-y-2">
              <SummaryRow icon="ok" label={`PostgreSQL on ${pgHost}:${pgPort}`} />
              <SummaryRow icon="ok" label={`Database "${dbName}" as "${dbUser}"`} />
              <SummaryRow icon="skip" label="Chromium will download automatically in the background (~170 MB)" />
            </div>

            <Button className="w-full mt-5 gap-2" size="lg" onClick={saveLocal}>
              Open TestFlow <ArrowRight className="h-4 w-4" />
            </Button>
          </WizardCard>
        )}

        {/* ── Step 2 (remote): Server URL ── */}
        {step === 2 && mode === 'remote' && (
          <WizardCard
            icon={<Cloud className="h-5 w-5 text-primary" />}
            title="Server connection"
            subtitle="Enter the URL of your hosted TestFlow backend."
            status={remoteCheck}
            statusText={{
              idle: 'Enter the URL and click "Test connection"',
              checking: 'Connecting to the server…',
              ok: 'Server is reachable and responding',
              fail: remoteError || 'Could not connect',
            }[remoteCheck]}
          >
            <div className="mt-3 space-y-1">
              <Label className="text-xs">API URL</Label>
              <Input
                value={remoteUrl}
                onChange={e => { setRemoteUrl(e.target.value); setRemoteCheck('idle') }}
                placeholder="https://testflow.yourcompany.com/api/v1"
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">Ask your administrator for the API URL.</p>
            </div>

            <Button variant="outline" size="sm" className="mt-3 gap-2" onClick={checkRemoteUrl} disabled={remoteCheck === 'checking' || !remoteUrl || remoteUrl === 'https://'}>
              {remoteCheck === 'checking' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              Test connection
            </Button>

            <WizardNav
              onBack={() => { setMode(null); setStep(1) }}
              onNext={() => setStep(3)}
              nextDisabled={remoteCheck !== 'ok'}
              nextLabel="Next: All done!"
            />
          </WizardCard>
        )}

        {/* ── Step 3 (remote): Done ── */}
        {step === 3 && mode === 'remote' && (
          <WizardCard
            icon={<CheckCircle2 className="h-5 w-5 text-emerald-500" />}
            title="You're all set!"
            subtitle="TestFlow will connect to your hosted server."
            status="ok"
            statusText="Server connection verified"
          >
            <div className="mt-3">
              <SummaryRow icon="ok" label={`Server: ${remoteUrl}`} />
            </div>
            <Button className="w-full mt-5 gap-2" size="lg" onClick={saveRemote}>
              Open TestFlow <ArrowRight className="h-4 w-4" />
            </Button>
          </WizardCard>
        )}
      </div>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const ModeCard = ({ icon, title, description, onClick }: {
  icon: React.ReactNode; title: string; description: string; onClick: () => void
}) => (
  <button
    onClick={onClick}
    className="w-full rounded-xl border border-border bg-card p-5 text-left hover:border-primary/50 hover:bg-primary/5 transition-colors group flex items-start gap-4"
  >
    <div className="mt-0.5 h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary flex-shrink-0 group-hover:bg-primary/20 transition-colors">
      {icon}
    </div>
    <div className="flex-1">
      <p className="font-semibold text-sm">{title}</p>
      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{description}</p>
    </div>
    <ArrowRight className="h-4 w-4 text-muted-foreground mt-1 flex-shrink-0 group-hover:text-primary transition-colors" />
  </button>
)

const WizardCard = ({ icon, title, subtitle, status, statusText, children }: {
  icon: React.ReactNode; title: string; subtitle: string
  status: CheckState | 'ok'
  statusText: string
  children: React.ReactNode
}) => (
  <div className="rounded-xl border border-border bg-card p-6">
    <div className="flex items-start gap-3 mb-1">
      <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
        {icon}
      </div>
      <div>
        <p className="font-semibold">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
      </div>
    </div>

    {/* Status bar */}
    <div className={cn(
      'flex items-center gap-2 rounded-lg px-3 py-2 mt-4 text-xs font-medium',
      status === 'ok' ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
        : status === 'fail' ? 'bg-destructive/10 text-destructive'
          : status === 'checking' ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
            : 'bg-muted text-muted-foreground',
    )}>
      <StatusIcon state={status as CheckState} className="h-4 w-4 flex-shrink-0" />
      {statusText}
    </div>

    {children}
  </div>
)

const WizardNav = ({ onBack, onNext, nextDisabled, nextLabel, nextVariant = 'default' }: {
  onBack?: () => void
  onNext: () => void
  nextDisabled?: boolean
  nextLabel?: string
  nextVariant?: 'default' | 'outline'
}) => (
  <div className="flex items-center justify-between mt-5 pt-4 border-t border-border">
    {onBack ? (
      <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5">
        <ArrowLeft className="h-3.5 w-3.5" /> Back
      </Button>
    ) : <div />}
    <Button variant={nextVariant} size="sm" onClick={onNext} disabled={nextDisabled} className="gap-1.5">
      {nextLabel ?? 'Next'} <ArrowRight className="h-3.5 w-3.5" />
    </Button>
  </div>
)

const SummaryRow = ({ icon, label }: { icon: 'ok' | 'skip'; label: string }) => (
  <div className="flex items-center gap-2 text-sm">
    {icon === 'ok'
      ? <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
      : <AlertCircle className="h-4 w-4 text-amber-500 flex-shrink-0" />}
    <span className={icon === 'skip' ? 'text-muted-foreground' : ''}>{label}</span>
  </div>
)
