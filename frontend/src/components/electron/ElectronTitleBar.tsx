import { useState, useEffect } from 'react'
import { Minus, Square, X, FlaskConical } from 'lucide-react'
import { cn } from '@/lib/utils'

// Rendered only on Windows/Linux in Electron mode.
// macOS uses native traffic lights (titleBarStyle: 'hiddenInset').

export const ElectronTitleBar = (): JSX.Element | null => {
  const [isMaximized, setIsMaximized] = useState(false)

  useEffect(() => {
    if (!window.electron) return

    window.electron.isMaximized().then(setIsMaximized)

    const unsub = window.electron.on('window:maximized-changed', (data) => {
      setIsMaximized(data as boolean)
    })

    return unsub
  }, [])

  if (!window.electron || window.electron.platform === 'darwin') return null

  return (
    <div
      className="flex items-center justify-between h-10 bg-slate-900 border-b border-slate-800 select-none flex-shrink-0"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      {/* App identity */}
      <div className="flex items-center gap-2 px-3">
        <FlaskConical className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium text-slate-300">TestFlow TCM</span>
      </div>

      {/* Window controls */}
      <div
        className="flex items-center"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        <TitleBarButton
          onClick={() => window.electron?.minimize()}
          className="hover:bg-slate-700"
          title="Minimize"
        >
          <Minus className="h-3 w-3" />
        </TitleBarButton>

        <TitleBarButton
          onClick={() => window.electron?.maximize()}
          className="hover:bg-slate-700"
          title={isMaximized ? 'Restore' : 'Maximize'}
        >
          {isMaximized ? (
            // Restore icon (two overlapping squares)
            <svg className="h-3 w-3" viewBox="0 0 10 10" fill="currentColor">
              <path d="M3 1H9V7H7V9H1V3H3V1ZM3 3V7H7V3H3Z" />
            </svg>
          ) : (
            <Square className="h-3 w-3" />
          )}
        </TitleBarButton>

        <TitleBarButton
          onClick={() => window.electron?.close()}
          className="hover:bg-red-600 hover:text-white"
          title="Close"
        >
          <X className="h-3.5 w-3.5" />
        </TitleBarButton>
      </div>
    </div>
  )
}

const TitleBarButton = ({
  children,
  onClick,
  className,
  title,
}: {
  children: React.ReactNode
  onClick: () => void
  className?: string
  title?: string
}): JSX.Element => (
  <button
    onClick={onClick}
    title={title}
    className={cn(
      'flex h-10 w-12 items-center justify-center text-slate-400 transition-colors',
      className,
    )}
  >
    {children}
  </button>
)
