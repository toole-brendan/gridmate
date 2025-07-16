import { create } from 'zustand';
import { AISuggestedOperation, DiffHunk, WorkbookSnapshot } from '../types/diff';

// Enhanced diff operation with session tracking
interface DiffOperation extends AISuggestedOperation {
  sessionId: string;
  messageId: string;
  timestamp: Date;
}

type DiffStatus = 'idle' | 'calculating' | 'previewing' | 'applying' | 'error';

type LogType = 'info' | 'error' | 'success' | 'warning';

interface LogEntry {
  type: LogType;
  message: string;
  timestamp: Date;
  data?: Record<string, any>;
}

interface DiffSessionState {
  sessionId: string | null;
  status: DiffStatus;
  originalSnapshot: WorkbookSnapshot | null;
  liveSnapshot: WorkbookSnapshot | null;
  pendingOperations: DiffOperation[];
  hunks: DiffHunk[];
  error: string | null;
  lastError: { message: string; timestamp: Date } | null;
  retryCount: number;
  logs: LogEntry[];
  actions: {
    startSession: (sessionId: string, snapshot: WorkbookSnapshot) => void;
    addOperation: (operation: AISuggestedOperation, messageId: string, newLiveSnapshot: WorkbookSnapshot, newHunks: DiffHunk[]) => void;
    endSession: () => void;
    setError: (error: string) => void;
    handleError: (error: Error) => void;
    retry: () => void;
    setStatus: (status: DiffStatus) => void;
    addLog: (type: LogType, message: string, data?: Record<string, any>) => void;
  }
}

export const useDiffSessionStore = create<DiffSessionState>((set, get) => ({
  sessionId: null,
  status: 'idle',
  originalSnapshot: null,
  liveSnapshot: null,
  pendingOperations: [],
  hunks: [],
  error: null,
  lastError: null,
  retryCount: 0,
  logs: [],
  actions: {
    startSession: (sessionId, snapshot) => set({
      sessionId,
      status: 'calculating',
      originalSnapshot: snapshot,
      liveSnapshot: snapshot, // Initially, live is same as original
      pendingOperations: [],
      hunks: [],
      error: null,
      retryCount: 0,
      logs: [], // Clear logs on new session
    }),
    addOperation: (operation, messageId, newLiveSnapshot, newHunks) => set((state) => ({
      pendingOperations: [...state.pendingOperations, {
        ...operation,
        sessionId: state.sessionId!,
        messageId,
        timestamp: new Date()
      }],
      liveSnapshot: newLiveSnapshot,
      hunks: newHunks, // Or merge hunks: [...state.hunks, ...newHunks]
      status: 'previewing',
    })),
    endSession: () => set({
      sessionId: null,
      status: 'idle',
      originalSnapshot: null,
      liveSnapshot: null,
      pendingOperations: [],
      hunks: [],
      error: null,
      retryCount: 0,
    }),
    setError: (error) => set({ 
      status: 'error', 
      error,
      lastError: { message: error, timestamp: new Date() }
    }),
    handleError: (error) => set((state) => ({ 
      status: 'error', 
      error: error.message,
      lastError: { message: error.message, timestamp: new Date() },
      retryCount: state.retryCount + 1
    })),
    retry: () => {
      const state = get();
      if (state.retryCount < 3 && state.originalSnapshot) {
        set({ 
          status: 'calculating', 
          error: null,
          liveSnapshot: state.originalSnapshot 
        });
      }
    },
    setStatus: (status) => set({ status }),
    addLog: (type, message, data) => {
      set((state) => ({
        logs: [...state.logs, { type, message, timestamp: new Date(), data }],
      }));
    },
  }
})); 