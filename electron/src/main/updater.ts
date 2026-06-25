import { ipcMain } from 'electron'
import { autoUpdater, UpdateInfo, ProgressInfo } from 'electron-updater'
import { is } from '@electron-toolkit/utils'
import { getMainWindow } from './window-manager'
import { store } from './store'

// ─── IPC handlers — always registered, even in dev ───────────────────────────
// (registerUpdaterHandlers is called unconditionally from index.ts via setupIpcHandlers)

export function registerUpdaterHandlers(): void {
  ipcMain.handle('updater:check', async () => {
    if (is.dev) {
      // In dev mode the auto-updater cannot run (no signed build / no publish config).
      // Return a mock "not available" so the UI doesn't show an error.
      sendToRenderer('updater:not-available')
      return { updateInfo: null, devMode: true }
    }
    try {
      return await autoUpdater.checkForUpdates()
    } catch (err) {
      const msg = (err as Error).message
      sendToRenderer('updater:error', msg)
      return { error: msg }
    }
  })

  ipcMain.handle('updater:download', async () => {
    if (is.dev) return
    try {
      await autoUpdater.downloadUpdate()
    } catch (err) {
      sendToRenderer('updater:error', (err as Error).message)
    }
  })

  ipcMain.handle('updater:install', () => {
    if (is.dev) return
    autoUpdater.quitAndInstall(false, true)
  })
}

// ─── Full auto-updater setup — production only ────────────────────────────────

export function setupUpdater(): void {
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true
  autoUpdater.allowPrerelease = false
  autoUpdater.allowDowngrade = false
  autoUpdater.logger = null

  // The read-only token for private repo access is primarily embedded in
  // app-update.yml at build time (via --config.publish.token in the release script).
  // electron-updater reads it automatically from there.
  // addAuthHeader is a runtime fallback for dev/manual runs where the token
  // was baked in via process.env.RELEASE_GH_TOKEN (define in electron.vite.config.ts).
  const releaseToken = process.env.RELEASE_GH_TOKEN || ''
  if (releaseToken) {
    autoUpdater.addAuthHeader(`token ${releaseToken}`)
  }

  autoUpdater.on('checking-for-update', () => sendToRenderer('updater:checking'))

  autoUpdater.on('update-available', (info: UpdateInfo) => {
    sendToRenderer('updater:available', info)
    if (store.get('showUpdateNotifications')) {
      getMainWindow()?.webContents.send('notification:show', {
        title: 'Update available',
        body: `TestFlow TCM ${info.version} is ready to download.`,
      })
    }
  })

  autoUpdater.on('update-not-available', () => sendToRenderer('updater:not-available'))

  autoUpdater.on('download-progress', (progress: ProgressInfo) => {
    sendToRenderer('updater:progress', progress)
  })

  autoUpdater.on('update-downloaded', (info: UpdateInfo) => {
    sendToRenderer('updater:downloaded', info)
    if (store.get('showUpdateNotifications')) {
      getMainWindow()?.webContents.send('notification:show', {
        title: 'Update ready',
        body: `TestFlow TCM ${info.version} downloaded. Restart to install.`,
      })
    }
  })

  autoUpdater.on('error', (err: Error) => {
    const msg = err.message
    // Silently ignore expected failures: private repo without embedded token (404),
    // or offline / DNS errors. Only surface unexpected errors to the renderer.
    if (
      msg.includes('404') ||
      msg.includes('ENOTFOUND') ||
      msg.includes('ECONNREFUSED') ||
      msg.includes('net::ERR') ||
      msg.includes('Cannot find latest') ||
      msg.includes('HttpError')
    ) return
    sendToRenderer('updater:error', msg)
  })

  // Auto-check 10 s after launch so it doesn't slow down startup
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch(() => { /* silently ignore */ })
  }, 10_000)
}

function sendToRenderer(channel: string, data?: unknown): void {
  getMainWindow()?.webContents.send(channel, data)
}
