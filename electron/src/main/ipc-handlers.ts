import { app, ipcMain, dialog, shell, Notification, safeStorage, nativeTheme } from 'electron'
import { store, getEffectiveApiUrl, type ServerMode } from './store'
import { getMainWindow } from './window-manager'
import { startBackend, stopBackend, restartBackend, isBackendRunning } from './backend-manager'
import net from 'net'
import os from 'os'
import path from 'path'
import fs from 'fs'
import { Client as PgClient } from 'pg'

export function setupIpcHandlers(): void {
  // ─── App version / name ──────────────────────────────────────────────────

  ipcMain.handle('app:version', () => app.getVersion())
  ipcMain.handle('app:name', () => app.getName())

  // ─── Server mode ─────────────────────────────────────────────────────────

  // Synchronous — read before renderer JS runs so http-client gets the right URL
  ipcMain.on('app:get-api-url-sync', (event) => {
    event.returnValue = getEffectiveApiUrl()
  })

  ipcMain.handle('app:get-api-url', () => getEffectiveApiUrl())

  ipcMain.handle('server:get-mode', () => store.get('serverMode'))

  ipcMain.handle('server:get-config', () => ({
    mode: store.get('serverMode'),
    remoteApiUrl: store.get('remoteApiUrl'),
    local: store.get('local'),
  }))

  ipcMain.handle('server:set-mode', (_event, mode: ServerMode) => {
    store.set('serverMode', mode)
    return { success: true }
  })

  ipcMain.handle('server:save-remote', (_event, url: string) => {
    store.set('remoteApiUrl', url)
    store.set('serverMode', 'remote')
    return { success: true }
  })

  ipcMain.handle('server:save-local', (_event, config: {
    dbHost: string
    dbPort: number
    dbUsername: string
    dbPassword: string
    dbName: string
    backendPort: number
  }) => {
    store.set('local', { ...store.get('local'), ...config })
    store.set('serverMode', 'local')
    return { success: true }
  })

  // ─── Backend lifecycle ────────────────────────────────────────────────────

  ipcMain.handle('backend:start', async () => {
    try {
      await startBackend()
      return { success: true }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle('backend:stop', () => {
    stopBackend()
    return { success: true }
  })

  ipcMain.handle('backend:restart', async () => {
    try {
      await restartBackend()
      return { success: true }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle('backend:is-running', () => isBackendRunning())

  // ─── App settings ────────────────────────────────────────────────────────

  ipcMain.handle('app:get-settings', () => ({
    serverMode: store.get('serverMode'),
    remoteApiUrl: store.get('remoteApiUrl'),
    local: store.get('local'),
    launchAtStartup: store.get('launchAtStartup'),
    minimizeToTray: store.get('minimizeToTray'),
    showUpdateNotifications: store.get('showUpdateNotifications'),
  }))

  ipcMain.handle('app:set-settings', (_event, settings: Partial<{
    remoteApiUrl: string
    launchAtStartup: boolean
    minimizeToTray: boolean
    showUpdateNotifications: boolean
  }>) => {
    if (settings.remoteApiUrl !== undefined) store.set('remoteApiUrl', settings.remoteApiUrl)
    if (settings.launchAtStartup !== undefined) {
      store.set('launchAtStartup', settings.launchAtStartup)
      app.setLoginItemSettings({ openAtLogin: settings.launchAtStartup })
    }
    if (settings.minimizeToTray !== undefined) store.set('minimizeToTray', settings.minimizeToTray)
    if (settings.showUpdateNotifications !== undefined)
      store.set('showUpdateNotifications', settings.showUpdateNotifications)
    return { success: true }
  })

  ipcMain.handle('app:open-external', (_event, url: string) => shell.openExternal(url))
  ipcMain.handle('app:open-config-dir', () => shell.openPath(app.getPath('userData')))

  // ─── Window controls ─────────────────────────────────────────────────────

  ipcMain.on('window:minimize', () => getMainWindow()?.minimize())

  ipcMain.on('window:maximize', () => {
    const win = getMainWindow()
    if (!win) return
    win.isMaximized() ? win.unmaximize() : win.maximize()
  })

  ipcMain.on('window:close', () => {
    const win = getMainWindow()
    if (!win) return
    store.get('minimizeToTray') && process.platform !== 'darwin' ? win.hide() : win.close()
  })

  ipcMain.handle('window:is-maximized', () => getMainWindow()?.isMaximized() ?? false)
  ipcMain.handle('window:get-platform', () => process.platform)

  app.on('browser-window-created', (_event, win) => {
    win.on('maximize', () => win.webContents.send('window:maximized-changed', true))
    win.on('unmaximize', () => win.webContents.send('window:maximized-changed', false))
  })

  // ─── Dialogs ─────────────────────────────────────────────────────────────

  ipcMain.handle('dialog:open-file', async (_event, options: Electron.OpenDialogOptions) => {
    const win = getMainWindow()
    if (!win) return null
    const result = await dialog.showOpenDialog(win, { properties: ['openFile'], ...options })
    return result.canceled ? null : result.filePaths
  })

  ipcMain.handle('dialog:save-file', async (_event, options: Electron.SaveDialogOptions) => {
    const win = getMainWindow()
    if (!win) return null
    const result = await dialog.showSaveDialog(win, options)
    return result.canceled ? null : result.filePath
  })

  ipcMain.handle('dialog:show-message', async (_event, options: Electron.MessageBoxOptions) => {
    const win = getMainWindow()
    if (!win) return null
    return dialog.showMessageBox(win, options)
  })

  // ─── Notifications ───────────────────────────────────────────────────────

  ipcMain.on('notification:show', (_event, { title, body }: { title: string; body: string }) => {
    if (!Notification.isSupported()) return
    const notif = new Notification({ title, body })
    notif.on('click', () => { const w = getMainWindow(); if (w) { w.isMinimized() && w.restore(); w.focus() } })
    notif.show()
  })

  // ─── Secure storage ──────────────────────────────────────────────────────

  ipcMain.handle('secure:get', (_event, key: string): string | null => {
    if (!safeStorage.isEncryptionAvailable()) return null
    const raw = store.get(`secure.${key}` as never, null) as string | null
    if (!raw) return null
    try { return safeStorage.decryptString(Buffer.from(raw, 'base64')) } catch { return null }
  })

  ipcMain.handle('secure:set', (_event, key: string, value: string): void => {
    if (!safeStorage.isEncryptionAvailable()) return
    store.set(`secure.${key}` as never, safeStorage.encryptString(value).toString('base64'))
  })

  ipcMain.handle('secure:delete', (_event, key: string): void => {
    store.delete(`secure.${key}` as never)
  })

  // ─── Theme ───────────────────────────────────────────────────────────────

  ipcMain.handle('theme:get-system', () => nativeTheme.shouldUseDarkColors ? 'dark' : 'light')

  nativeTheme.on('updated', () => {
    getMainWindow()?.webContents.send('theme:system-changed', nativeTheme.shouldUseDarkColors ? 'dark' : 'light')
  })

  // ─── Setup wizard checks ─────────────────────────────────────────────────

  // 1. TCP check — is something listening on host:port?
  ipcMain.handle('setup:check-pg-port', (_event, host: string, port: number) => {
    return new Promise<{ ok: boolean; error?: string }>((resolve) => {
      const socket = new net.Socket()
      const timeout = 3000
      socket.setTimeout(timeout)
      socket.connect(port, host, () => {
        socket.destroy()
        resolve({ ok: true })
      })
      socket.on('error', (err) => resolve({ ok: false, error: err.message }))
      socket.on('timeout', () => { socket.destroy(); resolve({ ok: false, error: 'Connection timed out' }) })
    })
  })

  // 2. Full credential check — can we authenticate to the database?
  ipcMain.handle('setup:check-pg-credentials', async (_event, config: {
    host: string; port: number; user: string; password: string; database: string
  }) => {
    const client = new PgClient({ ...config, connectionTimeoutMillis: 5000 })
    try {
      await client.connect()
      await client.end()
      return { ok: true }
    } catch (err) {
      return { ok: false, error: (err as Error).message }
    }
  })

  // 3. Check if Playwright Chromium binary is installed on this machine
  ipcMain.handle('setup:check-playwright', () => {
    const home = os.homedir()
    const cachePaths =
      process.platform === 'darwin'
        ? [path.join(home, 'Library', 'Caches', 'ms-playwright')]
        : process.platform === 'win32'
          ? [path.join(process.env['LOCALAPPDATA'] || home, 'ms-playwright')]
          : [path.join(home, '.cache', 'ms-playwright')]

    for (const base of cachePaths) {
      if (!fs.existsSync(base)) continue
      const dirs = fs.readdirSync(base)
      const hasChromium = dirs.some(
        (d) => d.startsWith('chromium-') || d.startsWith('chromium_headless_shell-'),
      )
      if (hasChromium) return { ok: true, path: base }
    }
    return { ok: false, path: cachePaths[0] }
  })

  // 4. Return install instructions per platform
  ipcMain.handle('setup:get-platform-info', () => ({
    platform: process.platform,
    arch: process.arch,
  }))
}
