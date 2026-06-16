import { useState, useEffect } from 'react'
import { Download, RefreshCw, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'

interface UpdateInfo {
  version: string
  releaseNotes?: string
}

interface DownloadProgress {
  percent: number
  transferred: number
  total: number
  bytesPerSecond: number
}

type UpdateState =
  | { status: 'idle' }
  | { status: 'checking' }
  | { status: 'available'; info: UpdateInfo }
  | { status: 'downloading'; progress: number }
  | { status: 'downloaded'; info: UpdateInfo }
  | { status: 'error'; message: string }

export const UpdateNotification = (): JSX.Element | null => {
  const [state, setState] = useState<UpdateState>({ status: 'idle' })
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (!window.electron) return

    const unsubs = [
      window.electron.on('updater:checking', () => setState({ status: 'checking' })),
      window.electron.on('updater:available', (data) =>
        setState({ status: 'available', info: data as UpdateInfo }),
      ),
      window.electron.on('updater:not-available', () => setState({ status: 'idle' })),
      window.electron.on('updater:progress', (data) => {
        const p = data as DownloadProgress
        setState({ status: 'downloading', progress: Math.round(p.percent) })
      }),
      window.electron.on('updater:downloaded', (data) =>
        setState({ status: 'downloaded', info: data as UpdateInfo }),
      ),
      window.electron.on('updater:error', (data) =>
        setState({ status: 'error', message: data as string }),
      ),
      window.electron.on('updater:check-triggered', () => {
        setDismissed(false)
        window.electron?.checkForUpdates()
      }),
    ]

    return () => unsubs.forEach((fn) => fn())
  }, [])

  if (!window.electron) return null
  if (dismissed) return null
  if (state.status === 'idle' || state.status === 'checking') return null

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 rounded-lg border border-border bg-card shadow-lg">
      <div className="flex items-start gap-3 p-4">
        <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
          {state.status === 'downloading' ? (
            <Download className="h-4 w-4 animate-pulse text-primary" />
          ) : (
            <RefreshCw className="h-4 w-4 text-primary" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          {state.status === 'available' && (
            <>
              <p className="text-sm font-medium">Update available</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                TestFlow TCM {state.info.version} is ready to download.
              </p>
              <div className="mt-3 flex gap-2">
                <Button
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => {
                    window.electron?.downloadUpdate()
                    setState({ status: 'downloading', progress: 0 })
                  }}
                >
                  Download
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs"
                  onClick={() => setDismissed(true)}
                >
                  Later
                </Button>
              </div>
            </>
          )}

          {state.status === 'downloading' && (
            <>
              <p className="text-sm font-medium">Downloading update…</p>
              <p className="text-xs text-muted-foreground mt-0.5">{state.progress}%</p>
              <Progress value={state.progress} className="mt-2 h-1.5" />
            </>
          )}

          {state.status === 'downloaded' && (
            <>
              <p className="text-sm font-medium">Update ready</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                TestFlow TCM {state.info.version} will install on restart.
              </p>
              <div className="mt-3 flex gap-2">
                <Button
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => window.electron?.installUpdate()}
                >
                  Restart &amp; Install
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs"
                  onClick={() => setDismissed(true)}
                >
                  Later
                </Button>
              </div>
            </>
          )}

          {state.status === 'error' && (
            <>
              <p className="text-sm font-medium text-destructive">Update failed</p>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">{state.message}</p>
            </>
          )}
        </div>

        <button
          onClick={() => setDismissed(true)}
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
