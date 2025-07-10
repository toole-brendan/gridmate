import { create } from 'zustand'
import { Range, WorkbookInfo } from '@shared/types/spreadsheet'

interface SpreadsheetState {
  isConnected: boolean
  connectionType: 'excel' | 'sheets' | null
  activeRange: Range | null
  workbookInfo: WorkbookInfo | null
  lastUpdate: Date | null
  
  setConnected: (connected: boolean, type?: 'excel' | 'sheets') => void
  setActiveRange: (range: Range | null) => void
  setWorkbookInfo: (info: WorkbookInfo | null) => void
  updateLastUpdate: () => void
}

export const useSpreadsheetStore = create<SpreadsheetState>((set) => ({
  isConnected: false,
  connectionType: null,
  activeRange: null,
  workbookInfo: null,
  lastUpdate: null,

  setConnected: (connected, type) =>
    set({
      isConnected: connected,
      connectionType: connected ? type || null : null
    }),

  setActiveRange: (range) =>
    set((state) => ({
      activeRange: range,
      lastUpdate: range ? new Date() : state.lastUpdate
    })),

  setWorkbookInfo: (info) =>
    set({ workbookInfo: info }),

  updateLastUpdate: () =>
    set({ lastUpdate: new Date() })
}))