import { spawn } from 'child_process'
import path, { join } from 'path'
import { is } from '@electron-toolkit/utils'
import fs from 'fs'
import os from 'os'
import { getMainWindow } from './window-manager'

function browsersPath(): string {
  if (process.platform === 'darwin') return join(os.homedir(), 'Library', 'Caches', 'ms-playwright')
  if (process.platform === 'win32') return join(process.env['LOCALAPPDATA'] || os.homedir(), 'ms-playwright')
  return join(os.homedir(), '.cache', 'ms-playwright')
}

function chromiumExeExists(chromiumDir: string): boolean {
  if (process.platform === 'win32') {
    return fs.existsSync(join(chromiumDir, 'chrome-win64', 'chrome.exe'))
  }
  if (process.platform === 'darwin') {
    const app = join('Google Chrome for Testing.app', 'Contents', 'MacOS', 'Google Chrome for Testing')
    return (
      fs.existsSync(join(chromiumDir, 'chrome-mac-arm64', app)) ||
      fs.existsSync(join(chromiumDir, 'chrome-mac-x64', app))
    )
  }
  return fs.existsSync(join(chromiumDir, 'chrome-linux64', 'chrome'))
}

function isChromiumInstalled(): boolean {
  const base = browsersPath()
  if (!fs.existsSync(base)) return false
  return fs.readdirSync(base)
    .filter((d) => d.startsWith('chromium-'))
    .some((d) => chromiumExeExists(join(base, d)))
}

function findCli(): string | null {
  if (!is.dev) {
    const prod = join(process.resourcesPath, 'playwright', 'node_modules', '@playwright', 'test', 'cli.js')
    return fs.existsSync(prod) ? prod : null
  }
  // Walk up from __dirname until node_modules/@playwright/test/cli.js is found.
  // Avoids fragile hardcoded ../.. counts that break when the compiled output dir depth changes.
  let dir = __dirname
  for (let i = 0; i < 10; i++) {
    const candidate = join(dir, 'node_modules', '@playwright', 'test', 'cli.js')
    if (fs.existsSync(candidate)) return candidate
    const parent = path.dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  return null
}

function send(channel: string, data?: unknown): void {
  getMainWindow()?.webContents.send(channel, data)
}

/**
 * Called once after the app window is ready.
 * If Chromium is already installed this is a no-op.
 * Otherwise it downloads Chromium (~170 MB) in the background using the playwright
 * CLI that ships with the app — no Node.js or npm required on the user's machine.
 */
export function ensurePlaywrightBrowsers(): void {
  if (isChromiumInstalled()) return

  const cliPath = findCli()
  if (!cliPath) {
    console.warn('[playwright-setup] CLI not found — skipping auto-install')
    return
  }

  // Small delay so the renderer is fully interactive before the banner appears
  setTimeout(() => {
    send('playwright:install-progress', '__start__')

    const proc = spawn(process.execPath, [cliPath, 'install', 'chromium'], {
      shell: false,
      env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
    })

    const emit = (line: string): void => {
      if (line.trim()) send('playwright:install-progress', line)
    }

    proc.stdout?.on('data', (d: Buffer) => d.toString().split('\n').forEach(emit))
    proc.stderr?.on('data', (d: Buffer) => d.toString().split('\n').forEach(emit))

    proc.on('close', (code) => {
      send('playwright:install-progress', code === 0 ? '__done__' : `__error__:Exit code ${code}`)
    })
    proc.on('error', (err) => {
      send('playwright:install-progress', `__error__:${err.message}`)
    })
  }, 4000)
}
