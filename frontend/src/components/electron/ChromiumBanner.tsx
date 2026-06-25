import { useState, useEffect } from 'react'
import { CheckCircle2, XCircle, X } from 'lucide-react'

/**
 * Non-blocking banner shown while Chromium is being auto-downloaded at first launch.
 * Listens for 'playwright:install-progress' events from the main process.
 * Sentinels: '__start__' → show banner, '__done__' → success, '__error__:...' → failure.
 */
export const ChromiumBanner = (): JSX.Element | null => {
  const [state, setState] = useState<'idle' | 'downloading' | 'done' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (!window.electron) return

    const unsub = window.electron.on('playwright:install-progress', (data) => {
      const line = String(data ?? '')
      if (line === '__start__') {
        setState('downloading')
        setDismissed(false)
      } else if (line === '__done__') {
        setState('done')
        // Auto-dismiss success banner after 6 s
        setTimeout(() => setDismissed(true), 6000)
      } else if (line.startsWith('__error__:')) {
        setState('error')
        setErrorMsg(line.slice('__error__:'.length))
      }
    })

    return unsub
  }, [])

  if (state === 'idle' || dismissed) return null

  const base = 'fixed bottom-4 right-4 z-50 flex items-start gap-3 rounded-xl border px-4 py-3 shadow-lg text-sm max-w-sm backdrop-blur-sm'

  if (state === 'downloading') {
    return (
      <div className={`${base} bg-card border-border`}>
        <div className="mt-0.5 h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin flex-shrink-0" />
        <div>
          <p className="font-medium text-foreground">Downloading Chromium</p>
          <p className="text-xs text-muted-foreground mt-0.5">Setting up automation browser (~170 MB). This happens once.</p>
        </div>
      </div>
    )
  }

  if (state === 'done') {
    return (
      <div className={`${base} bg-card border-emerald-500/30`}>
        <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="font-medium text-foreground">Chromium ready</p>
          <p className="text-xs text-muted-foreground mt-0.5">Automation recording and script execution are now available.</p>
        </div>
        <button onClick={() => setDismissed(true)} className="text-muted-foreground hover:text-foreground">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    )
  }

  if (state === 'error') {
    return (
      <div className={`${base} bg-card border-destructive/30`}>
        <XCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="font-medium text-foreground">Chromium download failed</p>
          <p className="text-xs text-muted-foreground mt-0.5 break-all">{errorMsg || 'Check your internet connection and restart the app.'}</p>
        </div>
        <button onClick={() => setDismissed(true)} className="text-muted-foreground hover:text-foreground">
          <X className="h-3.5 w-3.5" />
          </button>
      </div>
    )
  }

  return null
}
