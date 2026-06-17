import { useState, useEffect } from 'react'
import { RefreshCw, XCircle, FlaskConical, RotateCcw, Settings2, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type BackendStatus = 'starting' | 'ready' | 'stopped' | 'error'

interface StatusPayload {
  status: BackendStatus
  detail?: string
}

interface Props {
  onReady: () => void
}

export const BackendStartup = ({ onReady }: Props): JSX.Element | null => {
  const [status, setStatus] = useState<BackendStatus>('starting')
  const [detail, setDetail] = useState('')
  const [logs, setLogs] = useState<string[]>([])
  const [showLogs, setShowLogs] = useState(false)
  const [restarting, setRestarting] = useState(false)
  const [showConfig, setShowConfig] = useState(false)
  const [dbHost, setDbHost] = useState('localhost')
  const [dbPort, setDbPort] = useState('5432')
  const [dbUsername, setDbUsername] = useState('testflow')
  const [dbPassword, setDbPassword] = useState('')
  const [dbName, setDbName] = useState('testflow_db')
  const [backendPort, setBackendPort] = useState('3000')
  const [savingConfig, setSavingConfig] = useState(false)

  useEffect(() => {
    if (!window.electron) return

    // Pre-fill config fields from store
    window.electron.getServerConfig().then((cfg) => {
      if (cfg.local) {
        setDbHost(cfg.local.dbHost)
        setDbPort(String(cfg.local.dbPort))
        setDbUsername(cfg.local.dbUsername)
        setDbPassword(cfg.local.dbPassword)
        setDbName(cfg.local.dbName)
        setBackendPort(String(cfg.local.backendPort))
      }
    })

    // Listen for IPC status events from the main process (production)
    const unsubStatus = window.electron.on('backend:status', (data) => {
      const payload = data as StatusPayload
      setStatus(payload.status)
      setDetail(payload.detail ?? '')
      if (payload.status === 'ready') onReady()
    })

    const unsubLog = window.electron.on('backend:log', (data) => {
      setLogs(prev => [...prev.slice(-100), data as string])
    })

    // Health-check polling — handles dev mode (IPC event never sent because
    // startBackend() returns immediately) and acts as a fallback in prod.
    let pollTimer: ReturnType<typeof setTimeout> | null = null
    let stopped = false

    const pollHealth = async () => {
      if (stopped) return
      try {
        const apiUrl = window.electron!.apiUrl  // e.g. http://localhost:3000/api/v1
        const base = apiUrl.replace(/\/api\/v1\/?$/, '')
        const res = await fetch(`${base}/health`, { signal: AbortSignal.timeout(2000) })
        if (res.ok) {
          setStatus('ready')
          onReady()
          return
        }
      } catch { /* not ready yet */ }
      if (!stopped) pollTimer = setTimeout(pollHealth, 1500)
    }

    // Start polling after a short delay so the backend has a chance to boot
    pollTimer = setTimeout(pollHealth, 1000)

    return () => {
      stopped = true
      if (pollTimer) clearTimeout(pollTimer)
      unsubStatus()
      unsubLog()
    }
  }, [onReady])

  // In remote mode or when ready, nothing to render
  if (status === 'ready') return null

  const handleRestart = async () => {
    setRestarting(true)
    setLogs([])
    setStatus('starting')
    setShowConfig(false)
    await window.electron?.restartBackend()
    setRestarting(false)
  }

  const handleSaveConfig = async () => {
    if (!window.electron) return
    setSavingConfig(true)
    try {
      await window.electron.saveLocalServer({
        dbHost, dbPort: Number(dbPort),
        dbUsername, dbPassword, dbName,
        backendPort: Number(backendPort),
      })
      setShowConfig(false)
      // Restart with new config
      await handleRestart()
    } finally {
      setSavingConfig(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] bg-background flex flex-col items-center justify-center p-6">
      <div className="flex flex-col items-center gap-6 w-full max-w-md text-center">
        {/* Icon */}
        <div className="relative">
          <div className="h-16 w-16 rounded-2xl bg-primary flex items-center justify-center shadow-lg">
            <FlaskConical className="h-8 w-8 text-primary-foreground" />
          </div>
          {status === 'starting' && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-amber-500 border-2 border-background flex items-center justify-center">
              <RefreshCw className="h-2.5 w-2.5 text-white animate-spin" />
            </span>
          )}
          {status === 'error' && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive border-2 border-background flex items-center justify-center">
              <XCircle className="h-3 w-3 text-white" />
            </span>
          )}
        </div>

        {status === 'starting' && (
          <>
            <div>
              <p className="font-semibold text-lg">Starting TestFlow</p>
              <p className="text-sm text-muted-foreground mt-1">Launching the backend server, please wait…</p>
            </div>
            {/* Animated dots progress */}
            <div className="flex gap-1.5">
              {[0, 1, 2].map(i => (
                <span
                  key={i}
                  className="h-2 w-2 rounded-full bg-primary animate-pulse"
                  style={{ animationDelay: `${i * 200}ms` }}
                />
              ))}
            </div>
          </>
        )}

        {(status === 'error' || status === 'stopped') && (
          <>
            <div>
              <p className="font-semibold text-lg text-destructive">Backend failed to start</p>
              <p className="text-sm text-muted-foreground mt-1">
                {detail || 'The local backend server could not start.'}
              </p>
            </div>

            <div className="flex gap-2 flex-wrap justify-center">
              <Button onClick={handleRestart} disabled={restarting} className="gap-2">
                <RotateCcw className="h-4 w-4" />
                {restarting ? 'Restarting…' : 'Retry'}
              </Button>
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => { setShowConfig(v => !v); setShowLogs(false) }}
              >
                <Settings2 className="h-4 w-4" />
                Edit DB config
                {showConfig ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setShowLogs(v => !v); setShowConfig(false) }}
              >
                {showLogs ? 'Hide' : 'Show'} logs
              </Button>
            </div>

            {/* Inline DB config editor */}
            {showConfig && (
              <div className="w-full rounded-lg border border-border bg-card p-4 space-y-3 text-left">
                <p className="text-sm font-medium text-center">Database configuration</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="col-span-2 space-y-1">
                    <Label className="text-xs">Host</Label>
                    <Input value={dbHost} onChange={e => setDbHost(e.target.value)} className="h-7 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">DB Port</Label>
                    <Input value={dbPort} onChange={e => setDbPort(e.target.value)} className="h-7 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Backend Port</Label>
                    <Input value={backendPort} onChange={e => setBackendPort(e.target.value)} className="h-7 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Username</Label>
                    <Input value={dbUsername} onChange={e => setDbUsername(e.target.value)} className="h-7 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Password</Label>
                    <Input type="password" value={dbPassword} onChange={e => setDbPassword(e.target.value)} className="h-7 text-sm" />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <Label className="text-xs">Database name</Label>
                    <Input value={dbName} onChange={e => setDbName(e.target.value)} className="h-7 text-sm" />
                  </div>
                </div>
                <Button size="sm" className="w-full gap-2" onClick={handleSaveConfig} disabled={savingConfig || restarting}>
                  {savingConfig ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
                  Save & Restart
                </Button>
              </div>
            )}
          </>
        )}

        {/* Log output */}
        {showLogs && logs.length > 0 && (
          <div className="w-full rounded-lg border border-border bg-muted/30 p-3 text-left max-h-48 overflow-y-auto">
            {logs.map((line, i) => (
              <p key={i} className="text-xs font-mono text-muted-foreground leading-relaxed">{line}</p>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
