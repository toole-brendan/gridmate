import { create } from 'zustand';

interface PerformanceState {
  isHighLoad: boolean;
  streamingOptimized: boolean;
  batchingEnabled: boolean;
  setHighLoad: (value: boolean) => void;
  setStreamingOptimized: (value: boolean) => void;
  setBatchingEnabled: (value: boolean) => void;
}

export const usePerformanceStore = create<PerformanceState>((set) => ({
  isHighLoad: false,
  streamingOptimized: true,
  batchingEnabled: true,
  setHighLoad: (value) => set({ isHighLoad: value }),
  setStreamingOptimized: (value) => set({ streamingOptimized: value }),
  setBatchingEnabled: (value) => set({ batchingEnabled: value })
}));