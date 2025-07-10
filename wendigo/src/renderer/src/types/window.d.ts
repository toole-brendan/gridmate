import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI
    wendigo: {
      // Window controls
      minimize: () => Promise<void>
      maximize: () => Promise<void>
      close: () => Promise<void>
      toggleDocking: () => Promise<void>
      setAlwaysOnTop: (value: boolean) => Promise<void>
      setOpacity: (value: number) => Promise<void>

      // Spreadsheet operations
      connectSpreadsheet: (type: 'excel' | 'sheets', options?: { spreadsheetId?: string }) => Promise<boolean>
      getActiveRange: () => Promise<any>
      setCellValue: (cell: string, value: any) => Promise<void>

      // AI operations
      chat: (message: string, context?: any) => Promise<any>
      generateFormula: (description: string, context?: any) => Promise<string>

      // Audit operations
      getAuditHistory: (filter?: any) => Promise<any>

      // Event listeners
      onSpreadsheetChange: (callback: (change: any) => void) => void
      removeAllListeners: (channel: string) => void
    }
  }
}

export {}