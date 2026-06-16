import Store from 'electron-store'

export type ServerMode = 'local' | 'remote' | 'not-configured'

interface StoreSchema {
  // ─── Server mode ────────────────────────────────────────────────────────────
  serverMode: ServerMode

  // ─── Remote mode ────────────────────────────────────────────────────────────
  remoteApiUrl: string

  // ─── Local mode: DB + backend config ────────────────────────────────────────
  local: {
    backendPort: number
    dbHost: string
    dbPort: number
    dbUsername: string
    dbPassword: string
    dbName: string
    jwtSecret: string
    jwtRefreshSecret: string
  }

  // ─── Window + UI ────────────────────────────────────────────────────────────
  windowBounds: {
    width: number
    height: number
    x?: number
    y?: number
    isMaximized?: boolean
  }
  launchAtStartup: boolean
  minimizeToTray: boolean
  showUpdateNotifications: boolean
}

export const store = new Store<StoreSchema>({
  name: 'testflow-config',
  defaults: {
    serverMode: 'not-configured',
    remoteApiUrl: 'http://localhost:3000/api/v1',
    local: {
      backendPort: 3000,
      dbHost: 'localhost',
      dbPort: 5432,
      dbUsername: 'testflow',
      dbPassword: 'testflow_secret',
      dbName: 'testflow_db',
      jwtSecret: '',
      jwtRefreshSecret: '',
    },
    windowBounds: { width: 1280, height: 800 },
    launchAtStartup: false,
    minimizeToTray: true,
    showUpdateNotifications: true,
  },
})

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function getEffectiveApiUrl(): string {
  const mode = store.get('serverMode')
  if (mode === 'local') {
    const port = store.get('local.backendPort') ?? 3000
    return `http://localhost:${port}/api/v1`
  }
  return store.get('remoteApiUrl')
}
