import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const api = {
  // Window controls
  minimize: () => ipcRenderer.invoke('app:minimize'),
  maximize: () => ipcRenderer.invoke('app:maximize'),
  close: () => ipcRenderer.invoke('app:close'),
  toggleDocking: () => ipcRenderer.invoke('window:toggleDocking'),
  setAlwaysOnTop: (value: boolean) => ipcRenderer.invoke('window:setAlwaysOnTop', value),
  setOpacity: (value: number) => ipcRenderer.invoke('window:setOpacity', value),

  // Spreadsheet operations
  connectSpreadsheet: (type: 'excel' | 'sheets', options?: { spreadsheetId?: string }) => 
    ipcRenderer.invoke('spreadsheet:connect', type, options),
  getActiveRange: () => ipcRenderer.invoke('spreadsheet:getActiveRange'),
  setCellValue: (cell: string, value: any) => 
    ipcRenderer.invoke('spreadsheet:setCellValue', cell, value),

  // AI operations
  chat: (message: string, context?: any) => 
    ipcRenderer.invoke('ai:chat', message, context),
  generateFormula: (description: string, context?: any) => 
    ipcRenderer.invoke('ai:generateFormula', description, context),

  // Audit operations
  getAuditHistory: (filter?: any) => 
    ipcRenderer.invoke('audit:getHistory', filter),

  // Event listeners
  onSpreadsheetChange: (callback: (change: any) => void) => {
    ipcRenderer.on('spreadsheet:change', (_, change) => callback(change))
  },

  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel)
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('gridmate', api)
  } catch (error) {
    console.error(error)
  }
} else {
  window.electron = electronAPI
  window.gridmate = api
}