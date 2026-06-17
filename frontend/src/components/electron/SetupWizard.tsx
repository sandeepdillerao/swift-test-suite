import { useState } from 'react'
import { Server, Cloud, Database, CheckCircle2, XCircle, RefreshCw, ArrowRight, ArrowLeft, FlaskConical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

interface Props {
  onComplete: () => void
}

type Step = 'choose' | 'remote' | 'local' | 'done'
type TestState = 'idle' | 'testing' | 'ok' | 'fail'

export const SetupWizard = ({ onComplete }: Props): JSX.Element => {
  const [step, setStep] = useState<Step>('choose')

  // Remote state
  const [remoteUrl, setRemoteUrl] = useState('https://')
  const [remoteTest, setRemoteTest] = useState<TestState>('idle')
  const [remoteError, setRemoteError] = useState('')

  // Local state
  const [dbHost, setDbHost] = useState('localhost')
  const [dbPort, setDbPort] = useState('5432')
  const [dbUsername, setDbUsername] = useState('testflow')
  const [dbPassword, setDbPassword] = useState('testflow_secret')
  const [dbName, setDbName] = useState('testflow_db')
  const [backendPort, setBackendPort] = useState('3000')
  const [localSaving, setLocalSaving] = useState(false)
  const [localError, setLocalError] = useState('')

  const testUrl = async (url: string): Promise<boolean> => {
    setRemoteTest('testing')
    setRemoteError('')
    try {
      const clean = url.replace(/\/+$/, '')
      const res = await fetch(`${clean}/health`, { signal: AbortSignal.timeout(6000) })
      if (res.ok || res.status === 401 || res.status === 403) {
        setRemoteTest('ok')
        return true
      }
      throw new Error(`HTTP ${res.status}`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setRemoteError(msg.includes('Failed to fetch') || msg.includes('refused') ? `No server found at ${url}` : msg)
      setRemoteTest('fail')
      return false
    }
  }

  const saveRemote = async () => {
    const ok = await testUrl(remoteUrl)
    if (!ok) return
    await window.electron!.saveRemoteServer(remoteUrl)
    onComplete()
  }

  const saveLocal = async () => {
    setLocalSaving(true)
    setLocalError('')
    try {
      await window.electron!.saveLocalServer({
        dbHost, dbPort: Number(dbPort),
        dbUsername, dbPassword, dbName,
        backendPort: Number(backendPort),
      })
      onComplete()
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setLocalSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="h-14 w-14 rounded-2xl bg-primary flex items-center justify-center shadow-lg">
              <FlaskConical className="h-7 w-7 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-2xl font-bold">Welcome to TestFlow TCM</h1>
          <p className="text-muted-foreground mt-1 text-sm">Let's set up your connection before you start.</p>
        </div>

        {/* Step: choose mode */}
        {step === 'choose' && (
          <div className="space-y-4">
            <p className="text-sm font-medium text-center text-muted-foreground mb-6">How do you want to run TestFlow?</p>
            <ModeCard
              icon={<Server className="h-6 w-6" />}
              title="Run locally"
              description="Start the TestFlow backend on this machine. Best for individual use or local development. Requires PostgreSQL running locally."
              onClick={() => setStep('local')}
            />
            <ModeCard
              icon={<Cloud className="h-6 w-6" />}
              title="Connect to a server"
              description="Connect to a hosted TestFlow server. Best for teams — everyone connects to the same shared backend."
              onClick={() => setStep('remote')}
            />
          </div>
        )}

        {/* Step: remote */}
        {step === 'remote' && (
          <div className="rounded-xl border border-border bg-card p-6 space-y-5">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Cloud className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="font-semibold text-sm">Connect to a server</p>
                <p className="text-xs text-muted-foreground">Enter your TestFlow API URL</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="remote-url">API URL</Label>
              <Input
                id="remote-url"
                value={remoteUrl}
                onChange={e => { setRemoteUrl(e.target.value); setRemoteTest('idle') }}
                placeholder="https://testflow.yourcompany.com/api/v1"
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">Ask your administrator for the API URL.</p>
            </div>

            {remoteTest === 'fail' && (
              <p className="flex items-center gap-1.5 text-xs text-destructive">
                <XCircle className="h-3.5 w-3.5 flex-shrink-0" />{remoteError}
              </p>
            )}
            {remoteTest === 'ok' && (
              <p className="flex items-center gap-1.5 text-xs text-green-600">
                <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" />Server is reachable
              </p>
            )}

            <div className="flex gap-2 pt-1">
              <Button variant="ghost" size="sm" onClick={() => setStep('choose')}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              <div className="flex-1" />
              <Button variant="outline" size="sm" onClick={() => testUrl(remoteUrl)} disabled={remoteTest === 'testing'}>
                {remoteTest === 'testing' ? <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
                Test connection
              </Button>
              <Button size="sm" onClick={saveRemote} disabled={!remoteUrl || remoteTest === 'testing'}>
                Connect <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* Step: local */}
        {step === 'local' && (
          <div className="rounded-xl border border-border bg-card p-6 space-y-5">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <Database className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="font-semibold text-sm">Local setup</p>
                <p className="text-xs text-muted-foreground">Configure your PostgreSQL connection</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label className="text-xs">Database host</Label>
                <Input value={dbHost} onChange={e => setDbHost(e.target.value)} placeholder="localhost" className="h-8 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">DB port</Label>
                <Input value={dbPort} onChange={e => setDbPort(e.target.value)} placeholder="5432" className="h-8 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Backend port</Label>
                <Input value={backendPort} onChange={e => setBackendPort(e.target.value)} placeholder="3000" className="h-8 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">DB username</Label>
                <Input value={dbUsername} onChange={e => setDbUsername(e.target.value)} className="h-8 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">DB password</Label>
                <Input type="password" value={dbPassword} onChange={e => setDbPassword(e.target.value)} className="h-8 text-sm" />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label className="text-xs">Database name</Label>
                <Input value={dbName} onChange={e => setDbName(e.target.value)} className="h-8 text-sm" />
              </div>
            </div>

            {localError && (
              <p className="flex items-center gap-1.5 text-xs text-destructive">
                <XCircle className="h-3.5 w-3.5 flex-shrink-0" />{localError}
              </p>
            )}

            <div className="flex gap-2 pt-1">
              <Button variant="ghost" size="sm" onClick={() => setStep('choose')}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              <div className="flex-1" />
              <Button size="sm" onClick={saveLocal} disabled={localSaving}>
                {localSaving ? <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
                Save & Start <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const ModeCard = ({ icon, title, description, onClick }: {
  icon: React.ReactNode
  title: string
  description: string
  onClick: () => void
}) => (
  <button
    onClick={onClick}
    className={cn(
      'w-full rounded-xl border border-border bg-card p-5 text-left',
      'hover:border-primary/50 hover:bg-primary/5 transition-colors group',
      'flex items-start gap-4'
    )}
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
