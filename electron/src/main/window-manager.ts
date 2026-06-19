import { app, BrowserWindow, shell, globalShortcut } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import { store } from './store'

let mainWindow: BrowserWindow | null = null

export function getMainWindow(): BrowserWindow | null {
  // Auto-null if the window has been destroyed so callers don't get a stale ref
  if (mainWindow?.isDestroyed()) mainWindow = null
  return mainWindow
}

export function createWindow(): BrowserWindow {
  const savedBounds = store.get('windowBounds')

  mainWindow = new BrowserWindow({
    width: savedBounds.width,
    height: savedBounds.height,
    x: savedBounds.x,
    y: savedBounds.y,
    minWidth: 1024,
    minHeight: 600,
    show: false,

    // macOS: native traffic lights with hidden title bar
    // Windows/Linux: frameless with our custom TitleBar overlay
    frame: process.platform === 'darwin',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    // Native window controls overlay for Windows 11 style
    ...(process.platform === 'win32' && {
      titleBarOverlay: {
        color: '#1e293b',
        symbolColor: '#94a3b8',
        height: 40,
      },
    }),

    backgroundColor: '#0f172a',

    icon: getIconPath(),

    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: true,
      // Allow the renderer to make requests to the API server
      allowRunningInsecureContent: false,
    },
  })

  // Show gracefully after first paint; open DevTools in dev mode once visible
  mainWindow.on('ready-to-show', () => {
    if (savedBounds.isMaximized) {
      mainWindow?.maximize()
    } else {
      mainWindow?.show()
    }
    if (is.dev) {
      mainWindow?.webContents.openDevTools({ mode: 'detach' })
    }
  })

  // Persist window size/position (only when not maximized)
  const saveBounds = (): void => {
    if (!mainWindow) return
    store.set('windowBounds', {
      ...mainWindow.getBounds(),
      isMaximized: mainWindow.isMaximized(),
    })
  }

  mainWindow.on('resized', saveBounds)
  mainWindow.on('moved', saveBounds)
  mainWindow.on('maximize', saveBounds)
  mainWindow.on('unmaximize', saveBounds)

  // Intercept the native OS close button — minimize to tray instead of destroying
  // (only on Windows/Linux; macOS already keeps apps alive in the Dock)
  mainWindow.on('close', (event) => {
    if (store.get('minimizeToTray') && process.platform !== 'darwin') {
      event.preventDefault()
      mainWindow?.hide()
    }
  })

  // Clear the reference once the window is fully destroyed so getMainWindow()
  // never returns a stale destroyed object (which causes "Object has been destroyed")
  mainWindow.on('closed', () => {
    mainWindow = null
  })

  // Route external links to the OS default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  // Prevent navigation away from the app in production
  if (!is.dev) {
    mainWindow.webContents.on('will-navigate', (event, url) => {
      const appUrl = mainWindow?.webContents.getURL()
      if (appUrl && !url.startsWith(new URL(appUrl).origin)) {
        event.preventDefault()
        shell.openExternal(url)
      }
    })
  }

  // F12 / Cmd+Option+I toggles DevTools (both dev and prod for support purposes)
  mainWindow.webContents.on('before-input-event', (_event, input) => {
    if (input.key === 'F12' && input.type === 'keyDown') {
      mainWindow?.webContents.toggleDevTools()
    }
  })

  // Register global shortcut as a fallback for when the window doesn't have focus
  app.whenReady().then(() => {
    const shortcut = process.platform === 'darwin' ? 'Alt+Command+I' : 'Ctrl+Shift+I'
    if (!globalShortcut.isRegistered(shortcut)) {
      globalShortcut.register(shortcut, () => {
        getMainWindow()?.webContents.toggleDevTools()
      })
    }
  })

  // Load renderer.
  // In dev, always connect to the frontend Vite dev server on port 5173.
  // electron-vite overwrites ELECTRON_RENDERER_URL with its own renderer server
  // address, so we hardcode 5173 here to ensure the correctly-styled frontend is used.
  if (is.dev) {
    mainWindow.loadURL('http://localhost:5173')
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return mainWindow
}

function getIconPath(): string {
  const iconFile =
    process.platform === 'win32'
      ? 'icon.ico'
      : process.platform === 'darwin'
        ? 'icon.icns'
        : 'icon.png'

  return join(__dirname, `../../resources/${iconFile}`)
}
