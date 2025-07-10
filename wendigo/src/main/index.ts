import { app, BrowserWindow, ipcMain, screen, shell } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { setupIpcHandlers } from './ipc'
import { WindowManager } from './windowManager'

const isDevelopment = process.env.NODE_ENV !== 'production'

let mainWindow: BrowserWindow | null = null
let windowManager: WindowManager

function createWindow(): void {
  const primaryDisplay = screen.getPrimaryDisplay()
  const { width, height } = primaryDisplay.workAreaSize

  mainWindow = new BrowserWindow({
    width: 400,
    height: height - 100,
    x: width - 420,
    y: 50,
    show: false,
    frame: false,
    resizable: true,
    alwaysOnTop: true,
    transparent: false,
    backgroundColor: '#ffffff',
    titleBarStyle: 'hidden',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  windowManager = new WindowManager(mainWindow)
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.wendigo.app')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createWindow()
  setupIpcHandlers(ipcMain, windowManager)

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

ipcMain.handle('app:minimize', () => {
  mainWindow?.minimize()
})

ipcMain.handle('app:maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize()
  } else {
    mainWindow?.maximize()
  }
})

ipcMain.handle('app:close', () => {
  mainWindow?.close()
})