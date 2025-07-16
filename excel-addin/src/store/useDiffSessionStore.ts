import { create } from 'zustand';
import { AISuggestedOperation, DiffHunk, WorkbookSnapshot } from '../types/diff';

// Simplified: Only one active preview at a time
interface DiffData {
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
  
  // Actions
  setActivePreview: (messageId: string, operations: AISuggestedOperation[], hunks: DiffHunk[]) => void;
  acceptActivePreview: () => Promise<void>;
  rejectActivePreview: () => void;
  clearPreview: () => void;
}

export const useDiffSessionStore = create<DiffSessionState>((set, get) => ({
  activePreview: null,
  originalSnapshot: null,

  setActivePreview: (messageId, operations, hunks) => {
    set({
      activePreview: {
        status: 'previewing',
        operations,
        hunks,
        timestamp: Date.now(),
        messageId
      }
    });
  },

  acceptActivePreview: async () => {
    const { activePreview } = get();
    if (!activePreview || activePreview.status !== 'previewing') return;

    set((state) => ({
      activePreview: state.activePreview ? {
        ...state.activePreview,
        status: 'applying'
      } : null
    }));

    // After applying, keep the preview with 'accepted' status for history
    setTimeout(() => {
      set((state) => ({
        activePreview: state.activePreview ? {
          ...state.activePreview,
          status: 'accepted' as any  // Add 'accepted' as a valid status
        } : null,
        originalSnapshot: null
      }));
    }, 100);
  },

  rejectActivePreview: () => {
    const { activePreview } = get();
    if (!activePreview) return;

    set((state) => ({
      activePreview: state.activePreview ? {
        ...state.activePreview,
        status: 'rejected'
      } : null
    }));

    // Keep rejected state visible in chat history
    // Don't auto-clear - let it be cleared by next preview or manually
  },

  clearPreview: () => {
    set({
      activePreview: null,
      originalSnapshot: null
    });
  }
})); 