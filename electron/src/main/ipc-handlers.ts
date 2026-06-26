import { app, ipcMain, dialog, shell, Notification, safeStorage, nativeTheme, Menu } from 'electron'
import { store, getEffectiveApiUrl, type ServerMode } from './store'
import { getMainWindow } from './window-manager'
import { startBackend, stopBackend, restartBackend, isBackendRunning } from './backend-manager'
import net from 'net'
import os from 'os'
import path from 'path'
import fs from 'fs'
import { spawn } from 'child_process'
import { is } from '@electron-toolkit/utils'
import { Client as PgClient } from 'pg'

/**
 * Locate @playwright/test/cli.js.
 * Production: bundled at resources/playwright/node_modules/@playwright/test/cli.js
 * Dev: walk up from __dirname until node_modules/@playwright/test/cli.js is found.
 *      (Hardcoded ../.. counts are fragile — the compiled output dir depth varies.)
 */
function findPlaywrightCli(): string | null {
  if (!is.dev) {
    const prod = path.join(process.resourcesPath, 'playwright', 'node_modules', '@playwright', 'test', 'cli.js')
    return fs.existsSync(prod) ? prod : null
  }
  let dir = __dirname
  for (let i = 0; i < 10; i++) {
    const candidate = path.join(dir, 'node_modules', '@playwright', 'test', 'cli.js')
    if (fs.existsSync(candidate)) return candidate
    const parent = path.dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  return null
}

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

  // Pop up the native application menu at the current cursor position.
  // Used by the custom Windows title bar since frame:false hides the menu bar.
  ipcMain.on('window:popup-menu', () => {
    const menu = Menu.getApplicationMenu()
    if (menu) menu.popup({ window: getMainWindow() ?? undefined })
  })

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

  // ─── Storage path ─────────────────────────────────────────────────────────

  ipcMain.handle('app:get-storage-path', () => {
    return path.join(app.getPath('userData'), 'uploads')
  })

  ipcMain.handle('app:open-storage-folder', async () => {
    const dir = path.join(app.getPath('userData'), 'uploads')
    fs.mkdirSync(dir, { recursive: true })
    return shell.openPath(dir)
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
    const base =
      process.platform === 'darwin'
        ? path.join(home, 'Library', 'Caches', 'ms-playwright')
        : process.platform === 'win32'
          ? path.join(process.env['LOCALAPPDATA'] || home, 'ms-playwright')
          : path.join(home, '.cache', 'ms-playwright')

    function exeExists(chromiumDir: string): boolean {
      if (process.platform === 'win32') return fs.existsSync(path.join(chromiumDir, 'chrome-win64', 'chrome.exe'))
      if (process.platform === 'darwin') {
        const app = path.join('Google Chrome for Testing.app', 'Contents', 'MacOS', 'Google Chrome for Testing')
        return fs.existsSync(path.join(chromiumDir, 'chrome-mac-arm64', app)) ||
               fs.existsSync(path.join(chromiumDir, 'chrome-mac-x64', app))
      }
      return fs.existsSync(path.join(chromiumDir, 'chrome-linux64', 'chrome'))
    }

    if (fs.existsSync(base)) {
      const ready = fs.readdirSync(base)
        .filter(d => d.startsWith('chromium-'))
        .some(d => exeExists(path.join(base, d)))
      if (ready) return { ok: true, path: base }
    }
    return { ok: false, path: base }
  })

  // 4. Install Playwright Chromium using the bundled CLI + Electron's own Node runtime.
  //    Streams progress lines to the renderer via 'playwright:install-progress' events.
  //    No separate Node.js or npm install required on the user's machine.
  ipcMain.handle('setup:install-playwright', () => {
    return new Promise<{ ok: boolean; error?: string }>((resolve) => {
      const cliPath = findPlaywrightCli()
      if (!cliPath) {
        resolve({ ok: false, error: 'Playwright CLI not found. In dev mode run: npm install (from the repo root).' })
        return
      }

      const send = (line: string) =>
        getMainWindow()?.webContents.send('playwright:install-progress', line)

      send('Starting Chromium download (~170MB)…')

      const proc = spawn(process.execPath, [cliPath, 'install', 'chromium'], {
        shell: false,
        env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
      })

      proc.stdout?.on('data', (d: Buffer) => {
        d.toString().split('\n').filter(Boolean).forEach(send)
      })
      proc.stderr?.on('data', (d: Buffer) => {
        d.toString().split('\n').filter(Boolean).forEach(send)
      })
      proc.on('close', (code) => {
        if (code === 0) {
          send('✅ Chromium installed successfully!')
          resolve({ ok: true })
        } else {
          resolve({ ok: false, error: `playwright install exited with code ${code}` })
        }
      })
      proc.on('error', (err) => resolve({ ok: false, error: err.message }))
    })
  })

  // 5. Return install instructions per platform
  ipcMain.handle('setup:get-platform-info', () => ({
    platform: process.platform,
    arch: process.arch,
  }))

  // 5. Check if the DB is empty (no users) — used to decide whether to show
  //    the first-run setup screen. Uses pg directly so it works even before
  //    the NestJS backend processes its first request.
  ipcMain.handle('setup:needs-init', async () => {
    const local = store.get('local')
    const client = new PgClient({
      host: local.dbHost,
      port: local.dbPort ?? 5432,
      user: local.dbUsername,
      password: local.dbPassword,
      database: local.dbName,
      connectionTimeoutMillis: 5000,
    })
    try {
      await client.connect()
      const result = await client.query('SELECT COUNT(*) AS cnt FROM users')
      await client.end()
      return { requiresSetup: parseInt(result.rows[0].cnt, 10) === 0 }
    } catch {
      // Table doesn't exist yet or connection failed — assume setup needed
      try { await client.end() } catch { /* ignore */ }
      return { requiresSetup: true }
    }
  })
}
