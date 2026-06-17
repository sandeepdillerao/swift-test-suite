type ServerMode = 'local' | 'remote' | 'not-configured'

interface LocalServerConfig {
  dbHost: string
  dbPort: number
  dbUsername: string
  dbPassword: string
  dbName: string
  backendPort: number
}

interface ServerConfig {
  mode: ServerMode
  remoteApiUrl: string
  local: LocalServerConfig
}

interface ElectronSettings {
  serverMode: ServerMode
  remoteApiUrl: string
  local: LocalServerConfig
  launchAtStartup: boolean
  minimizeToTray: boolean
  showUpdateNotifications: boolean
}

type ElectronChannel =
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

interface ElectronAPI {
  isElectron: true
  isDev: boolean
  platform: 'win32' | 'darwin' | 'linux'
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
  showOpenDialog(options: { title?: string; filters?: Array<{ name: string; extensions: string[] }>; properties?: string[] }): Promise<string[] | null>
  showSaveDialog(options: { title?: string; defaultPath?: string; filters?: Array<{ name: string; extensions: string[] }> }): Promise<string | null>
  showMessageDialog(options: { type?: string; title?: string; message: string; detail?: string; buttons?: string[] }): Promise<{ response: number }>
  showNotification(title: string, body: string): void
  getCredential(key: string): Promise<string | null>
  setCredential(key: string, value: string): Promise<void>
  deleteCredential(key: string): Promise<void>
  checkForUpdates(): Promise<unknown>
  downloadUpdate(): Promise<void>
  installUpdate(): Promise<void>
  getSystemTheme(): Promise<'light' | 'dark'>
  on(channel: ElectronChannel, listener: (data?: unknown) => void): () => void
}

declare interface Window {
  electron?: ElectronAPI
}
