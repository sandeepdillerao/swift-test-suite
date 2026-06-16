import { useState, useEffect } from 'react'
import { WifiOff, Settings2, RefreshCw, CheckCircle2, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface Props {
  onResolved: () => void
}

type TestState = 'idle' | 'testing' | 'ok' | 'fail'

export const ServerConfigBanner = ({ onResolved }: Props): JSX.Element | null => {
  const [apiUrl, setApiUrl] = useState('')
  const [expanded, setExpanded] = useState(false)
  const [testState, setTestState] = useState<TestState>('idle')
  const [testError, setTestError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!window.electron) return
    window.electron.getApiUrl().then(setApiUrl)
  }, [])

  if (!window.electron) return null

  const testConnection = async (url: string): Promise<boolean> => {
    setTestState('testing')
    setTestError('')
    try {
      // Ping the backend health endpoint (or any lightweight endpoint)
      const res = await fetch(`${url.replace(/\/+$/, '')}/health`, {
        signal: AbortSignal.timeout(5000),
      })
      if (res.ok || res.status === 401 || res.status === 403) {
        // 401/403 means server is alive but needs auth — that's fine
        setTestState('ok')
        return true
      }
      throw new Error(`HTTP ${res.status}`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      // ERR_CONNECTION_REFUSED / ECONNREFUSED → server not running
      const friendly = msg.includes('Failed to fetch') || msg.includes('ECONNREFUSED') || msg.includes('refused')
        ? `No server found at ${url}`
        : msg
      setTestError(friendly)
      setTestState('fail')
      return false
    }
  }

  const handleSave = async () => {
    const ok = await testConnection(apiUrl)
    if (!ok) return
    setSaving(true)
    try {
      await window.electron!.setApiUrl(apiUrl)
      onResolved()
      // Reload so http-client picks up the new URL
      window.location.reload()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Alert className="mb-4 border-destructive/50 bg-destructive/5">
      <WifiOff className="h-4 w-4 text-destructive mt-0.5" />
      <AlertDescription className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-medium text-sm text-foreground">Cannot connect to server</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              The app is trying to reach <code className="font-mono bg-muted px-1 rounded text-xs">{apiUrl}</code>
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs flex-shrink-0"
            onClick={() => setExpanded((v) => !v)}
          >
            <Settings2 className="h-3 w-3 mr-1" />
            {expanded ? 'Cancel' : 'Configure'}
          </Button>
        </div>

        {expanded && (
          <div className="space-y-3 pt-1 border-t border-border">
            <div className="space-y-1.5">
              <Label htmlFor="api-url-inline" className="text-xs">Backend API URL</Label>
              <Input
                id="api-url-inline"
                value={apiUrl}
                onChange={(e) => {
                  setApiUrl(e.target.value)
                  setTestState('idle')
                }}
                placeholder="http://your-server:3000/api/v1"
                className="h-8 text-sm font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Ask your administrator for the correct URL.
              </p>
            </div>

            {testState === 'fail' && (
              <p className="flex items-center gap-1.5 text-xs text-destructive">
                <XCircle className="h-3.5 w-3.5 flex-shrink-0" />
                {testError}
              </p>
            )}
            {testState === 'ok' && (
              <p className="flex items-center gap-1.5 text-xs text-green-600">
                <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" />
                Server is reachable — saving…
              </p>
            )}

            <div className="flex gap-2">
              <Button
                size="sm"
                className="h-7 text-xs"
                onClick={handleSave}
                disabled={!apiUrl || testState === 'testing' || saving}
              >
                {testState === 'testing' ? (
                  <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                ) : null}
                {testState === 'testing' ? 'Testing…' : 'Save & Reconnect'}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs"
                onClick={() => testConnection(apiUrl)}
                disabled={!apiUrl || testState === 'testing'}
              >
                Test connection
              </Button>
            </div>
          </div>
        )}
      </AlertDescription>
    </Alert>
  )
}
