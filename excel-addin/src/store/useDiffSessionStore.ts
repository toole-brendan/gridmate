import { create } from 'zustand';
import { AISuggestedOperation, DiffHunk, WorkbookSnapshot } from '../types/diff';

// Simplified: Only one active preview at a time
export interface DiffData {
  status: 'previewing' | 'applying' | 'rejected' | 'accepted';
  operations: AISuggestedOperation[];
  hunks: DiffHunk[];
  timestamp: number;
  messageId: string;
}

interface DiffSessionState {
  // Current active preview (only one at a time)
  activePreview: DiffData | null;
  
  // Original snapshot before preview
  originalSnapshot: WorkbookSnapshot | null;
  
  // Current simulated snapshot (result of latest simulation)
  currentSimulatedSnapshot: WorkbookSnapshot | null;
  
  // Actions
  setActivePreview: (messageId: string, operations: AISuggestedOperation[], hunks: DiffHunk[], simulatedSnapshot: WorkbookSnapshot) => void;
  clearPreview: () => void;
}

export const useDiffSessionStore = create<DiffSessionState>((set) => ({
  activePreview: null,
  originalSnapshot: null,
  currentSimulatedSnapshot: null,

  setActivePreview: (messageId, operations, hunks, simulatedSnapshot) => {
    set({
      activePreview: {
        status: 'previewing',
        operations,
        hunks,
        timestamp: Date.now(),
        messageId
      },
      currentSimulatedSnapshot: simulatedSnapshot
    });
  },

  clearPreview: () => {
    set({
      activePreview: null,
      originalSnapshot: null,
      currentSimulatedSnapshot: null
    });
  }
})); 