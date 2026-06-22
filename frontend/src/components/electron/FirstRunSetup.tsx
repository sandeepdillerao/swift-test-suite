import { useState } from 'react'
import {
  UserPlus, Database, CheckCircle2, XCircle, ArrowRight,
  FlaskConical, RefreshCw, Eye, EyeOff, Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

interface Props {
  apiBase: string   // e.g. http://localhost:3000/api/v1
  onComplete: () => void
}

type Step = 'admin' | 'seed' | 'done'

export const FirstRunSetup = ({ apiBase, onComplete }: Props): JSX.Element => {
  const [step, setStep] = useState<Step>('admin')

  // Admin form
  const [orgName, setOrgName] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [adminSaving, setAdminSaving] = useState(false)
  const [adminError, setAdminError] = useState('')

  // Seed
  const [seeding, setSeeding] = useState(false)
  const [seedDone, setSeedDone] = useState(false)
  const [seedError, setSeedError] = useState('')
  const [seedResult, setSeedResult] = useState<{ demoUsers?: Array<{email:string;password:string;role:string}> } | null>(null)

  const createAdmin = async () => {
    setAdminSaving(true)
    setAdminError('')
    try {
      const res = await fetch(`${apiBase.replace(/\/api\/v1\/?$/, '')}/api/v1/setup/initialize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgName, firstName, lastName, email, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setAdminError(data?.message ?? data?.detail ?? 'Failed to create account')
        return
      }
      setStep('seed')
    } catch (err) {
      setAdminError('Cannot reach the backend. Make sure it is running.')
    } finally {
      setAdminSaving(false)
    }
  }

  const loadDemoData = async () => {
    setSeeding(true)
    setSeedError('')
    try {
      const res = await fetch(`${apiBase.replace(/\/api\/v1\/?$/, '')}/api/v1/setup/seed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const data = await res.json()
      if (!res.ok) {
        setSeedError(data?.message ?? data?.detail ?? 'Seed failed')
        return
      }
      setSeedResult(data)
      setSeedDone(true)
    } catch (err) {
      setSeedError('Seed request failed.')
    } finally {
      setSeeding(false)
    }
  }

  const valid = orgName.trim() && firstName.trim() && lastName.trim() && email.includes('@') && password.length >= 8

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-3">
            <div className="h-14 w-14 rounded-2xl bg-primary flex items-center justify-center shadow-lg">
              <FlaskConical className="h-7 w-7 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-2xl font-bold">Almost there!</h1>
          <p className="text-sm text-muted-foreground mt-1">Create your admin account to get started.</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {(['admin', 'seed'] as const).map((s, idx) => (
            <div key={s} className="flex items-center gap-2">
              <div className={cn(
                'h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all',
                (step === 'done' || (s === 'admin' && step !== 'admin'))
                  ? 'bg-emerald-500 border-emerald-500 text-white'
                  : step === s
                    ? 'bg-primary border-primary text-primary-foreground'
                    : 'bg-muted border-border text-muted-foreground'
              )}>
                {(step === 'done' || (s === 'admin' && step !== 'admin'))
                  ? <CheckCircle2 className="h-3.5 w-3.5" />
                  : idx + 1}
              </div>
              {idx === 0 && <div className={cn('h-0.5 w-10 rounded', step !== 'admin' ? 'bg-emerald-500' : 'bg-border')} />}
            </div>
          ))}
        </div>

        {/* ── Step 1: Admin account ── */}
        {step === 'admin' && (
          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <UserPlus className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold">Admin account</p>
                <p className="text-xs text-muted-foreground">You'll use this to log in and manage the platform.</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Organisation name</Label>
              <Input value={orgName} onChange={e => setOrgName(e.target.value)} placeholder="Acme Corp" className="h-9" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">First name</Label>
                <Input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Alice" className="h-9" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Last name</Label>
                <Input value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Admin" className="h-9" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Email address</Label>
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@yourcompany.com" className="h-9" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Password <span className="text-muted-foreground">(min 8 chars)</span></Label>
              <div className="relative">
                <Input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-9 pr-9"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {adminError && (
              <p className="flex items-center gap-1.5 text-xs text-destructive">
                <XCircle className="h-3.5 w-3.5 flex-shrink-0" />{adminError}
              </p>
            )}

            <Button
              className="w-full gap-2"
              onClick={createAdmin}
              disabled={!valid || adminSaving}
            >
              {adminSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              {adminSaving ? 'Creating account…' : 'Create admin account'}
            </Button>
          </div>
        )}

        {/* ── Step 2: Demo data ── */}
        {step === 'seed' && (
          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <Database className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold">Load demo data</p>
                <p className="text-xs text-muted-foreground">Optionally populate the app with sample projects, test cases, and runs.</p>
              </div>
            </div>

            <div className="rounded-lg bg-muted/40 border border-border p-3 text-xs text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">Demo data includes:</p>
              <p>• 3 sample projects (E-Commerce, Mobile App, API Gateway)</p>
              <p>• 5 test suites with 8 test cases (various statuses)</p>
              <p>• 3 releases + 2 test runs with results</p>
              <p>• 2 additional users: QA Lead &amp; Tester</p>
            </div>

            {!seedDone && !seedError && (
              <div className="flex gap-2">
                <Button className="flex-1 gap-2" onClick={loadDemoData} disabled={seeding}>
                  {seeding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
                  {seeding ? 'Loading data…' : 'Load demo data'}
                </Button>
                <Button variant="outline" className="flex-1" onClick={onComplete}>
                  Skip, start fresh
                </Button>
              </div>
            )}

            {seedError && (
              <p className="flex items-center gap-1.5 text-xs text-destructive">
                <XCircle className="h-3.5 w-3.5 flex-shrink-0" />{seedError}
              </p>
            )}

            {seedDone && seedResult && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-emerald-600">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Demo data loaded! 3 projects · 8 test cases · 2 test runs</span>
                </div>
                {seedResult.demoUsers && seedResult.demoUsers.length > 0 && (
                  <div className="rounded-lg bg-muted/40 border border-border p-3 text-xs space-y-1">
                    <p className="font-medium text-foreground">Additional demo accounts:</p>
                    {seedResult.demoUsers.map(u => (
                      <p key={u.email} className="font-mono">{u.email} / {u.password} <span className="text-muted-foreground">({u.role})</span></p>
                    ))}
                  </div>
                )}
                <Button className="w-full gap-2" onClick={onComplete}>
                  Open TestFlow <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
