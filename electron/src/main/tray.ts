import { app, Menu, Tray, nativeImage } from 'electron'
import { join } from 'path'
import { getMainWindow, createWindow } from './window-manager'

let tray: Tray | null = null

export function createTray(): void {
  const iconPath = join(
    __dirname,
    process.platform === 'win32'
      ? '../../resources/tray-icon.ico'
      : process.platform === 'darwin'
        ? '../../resources/tray-iconTemplate.png'
        : '../../resources/tray-icon.png',
  )

  try {
    const icon = nativeImage.createFromPath(iconPath)
    tray = new Tray(icon.isEmpty() ? nativeImage.createEmpty() : icon)
  } catch {
    tray = new Tray(nativeImage.createEmpty())
  }

  tray.setToolTip('TestFlow TCM')
  updateTrayMenu()

  tray.on('click', () => {
    const win = getMainWindow()
    if (!win) {
      // Window was fully closed — recreate it
      createWindow()
      return
    }
    if (win.isVisible()) {
      win.focus()
    } else {
      win.show()
      win.focus()
    }
  })
}

export function updateTrayMenu(): void {
  if (!tray) return

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'TestFlow TCM',
      enabled: false,
      icon: undefined,
    },
    { type: 'separator' },
    {
      label: 'Open TestFlow',
      click: () => {
        const win = getMainWindow()
        if (!win) {
          createWindow()
        } else {
          win.show()
          win.focus()
        }
      },
    },
    {
      label: 'Dashboard',
      click: () => {
        const win = getMainWindow()
        if (!win) return
        win.show()
        win.focus()
        win.webContents.send('navigate', '/app')
      },
    },
    { type: 'separator' },
    {
      label: 'Check for Updates',
      click: () => {
        getMainWindow()?.webContents.send('updater:check-triggered')
      },
    },
    { type: 'separator' },
    {
      label: 'Quit TestFlow',
      accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
      click: () => app.quit(),
    },
  ])

  tray.setContextMenu(contextMenu)
}

export function destroyTray(): void {
  tray?.destroy()
  tray = null
}
