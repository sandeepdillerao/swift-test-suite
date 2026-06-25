import { contextBridge, ipcRenderer } from 'electron'

// Read API URL synchronously so http-client.ts gets the right baseURL at module load time
const apiUrl = ipcRenderer.sendSync('app:get-api-url-sync') as string
const serverMode = ipcRenderer.invoke('server:get-mode') // async — used by renderer

const electronApi = {
  // ─── Identity ─────────────────────────────────────────────────────────
  isElectron: true as const,
  isDev: process.env.NODE_ENV === 'development',
  platform: process.platform as NodeJS.Platform,
  apiUrl,

  // ─── App ──────────────────────────────────────────────────────────────
  getVersion: (): Promise<string> => ipcRenderer.invoke('app:version'),
  getApiUrl: (): Promise<string> => ipcRenderer.invoke('app:get-api-url'),
  getSettings: (): Promise<ElectronSettings> => ipcRenderer.invoke('app:get-settings'),
  setSettings: (s: Partial<ElectronSettings>): Promise<{ success: boolean }> =>
    ipcRenderer.invoke('app:set-settings', s),
  openExternal: (url: string): Promise<void> => ipcRenderer.invoke('app:open-external', url),
  openConfigDir: (): Promise<void> => ipcRenderer.invoke('app:open-config-dir'),

  // ─── Server mode ──────────────────────────────────────────────────────
  getServerMode: (): Promise<ServerMode> => ipcRenderer.invoke('server:get-mode'),
  getServerConfig: (): Promise<ServerConfig> => ipcRenderer.invoke('server:get-config'),
  saveRemoteServer: (url: string): Promise<{ success: boolean }> =>
    ipcRenderer.invoke('server:save-remote', url),
  saveLocalServer: (cfg: LocalServerConfig): Promise<{ success: boolean }> =>
    ipcRenderer.invoke('server:save-local', cfg),
  setServerMode: (mode: ServerMode): Promise<{ success: boolean }> =>
    ipcRenderer.invoke('server:set-mode', mode),

  // ─── Backend lifecycle ────────────────────────────────────────────────
  startBackend: (): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('backend:start'),
  stopBackend: (): Promise<{ success: boolean }> => ipcRenderer.invoke('backend:stop'),
  restartBackend: (): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('backend:restart'),
  isBackendRunning: (): Promise<boolean> => ipcRenderer.invoke('backend:is-running'),

  // ─── Window ───────────────────────────────────────────────────────────
  minimize: (): void => ipcRenderer.send('window:minimize'),
  maximize: (): void => ipcRenderer.send('window:maximize'),
  close: (): void => ipcRenderer.send('window:close'),
  isMaximized: (): Promise<boolean> => ipcRenderer.invoke('window:is-maximized'),
  popupMenu: (): void => ipcRenderer.send('window:popup-menu'),

  // ─── Dialogs ──────────────────────────────────────────────────────────
  showOpenDialog: (options: Electron.OpenDialogOptions): Promise<string[] | null> =>
    ipcRenderer.invoke('dialog:open-file', options),
  showSaveDialog: (options: Electron.SaveDialogOptions): Promise<string | null> =>
    ipcRenderer.invoke('dialog:save-file', options),
  showMessageDialog: (options: Electron.MessageBoxOptions): Promise<Electron.MessageBoxReturnValue> =>
    ipcRenderer.invoke('dialog:show-message', options),

  // ─── Notifications ────────────────────────────────────────────────────
  showNotification: (title: string, body: string): void =>
    ipcRenderer.send('notification:show', { title, body }),

  // ─── Secure storage ───────────────────────────────────────────────────
  getCredential: (key: string): Promise<string | null> => ipcRenderer.invoke('secure:get', key),
  setCredential: (key: string, value: string): Promise<void> => ipcRenderer.invoke('secure:set', key, value),
  deleteCredential: (key: string): Promise<void> => ipcRenderer.invoke('secure:delete', key),

  // ─── Auto-updater ─────────────────────────────────────────────────────
  checkForUpdates: (): Promise<unknown> => ipcRenderer.invoke('updater:check'),
  downloadUpdate: (): Promise<void> => ipcRenderer.invoke('updater:download'),
  installUpdate: (): Promise<void> => ipcRenderer.invoke('updater:install'),

  // ─── Setup wizard checks ──────────────────────────────────────────────────
  needsInit: (): Promise<{ requiresSetup: boolean }> =>
    ipcRenderer.invoke('setup:needs-init'),
  checkPgPort: (host: string, port: number): Promise<{ ok: boolean; error?: string }> =>
    ipcRenderer.invoke('setup:check-pg-port', host, port),
  checkPgCredentials: (cfg: { host: string; port: number; user: string; password: string; database: string }): Promise<{ ok: boolean; error?: string }> =>
    ipcRenderer.invoke('setup:check-pg-credentials', cfg),
  checkPlaywright: (): Promise<{ ok: boolean; path: string }> =>
    ipcRenderer.invoke('setup:check-playwright'),
  installPlaywright: (): Promise<{ ok: boolean; error?: string }> =>
    ipcRenderer.invoke('setup:install-playwright'),
  getPlatformInfo: (): Promise<{ platform: string; arch: string }> =>
    ipcRenderer.invoke('setup:get-platform-info'),

  // ─── Theme ────────────────────────────────────────────────────────────
  getSystemTheme: (): Promise<'light' | 'dark'> => ipcRenderer.invoke('theme:get-system'),

  // ─── Event subscriptions ──────────────────────────────────────────────
  on: (channel: ElectronChannel, listener: (data?: unknown) => void): (() => void) => {
    const sub = (_e: Electron.IpcRendererEvent, d?: unknown): void => listener(d)
    ipcRenderer.on(channel, sub)
    return () => ipcRenderer.off(channel, sub)
  },
} satisfies ElectronAPI

contextBridge.exposeInMainWorld('electron', electronApi)

// ─── Types ───────────────────────────────────────────────────────────────────

export type ServerMode = 'local' | 'remote' | 'not-configured'

export interface LocalServerConfig {
  dbHost: string
  dbPort: number
  dbUsername: string
  dbPassword: string
  dbName: string
  backendPort: number
}

export interface ServerConfig {
  mode: ServerMode
  remoteApiUrl: string
  local: LocalServerConfig
}

export interface ElectronSettings {
  serverMode: ServerMode
  remoteApiUrl: string
  local: LocalServerConfig
  launchAtStartup: boolean
  minimizeToTray: boolean
  showUpdateNotifications: boolean
}

export type ElectronChannel =
  | 'window:maximized-changed'
  | 'navigate'
  | 'deep-link'
  | 'backend:status'
  | 'backend:log'
  | 'updater:checking'
  | 'updater:available'
  | 'updater:not-available'
  | 'updater:progress'
  | 'updater:downloaded'
  | 'updater:error'
  | 'updater:check-triggered'
  | 'notification:show'
  | 'theme:system-changed'
  | 'menu:new-test-case'
  | 'menu:toggle-sidebar'
  | 'menu:toggle-theme'
  | 'menu:show-about'
  | 'playwright:install-progress'

export interface ElectronAPI {
  isElectron: true
  isDev: boolean
  platform: NodeJS.Platform
  apiUrl: string
  getVersion(): Promise<string>
  getApiUrl(): Promise<string>
  getSettings(): Promise<ElectronSettings>
  setSettings(s: Partial<ElectronSettings>): Promise<{ success: boolean }>
  openExternal(url: string): Promise<void>
  openConfigDir(): Promise<void>
  getServerMode(): Promise<ServerMode>
  getServerConfig(): Promise<ServerConfig>
  saveRemoteServer(url: string): Promise<{ success: boolean }>
  saveLocalServer(cfg: LocalServerConfig): Promise<{ success: boolean }>
  setServerMode(mode: ServerMode): Promise<{ success: boolean }>
  startBackend(): Promise<{ success: boolean; error?: string }>
  stopBackend(): Promise<{ success: boolean }>
  restartBackend(): Promise<{ success: boolean; error?: string }>
  isBackendRunning(): Promise<boolean>
  minimize(): void
  maximize(): void
  close(): void
  isMaximized(): Promise<boolean>
  popupMenu(): void
  showOpenDialog(options: Electron.OpenDialogOptions): Promise<string[] | null>
  showSaveDialog(options: Electron.SaveDialogOptions): Promise<string | null>
  showMessageDialog(options: Electron.MessageBoxOptions): Promise<Electron.MessageBoxReturnValue>
  showNotification(title: string, body: string): void
  getCredential(key: string): Promise<string | null>
  setCredential(key: string, value: string): Promise<void>
  deleteCredential(key: string): Promise<void>
  checkForUpdates(): Promise<unknown>
  downloadUpdate(): Promise<void>
  installUpdate(): Promise<void>
  needsInit(): Promise<{ requiresSetup: boolean }>
  checkPgPort(host: string, port: number): Promise<{ ok: boolean; error?: string }>
  checkPgCredentials(cfg: { host: string; port: number; user: string; password: string; database: string }): Promise<{ ok: boolean; error?: string }>
  checkPlaywright(): Promise<{ ok: boolean; path: string }>
  getPlatformInfo(): Promise<{ platform: string; arch: string }>
  getSystemTheme(): Promise<'light' | 'dark'>
  on(channel: ElectronChannel, listener: (data?: unknown) => void): () => void
}
