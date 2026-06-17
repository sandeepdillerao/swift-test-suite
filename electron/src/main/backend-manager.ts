import { ChildProcess, fork } from 'child_process'
import { join } from 'path'
import os from 'os'
import { app } from 'electron'
import { is } from '@electron-toolkit/utils'
import { store } from './store'
import { getMainWindow } from './window-manager'
import crypto from 'crypto'
import fs from 'fs'

let backendProcess: ChildProcess | null = null
let healthTimer: ReturnType<typeof setTimeout> | null = null
let startResolve: (() => void) | null = null
let startReject: ((err: Error) => void) | null = null

// ─── Secrets ─────────────────────────────────────────────────────────────────
// Generate and persist strong secrets on first use.
// NestJS Joi validation requires JWT_SECRET >= 32 chars, so we guarantee that here.

function ensureSecrets(): { jwtSecret: string; jwtRefreshSecret: string } {
  let jwtSecret = store.get('local.jwtSecret' as never, '') as string
  let jwtRefreshSecret = store.get('local.jwtRefreshSecret' as never, '') as string

  if (!jwtSecret || jwtSecret.length < 32) {
    jwtSecret = crypto.randomBytes(64).toString('hex')  // 128 chars
    store.set('local' as never, { ...store.get('local'), jwtSecret })
  }
  if (!jwtRefreshSecret || jwtRefreshSecret.length < 32) {
    jwtRefreshSecret = crypto.randomBytes(64).toString('hex')
    store.set('local' as never, { ...store.get('local'), jwtRefreshSecret })
  }

  return { jwtSecret, jwtRefreshSecret }
}

// ─── Backend path ─────────────────────────────────────────────────────────────

function getBackendBundlePath(): string {
  if (is.dev) {
    // In dev, the bundled backend isn't needed — backend runs separately
    return ''
  }
  // In packaged app: resources/backend/index.js
  return join(process.resourcesPath, 'backend', 'index.js')
}

// ─── Env vars for backend process ─────────────────────────────────────────────

function buildBackendEnv(): NodeJS.ProcessEnv {
  const { jwtSecret, jwtRefreshSecret } = ensureSecrets()
  const local = store.get('local')

  // User-writable directory for uploads / automation artifacts.
  // e.g. ~/Library/Application Support/testflow-desktop/uploads  (macOS)
  //      %APPDATA%\testflow-desktop\uploads                       (Windows)
  const uploadsDir = join(app.getPath('userData'), 'uploads')
  fs.mkdirSync(join(uploadsDir, 'automation'), { recursive: true })

  return {
    ...process.env,
    NODE_ENV: 'production',
    ELECTRON_RUN_AS_NODE: '1',
    PORT: String(local.backendPort ?? 3000),
    API_PREFIX: 'api/v1',
    DB_HOST: local.dbHost,
    DB_PORT: String(local.dbPort ?? 5432),
    DB_USERNAME: local.dbUsername,
    DB_PASSWORD: local.dbPassword,
    DB_NAME: local.dbName,
    DB_SYNC: 'false',
    DB_LOGGING: 'false',
    JWT_SECRET: jwtSecret,
    JWT_ACCESS_EXPIRY: '15m',
    JWT_REFRESH_SECRET: jwtRefreshSecret,
    JWT_REFRESH_EXPIRY: '7d',
    BCRYPT_ROUNDS: '12',
    CORS_ORIGINS: 'null',
    SWAGGER_ENABLED: 'false',
    FRONTEND_URL: 'app://.',
    UPLOADS_DIR: uploadsDir,

    // Playwright: tell the service where to look for the CLI binary and where to
    // cache downloaded browsers. Users install Playwright into the userData dir:
    //   cd "$(electron app userData)" && npm install @playwright/test && npx playwright install
    PLAYWRIGHT_NODE_MODULES: join(app.getPath('userData'), 'node_modules'),
    // Use platform-appropriate Playwright browser cache so it matches where
    // `npx playwright install` puts binaries by default.
    // macOS: ~/Library/Caches/ms-playwright  Linux/Windows: ~/.cache/ms-playwright
    PLAYWRIGHT_BROWSERS_PATH: process.platform === 'darwin'
      ? join(os.homedir(), 'Library', 'Caches', 'ms-playwright')
      : join(os.homedir(), '.cache', 'ms-playwright'),
  }
}

// ─── Health check polling ─────────────────────────────────────────────────────

async function pollHealth(port: number, attempts = 0): Promise<void> {
  const MAX_ATTEMPTS = 60  // 30 seconds @ 500ms
  if (attempts >= MAX_ATTEMPTS) {
    startReject?.(new Error('Backend did not start within 30 seconds.'))
    startResolve = null
    startReject = null
    return
  }

  try {
    const res = await fetch(`http://localhost:${port}/health`, {
      signal: AbortSignal.timeout(1000),
    })
    if (res.ok) {
      sendStatus('ready')
      startResolve?.()
      startResolve = null
      startReject = null
      return
    }
  } catch {
    // not ready yet — keep polling
  }

  healthTimer = setTimeout(() => pollHealth(port, attempts + 1), 500)
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function startBackend(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (is.dev) {
      // In dev, the backend is started separately — just resolve immediately
      resolve()
      return
    }

    const bundlePath = getBackendBundlePath()
    if (!bundlePath) {
      reject(new Error('Backend bundle not found.'))
      return
    }

    const local = store.get('local')
    const port = local.backendPort ?? 3000

    startResolve = resolve
    startReject = reject

    sendStatus('starting')

    // Use ELECTRON_RUN_AS_NODE to run the bundled backend using Electron's own Node.js.
    // No separate Node.js installation required on the end-user's machine.
    backendProcess = fork(bundlePath, [], {
      execPath: process.execPath,
      env: buildBackendEnv(),
      stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
    })

    backendProcess.stdout?.on('data', (data: Buffer) => {
      const line = data.toString().trim()
      if (line) sendLog(line)
    })

    backendProcess.stderr?.on('data', (data: Buffer) => {
      const line = data.toString().trim()
      if (line) sendLog(`[err] ${line}`)
    })

    backendProcess.on('error', (err) => {
      sendStatus('error', err.message)
      startReject?.(err)
      startResolve = null
      startReject = null
    })

    backendProcess.on('exit', (code, signal) => {
      sendStatus('stopped', `exited with code ${code ?? signal}`)
      backendProcess = null
      if (healthTimer) clearTimeout(healthTimer)
    })

    // Start polling for readiness
    pollHealth(port)
  })
}

export function stopBackend(): void {
  if (healthTimer) {
    clearTimeout(healthTimer)
    healthTimer = null
  }
  if (backendProcess) {
    backendProcess.kill('SIGTERM')
    backendProcess = null
  }
}

export function restartBackend(): Promise<void> {
  stopBackend()
  return startBackend()
}

export function isBackendRunning(): boolean {
  return backendProcess !== null && !backendProcess.killed
}

// ─── IPC helpers ─────────────────────────────────────────────────────────────

type BackendStatus = 'starting' | 'ready' | 'stopped' | 'error'

function sendStatus(status: BackendStatus, detail?: string): void {
  getMainWindow()?.webContents.send('backend:status', { status, detail })
}

function sendLog(line: string): void {
  getMainWindow()?.webContents.send('backend:log', line)
}
