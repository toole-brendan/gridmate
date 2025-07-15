import { create } from 'zustand'
import { DiffHunk, AISuggestedOperation } from '../types/diff'

export type DiffStatus = 'idle' | 'computing' | 'previewing' | 'applying' | 'applied'

interface DiffState {
  // Current diff data
  hunks: DiffHunk[] | null
  status: DiffStatus
  
  // Operations that generated this diff
  pendingOperations: AISuggestedOperation[] | null
  
  // Workbook information
  workbookId: string | null
  revision: number
  
  // Error state
  error: string | null
  
  // Actions
  setPreview: (hunks: DiffHunk[], operations: AISuggestedOperation[], workbookId: string) => void
  clearPreview: () => void
  setStatus: (status: DiffStatus) => void
  setError: (error: string | null) => void
  incrementRevision: () => void
}

export const useDiffStore = create<DiffState>((set) => ({
  // Initial state
  hunks: null,
  status: 'idle',
  pendingOperations: null,
  workbookId: null,
  revision: 0,
  error: null,
  
  // Set preview state when diff is received
  setPreview: (hunks, operations, workbookId) => set({
    hunks,
    pendingOperations: operations,
    workbookId,
    status: 'previewing',
    error: null
  }),
  
  // Clear all diff state
  clearPreview: () => set({
    hunks: null,
    pendingOperations: null,
    status: 'idle',
    error: null
  }),
  
  // Update status
  setStatus: (status) => set({ status }),
  
  // Set error
  setError: (error) => set({ error, status: 'idle' }),
  
  // Increment revision for ordering
  incrementRevision: () => set((state) => ({ revision: state.revision + 1 }))
}))

// Selector hooks for common use cases
export const useDiffHunks = () => useDiffStore((state) => state.hunks)
export const useDiffStatus = () => useDiffStore((state) => state.status)
export const usePendingOperations = () => useDiffStore((state) => state.pendingOperations)
export const useIsPreviewing = () => useDiffStore((state) => state.status === 'previewing')