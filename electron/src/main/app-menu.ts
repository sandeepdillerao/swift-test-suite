import { app, Menu, MenuItemConstructorOptions, shell } from 'electron'
import { getMainWindow } from './window-manager'

export function createAppMenu(): void {
  const isMac = process.platform === 'darwin'

  const template: MenuItemConstructorOptions[] = [
    // ─── macOS app menu ──────────────────────────────────────────────────
    ...(isMac
      ? [
          {
            label: app.getName(),
            submenu: [
              { role: 'about' as const },
              { type: 'separator' as const },
              { role: 'services' as const },
              { type: 'separator' as const },
              { role: 'hide' as const },
              { role: 'hideOthers' as const },
              { role: 'unhide' as const },
              { type: 'separator' as const },
              { role: 'quit' as const },
            ],
          },
        ]
      : []),

    // ─── File ─────────────────────────────────────────────────────────────
    {
      label: 'File',
      submenu: [
        {
          label: 'New Test Case',
          accelerator: 'CmdOrCtrl+N',
          click: () => getMainWindow()?.webContents.send('menu:new-test-case'),
        },
        { type: 'separator' },
        {
          label: 'Settings',
          accelerator: 'CmdOrCtrl+,',
          click: () => getMainWindow()?.webContents.send('navigate', '/app/settings'),
        },
        { type: 'separator' },
        isMac ? { role: 'close' as const } : { role: 'quit' as const },
      ],
    },

    // ─── Edit ─────────────────────────────────────────────────────────────
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' as const },
        { role: 'redo' as const },
        { type: 'separator' as const },
        { role: 'cut' as const },
        { role: 'copy' as const },
        { role: 'paste' as const },
        ...(isMac
          ? [
              { role: 'pasteAndMatchStyle' as const },
              { role: 'delete' as const },
              { role: 'selectAll' as const },
              { type: 'separator' as const },
              {
                label: 'Speech',
                submenu: [{ role: 'startSpeaking' as const }, { role: 'stopSpeaking' as const }],
              },
            ]
          : [{ role: 'delete' as const }, { type: 'separator' as const }, { role: 'selectAll' as const }]),
      ],
    },

    // ─── View ─────────────────────────────────────────────────────────────
    {
      label: 'View',
      submenu: [
        { role: 'reload' as const },
        { role: 'forceReload' as const },
        { role: 'toggleDevTools' as const },
        { type: 'separator' as const },
        { role: 'resetZoom' as const },
        { role: 'zoomIn' as const },
        { role: 'zoomOut' as const },
        { type: 'separator' as const },
        { role: 'togglefullscreen' as const },
        { type: 'separator' as const },
        {
          label: 'Toggle Sidebar',
          accelerator: 'CmdOrCtrl+B',
          click: () => getMainWindow()?.webContents.send('menu:toggle-sidebar'),
        },
        {
          label: 'Toggle Dark Mode',
          accelerator: 'CmdOrCtrl+Shift+D',
          click: () => getMainWindow()?.webContents.send('menu:toggle-theme'),
        },
      ],
    },

    // ─── Navigate ─────────────────────────────────────────────────────────
    {
      label: 'Navigate',
      submenu: [
        {
          label: 'Dashboard',
          accelerator: 'CmdOrCtrl+1',
          click: () => getMainWindow()?.webContents.send('navigate', '/app'),
        },
        {
          label: 'Projects',
          accelerator: 'CmdOrCtrl+2',
          click: () => getMainWindow()?.webContents.send('navigate', '/app/projects'),
        },
        {
          label: 'Test Cases',
          accelerator: 'CmdOrCtrl+3',
          click: () => getMainWindow()?.webContents.send('navigate', '/app/test-cases'),
        },
        {
          label: 'Test Runs',
          accelerator: 'CmdOrCtrl+4',
          click: () => getMainWindow()?.webContents.send('navigate', '/app/test-runs'),
        },
        {
          label: 'Releases',
          accelerator: 'CmdOrCtrl+5',
          click: () => getMainWindow()?.webContents.send('navigate', '/app/releases'),
        },
      ],
    },

    // ─── Window ───────────────────────────────────────────────────────────
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' as const },
        { role: 'zoom' as const },
        ...(isMac
          ? [
              { type: 'separator' as const },
              { role: 'front' as const },
              { type: 'separator' as const },
              { role: 'window' as const },
            ]
          : [{ role: 'close' as const }]),
      ],
    },

    // ─── Help ─────────────────────────────────────────────────────────────
    {
      role: 'help',
      submenu: [
        {
          label: 'Documentation',
          click: () => shell.openExternal('https://docs.testflow.dev'),
        },
        {
          label: 'Report an Issue',
          click: () => shell.openExternal('https://github.com/your-org/testflow-tcm/issues'),
        },
        { type: 'separator' },
        {
          label: 'Check for Updates',
          click: () => getMainWindow()?.webContents.send('updater:check-triggered'),
        },
        ...(!isMac
          ? [
              { type: 'separator' as const },
              {
                label: 'About TestFlow TCM',
                click: () => getMainWindow()?.webContents.send('menu:show-about'),
              },
            ]
          : []),
      ],
    },
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}
