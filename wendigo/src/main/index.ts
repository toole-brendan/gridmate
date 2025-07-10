import { app, BrowserWindow, ipcMain, screen, shell } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { setupIpcHandlers } from './ipc'
import { WindowManager } from './windowManager'
import * as dotenv from 'dotenv'
import { ErrorHandler } from './utils/errorHandler'
import { logger, getLogFilePaths } from './utils/logger'
import { ExcelAddinServer } from './services/excelAddinServer'

// Load environment variables from .env file
dotenv.config()

const isDevelopment = process.env.NODE_ENV !== 'production'

// Initialize error handler as early as possible
const errorHandler = ErrorHandler.getInstance()

logger.info('Starting Wendigo application', {
  nodeVersion: process.version,
  electronVersion: process.versions.electron,
  isDevelopment,
  logFiles: getLogFilePaths()
})

let mainWindow: BrowserWindow | null = null
let windowManager: WindowManager
let excelAddinServer: ExcelAddinServer | null = null

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
    titleBarStyle: 'customButtonsOnHover', // This hides traffic lights on macOS
    trafficLightPosition: { x: -100, y: -100 }, // Move traffic lights off-screen
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
  logger.info('App ready, creating window')
  
  electronApp.setAppUserModelId('com.wendigo.app')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  try {
    createWindow()
    setupIpcHandlers(ipcMain, windowManager)
    logger.info('Window created and IPC handlers set up successfully')
    
    // Start Excel add-in server
    excelAddinServer = new ExcelAddinServer()
    excelAddinServer.start().then(() => {
      logger.info('Excel add-in server started successfully')
    }).catch((error) => {
      logger.error('Failed to start Excel add-in server:', error)
      // Don't quit the app, just log the error
    })
  } catch (error) {
    logger.fatal('Failed to initialize application:', error)
    app.quit()
  }

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) {
      logger.info('Reactivating app, creating new window')
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  logger.info('All windows closed')
  
  // Stop Excel add-in server
  if (excelAddinServer) {
    excelAddinServer.stop().then(() => {
      logger.info('Excel add-in server stopped')
    }).catch((error) => {
      logger.error('Error stopping Excel add-in server:', error)
    })
  }
  
  if (process.platform !== 'darwin') {
    logger.info('Quitting application')
    app.quit()
  }
})

ipcMain.handle('app:minimize', () => {
  try {
    mainWindow?.minimize()
    logger.debug('Window minimized')
  } catch (error) {
    logger.error('Failed to minimize window:', error)
    throw error
  }
})

ipcMain.handle('app:maximize', () => {
  try {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize()
      logger.debug('Window unmaximized')
    } else {
      mainWindow?.maximize()
      logger.debug('Window maximized')
    }
  } catch (error) {
    logger.error('Failed to toggle maximize:', error)
    throw error
  }
})

ipcMain.handle('app:close', () => {
  try {
    logger.info('Close requested, shutting down window')
    mainWindow?.close()
  } catch (error) {
    logger.error('Failed to close window:', error)
    throw error
  }
})