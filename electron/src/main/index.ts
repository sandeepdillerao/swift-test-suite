import { app, BrowserWindow } from 'electron'
import { resolve } from 'path'
import { is } from '@electron-toolkit/utils'
import { setupIpcHandlers } from './ipc-handlers'
import { createTray, destroyTray } from './tray'
import { registerUpdaterHandlers, setupUpdater } from './updater'
import { createAppMenu } from './app-menu'
import { createWindow, getMainWindow } from './window-manager'
import { startBackend, stopBackend } from './backend-manager'
import { ensurePlaywrightBrowsers } from './playwright-setup'
import { store } from './store'

// ─── Single instance lock ────────────────────────────────────────────────────
const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', (_event, argv) => {
    const win = getMainWindow()
    if (!win) return
    if (win.isMinimized()) win.restore()
    win.show()
    win.focus()
    const deepLink = argv.find((arg) => arg.startsWith('testflow://'))
    if (deepLink) win.webContents.send('deep-link', deepLink)
  })

  // ─── Register deep link protocol ─────────────────────────────────────────
  if (is.dev && process.defaultApp) {
    app.setAsDefaultProtocolClient('testflow', process.execPath, [resolve(process.argv[1] ?? '.')])
  } else {
    app.setAsDefaultProtocolClient('testflow')
  }

  // ─── App ready ───────────────────────────────────────────────────────────
  app.whenReady().then(async () => {
    if (process.platform === 'linux') {
      app.commandLine.appendSwitch('no-sandbox')
    }

    setupIpcHandlers()
    registerUpdaterHandlers()  // always — so renderer can invoke updater:check in dev too
    createWindow()
    createTray()
    createAppMenu()

    if (!is.dev) setupUpdater()  // actual auto-updater only in packaged builds

    // Start local backend if configured for local mode
    const mode = store.get('serverMode')
    if (mode === 'local') {
      try {
        await startBackend()
      } catch (err) {
        // Error is forwarded to renderer via IPC — window still shows
        console.error('Backend failed to start:', err)
      }
    }

    // Auto-install Chromium browsers if not present — runs in the background,
    // no user action required. A banner in the renderer shows download progress.
    ensurePlaywrightBrowsers()

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
      else getMainWindow()?.show()
    })
  })

  app.on('open-url', (event, url) => {
    event.preventDefault()
    const win = getMainWindow()
    if (win) {
      if (win.isMinimized()) win.restore()
      win.focus()
      win.webContents.send('deep-link', url)
    }
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      stopBackend()
      destroyTray()
      app.quit()
    }
  })

  app.on('before-quit', () => {
    stopBackend()
    destroyTray()
  })
}
