import { create } from 'zustand';
import { AISuggestedOperation } from '../types/diff';

interface DiffOrchestrationState {
  pendingDiffOps: AISuggestedOperation[];
  addOperation: (operation: AISuggestedOperation) => void;
  clearOperations: () => void;
  setOperations: (operations: AISuggestedOperation[]) => void;
}

export const useDiffOrchestrationStore = create<DiffOrchestrationState>((set) => ({
  pendingDiffOps: [],
  addOperation: (operation) => set((state) => ({
    pendingDiffOps: [...state.pendingDiffOps, operation],
  })),
  clearOperations: () => set({ pendingDiffOps: [] }),
  setOperations: (operations) => set({ pendingDiffOps: operations }),
})); 