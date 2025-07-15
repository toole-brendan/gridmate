import { create } from 'zustand'

type LogEntry = {
  timestamp: string
  source: 'general' | 'visual-diff' | 'signalr'
  message: string
  data?: any
}

interface LogState {
  logs: LogEntry[]
  addLog: (source: LogEntry['source'], message: string, data?: any) => void
  clearLogs: () => void
}

export const useLogStore = create<LogState>((set) => ({
  logs: [],
  addLog: (source, message, data) => {
    const timestamp = new Date().toLocaleTimeString()
    const newEntry: LogEntry = { timestamp, source, message, data }
    console.log(`[${source}] ${message}`, data) // Keep console.log for those who can see it
    set((state) => ({ logs: [...state.logs.slice(-100), newEntry] })) // Keep last 100 logs
  },
  clearLogs: () => set({ logs: [] }),
}))

// Helper function for easy access
export const log = (source: LogEntry['source'], message: string, data?: any) => {
  useLogStore.getState().addLog(source, message, data)
}