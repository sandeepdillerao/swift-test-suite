import { ipcMain } from 'electron'
import { autoUpdater, UpdateInfo, ProgressInfo } from 'electron-updater'
import { getMainWindow } from './window-manager'
import { store } from './store'

export function setupUpdater(): void {
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true
  autoUpdater.allowPrerelease = false
  autoUpdater.allowDowngrade = false

  autoUpdater.logger = null

  // ─── Events ──────────────────────────────────────────────────────────────

  autoUpdater.on('checking-for-update', () => {
    sendToRenderer('updater:checking')
  })

  autoUpdater.on('update-available', (info: UpdateInfo) => {
    sendToRenderer('updater:available', info)
    if (store.get('showUpdateNotifications')) {
      // Notification sent via IPC to show in renderer
      getMainWindow()?.webContents.send('notification:show', {
        title: 'Update available',
        body: `TestFlow TCM ${info.version} is ready to download.`,
      })
    }
  })

  autoUpdater.on('update-not-available', () => {
    sendToRenderer('updater:not-available')
  })

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
    sendToRenderer('updater:error', err.message)
  })

  // ─── IPC handlers ────────────────────────────────────────────────────────

  ipcMain.handle('updater:check', async () => {
    try {
      return await autoUpdater.checkForUpdates()
    } catch (err) {
      return { error: (err as Error).message }
    }
  })

  ipcMain.handle('updater:download', async () => {
    try {
      await autoUpdater.downloadUpdate()
    } catch (err) {
      sendToRenderer('updater:error', (err as Error).message)
    }
  })

  ipcMain.handle('updater:install', () => {
    autoUpdater.quitAndInstall(false, true)
  })

  // Auto-check on startup (after 10 seconds to not slow down boot)
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch(() => {/* silently ignore network errors */})
  }, 10_000)
}

function sendToRenderer(channel: string, data?: unknown): void {
  getMainWindow()?.webContents.send(channel, data)
}
